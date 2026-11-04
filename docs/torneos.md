# Oferta de torneos (SCRUM-17 / HU8)

**Como** estudiante de Icesi
**quiero** consultar la programación y ubicación de los partidos de los torneos
**para** poder asistir, apoyar a los equipos y saber siempre dónde encontrar esta información.

### CA1: Consultar la programación de partidos
- **Dado que** el estudiante accede a SportPass,
- **cuando** ingresa al módulo de torneos o partidos,
- **entonces** el sistema muestra los partidos programados con su fecha, hora, equipos participantes y torneo correspondiente.

### CA2: Consultar la ubicación de los partidos
- **Dado que** el estudiante consulta un partido programado,
- **cuando** accede a sus detalles,
- **entonces** el sistema muestra el lugar donde se disputará, incluyendo el nombre del escenario deportivo y su dirección, cuando esté disponible.

### CA3: Diferenciar el estado de los partidos
- **Dado que** existen partidos con diferentes estados,
- **cuando** el estudiante consulta la programación,
- **entonces** el sistema identifica si cada partido está programado, aplazado, cancelado o finalizado.

### CA4: Acceso a la programación
- **Dado que** el estudiante desea consultar los partidos de los torneos,
- **cuando** ingresa al módulo de programación,
- **entonces** el sistema le permite consultar la información sin necesidad de tener permisos de entrenador o administrador.

## Decisiones

- Un partido es una competencia registrada en HU4. A la competencia se le agregaron `status` (por defecto `programada`), `opponent` y `venue_address`, todos opcionales o con valor por defecto para no afectar HU4/HU6.
- Estados guardados: `programada`, `aplazada` y `cancelada`. `finalizada` no se guarda: se calcula al leer cuando ya pasó la fecha y hora de fin (hora de Bogotá, UTC-5) y el partido no está cancelado.
- La consulta es de solo lectura y solo exige sesión iniciada (`AccessGuard`); no usa `@RequirePermission`. El login ya restringe el acceso a cuentas `@icesi.edu.co`.
- Solo se muestran partidos de equipos activos y no se expone quién creó la competencia ni datos del entrenador.
- Ningún endpoint asigna todavía `aplazada`, el rival ni la dirección; `cancelada` la asignará SCRUM-21.

## Cómo probar

1. Backend: `yarn start:dev` en `backend/api` desde esta rama, para que TypeORM cree las columnas nuevas.
2. Datos de prueba (una sola vez, se puede repetir): `yarn seed:competitions` y luego `yarn seed:tournaments` en `backend/api`. Crea cuatro partidos `[Demo]`, uno por estado; las fechas se recalculan desde el día en que se ejecuta.
3. Frontend: `npm install` y `npm run dev` en `frontend/sportpassapp`, y abrir http://localhost:3000/torneos.
4. Recorrer los criterios:
   - CA1: la lista muestra cada partido con equipos (Icesi vs rival o "Rival por confirmar"), torneo, fecha y hora, escenario, deporte y tipo.
   - CA2: abrir "[Demo] Copa Universitaria · Programado" → escenario, dirección y enlace "Ver en el mapa"; en "[Demo] Liga Regional · Aplazado" la dirección dice "No disponible".
   - CA3: los cuatro partidos `[Demo]` aparecen como Programado (verde), Aplazado (ámbar), Cancelado (rojo y tachado) y Finalizado (gris).
   - CA4: entrar con `athlete.demo@icesi.edu.co`, `coach.demo@icesi.edu.co` y `admin.demo@icesi.edu.co`; los tres ven lo mismo. En `/competencias` el deportista sigue sin permiso.
   - `/torneos/abc` o un id inexistente muestran "Partido no encontrado."
5. Pruebas unitarias del backend: `yarn test` en `backend/api` (`tournaments.service.spec.ts` cubre CA1–CA3 y `tournaments.controller.spec.ts` cubre CA4).

### Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/tournaments/matches` | Programación de partidos (CA1, CA3) |
| GET | `/api/tournaments/matches/:id` | Detalle con escenario y dirección (CA2) |
