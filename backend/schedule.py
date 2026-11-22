"""AI Scheduling: proposed appointments for a week

Proposals aren't saved here, the manager reviews them first.
"""

from datetime import date, datetime

from fastapi import APIRouter
from pydantic import BaseModel

from auth import CurrentUser
from db import Database
from jobs import JobRepository
from models import AvailabilityWindow
from scheduling.generator import generate
from scheduling.validator import Appointment, Member


class MemberIn(BaseModel):
    userId: str
    skills: list[str] = []
    availability: list[AvailabilityWindow] = []
    maxWeeklyHours: float | None = None


class AppointmentIn(BaseModel):
    jobId: str
    assigneeIds: list[str]
    start: datetime  # team local time, no offset
    end: datetime
    status: str = "Scheduled"


class ProposalRequest(BaseModel):
    weekStart: date
    jobIds: list[str] | None = None  # leave out to schedule every job on the team
    # TODO: load these from MongoDB once teams and appointments are stored there
    members: list[MemberIn]
    existingAppointments: list[AppointmentIn] = []


class ProposalResponse(BaseModel):
    proposals: list[AppointmentIn]
    unscheduledJobIds: list[str]


router = APIRouter(prefix="/teams/{team_id}/schedule", tags=["schedule"])


@router.post("/proposals", response_model=ProposalResponse)
async def propose_schedule(team_id: str, body: ProposalRequest, user_id: CurrentUser, db: Database):
    jobs = {job.jobId: job for job in await JobRepository(db).list_for_team(team_id)}
    members = {
        m.userId: Member(m.userId, m.skills, m.availability, m.maxWeeklyHours)
        for m in body.members
    }
    existing = [Appointment(**a.model_dump()) for a in body.existingAppointments]
    job_ids = body.jobIds if body.jobIds is not None else list(jobs)

    proposals, unscheduled = generate(job_ids, body.weekStart, existing, jobs, members)
    return ProposalResponse(
        proposals=[AppointmentIn(**vars(p)) for p in proposals],
        unscheduledJobIds=unscheduled,
    )
