// Datos mínimos para probar HU4 (registrar competencia) y HU6 (editar competencia).
// Es idempotente: se puede ejecutar varias veces sin duplicar datos.
// Requisito: haber iniciado el backend al menos una vez para que TypeORM cree las tablas.
// Uso: yarn seed:competitions
require('dotenv').config({ quiet: true });
const { Client } = require('pg');

const DEMO_COACH = 'coach.demo@icesi.edu.co';
const DEMO_TEAMS = [
  { name: 'Selección Fútbol Masculino', sport: 'Fútbol' },
  { name: 'Selección Voleibol Femenino', sport: 'Voleibol' },
];

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
    const { rows: [tables] } = await client.query(`SELECT to_regclass('public.teams') AS teams, to_regclass('public.competitions') AS competitions`);
    if (!tables.teams || !tables.competitions) throw new Error('Faltan las tablas teams/competitions. Inicia el backend una vez (yarn start:dev) y vuelve a ejecutar el seed.');

    await client.query('BEGIN');
    const { rows: [permission] } = await client.query(
      `INSERT INTO permissions (code, description) VALUES ('competitions:manage', 'Registrar y editar competencias')
       ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description RETURNING id`,
    );
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, $1 FROM roles r WHERE r.name IN ('coach', 'admin')
       ON CONFLICT DO NOTHING`,
      [permission.id],
    );

    const { rows: [coach] } = await client.query('SELECT id FROM users WHERE email = $1', [DEMO_COACH]);
    if (!coach) throw new Error(`No existe el usuario ${DEMO_COACH}.`);
    for (const team of DEMO_TEAMS) {
      await client.query(
        `INSERT INTO teams (name, sport, coach_id) VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET coach_id = EXCLUDED.coach_id`,
        [team.name, team.sport, coach.id],
      );
    }
    await client.query('COMMIT');
    console.log(`Listo: permiso competitions:manage asignado a coach/admin y ${DEMO_TEAMS.length} equipos asignados a ${DEMO_COACH}.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => { console.error(error.message); process.exit(1); });
