# Ciclo de Vida y Estados de Planes Curriculares

Este documento define la especificación formal del ciclo de vida, los estados y las reglas de negocio aplicables a los planes de estudio de las carreras universitarias en la plataforma.

---

## 1. Contexto y Propósito

Una carrera universitaria (por ejemplo, *Licenciatura en Ingeniería de Software*) mantiene su identidad institucional a lo largo del tiempo, pero su estructura curricular evoluciona periódicamente a través de diferentes versiones y planes (*Plan 2020*, *Plan 2024*, *Plan 2025*, *Plan 2026*).

Los estados curriculares permiten:
1. **Separar el diseño de la operación:** Permitir a las coordinadoras rediseñar o duplicar planes libremente sin alterar los planes oficiales en curso.
2. **Garantizar integridad académica:** Evitar que se modifiquen semestres o asignaturas que los alumnos ya cursaron o están cursando actualmente.
3. **Establecer un flujo de aprobación formal:** Auditar y verificar que un mapa cumpla con el 100% de las normas institucionales antes de entrar en vigor.
4. **Preservar memoria histórica:** Conservar planes previos inmutables para trámites de egresados, revalidaciones y equivalencias.

---

## 2. Los 4 Estados del Plan Curricular

```
                   ┌──────────────────────────────────────────────┐
                   │                                              │
                   ▼                                              │ (Observaciones / Rechazo)
            ┌─────────────┐      Enviar a revisión       ┌─────────────────┐
  [Crear] ─►│  BORRADOR   ├─────────────────────────────►│   EN REVISIÓN   │
  [Clonar]  └─────────────┘   (0 errores bloqueantes)    └────────┬────────┘
                                                                  │
                                                                  │ (Aprobación Decanato/Dirección)
                                                                  ▼
                                                         ┌─────────────────┐
                                                         │     VIGENTE     │
                                                         └────────┬────────┘
                                                                  │
                                                                  │ (Reemplazado por nueva versión)
                                                                  ▼
                                                         ┌─────────────────┐
                                                         │    HISTÓRICO    │
                                                         │  (Solo lectura) │
                                                         └─────────────────┘
```

### 2.1. BORRADOR (`BORRADOR`)
* **Propósito:** Espacio de trabajo activo para la coordinadora académica.
* **Origen:** Se genera automáticamente al **Crear un nuevo programa** o al **Duplicar un plan existente**.
* **Nivel de edición:** **Total (100% editable).**
  - Se pueden agregar, renombrar, reordenar y eliminar asignaturas.
  - Se pueden mover materias entre cualquier ciclo (1 a 8 o cuatrimestres).
  - Se pueden definir o eliminar espacios optativos, horas, créditos y seriaciones.
* **Cálculo de validaciones:** El sistema evalúa en tiempo real y muestra advertencias/errores, pero **no bloquea el guardado** ni la persistencia intermedia.

---

### 2.2. EN REVISIÓN (`EN_REVISION`)
* **Propósito:** Versión congelada temporalmente para dictamen, cotejo y visto bueno por parte del Decanato, Dirección Académica o Estructura Académica.
* **Condición de entrada (Bloqueante):**
  - El plan debe tener **0 errores bloqueantes** en el motor de validaciones curriculares (ver sección 4).
* **Nivel de edición:** **Solo lectura.**
  - Ningún usuario (incluida la coordinadora) puede modificar materias, créditos ni seriaciones mientras el plan esté en dictamen.
* **Posibles salidas:**
  1. **Aprobado:** Pasa a estado **VIGENTE**.
  2. **Con observaciones:** Se devuelve a **BORRADOR** para que la coordinadora atienda los comentarios.

---

### 2.3. VIGENTE (`VIGENTE`)
* **Propósito:** Plan oficial que rige a las generaciones de alumnos activas en la universidad.
* **Condición de entrada:**
  - Aprobación expresa por usuario con rol `ADMIN` o autoridad de Decanato.
  - Registro de fecha/periodo de inicio de vigencia oficial.
  - Unicidad: Solo debe existir **un plan vigente para nuevas inscripciones** por carrera en un periodo escolar dado. Al activarse, el plan vigente previo debe transicionar a **HISTÓRICO**.
* **Nivel de edición:** **Restringido por avance de ciclo (`currentCycle`).**
  - **Ciclos terminados o en curso:** Bloqueados contra edición para salvaguardar el historial de los alumnos inscritos.
  - **Ciclos futuros:** Modificables únicamente bajo solicitud de excepción académica debidamente justificada y autorizada.

---

### 2.4. HISTÓRICO (`HISTORICO`)
* **Propósito:** Archivo inmutable de planes curriculares que concluyeron su ciclo de vida o fueron reemplazados por una versión más moderna.
* **Nivel de edición:** **Ninguno (Solo lectura permanente).**
  - No se permiten adiciones, ediciones ni eliminaciones de materias, claves o configuraciones.
  - Disponible permanentemente para consulta, generación de certificados, revalidaciones y exportación a Excel.
  - Si se desea reutilizar su contenido, la única acción permitida es **Duplicar** para generar un nuevo plan en estado **BORRADOR**.

