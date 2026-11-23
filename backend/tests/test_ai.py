# run from backend/: python -m pytest
# gemini is faked here, so these don't need an API key

import asyncio
from datetime import date

from models import AvailabilityWindow, Job
from scheduling.ai import Suggestion, ai_generate, build_prompt
from scheduling.validator import Member, validate

MONDAY = date(2026, 11, 23)


def window(day: str, start: str = "08:00", end: str = "17:00") -> AvailabilityWindow:
    return AvailabilityWindow(dayOfWeek=day, startTime=start, endTime=end)


JOBS = {
    "a": Job(jobId="a", teamId="t1", name="House", estimatedDurationMinutes=120, requiredSkills=["Regular cleaning"]),
    "b": Job(jobId="b", teamId="t1", name="Office", estimatedDurationMinutes=60, requiredSkills=["Regular cleaning"]),
}
MEMBERS = {
    "joe": Member("joe", ["Regular cleaning"], [window("Monday")]),
    "amy": Member("amy", ["Regular cleaning"], [window("Tuesday")]),
}


def fake(*suggestions):
    async def ask(prompt: str):
        return list(suggestions)
    return ask


def run(ask, job_ids=("a", "b")):
    return asyncio.run(ai_generate(list(job_ids), MONDAY, [], JOBS, MEMBERS, "", ask=ask))


def test_keeps_valid_ai_picks():
    result = run(fake(
        Suggestion(jobId="a", assigneeIds=["amy"], start="2026-11-24T09:00:00", end="2026-11-24T11:00:00"),
        Suggestion(jobId="b", assigneeIds=["joe"], start="2026-11-23T13:00:00", end="2026-11-23T14:00:00"),
    ))
    assert [(a.jobId, a.assigneeIds) for a in result.ai] == [("a", ["amy"]), ("b", ["joe"])]
    assert result.basic == [] and result.unscheduled == {} and result.notice is None


def test_invalid_ai_pick_falls_back_to_basic_scheduler():
    # joe isn't free on sunday
    result = run(fake(Suggestion(jobId="a", assigneeIds=["joe"], start="2026-11-29T09:00:00", end="2026-11-29T11:00:00")))
    assert result.ai == []
    assert sorted(a.jobId for a in result.basic) == ["a", "b"]
    assert validate(result.basic, [], JOBS, MEMBERS) == []


def test_fixes_wrong_end_time():
    result = run(fake(Suggestion(jobId="b", assigneeIds=["joe"], start="2026-11-23T09:00:00", end="2026-11-23T15:00:00")), ["b"])
    assert result.ai[0].end.hour == 10  # 1h job


def test_ignores_duplicates_and_unknown_jobs():
    result = run(fake(
        Suggestion(jobId="b", assigneeIds=["joe"], start="2026-11-23T09:00:00", end="2026-11-23T10:00:00"),
        Suggestion(jobId="b", assigneeIds=["amy"], start="2026-11-24T09:00:00", end="2026-11-24T10:00:00"),
        Suggestion(jobId="zzz", assigneeIds=["amy"], start="2026-11-24T12:00:00", end="2026-11-24T13:00:00"),
    ), ["b"])
    assert [(a.jobId, a.assigneeIds) for a in result.ai] == [("b", ["joe"])]


def test_gemini_failure_uses_basic_scheduler():
    async def broken(prompt: str):
        raise RuntimeError("quota")
    result = run(broken)
    assert result.ai == [] and len(result.basic) == 2
    assert result.notice is not None


def test_prompt_has_the_data_and_notes():
    prompt = build_prompt(["a"], MONDAY, [], JOBS, MEMBERS, "Joe prefers mornings")
    assert "Joe prefers mornings" in prompt and '"jobId": "a"' in prompt and "Monday 2026-11-23" in prompt
