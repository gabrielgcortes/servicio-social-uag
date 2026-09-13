"""Fixtures compartidos. Requiere una base PostgreSQL de pruebas (variable de
entorno TEST_DATABASE_URL) con las migraciones ya aplicadas
(`alembic upgrade head` apuntando a esa base). Estos tests NO se ejecutaron
como parte de la implementación (restricción del proyecto); el usuario debe
correr `pytest` con la base de pruebas levantada.

Cada test corre dentro de una transacción externa que siempre se revierte:
se usa join_transaction_mode="create_savepoint" (SQLAlchemy 2.0) para que un
session.commit() hecho por el código bajo prueba no termine esa transacción
externa, sino que abra/cierre un SAVEPOINT."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import get_db
from app.main import app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://mapa_user:change_me@localhost:5432/mapa_curricular_test",
)


@pytest.fixture(scope="session")
def engine():
    return create_engine(TEST_DATABASE_URL)


@pytest.fixture()
def db_session(engine):
    connection = engine.connect()
    outer_transaction = connection.begin()
    session_factory = sessionmaker(bind=connection, join_transaction_mode="create_savepoint")
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        outer_transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
