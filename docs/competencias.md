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

## Cómo probar

1. Backend: crear `backend/api/.env` con los datos de la BD, luego `yarn install` y `yarn start:dev` (puerto 3001). Al arrancar, TypeORM crea las tablas `teams` y `competitions`.
2. Datos de prueba (una sola vez): `yarn seed:competitions` en `backend/api`. Crea el permiso `competitions:manage` para los roles coach y admin, y dos equipos asignados a `coach.demo@icesi.edu.co`.
3. Frontend: `npm install` y `npm run dev` en `frontend/sportpassapp`, y abrir http://localhost:3000/competencias.
4. Iniciar sesión con el entrenador demo y recorrer los criterios:
   - HU4 CA1/CA5: registrar una competencia → aparece el mensaje de éxito y la competencia en el calendario del equipo.
   - HU4 CA2: guardar con campos vacíos → se marcan en rojo y aparece "Todos los campos son obligatorios."
   - HU4 CA3: fecha de ayer → "No se puede registrar una competencia con fecha pasada."
   - HU4 CA4: hora de fin igual o anterior a la de inicio → "La fecha y hora de fin deben ser posteriores a las de inicio."
   - HU6: botón "Editar" → cambiar solo el lugar o solo la fecha → mensaje "Competencia actualizada correctamente." con los datos nuevos; el resto no cambia.
   - Con `athlete.demo@icesi.edu.co` la pantalla indica que no tiene permiso (y la API responde 403).
5. Pruebas unitarias del backend: `yarn test` en `backend/api`.

### Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/competitions/teams` | Equipos que gestiona el entrenador (admin: todos) |
| POST | `/api/competitions` | Registrar competencia (HU4) |
| GET | `/api/competitions?teamId=` | Listado / calendario de competencias gestionables (HU6 CA1) |
| GET | `/api/competitions/:id` | Detalle |
| PATCH | `/api/competitions/:id` | Editar fecha, hora y/o lugar (HU6) |
