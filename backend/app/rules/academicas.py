"""Reglas configurables de estructura, horas, optativas y contenidos académicos."""
from __future__ import annotations

import re
import unicodedata

from app.models.enums import AreaFormacion, NivelAcademico, TipoElemento, TipoExcepcion, TipoMateria
from app.rules.base import RuleContext, RuleScope, RuleViolation, Severity


def _normalizar(texto: str) -> str:
    texto = "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", texto.strip().lower())


def _ubicaciones(ctx: RuleContext) -> dict[int, int]:
    numeros = {s.id: s.numero for s in ctx.semestres}
    return {
        e.materia_id: numeros[semestre_id]
        for semestre_id, elementos in ctx.elementos_por_semestre.items()
        for e in elementos
        if e.tipo == TipoElemento.MATERIA and e.materia_id is not None
    }


def _totales(ctx: RuleContext) -> tuple[float, int]:
    creditos = 0.0
    horas = 0
    for elementos in ctx.elementos_por_semestre.values():
        for elemento in elementos:
            if elemento.tipo == TipoElemento.MATERIA:
                materia = ctx.materias_por_id.get(elemento.materia_id)
                if materia:
                    creditos += float(materia.creditos or 0)
                    horas += materia.horas_docente + materia.horas_independientes
            else:
                creditos += float(elemento.creditos or 0)
                horas += (elemento.horas_docente or 0) + (elemento.horas_independientes or 0)
    return creditos, horas


class LimitesPlanRule:
    code = "LIMITES_PLAN"
    scope = RuleScope.CARRERA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        cfg = ctx.configuracion
        if cfg is None:
            return []
        violations: list[RuleViolation] = []
        ciclo_autorizado = any(a.tipo == TipoExcepcion.NUMERO_CICLOS for a in ctx.autorizaciones)
        if len(ctx.semestres) != cfg.ciclos_esperados and not ciclo_autorizado:
            violations.append(RuleViolation(
                code="CICLOS_ESPERADOS", severity=Severity.WARNING,
                message=f"El plan tiene {len(ctx.semestres)} ciclos y la configuración espera {cfg.ciclos_esperados}",
                context={"actual": len(ctx.semestres), "esperado": cfg.ciclos_esperados},
            ))
        creditos, horas = _totales(ctx)
        if cfg.min_creditos_plan is not None and creditos < float(cfg.min_creditos_plan):
            violations.append(RuleViolation("MIN_CREDITOS_PLAN", Severity.WARNING, "El plan no alcanza los créditos mínimos", {"actual": creditos, "minimo": float(cfg.min_creditos_plan)}))
        if cfg.max_creditos_plan is not None and creditos > float(cfg.max_creditos_plan):
            violations.append(RuleViolation("MAX_CREDITOS_PLAN", Severity.ERROR, "El plan excede los créditos máximos", {"actual": creditos, "maximo": float(cfg.max_creditos_plan)}))
        if cfg.min_horas_plan is not None and horas < cfg.min_horas_plan:
            violations.append(RuleViolation("MIN_HORAS_PLAN", Severity.WARNING, "El plan no alcanza las horas mínimas", {"actual": horas, "minimo": cfg.min_horas_plan}))
        return violations


class MaxMateriasCicloRule:
    code = "MAX_MATERIAS_CICLO"
    scope = RuleScope.SEMESTRE

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        cfg = ctx.configuracion
        if cfg is None:
            return []
        violations: list[RuleViolation] = []
        for semestre in ctx.semestres:
            cantidad = len(ctx.elementos_por_semestre.get(semestre.id, []))
            if cfg.max_materias_ciclo is not None and cantidad > cfg.max_materias_ciclo:
                violations.append(RuleViolation(self.code, Severity.ERROR, f"El ciclo {semestre.numero} supera el máximo de asignaturas", {"semestre": semestre.numero, "actual": cantidad, "maximo": cfg.max_materias_ciclo}))
            if cfg.materias_por_ciclo is not None and cantidad != cfg.materias_por_ciclo:
                violations.append(RuleViolation("MATERIAS_POR_CICLO", Severity.WARNING, f"El ciclo {semestre.numero} debe contener {cfg.materias_por_ciclo} asignaturas", {"semestre": semestre.numero, "actual": cantidad, "esperado": cfg.materias_por_ciclo}))
        return violations


class HorasFrecuenciaRule:
    code = "HORAS_FRECUENCIA"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        multiplo = ctx.configuracion.multiplo_horas if ctx.configuracion else None
        if not multiplo:
            return []
        return [RuleViolation(self.code, Severity.ERROR, f"Las horas docente de {m.clave} deben ser múltiplo de {multiplo}", {"materia_id": m.id, "multiplo": multiplo}) for m in ctx.materias_por_id.values() if m.horas_docente % multiplo != 0]


