import pytest
from pydantic import ValidationError

from app.models.enums import Decanato, ModalidadPrograma, NivelAcademico
from app.models.plan_curricular import PlanCurricular
from app.schemas.materia import MateriaCreate
from app.models.enums import TipoMateria
from app.services.configuracion_reglas import valores_predeterminados


def test_defaults_licenciatura_no_escolarizada():
    plan = PlanCurricular(max_creditos_semestre=50, nivel_academico=NivelAcademico.LICENCIATURA, modalidad=ModalidadPrograma.NO_ESCOLARIZADA, decanato=Decanato.OTRO)
    valores = valores_predeterminados(plan)
    assert valores["ciclos_esperados"] == 8
    assert valores["duracion_ciclo_semanas"] == 16
    assert valores["max_materias_ciclo"] == 5
    assert valores["optativa_min_horas_docente"] == 64
    assert valores["prohibir_seriacion"] is True


def test_defaults_maestria():
    plan = PlanCurricular(max_creditos_semestre=50, nivel_academico=NivelAcademico.MAESTRIA, modalidad=ModalidadPrograma.MIXTA, decanato=Decanato.OTRO)
    valores = valores_predeterminados(plan)
    assert valores["ciclos_esperados"] == 6
    assert valores["duracion_ciclo_semanas"] == 14
    assert valores["materias_por_ciclo"] == 2
    assert (valores["horas_docente_estandar"], valores["horas_independientes_estandar"], valores["creditos_estandar"]) == (14, 130, 9)


def test_nombre_de_asignatura_rechaza_title_case():
    with pytest.raises(ValidationError):
        MateriaCreate(clave="LAF001", nombre="Proyecto De Innovación Tecnológica", horas_docente=32, horas_independientes=64, tipo=TipoMateria.OBLIGATORIA)

