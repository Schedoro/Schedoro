"""Schedule checker: hard scheduling rules

Runs on every proposed appointment (from the generator or the LLM later) before a manager sees it.
All datetimes should be in the team's local timezone.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models import AvailabilityWindow, Job

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]  # same order as weekday()


@dataclass
class Member:
    userId: str
    skills: list[str] = field(default_factory=list)
    availability: list[AvailabilityWindow] = field(default_factory=list)
    maxWeeklyHours: float | None = None


@dataclass
class Appointment:
    jobId: str
    assigneeIds: list[str]
    start: datetime
    end: datetime
    status: str = "Scheduled"


@dataclass
class Violation:
    index: int  # position in the proposed list
    rule: str
    message: str


def validate(
    proposed: list[Appointment],
    existing: list[Appointment],
    jobs: dict[str, Job],
    members: dict[str, Member],
) -> list[Violation]:
    """Returns every rule that a proposed appointment breaks. An empty list means the schedule is valid."""
    booked: dict[str, list[tuple[datetime, datetime]]] = defaultdict(list)
    weekly_minutes: dict[tuple[str, date], int] = defaultdict(int)

    def book(appt: Appointment) -> None:
        for user_id in appt.assigneeIds:
            booked[user_id].append((appt.start, appt.end))
            weekly_minutes[(user_id, _week_start(appt.start))] += _minutes(appt)

    for appt in existing:
        if appt.status != "Cancelled":
            book(appt)

    violations = []
    for i, appt in enumerate(proposed):
        problems = _check(appt, jobs, members, booked, weekly_minutes)
        violations += [Violation(i, rule, message) for rule, message in problems]
        # only valid ones count toward the later checks while invalid ones get dropped anyway
        if not problems:
            book(appt)
    return violations


def _check(appt, jobs, members, booked, weekly_minutes) -> list[tuple[str, str]]:
    if appt.end <= appt.start:
        return [("time", "end time must be after start time")]

    job = jobs.get(appt.jobId)
    if job is None:
        return [("job", f"job {appt.jobId} not found")]

    problems = []
    if not appt.assigneeIds:
        problems.append(("assignees", "no one is assigned"))

    missing = [user_id for user_id in appt.assigneeIds if user_id not in members]
    if missing:
        problems.append(("assignees", f"not on this team: {', '.join(missing)}"))
    team = [members[user_id] for user_id in appt.assigneeIds if user_id in members]

    # skills are covered by the group, not each person
    team_skills = {skill.casefold() for member in team for skill in member.skills}
    lacking = [skill for skill in job.requiredSkills if skill.casefold() not in team_skills]
    if lacking:
        problems.append(("skills", f"nobody assigned has: {', '.join(lacking)}"))

    # no job windows means the job can happen any time
    if job.availability and not _fits(appt, job.availability):
        problems.append(("job_window", f"outside the allowed times for {job.name}"))

    # TODO: add travel time in-between back to back appointments once the MapsService is implemented
    for member in team:
        if not _fits(appt, member.availability):
            problems.append(("availability", f"{member.userId} isn't available then"))

        if any(appt.start < end and start < appt.end for start, end in booked[member.userId]):
            problems.append(("overlap", f"{member.userId} already has an appointment then"))

        if member.maxWeeklyHours is not None:
            total = weekly_minutes[(member.userId, _week_start(appt.start))] + _minutes(appt)
            if total > member.maxWeeklyHours * 60:
                problems.append(("weekly_hours", f"{member.userId} would go over {member.maxWeeklyHours:g}h this week"))

    return problems


def _fits(appt: Appointment, windows: list[AvailabilityWindow]) -> bool:
    """True if the appointment sits fully inside one of the weekly windows"""
    if appt.start.date() != appt.end.date():
        return False
    day = DAY_NAMES[appt.start.weekday()]
    start, end = appt.start.strftime("%H:%M"), appt.end.strftime("%H:%M")
    return any(w.dayOfWeek == day and w.startTime <= start and end <= w.endTime for w in windows)


def _week_start(when: datetime) -> date:
    return when.date() - timedelta(days=when.weekday())  # weeks start on monday


def _minutes(appt: Appointment) -> int:
    return int((appt.end - appt.start).total_seconds() // 60)
