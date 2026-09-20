"""Datos iniciales para desarrollo: usuario admin + una carrera de ejemplo con
semestres, materias obligatorias, optativas (con seriación) y un espacio optativo.
Idempotente: puede ejecutarse varias veces sin duplicar registros.
Invocar con: python -m scripts.seed  (dentro del contenedor backend)
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.carrera import Carrera
from app.models.enums import AreaFormacion, EstadoPlanCurricular, ModalidadPrograma, RolUsuario, TipoAula, TipoElemento, TipoMateria
from app.models.materia import Materia
from app.models.plan_curricular import PlanCurricular
from app.models.semestre import Semestre
from app.models.semestre_elemento import SemestreElemento
from app.models.usuario import Usuario
from app.services import configuracion_reglas as config_service

settings = get_settings()


def run() -> None:
    db = SessionLocal()
    try:
        _seed_admin(db)
        _seed_carrera_lsw(db)
        db.commit()
        print("Seed completado.")
    finally:
        db.close()


def _seed_admin(db: Session) -> None:
    existente = db.query(Usuario).filter_by(email=settings.seed_admin_email).one_or_none()
    if existente:
        return
    db.add(
        Usuario(
            nombre="Administrador",
            email=settings.seed_admin_email,
            password_hash=hash_password(settings.seed_admin_password),
            rol=RolUsuario.ADMIN,
            activo=True,
        )
    )


def _seed_carrera_lsw(db: Session) -> None:
    if db.query(Carrera).filter_by(clave="LSW").one_or_none():
        return

    carrera = Carrera(clave="LSW", nombre="Ingeniería de Software")
    db.add(carrera)
    db.flush()

    plan = PlanCurricular(
        carrera_id=carrera.id,
        clave="LSW-2025",
        descripcion="Plan curricular de ejemplo",
        anio_inicio=2025,
        estado=EstadoPlanCurricular.VIGENTE,
        max_creditos_semestre=50,
        mnemonico="LSW",
        decanato_otro="Tecnologías de información",
    )
    db.add(plan)
    db.flush()
    config_service.crear_inicial(db, plan)

    semestres = {n: Semestre(plan_curricular_id=plan.id, numero=n) for n in range(1, 9)}
    db.add_all(semestres.values())
    db.flush()

    # Catálogo de optativas — incluye la seriación LSW058 -> LSW059 del enunciado.
    redes_iii = Materia(
        plan_curricular_id=plan.id,
        clave="LSW058",
        nombre="Redes III",
        horas_docente=48,
        horas_independientes=64,
        tipo=TipoMateria.OPTATIVA,
        area_formacion=AreaFormacion.PROFESIONAL,
        tipo_aula=TipoAula.LABORATORIO,
        modalidad=ModalidadPrograma.ESCOLARIZADA,
        ciclos_disponibles=[7],
        usa_numeracion_romana=True,
    )
    db.add(redes_iii)
    db.flush()

    db.add_all(
        [
            Materia(
                plan_curricular_id=plan.id,
                clave="LSW059",
                nombre="Redes IV",
                horas_docente=48,
                horas_independientes=64,
                tipo=TipoMateria.OPTATIVA,
                seriacion_materia_id=redes_iii.id,
                area_formacion=AreaFormacion.PROFESIONAL,
                tipo_aula=TipoAula.LABORATORIO,
                modalidad=ModalidadPrograma.ESCOLARIZADA,
                ciclos_disponibles=[7],
                usa_numeracion_romana=True,
            ),
            Materia(
                plan_curricular_id=plan.id,
                clave="LSW054",
                nombre="Aprendizaje máquina",
                horas_docente=48,
                horas_independientes=64,
                tipo=TipoMateria.OPTATIVA,
                area_formacion=AreaFormacion.PROFESIONAL,
                tipo_aula=TipoAula.LABORATORIO,
                modalidad=ModalidadPrograma.ESCOLARIZADA,
                ciclos_disponibles=[7],
            ),
        ]
    )

    # Materias obligatorias distribuidas en los primeros semestres del mapa.
    obligatorias = [
        (1, "LSW001", "Fundamentos de Programación", 48, 48),
        (1, "LSW002", "Matemáticas Discretas", 64, 32),
        (2, "LSW003", "Estructuras de Datos", 48, 64),
        (2, "LSW004", "Bases de Datos I", 48, 48),
        (3, "LSW005", "Ingeniería de Software I", 32, 64),
        (3, "LSW006", "Redes I", 48, 48),
    ]
    orden_por_semestre: dict[int, int] = {}
    for numero, clave, nombre, horas_docente, horas_independientes in obligatorias:
        materia = Materia(
            plan_curricular_id=plan.id,
            clave=clave,
            nombre=nombre,
            horas_docente=horas_docente,
            horas_independientes=horas_independientes,
            tipo=TipoMateria.OBLIGATORIA,
            area_formacion=AreaFormacion.DISCIPLINAR,
            tipo_aula=TipoAula.AULA,
            modalidad=ModalidadPrograma.ESCOLARIZADA,
        )
        db.add(materia)
        db.flush()
        orden = orden_por_semestre.get(numero, 0)
        db.add(
            SemestreElemento(
                semestre_id=semestres[numero].id,
                tipo=TipoElemento.MATERIA,
                materia_id=materia.id,
                orden=orden,
            )
        )
        orden_por_semestre[numero] = orden + 1

    # Espacio optativo de ejemplo (sin materia concreta) en el semestre 7.
    db.add(
        SemestreElemento(
            semestre_id=semestres[7].id,
            tipo=TipoElemento.ESPACIO_OPTATIVO,
            nombre="Optativa de formación profesional 1",
            horas_docente=32,
            horas_independientes=64,
            orden=0,
        )
    )


if __name__ == "__main__":
    run()
