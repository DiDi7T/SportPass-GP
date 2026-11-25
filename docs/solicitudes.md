# Bandeja del entrenador e historial de solicitudes de ausencia (HU16 y HU20)

Ambas historias consultan las solicitudes creadas en HU11 (`training_absence_requests`) y son de solo lectura: no modifican el estado de ninguna solicitud. La aprobación o el rechazo corresponden a HU17.

## HU16. Revisión de solicitudes de notificación de ausencia (SCRUM-13)

**Como** entrenador deportivo
**quiero** visualizar una bandeja con las solicitudes pendientes de los deportistas de mi disciplina
**para** verificar que efectivamente están convocados a competencia y que tienen entrenamiento programado en ese horario.

- **CA1. Filtrado por disciplina:** el entrenador solo visualiza las solicitudes que HU11 le asignó (`training_absence_request_coaches`). HU11 asigna cada solicitud a todos los entrenadores activos de la disciplina (`team_coaches` y entrenador principal del equipo).
- **CA2. Información de validación:** cada registro muestra el nombre del deportista, la competencia asociada, la fecha y el horario del entrenamiento, la asignatura afectada y el correo del docente. Se indica además si el deportista tiene convocatoria registrada a la competencia (`competition_callups`).
- **CA3. Priorización:** las solicitudes pendientes (`pending_coach_approval`) aparecen primero, ordenadas por la fecha de entrenamiento más próxima; las demás se listan después, de la más reciente a la más antigua.

### Decisiones

- La ruta usa el permiso existente `permissions:manage` ("Gestionar permisos deportivos") del rol `coach`; no requiere datos adicionales en la base de datos.
- El sistema no registra horarios de entrenamiento, por lo que la verificación del horario la realiza el entrenador con la fecha y la hora que reporta el deportista.
- La pantalla está en `/coach/solicitudes` y se accede desde la opción "Solicitudes" del menú del entrenador.

## HU20. Consultar el historial general de solicitudes (SCRUM-16)

**Como** administrador
**quiero** consultar todas las solicitudes de permiso de los equipos representativos
**para** hacer seguimiento y atender los casos con problemas.

- **CA1. Consulta con filtros:** equipo, deportista, competencia, profesor, estado y rango de fechas del entrenamiento. Se agrega además un filtro por entrenador asignado. Las opciones de cada filtro se construyen a partir de las solicitudes existentes.
- **CA2. Exportación:** "Exportar" descarga un archivo `.xlsx` con las solicitudes que cumplen los filtros aplicados.
- **CA3. Solo consulta:** el detalle no ofrece opciones para aprobar, rechazar ni modificar, y la API no expone operaciones de escritura en `/api/admin/absence-requests`.

### Decisiones

- Se crea el permiso `absence-requests:history`, asignado al rol `admin`.
- El archivo de Excel se genera en el backend con `exceljs`. Las fechas y horas se escriben en hora de Bogotá (UTC-5).

## Endpoints

| Método | Ruta | Uso | Permiso |
| --- | --- | --- | --- |
| GET | `/api/coach/absence-requests` | Bandeja del entrenador | `permissions:manage` |
| GET | `/api/coach/absence-requests/:id` | Detalle de una solicitud asignada | `permissions:manage` |
| GET | `/api/admin/absence-requests?teamId=&athleteId=&competitionId=&teacherEmail=&coachId=&status=&from=&to=` | Historial general | `absence-requests:history` |
| GET | `/api/admin/absence-requests/filters` | Opciones de los filtros | `absence-requests:history` |
| GET | `/api/admin/absence-requests/export?...` | Exportación a Excel con los mismos filtros | `absence-requests:history` |
| GET | `/api/admin/absence-requests/:id` | Detalle de solo lectura | `absence-requests:history` |

## Cómo probar

1. Iniciar el backend una vez (`yarn start:dev` en `backend/api`) para que existan las tablas.
2. Ejecutar `yarn seed:absence-review` en `backend/api` para asignar el permiso de HU20 al rol `admin`.
3. Crear una solicitud desde `/mis-competencias` con `athlete.demo@icesi.edu.co`.
4. HU16: iniciar sesión con `coach.demo@icesi.edu.co` y abrir "Solicitudes". Verificar que solo aparezcan solicitudes de su disciplina, con los datos de CA2, y que las pendientes estén primero por fecha de entrenamiento. Con otro entrenador, la solicitud no debe aparecer.
5. HU20: iniciar sesión con `admin.demo@icesi.edu.co`, abrir "Solicitudes" en el menú, aplicar filtros, usar "Exportar" y abrir un detalle para confirmar que no tiene acciones.
6. Pruebas unitarias: `yarn test src/absence-request-review` en `backend/api`.
