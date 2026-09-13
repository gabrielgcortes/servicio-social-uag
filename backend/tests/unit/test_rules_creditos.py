"""Unit tests del motor de reglas de créditos, sin tocar la base de datos:
los objetos ORM se construyen en memoria y `creditos` se asigna a mano
(en la DB real esa columna es GENERATED, aquí solo se simula su valor)."""
from decimal import Decimal

from app.models.carrera import Carrera
from app.models.enums import TipoElemento, TipoMateria
from app.models.materia import Materia
from app.models.semestre import Semestre
from app.models.semestre_elemento import SemestreElemento
from app.rules.base import RuleContext, Severity
from app.rules.creditos import MaxCreditosSemestreRule


def _materia(id_, horas_docente, horas_independientes, creditos):
    m = Materia(
        id=id_,
        carrera_id=1,
        clave=f"M{id_}",
        nombre=f"Materia {id_}",
        horas_docente=horas_docente,
        horas_independientes=horas_independientes,
        tipo=TipoMateria.OBLIGATORIA,
    )
    m.creditos = Decimal(creditos)
    return m


def test_max_creditos_semestre_detecta_exceso():
    carrera = Carrera(id=1, clave="LSW", nombre="Ing. Software", max_creditos_semestre=50)
    semestre = Semestre(id=1, carrera_id=1, numero=1)
    # 6 materias de 9 créditos = 54 > 50
    materias = {i: _materia(i, 64, 80, "9.00") for i in range(1, 7)}
    elementos = [
        SemestreElemento(id=i, semestre_id=1, tipo=TipoElemento.MATERIA, materia_id=i, orden=i)
        for i in range(1, 7)
    ]

    ctx = RuleContext(
        carrera=carrera,
        semestres=[semestre],
        elementos_por_semestre={1: elementos},
        materias_por_id=materias,
    )

    violaciones = MaxCreditosSemestreRule().evaluate(ctx)
    assert len(violaciones) == 1
    assert violaciones[0].severity == Severity.ERROR
    assert violaciones[0].context["total"] == 54.0
    assert violaciones[0].context["maximo"] == 50


def test_max_creditos_semestre_no_excede():
    carrera = Carrera(id=1, clave="LSW", nombre="Ing. Software", max_creditos_semestre=50)
    semestre = Semestre(id=1, carrera_id=1, numero=1)
    materia = _materia(1, 48, 48, "6.00")
    elementos = [
        SemestreElemento(id=1, semestre_id=1, tipo=TipoElemento.MATERIA, materia_id=1, orden=0)
    ]
    ctx = RuleContext(
        carrera=carrera,
        semestres=[semestre],
        elementos_por_semestre={1: elementos},
        materias_por_id={1: materia},
    )
    assert MaxCreditosSemestreRule().evaluate(ctx) == []
