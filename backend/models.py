from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, field_validator, model_validator

HHMM = r"^([01]\d|2[0-3]):[0-5]\d$"  # 24-hour "HH:MM"

class DayOfWeek(str, Enum):
    Sunday = "Sunday"
    Monday = "Monday"
    Tuesday = "Tuesday"
    Wednesday = "Wednesday"
    Thursday = "Thursday"
    Friday = "Friday"
    Saturday = "Saturday"


class Location(BaseModel):
    address: str = Field(min_length=1)
    latitude: float | None = None  # to be filled in later by Google Maps
    longitude: float | None = None
    placeId: str | None = None


class AvailabilityWindow(BaseModel):
    dayOfWeek: DayOfWeek
    startTime: str = Field(pattern=HHMM)
    endTime: str = Field(pattern=HHMM)

    @model_validator(mode="after")
    def start_before_end(self) -> "AvailabilityWindow":
        if self.startTime >= self.endTime:  # "HH:MM" strings compare correctly
            raise ValueError("startTime must be before endTime")
        return self


class JobIn(BaseModel):
    """What the app sends to create or update a job."""

    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)
    location: Location | None = None
    estimatedDurationMinutes: int = Field(gt=0, le=24 * 60)
    requiredSkills: list[str] = []
    availability: list[AvailabilityWindow] = []


class Job(JobIn):
    """What the API returns."""

    jobId: str
    teamId: str


class Role(str, Enum):
    owner = "owner"
    manager = "manager"
    worker = "worker"


class MemberIn(BaseModel):
    """What the app sends to add or update a team member."""

    fullName: str = Field(default="", max_length=100)  # empty until they join and set their name
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=254)
    role: Role = Role.worker
    location: Location | None = None
    skills: list[str] = []
    availability: list[AvailabilityWindow] = []
    maxWeeklyHours: float | None = Field(default=None, gt=0, le=7 * 24)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower() if isinstance(value, str) else value


class Member(MemberIn):
    """What the API returns."""

    memberId: str
    teamId: str
    userId: str | None = None  # Clerk user ID, set once they accept the invite


class TeamIn(BaseModel):
    """What the app sends to create or rename a team."""

    name: str = Field(min_length=1, max_length=80)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class Team(TeamIn):
    """What the API returns."""

    teamId: str
    myRole: Role  # the signed-in user's role on this team


# ---------- Manual Scheduling: appointments ----------
class AppointmentStatus(str, Enum):
    Pending = "Pending"
    Scheduled = "Scheduled"
    InProgress = "In-Progress"
    Completed = "Completed"
    Cancelled = "Cancelled"


class AppointmentIn(BaseModel):
    """What the app sends to create an appointment. Times are the team's local time."""

    jobId: str = Field(min_length=1)
    assigneeIds: list[str] = Field(min_length=1)
    start: datetime
    end: datetime
    notes: str = Field(default="", max_length=1000)


class Appointment(AppointmentIn):
    """What the API returns."""

    appointmentId: str
    teamId: str
    status: AppointmentStatus = AppointmentStatus.Scheduled