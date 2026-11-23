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
) -> tuple[list[Appointment], dict[str, str]]:
    """Returns (proposed appointments, {job id: why it couldn't be placed})"""
    week_start -= timedelta(days=week_start.weekday())  # snap to monday
    proposed: list[Appointment] = []
    unscheduled: dict[str, str] = {}

    # longest jobs first since they're the hardest to fit
    for job_id in sorted(job_ids, key=lambda j: -jobs[j].estimatedDurationMinutes if j in jobs else 0):
        job = jobs.get(job_id)
        if job is None:
            unscheduled[job_id] = "job not found"
            continue
        appt, reason = _place(job, week_start, existing + proposed, jobs, members, max_team_size)
        if appt:
            proposed.append(appt)
        else:
            unscheduled[job_id] = reason
    return proposed, unscheduled


def _place(job, week_start, booked, jobs, members, max_team_size) -> tuple[Appointment | None, str]:
    duration = timedelta(minutes=job.estimatedDurationMinutes)
    by_load = sorted(members.values(), key=lambda m: _busy_minutes(m.userId, booked, week_start))

    # try one person first, then pairs if no one has every skill
    groups = [
        group
        for size in range(1, max_team_size + 1)
        for group in combinations(by_load, size)
        if _covers_skills(group, job)
    ]
    if not groups:
        return None, _skills_reason(job, members.values(), max_team_size)

    # remember why certain slots failed so we can provide explanations if nothing fits
    outside_job_times = False
    other_rules: set[str] = set()
    for group in groups:
        ids = [m.userId for m in group]
        for start in _slots(week_start, duration):
            appt = Appointment(job.jobId, ids, start, start + duration, status="Pending")
            rules = {v.rule for v in validate([appt], booked, jobs, members)}
            if not rules:
                return appt, ""
            if "availability" in rules:
                continue  # not free then, that's most slots so it says nothing on its own
            if "job_window" in rules:
                outside_job_times = True
            else:
                other_rules |= rules

    hours = _hours(job.estimatedDurationMinutes)
    if other_rules:
        reasons = []
        if "overlap" in other_rules:
            reasons.append("workers with the skills are already booked when they're free")
        if "weekly_hours" in other_rules:
            reasons.append(f"another {hours} would put workers over their weekly hours")
        return None, "; ".join(reasons) or "breaks a scheduling rule"
    if outside_job_times:
        return None, "workers with the skills aren't free during the job's allowed times"
    return None, f"no one with the skills is free for {hours} in a row this week"


def _skills_reason(job, members, max_team_size) -> str:
    have = {skill.casefold() for member in members for skill in member.skills}
    missing = [skill for skill in job.requiredSkills if skill.casefold() not in have]
    if missing:
        return f"no selected worker has {', '.join(missing)}"
    return f"needs more than {max_team_size} workers to cover {', '.join(job.requiredSkills)}"


def _hours(minutes: int) -> str:
    return f"{minutes / 60:g}h"


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
