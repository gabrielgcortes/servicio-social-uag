"""Entrypoint de la aplicación FastAPI (monolito modular)."""
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from app.api.routers.auditoria import router as auditoria_router
from app.api.routers.auth import router as auth_router
from app.api.routers.carreras import router as carreras_router
from app.api.routers.elementos import router as elementos_router
from app.api.routers.export import router as export_router
from app.api.routers.materias import router as materias_router
from app.api.routers.planes import router as planes_router
from app.api.routers.semestres import router as semestres_router
from app.api.routers.usuarios import router as usuarios_router
from app.core.config import get_settings
from app.core.exceptions import AppError, BusinessRuleError
from app.core.logging import configure_logging

configure_logging()
settings = get_settings()

app = FastAPI(title="Mapa Curricular API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def agregar_cabeceras_de_seguridad(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    return response


app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(carreras_router)
app.include_router(planes_router)
app.include_router(semestres_router)
app.include_router(materias_router)
app.include_router(elementos_router)
app.include_router(export_router)
app.include_router(auditoria_router)


@app.get("/api/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.exception_handler(AppError)
def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    body: dict[str, object] = {"detail": exc.detail, "code": exc.code}
    if isinstance(exc, BusinessRuleError):
        body["violations"] = exc.violations
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(RequestValidationError)
def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Datos de entrada inválidos",
            "code": "VALIDATION_ERROR",
            "violations": jsonable_encoder(exc.errors()),
        },
    )


@app.exception_handler(IntegrityError)
def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={"detail": "Conflicto de integridad de datos", "code": "INTEGRITY_ERROR"},
    )
