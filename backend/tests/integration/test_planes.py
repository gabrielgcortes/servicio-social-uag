"""Integración de versionado, invariantes entre planes y clonado."""
import pytest

from app.core.exceptions import BusinessRuleError
from app.models.carrera import Carrera
from app.models.enums import EstadoPlanCurricular, TipoElemento, TipoMateria
from app.models.materia import Materia
from app.models.plan_curricular import PlanCurricular
from app.models.semestre import Semestre
from app.models.semestre_elemento import SemestreElemento
from app.schemas.elemento import ElementoMateriaCreate
from app.schemas.materia import MateriaCreate, MateriaUpdate
from app.schemas.plan_curricular import PlanDuplicarRequest
from app.services import elemento as elemento_service
from app.services import materia as materia_service
from app.services import plan_curricular as plan_service


def _carrera_y_planes(db_session):
    carrera = Carrera(clave="VER", nombre="Carrera versionada")
    db_session.add(carrera)
    db_session.flush()
    historico = PlanCurricular(
        carrera_id=carrera.id,
        clave="VER-2023",
        estado=EstadoPlanCurricular.HISTORICO,
        max_creditos_semestre=50,
    )
    vigente = PlanCurricular(
        carrera_id=carrera.id,
        clave="VER-2025",
        estado=EstadoPlanCurricular.VIGENTE,
        max_creditos_semestre=55,
    )
    db_session.add_all([historico, vigente])
    db_session.flush()
    return carrera, historico, vigente


def test_una_carrera_puede_tener_varios_planes_independientes(db_session):
    carrera, historico, vigente = _carrera_y_planes(db_session)
    db_session.commit()
    assert {p.clave for p in plan_service.list_planes(db_session, carrera.id)} == {
        historico.clave,
        vigente.clave,
    }


def test_seriacion_no_puede_cruzar_planes(db_session):
    _, historico, vigente = _carrera_y_planes(db_session)
    prerequisito = Materia(
        plan_curricular_id=historico.id,
        clave="VER001",
        nombre="Materia histórica",
        horas_docente=48,
        horas_independientes=48,
        tipo=TipoMateria.OBLIGATORIA,
    )
    db_session.add(prerequisito)
    db_session.commit()

    payload = MateriaCreate(
        clave="VER002",
        nombre="Materia nueva",
        horas_docente=48,
        horas_independientes=48,
        tipo=TipoMateria.OBLIGATORIA,
        seriacion_materia_id=prerequisito.id,
    )
    with pytest.raises(BusinessRuleError, match="mismo plan"):
        materia_service.create_materia(db_session, vigente.id, payload)


def test_elemento_no_puede_usar_materia_de_otro_plan(db_session):
    _, historico, vigente = _carrera_y_planes(db_session)
    semestre = Semestre(plan_curricular_id=vigente.id, numero=1)
    materia = Materia(
        plan_curricular_id=historico.id,
        clave="VER003",
        nombre="Materia histórica",
        horas_docente=48,
        horas_independientes=48,
        tipo=TipoMateria.OBLIGATORIA,
    )
    db_session.add_all([semestre, materia])
    db_session.commit()

    with pytest.raises(BusinessRuleError, match="mismo plan"):
        elemento_service.crear_elemento_materia(
            db_session, semestre.id, ElementoMateriaCreate(materia_id=materia.id)
        )


def test_clonar_plan_copia_ids_y_reconstruye_referencias(db_session):
    _, _, origen = _carrera_y_planes(db_session)
    semestre = Semestre(plan_curricular_id=origen.id, numero=1)
    db_session.add(semestre)
    db_session.flush()
    prerequisito = Materia(
        plan_curricular_id=origen.id,
        clave="VER010",
        nombre="Prerrequisito",
        horas_docente=48,
        horas_independientes=48,
        tipo=TipoMateria.OBLIGATORIA,
    )
    db_session.add(prerequisito)
    db_session.flush()
    materia = Materia(
        plan_curricular_id=origen.id,
        clave="VER011",
        nombre="Materia seriada",
        horas_docente=48,
        horas_independientes=48,
        tipo=TipoMateria.OBLIGATORIA,
        seriacion_materia_id=prerequisito.id,
    )
    db_session.add(materia)
    db_session.flush()
    db_session.add_all(
        [
            SemestreElemento(
                semestre_id=semestre.id,
                tipo=TipoElemento.MATERIA,
                materia_id=materia.id,
                orden=0,
            ),
            SemestreElemento(
                semestre_id=semestre.id,
                tipo=TipoElemento.ESPACIO_OPTATIVO,
                nombre="Optativa profesional",
                horas_docente=32,
                horas_independientes=64,
                orden=1,
            ),
        ]
    )
    db_session.commit()

    clon = plan_service.duplicar_plan(
        db_session,
        origen.id,
        PlanDuplicarRequest(clave="VER-2027", anio_inicio=2027),
    )
    db_session.refresh(clon)
    clon_materias = {m.clave: m for m in clon.materias}
    clon_semestre = clon.semestres[0]

    assert clon.id != origen.id
    assert {m.clave for m in clon.materias} == {"VER010", "VER011"}
    assert clon_materias["VER010"].id != prerequisito.id
    assert clon_materias["VER011"].id != materia.id
    assert clon_materias["VER011"].seriacion_materia_id == clon_materias["VER010"].id
    assert clon_semestre.id != semestre.id
    assert clon_semestre.elementos[0].materia_id == clon_materias["VER011"].id
    assert clon_semestre.elementos[1].materia_id is None

    materia_service.update_materia(
        db_session,
        clon_materias["VER011"].id,
        MateriaUpdate(nombre="Materia modificada solo en 2027"),
    )
    db_session.refresh(materia)
    assert materia.nombre == "Materia seriada"
