# Frontend de mapas curriculares

## Desarrollo y verificación

```sh
npm install
npm run dev
npm run lint
npm run build
node --test tests/*.test.js
```

## Ciclo de vida del MVP

Los programas viven en `useState` dentro de `App.jsx`; las materias y optativas se guardan juntas en `useCurriculumSubjects`. El arranque del MVP inyecta `data/demoCurriculum.js` como datos iniciales. Al recargar se restablecen los datos de demostración. `activeProgram` se deriva del ID seleccionado y de la colección actual, evitando versiones de estado desincronizadas.

`updateProgramStatus` coordina los servicios asíncronos, la actualización del programa, el archivado del vigente anterior de la misma carrera y la notificación. Se impiden solicitudes simultáneas. La identidad de carrera usa `careerId` y, para datos antiguos, el mnemónico; las copias conservan esa identidad.

- Borrador: todos los ciclos editables; revisión requiere cero errores bloqueantes.
- En revisión: consulta del mapa y catálogo; controles explícitos de simulación del Decanato para aprobación o devolución con motivo obligatorio.
- Vigente: solo ciclos futuros editables; admite archivado.
- Histórico: consulta y exportación; duplicar produce un borrador independiente.

En **Editar programa → Estado del plan** existe una excepción explícita para demostraciones: permite forzar cualquier estado sin pasar por la validación ni el dictamen. El resto de la configuración permanece bloqueado si el plan está en revisión o histórico. Publicar mediante este selector también archiva al vigente anterior.

## Conectar FastAPI

`src/services/planService.js` inyecta una lectura del estado React en el adaptador mock: no existe una segunda base de datos en memoria. Incluye los cinco métodos de transición/duplicación y el transporte HTTP real.

Por defecto `VITE_USE_MOCK` está activado. Para cambiar al transporte HTTP, crear `.env.local` y reiniciar Vite:

```dotenv
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000
```

Se envía `estado` con el enum de FastAPI (`BORRADOR`, `EN_REVISION`, `VIGENTE`, `HISTORICO`); duplicación envía `clave`, `descripcion` y `estado` según `PlanDuplicarRequest`. Rechazo envía `{ motivo }`. El adaptador traduce la respuesta `PlanCurricularRead` al modelo de UI y conserva los metadatos ya cargados. Los errores de transición de plan dejan intacto el estado React.

La integración completa aún requiere cargar los planes y sus IDs reales, conectar la carga de asignaturas mediante `loadSubjects(planId)`, conectar la autenticación usada por el despliegue y adaptar las mutaciones restantes de configuración de programas. El backend actual del repositorio todavía debe incorporar `EN_REVISION` y las rutas de solicitar revisión, aprobar y rechazar definidas en la especificación. El servidor debe aplicar permisos, validaciones y unicidad de vigente en una transacción; la simulación de autoridad del MVP no constituye autorización real.

La exportación conserva el comportamiento existente del prototipo.


## Arquitectura de asignaturas

El modo predeterminado continúa siendo el MVP en memoria. No hace peticiones HTTP de asignaturas ni requiere levantar FastAPI. Recargar la página restablece la demostración.

- `hooks/useCurriculumSubjects.js`: estado React atómico de materias y optativas, bloqueo de operaciones simultáneas compartido con las transiciones de planes, estado de guardado, errores y notificaciones. `App.jsx` solamente invoca sus operaciones.
- `services/subjectService.js`: contrato único asíncrono y selección del adaptador.
- `services/mockSubjectService.js`: simulación inmutable contra el estado inyectado; genera IDs/claves y conserva la pertenencia al programa incluso al retirar materias del mapa.
- `services/httpSubjectService.js`: transporte futuro de catálogo y elementos del mapa. Permanece inactivo con `VITE_USE_MOCK` habilitado.
- `services/subjectDto.js`: traducción de nombres, enums y seriaciones; separa `materiaId`, `elementId` y `semesterId`. Los créditos de respuestas HTTP los determina el servidor.
- `services/subjectPolicies.js`: permisos por plan y ciclo, pertenencia y validaciones de entrada compartidas.
- `services/apiClient.js`: configuración común de modo, URL y cliente HTTP inyectable para pruebas/autenticación.
- `utils/curriculumState.js`: actualización de un solo plan sin sobrescribir otros y clonación independiente para el MVP.

