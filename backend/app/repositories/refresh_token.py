"""Acceso a datos de RefreshToken (rotación y revocación de sesiones)."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken


def add(db: Session, token: RefreshToken) -> RefreshToken:
    db.add(token)
    db.flush()
    return token


def get_by_hash(db: Session, token_hash: str) -> RefreshToken | None:
    return db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    ).scalar_one_or_none()


def revoke(token: RefreshToken) -> None:
    token.revoked_at = datetime.now(timezone.utc)


def revoke_all_for_usuario(db: Session, usuario_id: int) -> None:
    stmt = select(RefreshToken).where(
        RefreshToken.usuario_id == usuario_id, RefreshToken.revoked_at.is_(None)
    )
    for token in db.execute(stmt).scalars():
        revoke(token)
