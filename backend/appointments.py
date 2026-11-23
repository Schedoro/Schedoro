"""Manual Scheduling: appointments
 
Layers: AppointmentRouter (API)  ->  IAppointmentService / AppointmentService (app logic)
        ->  AppointmentValidator  ->  AppointmentRepository (infra / MongoDB `appointments` collection)
"""
 
from abc import ABC, abstractmethod
from datetime import date, datetime, time, timedelta, timezone
 
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase
 
from auth import CurrentUser
from db import Database
from models import Appointment, AppointmentIn, AppointmentStatus
 
 
class AppointmentRepository:
    """Reads and writes the `appointments` collection. One document per appointment, tagged with teamId."""
 
    def __init__(self, db: AsyncDatabase):
        self.collection = db["appointments"]
 
    async def insert(self, team_id: str, appointment: AppointmentIn, user_id: str) -> Appointment:
        doc = {
            **appointment.model_dump(),
            "teamId": team_id,
            "status": AppointmentStatus.Scheduled.value,
            "statusUpdatedBy": user_id,
            "statusUpdatedAt": datetime.now(timezone.utc),
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _to_appointment(doc)
 
    async def find_by_assignee_and_time(
        self, team_id: str, assignee_ids: list[str], start: datetime, end: datetime
    ) -> list[Appointment]:
        """Appointments that share a worker and overlap start-end. Cancelled ones don't count."""
        cursor = self.collection.find({
            "teamId": team_id,
            "assigneeIds": {"$in": assignee_ids},
            "status": {"$ne": AppointmentStatus.Cancelled.value},
            "start": {"$lt": end},
            "end": {"$gt": start},
        })
        return [_to_appointment(doc) async for doc in cursor]
 
    async def find_by_date_range(self, team_id: str, start: datetime, end: datetime) -> list[Appointment]:
        cursor = self.collection.find({"teamId": team_id, "start": {"$gte": start, "$lt": end}}).sort("start", 1)
        return [_to_appointment(doc) async for doc in cursor]
 
    async def get(self, team_id: str, appointment_id: str) -> Appointment | None:
        if not ObjectId.is_valid(appointment_id):
            return None
        doc = await self.collection.find_one({"_id": ObjectId(appointment_id), "teamId": team_id})
        return _to_appointment(doc) if doc else None
 
 
def _to_appointment(doc: dict) -> Appointment:
    doc = dict(doc)
    doc["appointmentId"] = str(doc.pop("_id"))
    return Appointment.model_validate(doc)
 
 
class AppointmentValidator:
    """Business rules checked before an appointment is saved."""
 
    def __init__(self, repository: AppointmentRepository):
        self.repository = repository
 
    def validate_time(self, start: datetime, end: datetime) -> bool:
        return start < end
 
    async def check_double_booking(self, team_id: str, assignee_ids: list[str], start: datetime, end: datetime) -> bool:
        """True if none of the workers already has an appointment at that time."""
        clashes = await self.repository.find_by_assignee_and_time(team_id, assignee_ids, start, end)
        return len(clashes) == 0
 
 
class IAppointmentService(ABC):
    """Public interface of the Manual Scheduling subsystem."""
 
    @abstractmethod
    async def create_appointment(self, team_id: str, data: AppointmentIn, user_id: str) -> Appointment: ...
 
    @abstractmethod
    async def get_appointments(self, team_id: str, day: date) -> list[Appointment]: ...
 
    @abstractmethod
    async def get_appointment(self, team_id: str, appointment_id: str) -> Appointment: ...
 
 
class AppointmentService(IAppointmentService):
    def __init__(self, validator: AppointmentValidator, repository: AppointmentRepository):
        self.validator = validator
        self.repository = repository
 
    async def create_appointment(self, team_id: str, data: AppointmentIn, user_id: str) -> Appointment:
        if not self.validator.validate_time(data.start, data.end):
            raise HTTPException(422, detail="End time must be after start time")
        if not await self.validator.check_double_booking(team_id, data.assigneeIds, data.start, data.end):
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Worker already booked at that time")
        return await self.repository.insert(team_id, data, user_id)
 
    async def get_appointments(self, team_id: str, day: date) -> list[Appointment]:
        start = datetime.combine(day, time.min)
        return await self.repository.find_by_date_range(team_id, start, start + timedelta(days=1))
 
    async def get_appointment(self, team_id: str, appointment_id: str) -> Appointment:
        appointment = await self.repository.get(team_id, appointment_id)
        if appointment is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        return appointment
 
 
# TODO: once teams are in MongoDB, check that user_id is a manager/owner of team_id
 
router = APIRouter(prefix="/teams/{team_id}/appointments", tags=["appointments"])
 
 
def get_appointment_service(db: AsyncDatabase) -> IAppointmentService:
    """Wires the layers together (dependency injection)."""
    repository = AppointmentRepository(db)
    return AppointmentService(AppointmentValidator(repository), repository)
 
 
@router.post("", response_model=Appointment, status_code=status.HTTP_201_CREATED)
async def post_appointment(team_id: str, data: AppointmentIn, user_id: CurrentUser, db: Database):
    return await get_appointment_service(db).create_appointment(team_id, data, user_id)
 
 
@router.get("", response_model=list[Appointment])
async def list_appointments(team_id: str, date: date, user_id: CurrentUser, db: Database):
    return await get_appointment_service(db).get_appointments(team_id, date)
 
 
@router.get("/{appointment_id}", response_model=Appointment)
async def get_appointment(team_id: str, appointment_id: str, user_id: CurrentUser, db: Database):
    return await get_appointment_service(db).get_appointment(team_id, appointment_id)
 