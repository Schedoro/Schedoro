"""Work Management: job templates

Layers: router (API)  ->  JobService (app logic)  ->  JobRepository (infra / MongoDB)
"""

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase

from auth import CurrentUser
from db import Database
from models import Job, JobIn

class JobRepository:
    """Reads and writes the `jobs` collection. One document per job tagged with teamId."""

    def __init__(self, db: AsyncDatabase):
        self.collection = db["jobs"]

    async def list_for_team(self, team_id: str) -> list[Job]:
        cursor = self.collection.find({"teamId": team_id}).sort("_id", -1)
        return [_to_job(doc) async for doc in cursor]

    async def get(self, team_id: str, job_id: str) -> Job | None:
        oid = _object_id(job_id)
        if oid is None:
            return None
        doc = await self.collection.find_one({"_id": oid, "teamId": team_id})
        return _to_job(doc) if doc else None

    async def insert(self, team_id: str, job: JobIn) -> Job:
        doc = {**job.model_dump(mode="json"), "teamId": team_id}
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _to_job(doc)

    async def update(self, team_id: str, job_id: str, job: JobIn) -> Job | None:
        oid = _object_id(job_id)
        if oid is None:
            return None
        doc = await self.collection.find_one_and_update(
            {"_id": oid, "teamId": team_id},
            {"$set": job.model_dump(mode="json")},
            return_document=ReturnDocument.AFTER,
        )
        return _to_job(doc) if doc else None

    async def delete(self, team_id: str, job_id: str) -> bool:
        oid = _object_id(job_id)
        if oid is None:
            return False
        result = await self.collection.delete_one({"_id": oid, "teamId": team_id})
        return result.deleted_count == 1


def _object_id(value: str) -> ObjectId | None:
    return ObjectId(value) if ObjectId.is_valid(value) else None


def _to_job(doc: dict) -> Job:
    doc = dict(doc)
    doc["jobId"] = str(doc.pop("_id"))
    return Job.model_validate(doc)


class JobService:
    def __init__(self, repository: JobRepository):
        self.repository = repository

    async def list_jobs(self, team_id: str) -> list[Job]:
        return await self.repository.list_for_team(team_id)

    async def get_job(self, team_id: str, job_id: str) -> Job:
        return _found(await self.repository.get(team_id, job_id))

    async def create_job(self, team_id: str, job: JobIn) -> Job:
        return await self.repository.insert(team_id, job)

    async def update_job(self, team_id: str, job_id: str, job: JobIn) -> Job:
        return _found(await self.repository.update(team_id, job_id, job))

    async def delete_job(self, team_id: str, job_id: str) -> None:
        if not await self.repository.delete(team_id, job_id):
            _found(None)


def _found(job: Job | None) -> Job:
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


# TODO: once teams implemented in MongoDB, check that user_id is a manager/owner of team_id

router = APIRouter(prefix="/teams/{team_id}/jobs", tags=["jobs"])


def _service(db: AsyncDatabase) -> JobService:
    return JobService(JobRepository(db))


@router.get("", response_model=list[Job])
async def list_jobs(team_id: str, user_id: CurrentUser, db: Database):
    return await _service(db).list_jobs(team_id)


@router.post("", response_model=Job, status_code=status.HTTP_201_CREATED)
async def create_job(team_id: str, job: JobIn, user_id: CurrentUser, db: Database):
    return await _service(db).create_job(team_id, job)


@router.get("/{job_id}", response_model=Job)
async def get_job(team_id: str, job_id: str, user_id: CurrentUser, db: Database):
    return await _service(db).get_job(team_id, job_id)


@router.put("/{job_id}", response_model=Job)
async def update_job(team_id: str, job_id: str, job: JobIn, user_id: CurrentUser, db: Database):
    return await _service(db).update_job(team_id, job_id, job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(team_id: str, job_id: str, user_id: CurrentUser, db: Database):
    await _service(db).delete_job(team_id, job_id)
