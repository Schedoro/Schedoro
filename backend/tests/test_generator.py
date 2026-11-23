# run from backend/: python -m pytest
from datetime import date, datetime

from models import AvailabilityWindow, Job
from scheduling.generator import generate
from scheduling.validator import Appointment, Member, validate

MONDAY = date(2026, 11, 23)


def window(day: str, start: str = "08:00", end: str = "17:00") -> AvailabilityWindow:
    return AvailabilityWindow(dayOfWeek=day, startTime=start, endTime=end)


def job(job_id: str, minutes: int, skills: list[str]) -> Job:
    return Job(jobId=job_id, teamId="t1", name=job_id, estimatedDurationMinutes=minutes, requiredSkills=skills)


MEMBERS = {
    "joe": Member("joe", ["Regular cleaning"], [window("Monday")], maxWeeklyHours=40),
    "amy": Member("amy", ["Regular cleaning"], [window("Monday")], maxWeeklyHours=40),
    "sam": Member("sam", ["Deep cleaning"], [window("Tuesday")], maxWeeklyHours=40),
}


def test_every_proposal_passes_the_validator():
    jobs = {"a": job("a", 180, ["Regular cleaning"]), "b": job("b", 120, ["Regular cleaning"]), "c": job("c", 240, [])}
    proposals, unscheduled = generate(list(jobs), MONDAY, [], jobs, MEMBERS)
    assert unscheduled == {}
    assert validate(proposals, [], jobs, MEMBERS) == []


def test_least_busy_worker_gets_the_job():
    jobs = {"a": job("a", 120, ["Regular cleaning"])}
    existing = [Appointment("x", ["joe"], datetime(2026, 11, 23, 8), datetime(2026, 11, 23, 12))]
    proposals, _ = generate(["a"], MONDAY, existing, jobs, MEMBERS)
    assert proposals[0].assigneeIds == ["amy"]


def test_pairs_up_workers_when_no_one_has_every_skill():
    jobs = {"a": job("a", 60, ["Regular cleaning", "Deep cleaning"])}
    members = {
        "joe": Member("joe", ["Regular cleaning"], [window("Monday")]),
        "amy": Member("amy", ["Deep cleaning"], [window("Monday")]),
    }
    proposals, _ = generate(["a"], MONDAY, [], jobs, members)
    assert sorted(proposals[0].assigneeIds) == ["amy", "joe"]


def test_unplaceable_job_is_reported():
    jobs = {"a": job("a", 60, ["Window cleaning"])}
    proposals, unscheduled = generate(["a", "missing"], MONDAY, [], jobs, MEMBERS)
    assert proposals == []
    assert unscheduled == {"a": "no selected worker has Window cleaning", "missing": "job not found"}


def test_week_start_snaps_to_monday():
    jobs = {"a": job("a", 60, ["Regular cleaning"])}
    proposals, _ = generate(["a"], date(2026, 11, 26), [], jobs, MEMBERS)  # a thursday
    assert proposals[0].start.date() == MONDAY


def test_explains_when_no_one_is_free_long_enough():
    jobs = {"a": job("a", 600, ["Regular cleaning"])}  # 10h but monday is only 9h
    _, unscheduled = generate(["a"], MONDAY, [], jobs, MEMBERS)
    assert unscheduled == {"a": "no one with the skills is free for 10h in a row this week"}


def test_explains_weekly_hours():
    jobs = {"a": job("a", 120, ["Regular cleaning"])}
    members = {"joe": Member("joe", ["Regular cleaning"], [window("Monday")], maxWeeklyHours=1)}
    _, unscheduled = generate(["a"], MONDAY, [], jobs, members)
    assert unscheduled == {"a": "another 2h would put workers over their weekly hours"}


def test_explains_already_booked():
    jobs = {"a": job("a", 120, ["Regular cleaning"])}
    members = {"joe": Member("joe", ["Regular cleaning"], [window("Monday", "08:00", "10:00")])}
    existing = [Appointment("x", ["joe"], datetime(2026, 11, 23, 8), datetime(2026, 11, 23, 9))]
    _, unscheduled = generate(["a"], MONDAY, existing, jobs, members)
    assert unscheduled == {"a": "workers with the skills are already booked when they're free"}
