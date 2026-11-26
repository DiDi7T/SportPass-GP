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

## HU14. Consultar mi historial de solicitudes (SCRUM-26)

**Como** estudiante-deportista
**quiero** consultar y filtrar el historial completo de las notificaciones de ausencia que he realizado durante el semestre
**para** llevar un control personal de las clases a las que he faltado por entrenamientos de competencia.

- **CA1. Filtros de búsqueda:** rango de fechas del entrenamiento, estado (Pendiente, Aprobada por entrenador, Rechazada, Cancelada) y materia (coincidencia parcial, sin distinguir mayúsculas). El botón "Este semestre" llena el rango con el semestre actual (enero–junio o julio–diciembre).
- **CA2. Orden cronológico:** del entrenamiento más reciente al más antiguo (fecha, hora de inicio y fecha de creación).
- **CA3. Acceso a detalle:** cada solicitud muestra la competencia, el entrenamiento, la materia, el docente y su correo, la respuesta del entrenador, el motivo si fue rechazada y, si fue aprobada, a qué correo y cuándo se envió la notificación al docente, junto con el botón "Descargar comprobante" (PDF de HU15).

### Decisiones

- Es una consulta nueva (`/history`), aparte de la que usa HU12, para no cambiar el orden ni el comportamiento de "Mis solicitudes".
- Solo lectura: ni la pantalla ni la API ofrecen acciones para editar, cancelar o eliminar desde el historial.
- Solo un deportista activo puede consultarlo; cualquier otro rol recibe 403.
- La pantalla está en `/historial-solicitudes` y se accede desde "Historial" en el menú del deportista.

## HU18. Notificar al docente por correo al aprobarse la solicitud (SCRUM-35)

**Como** estudiante-deportista
**quiero** que mi docente reciba automáticamente un correo cuando mi entrenador apruebe mi solicitud
**para** que conozca mi ausencia por entrenamiento sin que yo tenga que escribirle ni él necesite una cuenta en SportPass.

- **CA1. Disparador:** el correo se envía una sola vez, cuando HU17 pasa la solicitud a "Aprobada por entrenador". No se envía al crearla, rechazarla ni cancelarla.
- **CA2. Destinatarios:** al correo `@icesi.edu.co` del docente registrado en la solicitud, con copia al correo institucional del deportista.
- **CA3. Contenido:** nombre y código del estudiante, disciplina, competencia, fecha y hora del entrenamiento, materia y entrenador que avala; adjunta la constancia PDF de HU15 y aclara que es un aviso informativo y no un permiso oficial de Bienestar Universitario.
- **CA4. Registro:** cada intento guarda `teacher_email_status` (`sent` o `failed`), `teacher_email_error` y `teacher_email_attempted_at`. Solo un envío exitoso llena `teacher_email_sent_at`, lo que además actualiza la notificación del deportista (trigger de HU19). Si el envío falla, la solicitud sigue aprobada.

### Decisiones

- El envío usa `nodemailer` (`src/mail`). `TeacherApprovalEmailService` (`src/teacher-notifications`) arma el correo y lo invoca `decideForCoach` (HU17) solo al aprobar.
- La bandeja del entrenador y el historial general muestran `teacherEmailStatus` y `teacherEmailError`.
- El SMTP tiene tiempos límite (10–20 s) para no dejar esperando al entrenador si el servidor de correo no responde.
- La migración `010_hu18_teacher_email_log.sql` agrega las columnas del registro. **Debe aplicarse antes de usar esta versión del backend** (con `DB_SYNCHRONIZE=false`).

### Configuración del correo (`backend/api/.env`)

Copia `backend/api/.env.example` como `backend/api/.env` y llena los valores; el ejemplo lista todas las variables del backend (base de datos, servidor, autenticación y correo) sin secretos.

| Variable | Uso |
| --- | --- |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_SECURE` | Servidor SMTP. Con Gmail: `smtp.gmail.com`, `465`, tu correo, una **contraseña de aplicación** y `true`. |
| `MAIL_FROM` | Remitente, p. ej. `SportPass Icesi <tu-correo@gmail.com>`. |
| `MAIL_REDIRECT_TO` | **Solo en desarrollo y demostraciones:** desvía el correo a esta dirección; el asunto conserva a quién iba dirigido (`[Para: docente@icesi.edu.co; CC: deportista@icesi.edu.co] …`). Sin `MAIL_REDIRECT_CC_TO`, la copia se omite. En producción no se define. |
| `MAIL_REDIRECT_CC_TO` | **Solo en desarrollo:** desvía la copia (la del deportista) a otra dirección, p. ej. el correo del docente a tu institucional y la copia a tu personal. Solo funciona junto con `MAIL_REDIRECT_TO`; sola no redirige nada. |

Sin `MAIL_HOST`, fuera de producción el backend crea una cuenta de prueba de **Ethereal**: el correo no se entrega y en la consola aparece "Vista previa del correo: https://ethereal.email/message/…".

## Endpoints

| Método | Ruta | Uso | Permiso |
| --- | --- | --- | --- |
| GET | `/api/me/training-absence-requests/history?status=&from=&to=&subject=` | Historial del deportista (HU14) | Sesión de deportista activo |
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
6. HU14: con `athlete.demo@icesi.edu.co`, abrir "Historial". Verificar el orden, filtrar por estado, materia y fechas ("Este semestre"), confirmar el mensaje "No hay solicitudes con esos filtros." cuando nada coincide y abrir un detalle sin acciones.
7. HU18: con la migración 010 aplicada y el correo configurado, aprobar como entrenador una solicitud pendiente. Verificar el correo (en el buzón de `MAIL_REDIRECT_TO` o en el enlace de Ethereal de la consola): destinatario y copia en el asunto, datos completos, aclaración de Bienestar y PDF adjunto. Luego, como deportista, la campana y el Historial deben indicar que el correo fue enviado. Para probar un fallo, poner una `MAIL_PASSWORD` incorrecta, aprobar otra solicitud y confirmar que sigue aprobada y que la bandeja del entrenador muestra el error.
8. Pruebas unitarias: `yarn test src/absence-request-review`, `yarn test src/training-absence-requests` y `yarn test src/teacher-notifications` en `backend/api`.
