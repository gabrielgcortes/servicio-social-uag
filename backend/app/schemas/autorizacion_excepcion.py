from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TipoExcepcion


class AutorizacionExcepcionCreate(BaseModel):
    materia_id: int | None = None
    tipo: TipoExcepcion
    motivo: str = Field(min_length=10)
    responsable: str = Field(min_length=2, max_length=200)


class AutorizacionExcepcionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_curricular_id: int
    materia_id: int | None
    tipo: TipoExcepcion
    motivo: str
    responsable: str
    autorizada_en: datetime
    activa: bool
