"""Paquete de modelos SQLAlchemy — cada TASK de la Fase 1 añade sus imports aquí
para que Alembic (env.py) descubra todas las tablas vía Base.metadata."""
from app.models.carrera import Carrera  # noqa: F401
from app.models.usuario_carrera import usuario_carrera  # noqa: F401
from app.models.plan_curricular import PlanCurricular  # noqa: F401
from app.models.semestre import Semestre  # noqa: F401
from app.models.materia import Materia  # noqa: F401
from app.models.semestre_elemento import SemestreElemento  # noqa: F401
from app.models.usuario import Usuario  # noqa: F401
from app.models.refresh_token import RefreshToken  # noqa: F401
from app.models.auditoria import Auditoria  # noqa: F401