class AreaFormacionRule:
    code = "AREA_FORMACION"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        licenciatura = {AreaFormacion.UNIVERSITARIA, AreaFormacion.BASICA, AreaFormacion.DISCIPLINAR, AreaFormacion.PROFESIONAL}
        posgrado = {AreaFormacion.FUNDAMENTAL, AreaFormacion.DISCIPLINAR, AreaFormacion.TERMINAL_INVESTIGACION}
        permitidas = licenciatura if ctx.plan.nivel_academico == NivelAcademico.LICENCIATURA else posgrado
        result = []
        for m in ctx.materias_por_id.values():
            if m.area_formacion is None:
                result.append(RuleViolation(self.code, Severity.WARNING, f"La materia {m.clave} no tiene área de formación", {"materia_id": m.id}))
            elif m.area_formacion not in permitidas:
                result.append(RuleViolation(self.code, Severity.ERROR, f"El área de {m.clave} no corresponde al nivel académico", {"materia_id": m.id, "area": m.area_formacion.value}))
        return result


class OptativasMinimosRule:
    code = "OPTATIVA_HORAS_MINIMAS"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        cfg = ctx.configuracion
        if cfg is None or cfg.optativa_min_horas_docente is None:
            return []
        autorizadas = {a.materia_id for a in ctx.autorizaciones if a.tipo == TipoExcepcion.OPTATIVA_HORAS_MINIMAS and a.materia_id is not None}
        ciclos_con_espacio = {
            semestre.numero
            for semestre in ctx.semestres
            if any(e.tipo == TipoElemento.ESPACIO_OPTATIVO for e in ctx.elementos_por_semestre.get(semestre.id, []))
        }
        result = []
        for m in ctx.materias_por_id.values():
            if m.tipo != TipoMateria.OPTATIVA:
                continue
            if not m.ciclos_disponibles:
                result.append(RuleViolation("OPTATIVA_SIN_CICLOS", Severity.WARNING, f"La optativa {m.clave} no indica ciclos disponibles", {"materia_id": m.id}))
            elif not set(m.ciclos_disponibles).issubset(ciclos_con_espacio):
                result.append(RuleViolation("OPTATIVA_CICLO_SIN_ESPACIO", Severity.WARNING, f"La optativa {m.clave} referencia ciclos sin espacio optativo", {"materia_id": m.id, "ciclos": m.ciclos_disponibles}))
            if m.id not in autorizadas and (m.horas_docente < cfg.optativa_min_horas_docente or m.horas_independientes < (cfg.optativa_min_horas_independientes or 0)):
                result.append(RuleViolation(self.code, Severity.ERROR, f"La optativa {m.clave} no cumple las horas mínimas y no tiene autorización", {"materia_id": m.id, "min_horas_docente": cfg.optativa_min_horas_docente, "min_horas_independientes": cfg.optativa_min_horas_independientes}))
        return result


class EspaciosOptativosMinimosRule:
    code = "ESPACIO_OPTATIVO_HORAS_MINIMAS"
    scope = RuleScope.SEMESTRE

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        cfg = ctx.configuracion
        if cfg is None or cfg.optativa_min_horas_docente is None:
            return []
        result = []
        for elementos in ctx.elementos_por_semestre.values():
            for e in elementos:
                if e.tipo == TipoElemento.ESPACIO_OPTATIVO and (
                    (e.horas_docente or 0) < cfg.optativa_min_horas_docente
                    or (e.horas_independientes or 0) < (cfg.optativa_min_horas_independientes or 0)
                ):
                    result.append(RuleViolation(self.code, Severity.ERROR, "El espacio optativo no cumple las horas mínimas configuradas", {"elemento_id": e.id, "min_horas_docente": cfg.optativa_min_horas_docente, "min_horas_independientes": cfg.optativa_min_horas_independientes}))
        return result