### Contrato público

| Operación | Firma |
| --- | --- |
| Consultar catálogo y mapa | `listarAsignaturas(planId)` |
| Crear o editar materia/espacio | `guardarAsignatura(planId, input, { source: 'catalog' o 'map' })` |
| Asignar una materia al mapa | `asignarAsignatura(planId, key, cycle)` |
| Retirar elemento del mapa | `quitarDelMapa(planId, subjectId)` |
| Mover o arrastrar | `moverAsignatura(planId, subjectId, cycle, targetId?, placeAfter?)` |
| Reordenar arriba/abajo | `reordenarAsignatura(planId, subjectId, direction)` |
| Eliminar materia del catálogo | `eliminarAsignatura(planId, subjectId)` |

Ambos adaptadores resuelven `{ programId, subjects, electives, warnings, message? }` con el catálogo y mapa completos del plan indicado. El hook aplica esa respuesta en una sola actualización y conserva los demás planes. Una creación sin `input.id` obtiene su identidad del servicio; el formulario muestra una clave preliminar. Eliminar del catálogo está preparado como operación de servicio; no se agrega un botón nuevo a la interfaz.

Crear una obligatoria desde catálogo no la coloca automáticamente en el mapa. Crear desde mapa sí la coloca; retirar del mapa conserva el catálogo. Los espacios optativos son elementos independientes y las materias optativas pertenecen a la oferta. Editar una materia sincroniza sus datos entre catálogo y mapa, respetando los ciclos bloqueados de todas sus colocaciones.

### Transporte futuro y límites de integración

El adaptador HTTP está escrito según los schemas y rutas actuales del repositorio:

| Recurso | Rutas |
| --- | --- |
| Materias | `GET/POST /api/planes/{id}/materias`, `PATCH/DELETE /api/materias/{id}` |
| Oferta optativa | `POST /api/planes/{id}/optativas` |
| Semestres | `GET /api/planes/{id}/semestres` |
| Elementos del mapa | `GET/POST /api/semestres/{id}/elementos`, `PATCH/DELETE /api/elementos/{id}` |
| Orden | `PUT /api/semestres/{id}/elementos/orden` |
| Movimiento | `POST /api/elementos/{id}/mover` |

Las pruebas HTTP usan un transporte falso inyectado; nunca contactan al backend. Antes de activar el transporte en un despliegue, se deben cargar programas con sus IDs reales, usar `loadSubjects(planId)` para hidratar catálogo y mapa, y aportar la autenticación correspondiente mediante el cliente. Los IDs de materias y elementos no son intercambiables; el adaptador rechaza IDs de la demostración. Los ciclos deben existir previamente en el servidor.

Duplicar/crear programas continúa con el flujo MVP existente. En una integración real, la duplicación debe dejar que FastAPI copie el contenido y después cargar el nuevo plan; no se deben usar las copias locales con IDs simulados. El servicio de asignaturas y sus componentes ya quedan separados de esa decisión de integración.

El contrato actual de materia no tiene un campo `core`: esa marca se conserva localmente, pero su persistencia requerirá una decisión de contrato con backend. Las claves actuales se envían porque `MateriaCreate` exige `clave`; se usa siempre la clave devuelta por el servidor. Si el backend pasa a generarlas, el cambio se concentra en el DTO.

Crear una materia directamente en el mapa requiere actualmente dos peticiones (materia y elemento), sin una transacción HTTP conjunta. Si falla la segunda, se intenta recargar el plan y se informa el error, conservando los cambios que sí confirmó el servidor. Esto evita simular una reversión que el servidor no realizó; una garantía de transacción conjunta requiere soporte de backend.
