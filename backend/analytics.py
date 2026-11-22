"""Scheduling Analytics: worker utilization

Layers: AnalyticsRouter (API)  ->  IAnalyticsService / AnalyticsService (app logic)
        ->  UtilizationCalculator  +  AppointmentRepository / TeamMemberRepository (infra / MongoDB)
"""

from abc import ABC, abstractmethod
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pymongo.asynchronous.database import AsyncDatabase

from appointments import AppointmentRepository
from auth import CurrentUser
from db import Database
from models import Appointment, AppointmentStatus

DEFAULT_MAX_WEEKLY_HOURS = 40  # used when a team member has no maxWeeklyHours set yet


class UtilizationMetric(BaseModel):
    teamMemberId: str
    name: str
    scheduledHours: float
    maxWeeklyHours: float
    utilizationPercent: float


class TeamMemberRepository:
    """Reads the `team_members` collection (fields from the Domain Model: teamId, userId, name, maxWeeklyHours)."""

    def __init__(self, db: AsyncDatabase):
        self.collection = db["team_members"]

    async def find_by_team(self, team_id: str) -> list[dict]:
        return [doc async for doc in self.collection.find({"teamId": team_id})]


class UtilizationCalculator:
    """Scheduled hours vs. available hours for each team member."""

    def calculate(self, appointments: list[Appointment], team_members: list[dict], days: int) -> list[UtilizationMetric]:
        hours: dict[str, float] = {}
        for appt in appointments:
            if appt.status == AppointmentStatus.Cancelled:
                continue
            length = (appt.end - appt.start).total_seconds() / 3600
            for member_id in appt.assigneeIds:
                hours[member_id] = hours.get(member_id, 0) + length

        # everyone on the team, plus anyone booked who isn't in team_members yet
        members = {m["userId"]: m for m in team_members}
        for member_id in hours:
            members.setdefault(member_id, {"userId": member_id})

        metrics = []
        for member_id, member in members.items():
            max_weekly = member.get("maxWeeklyHours") or DEFAULT_MAX_WEEKLY_HOURS
            available = max_weekly * days / 7
            scheduled = hours.get(member_id, 0)
            metrics.append(UtilizationMetric(
                teamMemberId=member_id,
                name=member.get("name", member_id),
                scheduledHours=round(scheduled, 2),
                maxWeeklyHours=max_weekly,
                utilizationPercent=round(scheduled / available * 100, 1),
            ))
        return sorted(metrics, key=lambda m: m.utilizationPercent, reverse=True)


class IAnalyticsService(ABC):
    """Public interface of the Scheduling Analytics subsystem."""

    @abstractmethod
    async def get_worker_utilization(self, team_id: str, start: date, end: date) -> list[UtilizationMetric]: ...


class AnalyticsService(IAnalyticsService):
    def __init__(
        self,
        appointments: AppointmentRepository,
        team_members: TeamMemberRepository,
        calculator: UtilizationCalculator,
    ):
        self.appointments = appointments
        self.team_members = team_members
        self.calculator = calculator

    async def get_worker_utilization(self, team_id: str, start: date, end: date) -> list[UtilizationMetric]:
        """start and end are both included, e.g. Monday to Sunday."""
        if end < start:
            raise HTTPException(422, detail="end must be on or after start")
        range_start = datetime.combine(start, time.min)
        range_end = datetime.combine(end + timedelta(days=1), time.min)
        appointments = await self.appointments.find_by_date_range(team_id, range_start, range_end)
        team_members = await self.team_members.find_by_team(team_id)
        return self.calculator.calculate(appointments, team_members, (end - start).days + 1)


router = APIRouter(prefix="/teams/{team_id}/analytics", tags=["analytics"])


def get_analytics_service(db: AsyncDatabase) -> IAnalyticsService:
    """Wires the layers together (dependency injection)."""
    return AnalyticsService(AppointmentRepository(db), TeamMemberRepository(db), UtilizationCalculator())


@router.get("/utilization", response_model=list[UtilizationMetric])
async def get_utilization(
    team_id: str, user_id: CurrentUser, db: Database, start: date | None = None, end: date | None = None
):
    """Defaults to the current week (Monday to Sunday)."""
    if start is None:
        today = date.today()
        start = today - timedelta(days=today.weekday())
    if end is None:
        end = start + timedelta(days=6)
    return await get_analytics_service(db).get_worker_utilization(team_id, start, end)
