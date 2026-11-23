"""Gemini schedule generator

Gemini suggests appointments, then the validator checks every one. Anything invalid or left out
goes to the greedy generator, so the manager always gets the best proposal we can make.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import TYPE_CHECKING, Awaitable, Callable

from pydantic import BaseModel, TypeAdapter

from scheduling.generator import generate
from scheduling.validator import DAY_NAMES, Appointment, Member, validate

if TYPE_CHECKING:
    from models import Job

TIMEOUT_SECONDS = 45
log = logging.getLogger("uvicorn.error")  # uvicorn prints this one, the root logger gets swallowed


class Suggestion(BaseModel):
    jobId: str
    assigneeIds: list[str]
    start: str  # "2026-11-23T09:00:00", team local time
    end: str


@dataclass
class AiResult:
    ai: list[Appointment] = field(default_factory=list)  # from gemini, passed the validator
    basic: list[Appointment] = field(default_factory=list)  # filled in by the greedy generator
    unscheduled: dict[str, str] = field(default_factory=dict)
    notice: str | None = None


def ai_enabled() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY"))


async def ask_gemini(prompt: str) -> list[Suggestion]:
    from google import genai  # only needed when the key is set
    from google.genai import types

    # keep the client in a variable, a throwaway one gets closed mid request
    client = genai.Client()
    response = await client.aio.models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"),
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[Suggestion],
            temperature=0.2,
        ),
    )
    return TypeAdapter(list[Suggestion]).validate_json(response.text or "[]")


async def ai_generate(
    job_ids: list[str],
    week_start: date,
    existing: list[Appointment],
    jobs: dict[str, Job],
    members: dict[str, Member],
    notes: str = "",
    ask: Callable[[str], Awaitable[list[Suggestion]]] = ask_gemini,
) -> AiResult:
    week_start -= timedelta(days=week_start.weekday())
    wanted = [j for j in job_ids if j in jobs]
    result = AiResult()

    try:
        prompt = build_prompt(wanted, week_start, existing, jobs, members, notes)
        suggestions = await asyncio.wait_for(ask(prompt), TIMEOUT_SECONDS)
    except Exception as e:
        log.exception("gemini scheduling failed")
        suggestions = []
        reason = "it took too long" if isinstance(e, TimeoutError) else f"{type(e).__name__}: {e}"[:160]
        result.notice = f"Gemini didn't respond ({reason}), so this schedule came from the basic scheduler."

    booked = list(existing)
    for s in suggestions:
        appt = _to_appointment(s, jobs, week_start)
        if appt is None or appt.jobId not in wanted or any(a.jobId == appt.jobId for a in result.ai):
            continue
        if validate([appt], booked, jobs, members):
            continue  # broke a rule, the greedy generator gets another try at this job
        result.ai.append(appt)
        booked.append(appt)

    placed = {a.jobId for a in result.ai}
    leftover = [j for j in job_ids if j not in placed]
    result.basic, result.unscheduled = generate(leftover, week_start, booked, jobs, members)
    return result


def _to_appointment(s: Suggestion, jobs, week_start: date) -> Appointment | None:
    job = jobs.get(s.jobId)
    try:
        start = datetime.fromisoformat(s.start).replace(tzinfo=None, second=0, microsecond=0)
    except ValueError:
        return None
    if job is None or not (week_start <= start.date() < week_start + timedelta(days=7)):
        return None
    # always use the job's real duration, as gemini sometimes gets the end time wrong
    end = start + timedelta(minutes=job.estimatedDurationMinutes)
    return Appointment(s.jobId, list(dict.fromkeys(s.assigneeIds)), start, end, status="Pending")


def build_prompt(job_ids, week_start, existing, jobs, members, notes) -> str:
    def windows(ws):
        return [f"{w.dayOfWeek} {w.startTime}-{w.endTime}" for w in ws]

    booked_minutes = {m: 0 for m in members}
    for a in existing:
        if a.status == "Cancelled":
            continue
        for m in a.assigneeIds:
            if m in booked_minutes:
                booked_minutes[m] += int((a.end - a.start).total_seconds() // 60)

    data = {
        "week": [f"{DAY_NAMES[i]} {(week_start + timedelta(days=i)).isoformat()}" for i in range(7)],
        "jobs": [
            {
                "jobId": j,
                "name": jobs[j].name,
                "durationMinutes": jobs[j].estimatedDurationMinutes,
                "requiredSkills": jobs[j].requiredSkills,
                "allowedTimes": windows(jobs[j].availability) or "any time",
            }
            for j in job_ids
        ],
        "workers": [
            {
                "id": m.userId,
                "skills": m.skills,
                "availability": windows(m.availability),
                "maxWeeklyHours": m.maxWeeklyHours,
                "alreadyBookedMinutes": booked_minutes[m.userId],
            }
            for m in members.values()
        ],
        "existingAppointments": [
            {"assigneeIds": a.assigneeIds, "start": a.start.isoformat(), "end": a.end.isoformat()}
            for a in existing
            if a.status != "Cancelled"
        ],
    }

    return f"""You schedule cleaning jobs for a small business. Plan the week below.

Hard rules, every appointment must follow all of them:
- The assigned workers together have every required skill for the job.
- It fits inside the availability of every assigned worker, and inside the job's allowed times, on one day.
- end = start + durationMinutes. Times are local, formatted like 2026-11-23T09:00:00, inside the given week.
- No worker has two appointments at the same time, including the existing ones.
- No worker goes over maxWeeklyHours, counting alreadyBookedMinutes.

Preferences (ignore if otherwise is stated in manager's notes/business constraints):
- Use one worker unless the skills require more.
- Spread the hours fairly between workers.
- Leave at least 30 minutes between a worker's back to back appointments for travel.
- Follow the manager's notes when they don't break a hard rule.

Give each job at most one appointment, and leave out any job that can't fit.

Manager's notes: {notes.strip() or "none"}

Data:
{json.dumps(data, indent=1)}"""
