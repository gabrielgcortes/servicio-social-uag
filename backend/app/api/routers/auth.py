"""Endpoints de autenticación: login, refresh (con rotación), logout, me,
cambio de contraseña. El refresh token viaja en cookie httpOnly, nunca en el
cuerpo de la respuesta ni accesible desde JavaScript."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.auth.deps import get_current_principal
from app.auth.principal import Principal
from app.core.config import get_settings
from app.core.exceptions import TooManyRequestsError, UnauthorizedError
from app.core.rate_limit import registrar_intento_y_verificar
from app.db.session import get_db
from app.repositories import usuario as usuario_repo
from app.schemas.auth import ChangePasswordRequest, LoginRequest, TokenResponse
from app.schemas.usuario import UsuarioRead
from app.services import auth as auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()

_COOKIE_NAME = "refresh_token"
_COOKIE_PATH = "/api/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=True,  # localhost cuenta como "contexto seguro" en navegadores modernos
        samesite="lax",
        path=_COOKIE_PATH,
        max_age=settings.refresh_token_days * 24 * 3600,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest, response: Response, db: Session = Depends(get_db)
) -> TokenResponse:
    if not registrar_intento_y_verificar(payload.email.lower()):
        raise TooManyRequestsError(
            "Demasiados intentos de inicio de sesión; intenta de nuevo en un minuto"
        )
    access_token, refresh_token, _user = auth_service.login(db, payload.email, payload.password)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: Request, response: Response, db: Session = Depends(get_db)
) -> TokenResponse:
    refresh_token = request.cookies.get(_COOKIE_NAME)
    if not refresh_token:
        raise UnauthorizedError("Falta el refresh token")
    access_token, new_refresh_token = auth_service.refresh(db, refresh_token)
    _set_refresh_cookie(response, new_refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=204, response_model=None)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> None:
    refresh_token = request.cookies.get(_COOKIE_NAME)
    if refresh_token:
        auth_service.logout(db, refresh_token)
    response.delete_cookie(_COOKIE_NAME, path=_COOKIE_PATH)


@router.get("/me", response_model=UsuarioRead)
def me(
    principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)
) -> UsuarioRead:
    user = usuario_repo.get_by_id(db, principal.usuario_id)
    if user is None:
        raise UnauthorizedError("Usuario no encontrado")
    return UsuarioRead.model_validate(user)


@router.post("/change-password", status_code=204, response_model=None)
def change_password(
    payload: ChangePasswordRequest,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> None:
    user = usuario_repo.get_by_id(db, principal.usuario_id)
    if user is None:
        raise UnauthorizedError("Usuario no encontrado")
    auth_service.change_password(db, user, payload.password_actual, payload.password_nueva)
