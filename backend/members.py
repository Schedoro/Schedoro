"""Team management: team members (owners, managers, workers)

Layers: router (API)  ->  MemberService (app logic)  ->  MemberRepository (infra / MongoDB)
"""

from typing import NoReturn

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from auth import CurrentUser
from db import Database
from models import Member, MemberIn, Role


class EmailTaken(Exception):
    pass


class MemberRepository:
    """Reads and writes the `members` collection. One document per member tagged with teamId."""

    def __init__(self, db: AsyncDatabase):
        self.collection = db["members"]

    async def list_for_team(self, team_id: str) -> list[Member]:
        cursor = self.collection.find({"teamId": team_id}).sort("_id", 1)  # in the order they were added
        return [_to_member(doc) async for doc in cursor]

    async def get(self, team_id: str, member_id: str) -> Member | None:
        oid = _object_id(member_id)
        if oid is None:
            return None
        doc = await self.collection.find_one({"_id": oid, "teamId": team_id})
        return _to_member(doc) if doc else None

    async def role_of(self, team_id: str, user_id: str) -> Role | None:
        doc = await self.collection.find_one({"teamId": team_id, "userId": user_id}, {"role": 1})
        return Role(doc["role"]) if doc else None

    async def roles_for_user(self, user_id: str) -> dict[str, Role]:
        """teamId -> role for every team this Clerk user is on."""
        cursor = self.collection.find({"userId": user_id}, {"teamId": 1, "role": 1})
        return {doc["teamId"]: Role(doc["role"]) async for doc in cursor}

    async def insert(self, team_id: str, member: MemberIn, user_id: str | None = None) -> Member:
        doc = {**member.model_dump(mode="json"), "teamId": team_id, "userId": user_id}
        try:
            result = await self.collection.insert_one(doc)
        except DuplicateKeyError:  # unique index on (teamId, email), see main.py
            raise EmailTaken
        doc["_id"] = result.inserted_id
        return _to_member(doc)

    async def update(self, team_id: str, member_id: str, member: MemberIn) -> Member | None:
        oid = _object_id(member_id)
        if oid is None:
            return None
        try:
            doc = await self.collection.find_one_and_update(
                {"_id": oid, "teamId": team_id},
                {"$set": member.model_dump(mode="json")},  # userId isn't in MemberIn so it stays as is
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            raise EmailTaken
        return _to_member(doc) if doc else None

    async def delete(self, team_id: str, member_id: str) -> bool:
        oid = _object_id(member_id)
        if oid is None:
            return False
        result = await self.collection.delete_one({"_id": oid, "teamId": team_id})
        return result.deleted_count == 1


def _object_id(value: str) -> ObjectId | None:
    return ObjectId(value) if ObjectId.is_valid(value) else None


def _to_member(doc: dict) -> Member:
    doc = dict(doc)
    doc["memberId"] = str(doc.pop("_id"))
    return Member.model_validate(doc)


class MemberService:
    def __init__(self, repository: MemberRepository):
        self.repository = repository

    async def list_members(self, team_id: str) -> list[Member]:
        return await self.repository.list_for_team(team_id)

    async def get_member(self, team_id: str, member_id: str) -> Member:
        return _found(await self.repository.get(team_id, member_id))

    async def add_member(self, team_id: str, member: MemberIn) -> Member:
        try:
            return await self.repository.insert(team_id, member)
        except EmailTaken:
            _email_taken()

    async def update_member(self, team_id: str, member_id: str, member: MemberIn) -> Member:
        try:
            return _found(await self.repository.update(team_id, member_id, member))
        except EmailTaken:
            _email_taken()

    async def remove_member(self, team_id: str, member_id: str) -> None:
        if not await self.repository.delete(team_id, member_id):
            _found(None)


def _found(member: Member | None) -> Member:
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return member


def _email_taken() -> NoReturn:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Someone with this email is already on the team.")


# TODO: once teams implemented in MongoDB, check that user_id is a manager/owner of team_id
# TODO: send the invite email and fill in userId when they accept

router = APIRouter(prefix="/teams/{team_id}/members", tags=["members"])


def _service(db: AsyncDatabase) -> MemberService:
    return MemberService(MemberRepository(db))


@router.get("", response_model=list[Member])
async def list_members(team_id: str, user_id: CurrentUser, db: Database):
    return await _service(db).list_members(team_id)


@router.post("", response_model=Member, status_code=status.HTTP_201_CREATED)
async def add_member(team_id: str, member: MemberIn, user_id: CurrentUser, db: Database):
    return await _service(db).add_member(team_id, member)


@router.get("/{member_id}", response_model=Member)
async def get_member(team_id: str, member_id: str, user_id: CurrentUser, db: Database):
    return await _service(db).get_member(team_id, member_id)


@router.put("/{member_id}", response_model=Member)
async def update_member(team_id: str, member_id: str, member: MemberIn, user_id: CurrentUser, db: Database):
    return await _service(db).update_member(team_id, member_id, member)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(team_id: str, member_id: str, user_id: CurrentUser, db: Database):
    await _service(db).remove_member(team_id, member_id)