class PracticasCapstoneRule:
    code = "PRACTICAS_CAPSTONE"
    scope = RuleScope.CARRERA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        cfg = ctx.configuracion
        if cfg is None:
            return []
        ubicaciones = _ubicaciones(ctx)
        practicas = [m for m in ctx.materias_por_id.values() if m.es_practica_profesional and m.id in ubicaciones]
        capstones = [m for m in ctx.materias_por_id.values() if m.es_capstone and m.id in ubicaciones]
        result = []
        p_horas = sum(m.horas_docente + m.horas_independientes for m in practicas)
        p_creditos = sum(float(m.creditos or 0) for m in practicas)
        if len(practicas) < cfg.practicas_min_periodos or p_horas < cfg.practicas_min_horas or p_creditos < float(cfg.practicas_min_creditos):
            result.append(RuleViolation("PRACTICAS_MINIMOS", Severity.WARNING, "Las prácticas profesionales no alcanzan los mínimos configurados", {"periodos": len(practicas), "horas": p_horas, "creditos": p_creditos}))
        if len(practicas) > cfg.practicas_max_periodos or p_horas > cfg.practicas_max_horas or p_creditos > float(cfg.practicas_max_creditos):
            result.append(RuleViolation("PRACTICAS_MAXIMOS", Severity.ERROR, "Las prácticas profesionales exceden los máximos configurados", {"periodos": len(practicas), "horas": p_horas, "creditos": p_creditos}))
        if len(capstones) < cfg.capstone_min:
            result.append(RuleViolation("CAPSTONE_MINIMO", Severity.WARNING, "Faltan asignaturas capstone", {"actual": len(capstones), "minimo": cfg.capstone_min}))
        if len(capstones) > cfg.capstone_max:
            result.append(RuleViolation("CAPSTONE_MAXIMO", Severity.ERROR, "Hay más asignaturas capstone de las autorizadas", {"actual": len(capstones), "maximo": cfg.capstone_max}))
        mitad = (cfg.ciclos_esperados // 2) + 1
        for materia in capstones:
            if ubicaciones[materia.id] < mitad:
                result.append(RuleViolation("CAPSTONE_UBICACION", Severity.ERROR, f"{materia.clave} debe ubicarse a partir de la segunda mitad del plan", {"materia_id": materia.id, "ciclo_minimo": mitad}))
        return result


class MateriasRequeridasRule:
    code = "MATERIAS_REQUERIDAS"
    scope = RuleScope.CARRERA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        if ctx.configuracion is None:
            return []
        requisitos = ctx.configuracion.reglas_adicionales.get("materias_requeridas", [])
        por_nombre = {_normalizar(m.nombre): m for m in ctx.materias_por_id.values()}
        ubicaciones = _ubicaciones(ctx)
        result = []
        for requisito in requisitos:
            materia = por_nombre.get(_normalizar(requisito["nombre"]))
            if materia is None:
                result.append(RuleViolation(self.code, Severity.WARNING, f"Falta la asignatura requerida: {requisito['nombre']}", {"nombre": requisito["nombre"], "ciclo": requisito["ciclo"]}))
            elif ubicaciones.get(materia.id) != requisito["ciclo"]:
                result.append(RuleViolation("ORDEN_PREESTABLECIDO", Severity.ERROR, f"{materia.nombre} debe cursarse en el ciclo {requisito['ciclo']}", {"materia_id": materia.id, "ciclo": requisito["ciclo"]}))
        nucleos = ctx.configuracion.reglas_adicionales.get("materias_nucleo", [])
        for nombre in nucleos:
            if _normalizar(nombre) not in por_nombre:
                result.append(RuleViolation("MATERIA_NUCLEO_FALTANTE", Severity.WARNING, f"Falta la materia de núcleo: {nombre}", {"nombre": nombre}))
        if ctx.plan.nivel_academico == NivelAcademico.MAESTRIA:
            topicos = sum(1 for m in ctx.materias_por_id.values() if m.es_topico_selecto)
            espacios = sum(1 for es in ctx.elementos_por_semestre.values() for e in es if e.tipo == TipoElemento.ESPACIO_OPTATIVO)
            if topicos != 2:
                result.append(RuleViolation("MAESTRIA_TOPICOS_SELECTOS", Severity.WARNING, "La maestría debe incluir exactamente 2 Tópicos Selectos", {"actual": topicos}))
            if espacios != 2:
                result.append(RuleViolation("MAESTRIA_OPTATIVAS", Severity.WARNING, "La maestría debe incluir exactamente 2 espacios optativos", {"actual": espacios}))
        return result


class EstandarMaestriaRule:
    code = "ESTANDAR_MAESTRIA"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        cfg = ctx.configuracion
        if ctx.plan.nivel_academico != NivelAcademico.MAESTRIA or cfg is None:
            return []
        result = []
        for m in ctx.materias_por_id.values():
            if m.excepcion_horas_estandar:
                continue
            if (cfg.horas_docente_estandar is not None and m.horas_docente != cfg.horas_docente_estandar) or (cfg.horas_independientes_estandar is not None and m.horas_independientes != cfg.horas_independientes_estandar) or (cfg.creditos_estandar is not None and float(m.creditos or 0) != float(cfg.creditos_estandar)):
                result.append(RuleViolation(self.code, Severity.ERROR, f"{m.clave} no cumple el estándar de horas/créditos de maestría", {"materia_id": m.id}))
        return result


class ClaveMateriaRule:
    code = "CLAVE_MATERIA"
    scope = RuleScope.MATERIA

    def evaluate(self, ctx: RuleContext) -> list[RuleViolation]:
        patron = re.compile(rf"^{re.escape(ctx.plan.mnemonico)}\d{{3}}$")
        ubicadas = set(_ubicaciones(ctx))
        return [RuleViolation(self.code, Severity.WARNING, f"La clave {m.clave} no corresponde al mnemónico y posición del mapa", {"materia_id": m.id, "mnemonico": ctx.plan.mnemonico}) for m in ctx.materias_por_id.values() if m.id in ubicadas and m.tipo == TipoMateria.OBLIGATORIA and not patron.match(m.clave)]
