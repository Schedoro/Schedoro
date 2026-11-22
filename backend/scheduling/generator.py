"""Greedy schedule generator

Baseline schedule generation before the LLM. Puts each job in the earliest slot that passes the validator, trying the least busy workers first.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from itertools import combinations
from typing import TYPE_CHECKING

from scheduling.validator import Appointment, Member, validate

if TYPE_CHECKING:
    from models import Job

SLOT_MINUTES = 30
DAY_START, DAY_END = time(6), time(22)


def generate(
    job_ids: list[str],
    week_start: date,
    existing: list[Appointment],
    jobs: dict[str, Job],
    members: dict[str, Member],
    max_team_size: int = 2,
) -> tuple[list[Appointment], list[str]]:
    """Returns (proposed appointments, job ids that couldn't be placed)"""
    week_start -= timedelta(days=week_start.weekday())  # snap to monday
    proposed: list[Appointment] = []
    unscheduled: list[str] = []

    # longest jobs first since they're the hardest to fit
    for job_id in sorted(job_ids, key=lambda j: -jobs[j].estimatedDurationMinutes if j in jobs else 0):
        job = jobs.get(job_id)
        appt = job and _place(job, week_start, existing + proposed, jobs, members, max_team_size)
        if appt:
            proposed.append(appt)
        else:
            unscheduled.append(job_id)
    return proposed, unscheduled


def _place(job, week_start, booked, jobs, members, max_team_size) -> Appointment | None:
    duration = timedelta(minutes=job.estimatedDurationMinutes)
    by_load = sorted(members.values(), key=lambda m: _busy_minutes(m.userId, booked, week_start))

    # try one person first, then pairs if no one has every skill
    for size in range(1, max_team_size + 1):
        for group in combinations(by_load, size):
            if not _covers_skills(group, job):
                continue
            ids = [m.userId for m in group]
            for start in _slots(week_start, duration):
                appt = Appointment(job.jobId, ids, start, start + duration, status="Pending")
                if not validate([appt], booked, jobs, members):
                    return appt
    return None


def _covers_skills(group, job) -> bool:
    have = {skill.casefold() for member in group for skill in member.skills}
    return all(skill.casefold() in have for skill in job.requiredSkills)


def _slots(week_start: date, duration: timedelta):
    for day in range(7):
        start = datetime.combine(week_start + timedelta(days=day), DAY_START)
        last = datetime.combine(start.date(), DAY_END) - duration
        while start <= last:
            yield start
            start += timedelta(minutes=SLOT_MINUTES)


def _busy_minutes(user_id: str, booked: list[Appointment], week_start: date) -> int:
    week_end = week_start + timedelta(days=7)
    return sum(
        int((a.end - a.start).total_seconds() // 60)
        for a in booked
        if user_id in a.assigneeIds and a.status != "Cancelled" and week_start <= a.start.date() < week_end
    )
