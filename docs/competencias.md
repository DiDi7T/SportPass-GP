# Gestión de competencias (HU4 y HU6)

## HU4. Registrar una competencia

**Como** entrenador de un equipo representativo
**quiero** registrar una competencia en la plataforma
**para que** los deportistas convocados puedan solicitar sus permisos académicos.

### CA1: Registro exitoso
- **Dado que** inicié sesión como entrenador y tengo al menos un equipo a mi cargo,
- **cuando** entro a "Registrar competencia", diligencio nombre del torneo, equipo, fecha de inicio, fecha de fin, hora de inicio, hora de fin, lugar y tipo (local, regional o nacional) y hago clic en "Guardar",
- **entonces** el sistema registra la competencia y me muestra el mensaje "Competencia registrada correctamente."

### CA2: Campos obligatorios incompletos
- **Dado que** estoy en el formulario "Registrar competencia",
- **cuando** dejo vacío uno o más campos y hago clic en "Guardar",
- **entonces** el sistema no registra la competencia, marca los campos faltantes y me muestra el mensaje "Todos los campos son obligatorios."

### CA3: Fecha de inicio en el pasado
- **Dado que** estoy en el formulario "Registrar competencia",
- **cuando** ingreso una fecha u hora de inicio anterior al momento actual y hago clic en "Guardar",
- **entonces** el sistema no registra la competencia y me muestra el mensaje "No se puede registrar una competencia con fecha pasada."

### CA4: Fin anterior o igual al inicio
- **Dado que** estoy en el formulario "Registrar competencia",
- **cuando** ingreso una fecha y hora de fin anterior o igual a la fecha y hora de inicio y hago clic en "Guardar",
- **entonces** el sistema no registra la competencia y me muestra el mensaje "La fecha y hora de fin deben ser posteriores a las de inicio."

### CA5: Visible en el calendario del equipo
- **Dado que** registré una competencia correctamente,
- **cuando** entro al "Calendario" del equipo seleccionado,
- **entonces** la competencia aparece en la fecha correspondiente con su nombre, horario, lugar y tipo.

## HU6. Editar una competencia

**Como** entrenador
**quiero** modificar la fecha, la hora o el lugar de una competencia ya registrada
**para** mantener la información al día cuando el torneo cambia la programación.

- **CA1. Consultar competencias registradas:** el listado muestra solo las competencias de los equipos que el entrenador gestiona y permite seleccionar una para modificarla.
- **CA2. Modificar la fecha:** al cambiar la fecha y guardar, se actualiza y se muestra la nueva información.
- **CA3. Cambios parciales o completos:** se puede modificar solo la fecha, la hora, el lugar o cualquier combinación; los demás datos se conservan sin cambios.
- **CA4. Confirmar la actualización:** al guardar datos válidos se muestra un mensaje de confirmación con la información actualizada.

> La edición aplica las mismas reglas de HU4: no se permiten fechas pasadas y el fin debe ser posterior al inicio.

## HU7. Cancelar una competencia (SCRUM-21)

**Como** entrenador
**quiero** cancelar una competencia
**para que** los permisos asociados queden sin efecto y los profesores estén informados.

- **CA1. Confirmación y motivo:** antes de registrar la cancelación se pide confirmación y un motivo obligatorio.
- **CA2. Anulación de permisos:** las solicitudes de permiso pendientes o aprobadas pasan a "Anulada" y se notifica a los deportistas convocados y a los profesores involucrados.
- **CA3. Cancelada en el historial:** la competencia se muestra como "Cancelada" y no admite nuevas solicitudes de permiso.
- **CA4. Restricción:** solo el entrenador del equipo de la competencia ve y puede usar la opción "Cancelar competencia".

## HU11. Solicitud de notificación de ausencia por entrenamiento (SCRUM-14)

