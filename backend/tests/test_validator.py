# run from backend/: python -m pytest
# or .venv/bin/python -m pytest

from datetime import datetime

from models import AvailabilityWindow, Job
from scheduling.validator import Appointment, Member, validate

MON = datetime(2026, 11, 23)  # a monday


def at(hour: int, day: datetime = MON) -> datetime:
    return day.replace(hour=hour)


def window(day: str, start: str = "08:00", end: str = "17:00") -> AvailabilityWindow:
    return AvailabilityWindow(dayOfWeek=day, startTime=start, endTime=end)


JOBS = {
    "house": Job(jobId="house", teamId="t1", name="House cleaning", estimatedDurationMinutes=180, requiredSkills=["Regular cleaning"]),
    "office": Job(
        jobId="office", teamId="t1", name="Office cleaning", estimatedDurationMinutes=120,
        requiredSkills=["Deep cleaning"], availability=[window("Monday", "12:00", "17:00")],
    ),
}

MEMBERS = {
    "joe": Member("joe", skills=["Regular cleaning"], availability=[window("Monday")], maxWeeklyHours=6),
    "amy": Member("amy", skills=["deep cleaning"], availability=[window("Monday")]),
}


def rules(proposed, existing=()):
    return [v.rule for v in validate(list(proposed), list(existing), JOBS, MEMBERS)]


def test_valid_appointment_passes():
    assert rules([Appointment("house", ["joe"], at(9), at(12))]) == []


def test_missing_skill():
    assert rules([Appointment("office", ["joe"], at(13), at(15))]) == ["skills"]


def test_skills_can_come_from_the_group_and_ignore_case():
    assert rules([Appointment("office", ["joe", "amy"], at(13), at(15))]) == []


def test_outside_member_availability():
    assert rules([Appointment("house", ["joe"], at(15), at(18))]) == ["availability"]


def test_outside_job_window():
    assert rules([Appointment("office", ["amy"], at(9), at(11))]) == ["job_window"]


def test_overlap_with_existing():
    existing = [Appointment("house", ["joe"], at(9), at(12))]
    assert rules([Appointment("house", ["joe"], at(11), at(14))], existing) == ["overlap"]


def test_cancelled_appointments_are_ignored():
    existing = [Appointment("house", ["joe"], at(9), at(12), status="Cancelled")]
    assert rules([Appointment("house", ["joe"], at(10), at(13))], existing) == []


def test_overlap_between_proposed():
    proposed = [Appointment("house", ["joe"], at(9), at(12)), Appointment("house", ["joe"], at(10), at(13))]
    assert rules(proposed) == ["overlap"]


def test_weekly_hours_limit():
    proposed = [Appointment("house", ["joe"], at(8), at(11)), Appointment("house", ["joe"], at(12), at(16))]
    assert rules(proposed) == ["weekly_hours"]


def test_unknown_job_and_member():
    assert rules([Appointment("nope", ["joe"], at(9), at(10))]) == ["job"]
    assert rules([Appointment("house", ["ghost"], at(9), at(10))]) == ["assignees", "skills"]


def test_end_before_start():
    assert rules([Appointment("house", ["joe"], at(12), at(9))]) == ["time"]