---

## 3. Matriz de Permisos por Rol y Estado

| Acción | Borrador | En revisión | Vigente | Histórico |
| :--- | :---: | :---: | :---: | :---: |
| **Consultar mapa y catálogo** | Coordinador, Decanato, Admin | Coordinador, Decanato, Admin | Todos | Todos |
| **Exportar a Excel (.xlsx)** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **Mover / editar materias (Ciclos futuros)** | ✅ Coordinador | ❌ Bloqueado | ⚠️ Con excepción | ❌ Bloqueado |
| **Mover / editar materias (Ciclos pasados/en curso)** | ✅ Coordinador | ❌ Bloqueado | ❌ Bloqueado | ❌ Bloqueado |
| **Duplicar plan** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **Enviar a Revisión** | ✅ Coordinador | — | — | — |
| **Regresar a Borrador** | — | ✅ Decanato / Admin | ❌ No permitido | ❌ No permitido |
| **Aprobar y Publicar (Vigente)** | ❌ | ✅ Decanato / Admin | — | — |
| **Archivar a Histórico** | ❌ | ❌ | ✅ Admin / Automático | — |

---

## 4. Criterios de Validación para Pasar a "En Revisión"

Para que el sistema permita la transición de `BORRADOR` a `EN_REVISION`, el plan debe satisfacer estrictamente las siguientes reglas normativas institucionales:

1. **Rango de Créditos Totales:** Cumplir con los créditos mínimos y máximos según nivel (ej. Licenciatura 300–400 cr; Especialidad 45–54 cr; Maestría 75–108 cr; Doctorado mínimo 150 cr).
2. **Topes por Semestre:**
   - Máximo de créditos por semestre $\le 50$ créditos.
   - Máximo de asignaturas por semestre $\le 7$ (modalidad escolarizada o mixta) o $\le 5$ (no escolarizada).
3. **Horas Totales del Programa:**
   - Mínimo 4,800 horas para licenciaturas (desglosadas en conducción docente e independientes según modalidad).
4. **Seriaciones y Prerrequisitos:**
   - Toda asignatura seriada debe tener su prerrequisito ubicado en un semestre estrictamente anterior.
   - Prohibidas dependencias circulares o auto-referenciadas.
5. **Asignaturas de Núcleo por Decanato:**
   - Para *Diseño, Ciencia y Tecnología*: Inmersión (1°), Lógica (2°), Lengua Extranjera I (4°), Antropología (4°), Lengua Extranjera II (5°), Lab. Innovación (5°), Bioética (6°), Lab. Emprendimiento (7°).
   - Para *Ciencias Sociales*: Orden correspondiente al decanato.
6. **Mínimos Institucionales:**
   - Al menos 2 asignaturas **Capstone** ubicadas a partir de la segunda mitad del plan (semestre 5 en adelante para licenciaturas).
   - Mínimo 2 semestres con **Prácticas Profesionales**, acumulando al menos 320 horas y 20 créditos (o hasta 5 periodos con estadía laboral).
7. **Espacios Optativos y Catálogo:**
   - Si existen espacios optativos en el mapa, deben cumplir con los mínimos de horas de la modalidad y contar con la oferta correspondiente en el catálogo.

---

## 5. Impacto en la Arquitectura de Software

### En el Backend (FastAPI + SQLAlchemy)
1. **Enum unificado:** Sincronizar el modelo con los 4 estados canónicos:
   ```python
   class EstadoPlanCurricular(str, enum.Enum):
       BORRADOR = "BORRADOR"
       EN_REVISION = "EN_REVISION"
       VIGENTE = "VIGENTE"
       HISTORICO = "HISTORICO"
   ```
2. **Políticas de Autorización:**
   - Validar el estado del plan en `materia_service`, `semestre_service` y `elemento_service`. Lanzar `BusinessRuleError("El plan se encuentra en revisión o histórico y no admite modificaciones")` si el estado no es editable.
3. **Endpoints de Transición de Estado:**
   - `POST /api/planes/{id}/solicitar-revision`: Ejecuta el motor de reglas; si pasa, cambia a `EN_REVISION`.
   - `POST /api/planes/{id}/aprobar`: Valida permisos de decanato y cambia a `VIGENTE` (marcando el anterior como `HISTORICO`).
   - `POST /api/planes/{id}/rechazar`: Regresa a `BORRADOR` con bitácora de observaciones.

### En el Frontend (React)
1. **Badges e Insignias de Estado:**
   - `BORRADOR`: Tono ámbar/naranja con acceso total a edición.
   - `EN_REVISION`: Tono azul/morado con banner informativo de dictamen.
   - `VIGENTE`: Tono verde institucional.
   - `HISTORICO`: Tono gris neutro en modo solo lectura.
2. **Controles Condicionales:**
   - Deshabilitar botones de arrastrar (*drag & drop*), agregar materias o borrar si el estado es `EN_REVISION` o `HISTORICO`.
   - Mostrar el botón **"Enviar a revisión"** en la barra superior del mapa curricular cuando el plan esté en `BORRADOR`, habilitado únicamente si la cuenta de errores bloqueantes es `0`.