En `/mis-competencias`, un deportista activo puede registrar un aviso solo para una competencia futura, no cancelada y con convocatoria registrada a su nombre. La solicitud exige materia, fecha y horario del entrenamiento, nombre del docente y correo `@icesi.edu.co`; queda en `pending_coach_approval` (mostrado como "Pendiente de aprobación del entrenador"). Se asocia a todos los entrenadores activos de la disciplina, incluyendo los asignados en `team_coaches` y el entrenador principal legado del equipo.

El formulario muestra que el aviso está sujeto al aval del entrenador y no reemplaza las excusas oficiales de Bienestar Universitario. La revisión del entrenador, el seguimiento de solicitudes (HU12) y el envío efectivo de correo no forman parte de esta implementación de HU11.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/me/training-absence-requests/eligible-competitions` | Competencias futuras con convocatoria activa del deportista |
| POST | `/api/me/training-absence-requests` | Crear una solicitud pendiente |

Para instalaciones con `DB_SYNCHRONIZE=false`, aplicar `backend/api/migrations/004_hu11_training_absence_requests.sql` antes de usar estos endpoints.

## HU12. Consulta de estado de mis solicitudes (SCRUM-15)

La sección "Mis solicitudes de ausencia" en `/mis-competencias` muestra las solicitudes propias más recientes y permite abrir cada detalle. La API solo devuelve solicitudes cuyo `athlete_id` corresponde al usuario autenticado; no se acepta un identificador de deportista desde el cliente.

La página actualiza el listado y el detalle abierto cada 15 segundos, y también al volver a enfocar la pestaña. Esto refleja automáticamente cambios escritos por el flujo de revisión del entrenador, sin implementar aquí acciones para aprobar o rechazar.

### Contrato para el flujo de aprobación

Para que los estados y trazabilidad se reflejen en HU12, el flujo que revise la solicitud debe usar estos valores y columnas:

| Acción | `status` | Datos de trazabilidad |
| --- | --- | --- |
| Pendiente | `pending_coach_approval` | `coach_responded_at`, `rejection_comment` y `teacher_email_sent_at` permanecen `NULL` |
| Aprobada | `approved_by_coach` | Guardar fecha de respuesta en `coach_responded_at`; establecer `teacher_email_sent_at` solo tras confirmar el envío |
| Rechazada | `rejected_by_coach` | Guardar fecha de respuesta en `coach_responded_at` y la justificación en `rejection_comment` |
| Cancelada | `cancelled` | Cambiar estado a `cancelled` |

Si la otra implementación utiliza valores distintos, debe adaptar este contrato o actualizar el mapeo de estados de HU12. Las confirmaciones de correo no se inventan: mientras `teacher_email_sent_at` sea `NULL`, la interfaz indica que no hay confirmación registrada.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/me/training-absence-requests` | Listar solicitudes del deportista autenticado |
| GET | `/api/me/training-absence-requests/:id` | Consultar detalle propio y trazabilidad |

Para bases con `DB_SYNCHRONIZE=false`, aplicar `backend/api/migrations/005_hu12_training_absence_traceability.sql` después de la migración 004. Con `DB_SYNCHRONIZE=true`, TypeORM crea las columnas desde la entidad.

### Decisiones (backend, Task 1)

- Cancelar no borra la competencia: queda con `status = 'cancelada'`, `cancellation_reason`, `cancelled_by` y `cancelled_at`. Los tres campos nuevos son opcionales, así que HU4/HU6 no cambian.
- Solo el entrenador asignado al equipo puede cancelar; el administrador no (CA4). La API lo valida aunque el botón esté oculto.
- No se puede cancelar dos veces, ni cancelar una competencia que ya terminó, ni editar una competencia cancelada (409).
- Las respuestas de `/api/competitions` incluyen `status`, `cancellation` (`reason`, `cancelledAt`) y `canCancel`, que el frontend usa para mostrar u ocultar el botón.
- CA3: `acceptsPermissionRequests(competition)` (en `competitions.service.ts`) devuelve `false` para una competencia cancelada; la solicitud de permiso (SCRUM-14) debe usarla antes de crear una.
- CA2: `CompetitionCancellationEffects` es el punto único de efectos. `annulPermissionRequests` corre en la misma transacción que la cancelación y `notifyCancellation` después de confirmarla. Ambos siguen como placeholders; el alcance de HU11 no incluye cancelar solicitudes existentes ni notificar la cancelación.

