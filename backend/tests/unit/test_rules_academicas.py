from decimal import Decimal

from app.models.autorizacion_excepcion import AutorizacionExcepcion
from app.models.carrera import Carrera
from app.models.configuracion_reglas import ConfiguracionReglasPlan
from app.models.enums import (
    AreaFormacion, Decanato, ModalidadPrograma, NivelAcademico, TipoElemento,
    TipoExcepcion, TipoMateria,
)
from app.models.materia import Materia
from app.models.plan_curricular import PlanCurricular
from app.models.semestre import Semestre
from app.models.semestre_elemento import SemestreElemento
from app.rules.academicas import (
    HorasFrecuenciaRule, MaxMateriasCicloRule, OptativasMinimosRule,
    PracticasCapstoneRule,
)
from app.rules.base import RuleContext, Severity
from app.rules.seriacion import SecuenciasDocumentalesRule, SeriacionPermitidaRule


def _plan(nivel=NivelAcademico.LICENCIATURA, modalidad=ModalidadPrograma.ESCOLARIZADA):
    return PlanCurricular(id=1, carrera_id=1, clave="LAF-2026", mnemonico="LAF", nivel_academico=nivel, modalidad=modalidad, decanato=Decanato.OTRO, max_creditos_semestre=50)


def _config(**cambios):
    valores = dict(
        id=1, plan_curricular_id=1, version=1, vigente=True,
        duracion_ciclo_semanas=16, ciclos_esperados=8, max_creditos_ciclo=50,
        max_materias_ciclo=7, min_creditos_plan=300, max_creditos_plan=400,
        min_horas_plan=4800, multiplo_horas=16, materias_por_ciclo=None,
        prohibir_seriacion=False, optativa_min_horas_docente=32,
        optativa_min_horas_independientes=64, practicas_min_periodos=2,
        practicas_max_periodos=5, practicas_min_horas=320, practicas_max_horas=1280,
        practicas_min_creditos=20, practicas_max_creditos=80,
        capstone_min=2, capstone_max=2, reglas_adicionales={},
    )
    valores.update(cambios)
    return ConfiguracionReglasPlan(**valores)


def _materia(id_, *, nombre=None, tipo=TipoMateria.OBLIGATORIA, hd=32, hi=64, **kwargs):
    m = Materia(id=id_, plan_curricular_id=1, clave=f"LAF{id_:03d}", nombre=nombre or f"Materia {id_}", horas_docente=hd, horas_independientes=hi, tipo=tipo, area_formacion=AreaFormacion.DISCIPLINAR, **kwargs)
    m.creditos = Decimal(hd + hi) / Decimal(16)
    return m


def _ctx(materias, elementos=None, semestres=None, config=None, autorizaciones=None):
    semestres = semestres or []
    return RuleContext(
        carrera=Carrera(id=1, clave="LAF", nombre="Administración financiera"),
        plan=_plan(), semestres=semestres,
        elementos_por_semestre=elementos or {}, materias_por_id={m.id: m for m in materias},
        configuracion=config or _config(), autorizaciones=autorizaciones or [],
    )


def test_maximo_de_siete_materias_en_licenciatura():
    semestre = Semestre(id=1, plan_curricular_id=1, numero=1)
    materias = [_materia(i) for i in range(1, 9)]
    elementos = [SemestreElemento(id=i, semestre_id=1, tipo=TipoElemento.MATERIA, materia_id=i, orden=i) for i in range(1, 9)]
    violations = MaxMateriasCicloRule().evaluate(_ctx(materias, {1: elementos}, [semestre]))
    assert violations[0].code == "MAX_MATERIAS_CICLO"
    assert violations[0].severity == Severity.ERROR


def test_horas_docente_deben_respetar_frecuencia_del_nivel():
    violations = HorasFrecuenciaRule().evaluate(_ctx([_materia(1, hd=30)]))
    assert [v.code for v in violations] == ["HORAS_FRECUENCIA"]


def test_optativa_bajo_minimo_requiere_autorizacion_explicita():
    optativa = _materia(1, tipo=TipoMateria.OPTATIVA, hd=16, hi=32)
    ctx = _ctx([optativa])
    assert any(v.code == "OPTATIVA_HORAS_MINIMAS" for v in OptativasMinimosRule().evaluate(ctx))
    autorizacion = AutorizacionExcepcion(id=1, plan_curricular_id=1, materia_id=1, tipo=TipoExcepcion.OPTATIVA_HORAS_MINIMAS, motivo="Excepción aprobada", responsable="Consejo académico")
    ctx.autorizaciones = [autorizacion]
    assert not any(v.code == "OPTATIVA_HORAS_MINIMAS" for v in OptativasMinimosRule().evaluate(ctx))


def test_capstone_en_primera_mitad_es_error():
    semestre = Semestre(id=1, plan_curricular_id=1, numero=3)
    materia = _materia(1, es_capstone=True)
    elemento = SemestreElemento(id=1, semestre_id=1, tipo=TipoElemento.MATERIA, materia_id=1, orden=0)
    violations = PracticasCapstoneRule().evaluate(_ctx([materia], {1: [elemento]}, [semestre]))
    assert any(v.code == "CAPSTONE_UBICACION" and v.severity == Severity.ERROR for v in violations)


def test_plan_flexible_puede_prohibir_seriacion():
    a = _materia(1)
    b = _materia(2, seriacion_materia_id=1, usa_numeracion_romana=True)
    ctx = _ctx([a, b], config=_config(prohibir_seriacion=True))
    assert SeriacionPermitidaRule().evaluate(ctx)[0].code == "SERIACION_PROHIBIDA"


def test_lengua_extranjera_ii_debe_requerir_i():
    otra = _materia(1, nombre="Introducción profesional")
    segunda = _materia(2, nombre="Lengua extranjera II", seriacion_materia_id=1, usa_numeracion_romana=True)
    assert SecuenciasDocumentalesRule().evaluate(_ctx([otra, segunda]))[0].code == "SECUENCIA_DOCUMENTAL"

