"""Tests de integración: columna generada de créditos y rollback transaccional
del motor de reglas al superar el máximo de créditos por semestre."""
from decimal import Decimal

from app.core.exceptions import BusinessRuleError
from app.models.carrera import Carrera
from app.models.enums import TipoMateria
from app.models.materia import Materia
from app.models.plan_curricular import PlanCurricular
from app.models.semestre import Semestre
from app.models.semestre_elemento import SemestreElemento
from app.schemas.elemento import ElementoMateriaCreate
from app.services import elemento as elemento_service


def test_columna_generada_de_creditos(db_session):
    carrera = Carrera(clave="FFF", nombre="Carrera F")
    db_session.add(carrera)
    db_session.flush()
    plan = PlanCurricular(carrera_id=carrera.id, clave="FFF-2025", max_creditos_semestre=50)
    db_session.add(plan)
    db_session.flush()
    materia = Materia(
        plan_curricular_id=plan.id,
        clave="F001",
        nombre="Materia F",
        horas_docente=48,
        horas_independientes=64,
        tipo=TipoMateria.OBLIGATORIA,
    )
    db_session.add(materia)
    db_session.commit()
    db_session.refresh(materia)
    assert materia.creditos == Decimal("7.00")


def test_max_creditos_semestre_hace_rollback(db_session):
    carrera = Carrera(clave="GGG", nombre="Carrera G")
    db_session.add(carrera)
    db_session.flush()
    plan = PlanCurricular(carrera_id=carrera.id, clave="GGG-2025", max_creditos_semestre=10)
    db_session.add(plan)
    db_session.flush()
    semestre = Semestre(plan_curricular_id=plan.id, numero=1)
    db_session.add(semestre)
    db_session.flush()

    materia1 = Materia(
        plan_curricular_id=plan.id,
        clave="G001",
        nombre="Materia G1",
        horas_docente=64,
        horas_independientes=80,  # 9 créditos
        tipo=TipoMateria.OBLIGATORIA,
    )
    materia2 = Materia(
        plan_curricular_id=plan.id,
        clave="G002",
        nombre="Materia G2",
        horas_docente=64,
        horas_independientes=80,  # 9 créditos más -> 18 > 10
        tipo=TipoMateria.OBLIGATORIA,
    )
    db_session.add_all([materia1, materia2])
    db_session.commit()

    elemento_service.crear_elemento_materia(
        db_session, semestre.id, ElementoMateriaCreate(materia_id=materia1.id)
    )

    try:
        elemento_service.crear_elemento_materia(
            db_session, semestre.id, ElementoMateriaCreate(materia_id=materia2.id)
        )
        raise AssertionError("Se esperaba BusinessRuleError por exceso de créditos")
    except BusinessRuleError:
        pass

    elementos = (
        db_session.query(SemestreElemento).filter_by(semestre_id=semestre.id).all()
    )
    assert len(elementos) == 1  # el segundo elemento no debe haberse persistido
