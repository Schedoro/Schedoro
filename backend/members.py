"""Team management: team members (owners, managers, workers)

Layers: router (API)  ->  MemberService (app logic)  ->  MemberRepository (infra / MongoDB)

Adding a member saves them with userId = None and has Clerk email them an invite. When someone signs in,
any member records matching one of their verified emails get their Clerk userId (see link_account).
Roles are ours, not Clerk's: the invite email doesn't know about them, the member record does.
"""

import logging
from typing import NoReturn

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from auth import CurrentUser, revoke_invite, send_invite
from db import Database
from models import Member, MemberIn, Role

MANAGERS = (Role.owner, Role.manager)

logger = logging.getLogger("uvicorn.error")


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

    async def count_owners(self, team_id: str) -> int:
        return await self.collection.count_documents({"teamId": team_id, "role": Role.owner.value})

    async def insert(self, team_id: str, member: MemberIn, user_id: str | None = None) -> Member:
        doc = {**member.model_dump(mode="json"), "teamId": team_id, "userId": user_id}
        try:
            result = await self.collection.insert_one(doc)
        except DuplicateKeyError:  # unique index on (teamId, email), see main.py
            raise EmailTaken
        doc["_id"] = result.inserted_id
        return _to_member(doc)

    async def set_invitation(self, member_id: str, invitation_id: str) -> None:
        await self.collection.find_one_and_update({"_id": ObjectId(member_id)}, {"$set": {"invitationId": invitation_id}})

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

    async def delete(self, team_id: str, member_id: str) -> dict | None:
        """Returns the deleted document so its pending invite can be revoked."""
        oid = _object_id(member_id)
        if oid is None:
            return None
        return await self.collection.find_one_and_delete({"_id": oid, "teamId": team_id})

    async def link_account(self, user_id: str, emails: list[str], name: str) -> int:
        """Gives every not-yet-joined member with one of these emails the user's Clerk ID. Returns how many."""
        if not emails:
            return 0
        result = await self.collection.update_many(
            {"userId": None, "email": {"$in": emails}},
            {"$set": {"userId": user_id}, "$unset": {"invitationId": ""}},
        )
        if name:  # the manager may not have typed a name, use the one from their account
            await self.collection.update_many({"userId": user_id, "fullName": ""}, {"$set": {"fullName": name}})
        if not result.modified_count:
            # helps tell "invited a different address" apart from "already linked to another account"
            matches = [(doc["teamId"], doc.get("userId")) async for doc in self.collection.find({"email": {"$in": emails}}, {"teamId": 1, "userId": 1})]
            logger.info("no new links for %s, member records with those emails (teamId, userId): %s", user_id, matches)
        return result.modified_count


def _object_id(value: str) -> ObjectId | None:
    return ObjectId(value) if ObjectId.is_valid(value) else None


def _to_member(doc: dict) -> Member:
    doc = dict(doc)
    doc["memberId"] = str(doc.pop("_id"))
    return Member.model_validate(doc)


async def require_role(db: AsyncDatabase, team_id: str, user_id: str, *allowed: Role) -> Role:
    """The caller's role on the team. 404 if they aren't on it, 403 if their role isn't in `allowed`."""
    role = await MemberRepository(db).role_of(team_id, user_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    if allowed and role not in allowed:
        _forbidden("Only owners and managers can make changes here.")
    return role


class MemberService:
    def __init__(self, repository: MemberRepository):
        self.repository = repository

    async def list_members(self, team_id: str) -> list[Member]:
        return await self.repository.list_for_team(team_id)

    async def get_member(self, team_id: str, member_id: str) -> Member:
        return _found(await self.repository.get(team_id, member_id))

    async def add_member(self, team_id: str, member: MemberIn, caller: Role) -> Member:
        if member.role == Role.owner and caller != Role.owner:
            _forbidden("Only the owner can add another owner.")
        try:
            added = await self.repository.insert(team_id, member)
        except EmailTaken:
            _email_taken()
        try:
            invitation_id = await send_invite(added.email)
        except HTTPException:
            await self.repository.delete(team_id, added.memberId)  # no email went out, so don't keep a half-invited member
            raise
        await self.repository.set_invitation(added.memberId, invitation_id)
        return added

    async def update_member(self, team_id: str, member_id: str, member: MemberIn, caller: Role) -> Member:
        current = _found(await self.repository.get(team_id, member_id))
        if caller != Role.owner and Role.owner in (current.role, member.role):
            _forbidden("Only the owner can change owners.")
        if member.email != current.email:
            _bad_request("The email can’t be changed. Remove them and invite the new email instead.")
        if current.role == Role.owner and member.role != Role.owner:
            await self._keep_an_owner(team_id)
        try:
            return _found(await self.repository.update(team_id, member_id, member))
        except EmailTaken:
            _email_taken()

    async def remove_member(self, team_id: str, member_id: str, caller: Role) -> None:
        current = _found(await self.repository.get(team_id, member_id))
        if current.role == Role.owner:
            if caller != Role.owner:
                _forbidden("Only the owner can remove an owner.")
            await self._keep_an_owner(team_id)
        doc = _found(await self.repository.delete(team_id, member_id))
        if doc.get("invitationId") and not doc.get("userId"):
            await revoke_invite(doc["invitationId"])

    async def _keep_an_owner(self, team_id: str) -> None:
        if await self.repository.count_owners(team_id) <= 1:
            _bad_request("A team needs at least one owner. Make someone else the owner first.")


def _found(value):
    if value is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return value


def _email_taken() -> NoReturn:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Someone with this email is already on the team.")


def _forbidden(message: str) -> NoReturn:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)


def _bad_request(message: str) -> NoReturn:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)


router = APIRouter(prefix="/teams/{team_id}/members", tags=["members"])


def _service(db: AsyncDatabase) -> MemberService:
    return MemberService(MemberRepository(db))


@router.get("", response_model=list[Member])
async def list_members(team_id: str, user_id: CurrentUser, db: Database):
    await require_role(db, team_id, user_id)
    return await _service(db).list_members(team_id)


@router.post("", response_model=Member, status_code=status.HTTP_201_CREATED)
async def add_member(team_id: str, member: MemberIn, user_id: CurrentUser, db: Database):
    caller = await require_role(db, team_id, user_id, *MANAGERS)
    return await _service(db).add_member(team_id, member, caller)


@router.get("/{member_id}", response_model=Member)
async def get_member(team_id: str, member_id: str, user_id: CurrentUser, db: Database):
    await require_role(db, team_id, user_id)
    return await _service(db).get_member(team_id, member_id)


@router.put("/{member_id}", response_model=Member)
async def update_member(team_id: str, member_id: str, member: MemberIn, user_id: CurrentUser, db: Database):
    caller = await require_role(db, team_id, user_id, *MANAGERS)
    return await _service(db).update_member(team_id, member_id, member, caller)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(team_id: str, member_id: str, user_id: CurrentUser, db: Database):
    caller = await require_role(db, team_id, user_id, *MANAGERS)
    await _service(db).remove_member(team_id, member_id, caller)
