"""MongoDB Atlas connection.

Reads MONGODB_URI and optionally MONGODB_DB from the environment.
Routes get the database with `db: Database` (see alias at bottom).
"""

import os
from typing import Annotated

from fastapi import Depends
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

client: AsyncMongoClient = AsyncMongoClient(os.environ["MONGODB_URI"])
db: AsyncDatabase = client[os.environ.get("MONGODB_DB", "schedoro")]


def get_db() -> AsyncDatabase:
    return db


Database = Annotated[AsyncDatabase, Depends(get_db)]
