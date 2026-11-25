// Permiso necesario para HU20 (historial general de solicitudes).
// Es idempotente: se puede ejecutar varias veces sin duplicar datos.
// - Crea el permiso `absence-requests:history` y lo asigna al rol `admin`.
// HU16 (bandeja del entrenador) usa el permiso `permissions:manage`, que el rol `coach` ya tiene.
// Requisito: haber iniciado el backend al menos una vez para que TypeORM cree las tablas.
// Uso: yarn seed:absence-review
require('dotenv').config({ quiet: true });
const { Client } = require('pg');

const HISTORY_PERMISSION = {
  code: 'absence-requests:history',
  description: 'Consultar y exportar el historial general de solicitudes',
  role: 'admin',
};

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
    const { rows: [tables] } = await client.query(`SELECT to_regclass('public.permissions') AS permissions`);
    if (!tables.permissions) throw new Error('Falta la tabla permissions. Inicia el backend una vez (yarn start:dev) y vuelve a ejecutar el seed.');

    await client.query('BEGIN');
    const { rows: [saved] } = await client.query(
      `INSERT INTO permissions (code, description) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description RETURNING id`,
      [HISTORY_PERMISSION.code, HISTORY_PERMISSION.description],
    );
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, $1 FROM roles r WHERE r.name = $2
       ON CONFLICT DO NOTHING`,
      [saved.id, HISTORY_PERMISSION.role],
    );
    await client.query('COMMIT');
    console.log('Listo: permiso absence-requests:history asignado al rol admin.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => { console.error(error.message); process.exit(1); });
