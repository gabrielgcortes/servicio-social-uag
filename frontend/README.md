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

Los programas, materias y optativas viven en `useState` dentro de `App.jsx`. Al recargar se restablecen los datos de demostración. `activeProgram` se deriva del ID seleccionado y de la colección actual, evitando versiones de estado desincronizadas.

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

Se envía `estado` con el enum de FastAPI (`BORRADOR`, `EN_REVISION`, `VIGENTE`, `HISTORICO`); duplicación envía `clave`, `descripcion` y `estado` según `PlanDuplicarRequest`. Rechazo envía `{ motivo }`. El adaptador traduce la respuesta `PlanCurricularRead` al modelo de UI y conserva los metadatos ya cargados. Los errores HTTP dejan intacto el estado React.

La integración completa aún requiere cargar los planes y sus IDs reales, materias, configuración y catálogo desde FastAPI, conectar la autenticación usada por el despliegue y adaptar las mutaciones restantes de configuración/asignaturas. El backend actual del repositorio todavía debe incorporar `EN_REVISION` y las rutas de solicitar revisión, aprobar y rechazar definidas en la especificación. El servidor debe aplicar permisos, validaciones y unicidad de vigente en una transacción; la simulación de autoridad del MVP no constituye autorización real.

La exportación conserva el comportamiento existente del prototipo.
