// Partidos de prueba en los cuatro estados para la Oferta de torneos (SCRUM-17, CA3).
// Es idempotente: se puede ejecutar varias veces sin duplicar datos; las fechas se
// recalculan a partir de hoy para que "programado" siga en el futuro y "finalizado" en el pasado.
// Requisitos: haber ejecutado `yarn seed:competitions` (equipos demo) e iniciado el backend
// desde una rama con SCRUM-17 (columnas status, opponent y venue_address).
// Uso: yarn seed:tournaments
require('dotenv').config({ quiet: true });
const { Client } = require('pg');

const DEMO_COACH = 'coach.demo@icesi.edu.co';
const FOOTBALL = 'Selección Fútbol Masculino';
const VOLLEYBALL = 'Selección Voleibol Femenino';

// "finalizada" no se guarda: se calcula porque el partido ya terminó.
const MATCHES = [
  { name: '[Demo] Copa Universitaria · Programado', team: FOOTBALL, days: 7, startTime: '15:00', endTime: '17:00', location: 'Coliseo Universidad Icesi', type: 'local', status: 'programada', opponent: 'Universidad Javeriana', venueAddress: 'Calle 18 #122-135, Cali' },
  { name: '[Demo] Liga Regional · Aplazado', team: VOLLEYBALL, days: 14, startTime: '10:00', endTime: '12:00', location: 'Coliseo El Pueblo', type: 'regional', status: 'aplazada', opponent: 'Universidad del Valle', venueAddress: null },
  { name: '[Demo] Torneo Nacional · Cancelado', team: FOOTBALL, days: 10, startTime: '18:00', endTime: '20:00', location: 'Estadio Pascual Guerrero', type: 'nacional', status: 'cancelada', opponent: 'Universidad de los Andes', venueAddress: 'Calle 5 #34-00, Cali' },
  { name: '[Demo] Copa Interuniversitaria · Finalizado', team: VOLLEYBALL, days: -7, startTime: '14:00', endTime: '16:00', location: 'Coliseo 2 Universidad Icesi', type: 'local', status: 'programada', opponent: 'Universidad Autónoma de Occidente', venueAddress: 'Calle 18 #122-135, Cali' },
];

// Fecha de Bogotá (UTC-5, sin horario de verano) desplazada `days` días.
function bogotaDate(days) {
  const date = new Date(Date.now() - 5 * 3600000 + days * 86400000);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const { rows: [column] } = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'status'`,
    );
    if (!column) throw new Error('Falta la columna competitions.status. Inicia el backend desde la rama de SCRUM-17 (yarn start:dev) y vuelve a ejecutar el seed.');

    const { rows: [coach] } = await client.query('SELECT id FROM users WHERE email = $1', [DEMO_COACH]);
    if (!coach) throw new Error(`No existe el usuario ${DEMO_COACH}.`);
    const { rows: teams } = await client.query('SELECT id, name FROM teams WHERE name = ANY($1)', [[FOOTBALL, VOLLEYBALL]]);
    const teamId = Object.fromEntries(teams.map(team => [team.name, team.id]));
    if (!teamId[FOOTBALL] || !teamId[VOLLEYBALL]) throw new Error('Faltan los equipos demo. Ejecuta primero yarn seed:competitions.');

    await client.query('BEGIN');
    for (const match of MATCHES) {
      const date = bogotaDate(match.days);
      const values = [match.name, teamId[match.team], date, date, match.startTime, match.endTime, match.location, match.type, match.status, match.opponent, match.venueAddress, coach.id];
      const { rowCount } = await client.query(
        `UPDATE competitions SET team_id = $2, start_date = $3, end_date = $4, start_time = $5, end_time = $6, location = $7,
           type = $8, status = $9, opponent = $10, venue_address = $11, created_by = $12, updated_at = now()
         WHERE name = $1`,
        values,
      );
      if (!rowCount) {
        await client.query(
          `INSERT INTO competitions (name, team_id, start_date, end_date, start_time, end_time, location, type, status, opponent, venue_address, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          values,
        );
      }
    }
    await client.query('COMMIT');
    console.log(`Listo: ${MATCHES.length} partidos [Demo] (programado, aplazado, cancelado y finalizado).`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => { console.error(error.message); process.exit(1); });
