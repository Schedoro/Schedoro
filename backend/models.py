from enum import Enum
from pydantic import BaseModel, Field, model_validator

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
