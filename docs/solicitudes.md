# Revisión e historial de solicitudes de ausencia (HU16 y HU20)

Ambas historias consultan las solicitudes creadas en HU11 (`training_absence_requests`) y son de solo lectura: no modifican el estado de ninguna solicitud. La aprobación o el rechazo corresponden al flujo del entrenador.

## HU16. Revisión de solicitudes de notificación de ausencia (SCRUM-13)

**Como** profesor
**quiero** ver en un solo lugar las solicitudes de permiso de mis cursos
**para** gestionarlas sin buscarlas entre mis correos.

- **CA1. Bandeja del profesor:** en "Solicitudes" se muestran solo las solicitudes cuyo correo de docente coincide con el del profesor autenticado. Las pendientes (`pending_coach_approval`) aparecen primero, ordenadas por la fecha de competencia más cercana.
- **CA2. Filtros:** curso (materia registrada en la solicitud), estado y fecha de la clase.
- **CA3. Información visible:** el detalle indica si el deportista tiene convocatoria oficial a la competencia (`competition_callups`) y quiénes son sus entrenadores (asignados a la solicitud en HU11). No se expone promedio ni historial académico; del deportista solo se muestran nombre, código estudiantil y correo.

### Decisiones

- Se crea el rol `professor` con el permiso `absence-requests:review`. El profesor se identifica por su correo institucional, que es el que el deportista registra en la solicitud (`teacher_email`).
- La bandeja muestra solicitudes en todos los estados; el filtro de estado permite acotarla.
- La ruta de inicio del rol profesor es `/profesor/solicitudes`.

## HU20. Consultar el historial general de solicitudes (SCRUM-16)

**Como** administrador
**quiero** consultar todas las solicitudes de permiso de los equipos representativos
**para** hacer seguimiento y atender los casos con problemas.

- **CA1. Consulta con filtros:** equipo, deportista, competencia, profesor, estado y rango de fechas de la clase. Las opciones de cada filtro se construyen a partir de las solicitudes existentes.
- **CA2. Exportación:** "Exportar" descarga un archivo `.xlsx` con las solicitudes que cumplen los filtros aplicados.
- **CA3. Solo consulta:** el detalle no ofrece opciones para aprobar, rechazar ni modificar, y la API no expone operaciones de escritura en `/api/admin/absence-requests`.

### Decisiones

- Se crea el permiso `absence-requests:history`, asignado al rol `admin`.
- El archivo de Excel se genera en el backend con `exceljs`. Las fechas y horas se escriben en hora de Bogotá (UTC-5).

## Endpoints

| Método | Ruta | Uso | Permiso |
| --- | --- | --- | --- |
| GET | `/api/teacher/absence-requests?course=&status=&date=` | Bandeja del profesor | `absence-requests:review` |
| GET | `/api/teacher/absence-requests/courses` | Cursos del profesor con solicitudes | `absence-requests:review` |
| GET | `/api/teacher/absence-requests/:id` | Detalle de una solicitud propia | `absence-requests:review` |
| GET | `/api/admin/absence-requests?teamId=&athleteId=&competitionId=&teacherEmail=&status=&from=&to=` | Historial general | `absence-requests:history` |
| GET | `/api/admin/absence-requests/filters` | Opciones de los filtros | `absence-requests:history` |
| GET | `/api/admin/absence-requests/export?...` | Exportación a Excel con los mismos filtros | `absence-requests:history` |
| GET | `/api/admin/absence-requests/:id` | Detalle de solo lectura | `absence-requests:history` |

## Cómo probar

1. Iniciar el backend una vez (`yarn start:dev` en `backend/api`) para que existan las tablas.
2. Ejecutar `yarn seed:absence-review` en `backend/api`. Crea el rol `professor`, los permisos de HU16 y HU20 y los usuarios profesores de los cursos demo (`docente.demo1`, `docente.demo2` y `docente.demo3@icesi.edu.co`). La contraseña de prueba está en `scripts/seed-absence-review.cjs`.
3. Crear una solicitud desde `/mis-competencias` con `athlete.demo@icesi.edu.co`, usando como docente uno de los correos anteriores.
4. HU16: iniciar sesión con el profesor de la solicitud y abrir "Solicitudes". Verificar el orden, los filtros y que el detalle muestre la convocatoria y el entrenador sin datos académicos. Con otro profesor, la solicitud no debe aparecer.
5. HU20: iniciar sesión con `admin.demo@icesi.edu.co`, abrir "Solicitudes" en el menú, aplicar filtros, usar "Exportar" y abrir un detalle para confirmar que no tiene acciones.
6. Pruebas unitarias: `yarn test src/absence-request-review` en `backend/api`.
