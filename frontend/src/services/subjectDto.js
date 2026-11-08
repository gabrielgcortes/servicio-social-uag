import { nextSubjectKey, getCatalogSubjects } from '../utils/subjectCatalog.js'

const areas = { Universitaria: 'UNIVERSITARIA', Básica: 'BASICA', Disciplinar: 'DISCIPLINAR', Profesional: 'PROFESIONAL', Fundamental: 'FUNDAMENTAL', 'Terminal de Investigación': 'TERMINAL_INVESTIGACION' }
const modalities = { Escolarizada: 'ESCOLARIZADA', 'No escolarizada': 'NO_ESCOLARIZADA', Mixta: 'MIXTA' }
const labelFor = (values, code) => Object.keys(values).find((key) => values[key] === code)

export function toApiId(value, label = 'registro') {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new Error(`Falta el ID real de ${label}. Carga los datos del servidor antes de usar el adaptador HTTP.`)
  }
  return Number(value)
}

export function toMateriaDto(input, { plan, subjects, electives }, original = null) {
  const catalog = getCatalogSubjects(subjects, electives, plan.id)
  let prerequisiteId = null
  if (input.prerequisite) {
    const prerequisite = catalog.find((item) => item.key === input.prerequisite)
    if (!prerequisite) throw new Error('No se encontró la asignatura de seriación en este plan.')
    prerequisiteId = toApiId(prerequisite.materiaId ?? prerequisite.id, 'la materia de seriación')
  }
  if (!areas[input.area] || !modalities[input.modality]) throw new Error('Área o modalidad no reconocida por el contrato de asignaturas.')
  return {
    clave: original?.key || nextSubjectKey(catalog, plan.mnemonic), nombre: input.name.trim(),
    horas_docente: Number(input.teacherHours), horas_independientes: Number(input.independentHours),
    tipo_aula: input.room, modalidad: modalities[input.modality], area_formacion: areas[input.area],
    tipo: input.type === 'Optativa' ? 'OPTATIVA' : 'OBLIGATORIA',
    aporte_sustancial: Boolean(input.substantial), es_capstone: Boolean(input.capstone),
    es_practica_profesional: Boolean(input.practice), docente_sugerido: input.suggestedTeacher || null,
    programa_asignatura: input.programRef || null, seriacion_materia_id: prerequisiteId,
    ciclos_disponibles: input.type === 'Optativa' ? input.availableCycles || [Number(input.cycle)] : [],
  }
}

export function fromMateriaDto(dto, planId, allMaterias = [], previous = {}) {
  if (dto?.id == null || typeof dto.nombre !== 'string' || !['OBLIGATORIA', 'OPTATIVA'].includes(dto.tipo)) throw new Error('El servidor devolvió una materia no válida.')
  const elective = dto.tipo === 'OPTATIVA'
  return {
    ...previous, id: `materia-${dto.id}`, materiaId: dto.id, ownerProgramId: planId,
    programId: elective ? planId : null, name: dto.nombre, key: dto.clave,
    type: elective ? 'Optativa' : 'Obligatoria', isElectiveSlot: false,
    teacherHours: dto.horas_docente, independentHours: dto.horas_independientes, credits: Number(dto.creditos),
    room: dto.tipo_aula || dto.instalaciones || 'A', modality: labelFor(modalities, dto.modalidad) || previous.modality || 'Escolarizada',
    area: labelFor(areas, dto.area_formacion) || previous.area || 'Disciplinar',
    capstone: dto.es_capstone, practice: dto.es_practica_profesional, substantial: dto.aporte_sustancial,
    core: Boolean(previous.core), suggestedTeacher: dto.docente_sugerido || '', programRef: dto.programa_asignatura || '',
    prerequisite: allMaterias.find((item) => item.id === dto.seriacion_materia_id)?.clave || null,
    cycle: dto.ciclos_disponibles?.[0] || previous.cycle || 1, availableCycles: dto.ciclos_disponibles || [],
  }
}

export function fromElementoDto(dto, semester, planId, materias) {
  if (dto?.id == null || !['MATERIA', 'ESPACIO_OPTATIVO'].includes(dto.tipo)) throw new Error('El servidor devolvió un elemento de mapa no válido.')
  const slot = dto.tipo === 'ESPACIO_OPTATIVO'
  const materia = materias.find((item) => item.materiaId === dto.materia_id)
  if (!slot && !materia) throw new Error('El elemento del mapa referencia una materia no cargada.')
  return {
    ...(slot ? { name: dto.nombre, key: '', type: 'Optativa', area: 'Profesional', room: 'A', teacherHours: dto.horas_docente, independentHours: dto.horas_independientes, credits: Number(dto.creditos) } : materia),
    id: `elemento-${dto.id}`, elementId: dto.id, semesterId: semester.id, order: dto.orden,
    programId: planId, ownerProgramId: planId, cycle: semester.numero, isElectiveSlot: slot, catalogAssignment: !slot,
  }
}