## Cómo probar

1. Backend: crear `backend/api/.env` con los datos de la BD, luego `yarn install` y `yarn start:dev` (puerto 3001). Al arrancar, TypeORM crea las tablas `teams` y `competitions`.
2. Datos de prueba (una sola vez): `yarn seed:competitions` en `backend/api`. Crea el permiso `competitions:manage` para los roles coach y admin, y dos equipos asignados a `coach.demo@icesi.edu.co`.
3. Frontend: `npm install` y `npm run dev` en `frontend/sportpassapp`, abrir http://localhost:3000/login y entrar a "Competencias" desde el menú.
4. Iniciar sesión con el entrenador demo y recorrer los criterios:
   - HU4 CA1/CA5: registrar una competencia → aparece el mensaje de éxito y la competencia en el calendario del equipo.
   - HU4 CA2: guardar con campos vacíos → se marcan en rojo y aparece "Todos los campos son obligatorios."
   - HU4 CA3: fecha de ayer → "No se puede registrar una competencia con fecha pasada."
   - HU4 CA4: hora de fin igual o anterior a la de inicio → "La fecha y hora de fin deben ser posteriores a las de inicio."
   - HU6: botón "Editar" → cambiar solo el lugar o solo la fecha → mensaje "Competencia actualizada correctamente." con los datos nuevos; el resto no cambia.
   - HU7 CA1: botón "Cancelar competencia" → diálogo de confirmación; sin motivo muestra "El motivo de la cancelación es obligatorio."; con motivo aparece "Competencia cancelada correctamente."
   - HU7 CA3: la competencia queda con la etiqueta "Cancelada", tachada, con su motivo y sin botones de editar ni cancelar; en el calendario se ve tachada en rojo y en `/torneos` como "Cancelado".
   - HU7 CA4: con `admin.demo@icesi.edu.co` no aparece el botón "Cancelar competencia" (solo lo ve el entrenador del equipo).
   - Con `athlete.demo@icesi.edu.co` la pantalla indica que no tiene permiso (y la API responde 403).
   - Para restaurar los partidos `[Demo]` después de probar: `yarn seed:tournaments`.
5. Pruebas unitarias del backend: `yarn test` en `backend/api`. Las de HU7 están en `competitions.cancel.spec.ts` (endpoint y servicio) y `competitions.cancel.validation.spec.ts` (Task 3):

   | CA | Qué se prueba |
   | --- | --- |
   | CA1 | Se guarda el motivo (sin espacios sobrantes), quién canceló y cuándo, sin borrar; motivo vacío, ausente, no textual o de más de 500 caracteres se rechaza con un mensaje claro. |
   | CA2 | La anulación de solicitudes corre en la misma transacción que la cancelación y la notificación después; si la cancelación falla no se anula ni se notifica; hoy anula 0 solicitudes y solo deja registro. |
   | CA3 | La cancelada sigue en el listado con estado y motivo; no se puede editar, volver a cancelar ni recibir nuevas solicitudes (`acceptsPermissionRequests`); en la oferta de torneos aparece como "cancelada". |
   | CA4 | Solo el entrenador del equipo puede cancelar (otro entrenador y el administrador reciben 403) y solo para él `canCancel` es `true`; nunca para una cancelada o terminada. |

### Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/competitions/teams` | Equipos que gestiona el entrenador (admin: todos) |
| POST | `/api/competitions` | Registrar competencia (HU4) |
| GET | `/api/competitions?teamId=` | Listado / calendario de competencias gestionables (HU6 CA1) |
| GET | `/api/competitions/:id` | Detalle |
| PATCH | `/api/competitions/:id` | Editar fecha, hora y/o lugar (HU6) |
| POST | `/api/competitions/:id/cancel` | Cancelar con motivo `{ "reason": "..." }` (HU7, solo el entrenador del equipo) |
