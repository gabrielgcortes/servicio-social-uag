"""Unit tests de las reglas de seriación, sin tocar la base de datos."""
from app.models.carrera import Carrera
from app.models.enums import TipoMateria
from app.models.materia import Materia
from app.models.plan_curricular import PlanCurricular
from app.rules.base import RuleContext
from app.rules.seriacion import SeriacionCicloRule, SeriacionMismoPlanRule


def _materia(id_, seriacion_id=None):
    return Materia(
        id=id_,
        plan_curricular_id=1,
        clave=f"M{id_}",
        nombre=f"Materia {id_}",
        horas_docente=48,
        horas_independientes=48,
        tipo=TipoMateria.OPTATIVA,
        seriacion_materia_id=seriacion_id,
    )


def _ctx(materias_por_id):
    return RuleContext(
        carrera=Carrera(id=1, clave="LSW", nombre="X"),
        plan=PlanCurricular(id=1, carrera_id=1, clave="LSW-2025", max_creditos_semestre=50),
        semestres=[],
        elementos_por_semestre={},
        materias_por_id=materias_por_id,
    )


def test_detecta_ciclo_de_seriacion():
    a = _materia(1, seriacion_id=2)
    b = _materia(2, seriacion_id=1)
    ctx = _ctx({1: a, 2: b})
    violaciones = SeriacionCicloRule().evaluate(ctx)
    assert len(violaciones) == 2  # ambas materias participan del ciclo


def test_seriacion_sin_prerequisito_en_la_carrera():
    a = _materia(1, seriacion_id=999)
    ctx = _ctx({1: a})
    violaciones = SeriacionMismoPlanRule().evaluate(ctx)
    assert len(violaciones) == 1


def test_seriacion_valida_no_genera_violaciones():
    a = _materia(1)
    b = _materia(2, seriacion_id=1)
    ctx = _ctx({1: a, 2: b})
    assert SeriacionCicloRule().evaluate(ctx) == []
    assert SeriacionMismoPlanRule().evaluate(ctx) == []
