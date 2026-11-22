"""Team management: teams

Layers: router (API)  ->  TeamService (app logic)  ->  TeamRepository (infra / MongoDB)

A team's people live in the `members` collection (see members.py). Whoever creates a team is added
there as its owner with their Clerk userId, and "my teams" is every team with a member that has my userId.
"""

from typing import NoReturn

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase

from auth import CurrentUser, clerk_profile
from db import Database
from members import MemberRepository
from models import MemberIn, Role, Team, TeamIn


class TeamRepository:
    """Reads and writes the `teams` collection. A team document only holds its name for now."""

    def __init__(self, db: AsyncDatabase):
        self.db = db
        self.collection = db["teams"]

    async def names(self, team_ids: list[str]) -> dict[str, str]:
        oids = [oid for oid in map(_object_id, team_ids) if oid]
        cursor = self.collection.find({"_id": {"$in": oids}}).sort("_id", 1)
        return {str(doc["_id"]): doc["name"] async for doc in cursor}

    async def get_name(self, team_id: str) -> str | None:
        oid = _object_id(team_id)
        doc = await self.collection.find_one({"_id": oid}) if oid else None
        return doc["name"] if doc else None

    async def insert(self, team: TeamIn, created_by: str) -> str:
        result = await self.collection.insert_one({**team.model_dump(mode="json"), "createdBy": created_by})
        return str(result.inserted_id)

    async def rename(self, team_id: str, team: TeamIn) -> str | None:
        oid = _object_id(team_id)
        if oid is None:
            return None
        doc = await self.collection.find_one_and_update(
            {"_id": oid}, {"$set": team.model_dump(mode="json")}, return_document=ReturnDocument.AFTER
        )
        return doc["name"] if doc else None

    async def delete(self, team_id: str) -> None:
        # a team's jobs and members go with it
        oid = _object_id(team_id)
        if oid:
            await self.collection.delete_one({"_id": oid})
        await self.db["jobs"].delete_many({"teamId": team_id})
        await self.db["members"].delete_many({"teamId": team_id})


def _object_id(value: str) -> ObjectId | None:
    return ObjectId(value) if ObjectId.is_valid(value) else None


class TeamService:
    def __init__(self, teams: TeamRepository, members: MemberRepository):
        self.teams = teams
        self.members = members

    async def my_teams(self, user_id: str) -> list[Team]:
        roles = await self.members.roles_for_user(user_id)
        names = await self.teams.names(list(roles))
        return [Team(teamId=team_id, name=name, myRole=roles[team_id]) for team_id, name in names.items()]

    async def get_team(self, team_id: str, user_id: str) -> Team:
        role = await self._role(team_id, user_id)
        name = await self.teams.get_name(team_id)
        if name is None:
            _not_found()
        return Team(teamId=team_id, name=name, myRole=role)

    async def create_team(self, team: TeamIn, user_id: str) -> Team:
        full_name, email = await clerk_profile(user_id)
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Add an email address to your account before creating a team.")
        team_id = await self.teams.insert(team, created_by=user_id)
        try:
            owner = MemberIn(fullName=full_name, email=email, role=Role.owner)
            await self.members.insert(team_id, owner, user_id=user_id)
        except Exception:
            await self.teams.delete(team_id)  # don't leave a team nobody can open
            raise
        return Team(teamId=team_id, name=team.name, myRole=Role.owner)

    async def rename_team(self, team_id: str, team: TeamIn, user_id: str) -> Team:
        role = await self._role(team_id, user_id)
        if role not in (Role.owner, Role.manager):
            _forbidden("Only owners and managers can rename the team.")
        name = await self.teams.rename(team_id, team)
        if name is None:
            _not_found()
        return Team(teamId=team_id, name=name, myRole=role)

    async def delete_team(self, team_id: str, user_id: str) -> None:
        if await self._role(team_id, user_id) != Role.owner:
            _forbidden("Only the owner can delete the team.")
        await self.teams.delete(team_id)

    async def _role(self, team_id: str, user_id: str) -> Role:
        # someone who isn't on the team gets a 404, same as a team that doesn't exist
        role = await self.members.role_of(team_id, user_id)
        if role is None:
            _not_found()
        return role


def _not_found() -> NoReturn:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")


def _forbidden(message: str) -> NoReturn:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)


router = APIRouter(prefix="/teams", tags=["teams"])


def _service(db: AsyncDatabase) -> TeamService:
    return TeamService(TeamRepository(db), MemberRepository(db))


@router.get("", response_model=list[Team])
async def list_my_teams(user_id: CurrentUser, db: Database):
    return await _service(db).my_teams(user_id)


@router.post("", response_model=Team, status_code=status.HTTP_201_CREATED)
async def create_team(team: TeamIn, user_id: CurrentUser, db: Database):
    return await _service(db).create_team(team, user_id)


@router.get("/{team_id}", response_model=Team)
async def get_team(team_id: str, user_id: CurrentUser, db: Database):
    return await _service(db).get_team(team_id, user_id)


@router.put("/{team_id}", response_model=Team)
async def rename_team(team_id: str, team: TeamIn, user_id: CurrentUser, db: Database):
    return await _service(db).rename_team(team_id, team, user_id)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(team_id: str, user_id: CurrentUser, db: Database):
    await _service(db).delete_team(team_id, user_id)
