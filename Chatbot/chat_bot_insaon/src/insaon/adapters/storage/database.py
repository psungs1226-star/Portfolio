from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from insaon.adapters.storage.models import Base


def create_database(url: str = "sqlite+pysqlite:///:memory:") -> Engine:
    engine = create_engine(url)
    Base.metadata.create_all(engine)
    return engine


class SessionFactory:
    def __init__(self, engine: Engine) -> None:
        self._factory = sessionmaker(bind=engine, expire_on_commit=False)

    @contextmanager
    def begin(self) -> Iterator[Session]:
        with self._factory.begin() as session:
            yield session

    @contextmanager
    def read(self) -> Iterator[Session]:
        with self._factory() as session:
            yield session
