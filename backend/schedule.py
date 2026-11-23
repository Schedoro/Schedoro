"""AI Scheduling: proposed appointments for a week

Proposals aren't saved here, the manager reviews them first and the app
saves the accepted ones through the appointments API.
"""

from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from appointments import AppointmentRepository
from auth import CurrentUser
from db import Database
from jobs import JobRepository
from members import MANAGERS, MemberRepository, require_role
from scheduling.ai import ai_enabled, ai_generate
from scheduling.generator import generate
from scheduling.validator import Appointment, Member


class ProposalRequest(BaseModel):
    weekStart: date  # any day works and it adjusts to that week's monday
    jobIds: list[str] | None = None  # leave out to schedule every job on the team
    memberIds: list[str] | None = None  # leave out to use everyone on the team
    notes: str = Field(default="", max_length=1000)  # the manager's business constraints, only gemini reads these


class ProposedAppointment(BaseModel):
    jobId: str
    assigneeIds: list[str]  # memberIds
    start: datetime  # team local time, no offset
    end: datetime
    source: Literal["ai", "basic"]  # gemini, or the basic schedule generator when gemini's pick broke a rule


class UnscheduledJob(BaseModel):
    jobId: str
    reason: str


class ProposalResponse(BaseModel):
    weekStart: date
    proposals: list[ProposedAppointment]
    unscheduled: list[UnscheduledJob]
    notice: str | None = None


router = APIRouter(prefix="/teams/{team_id}/schedule", tags=["schedule"])


@router.post("/proposals", response_model=ProposalResponse)
async def propose_schedule(team_id: str, body: ProposalRequest, user_id: CurrentUser, db: Database):
    await require_role(db, team_id, user_id, *MANAGERS)

    monday = body.weekStart - timedelta(days=body.weekStart.weekday())
    week_start = datetime.combine(monday, time.min)

    jobs = {job.jobId: job for job in await JobRepository(db).list_for_team(team_id)}
    members = {
        m.memberId: Member(m.memberId, m.skills, m.availability, m.maxWeeklyHours)
        for m in await MemberRepository(db).list_for_team(team_id)
        if body.memberIds is None or m.memberId in body.memberIds
    }
    saved = await AppointmentRepository(db).find_by_date_range(team_id, week_start, week_start + timedelta(days=7))
    existing = [Appointment(a.jobId, a.assigneeIds, a.start, a.end, a.status.value) for a in saved]
    job_ids = body.jobIds if body.jobIds is not None else list(jobs)

    # gemini when there's a key in .env, otherwise just the greedy generator
    if ai_enabled():
        result = await ai_generate(job_ids, monday, existing, jobs, members, body.notes)
        picks = [(p, "ai") for p in result.ai] + [(p, "basic") for p in result.basic]
        unscheduled, notice = result.unscheduled, result.notice
    else:
        proposals, unscheduled = generate(job_ids, monday, existing, jobs, members)
        picks, notice = [(p, "basic") for p in proposals], None

    return ProposalResponse(
        weekStart=monday,
        proposals=[
            ProposedAppointment(jobId=p.jobId, assigneeIds=p.assigneeIds, start=p.start, end=p.end, source=source)
            for p, source in sorted(picks, key=lambda pick: pick[0].start)
        ],
        unscheduled=[UnscheduledJob(jobId=job_id, reason=reason) for job_id, reason in unscheduled.items()],
        notice=notice,
    )
