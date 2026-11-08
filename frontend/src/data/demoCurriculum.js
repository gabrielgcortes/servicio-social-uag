import { initialSubjects, ownElectives, initialProgramId } from './mockData.js'

// Explicit MVP bootstrap. The hook and services do not depend on demo records.
export const demoCurriculum = {
  subjects: initialSubjects,
  electives: ownElectives.map((item) => item.programId ? item : { ...item, programId: initialProgramId }),
}
