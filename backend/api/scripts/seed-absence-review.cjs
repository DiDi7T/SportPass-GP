// Datos mínimos para probar HU16 (bandeja del profesor) y HU20 (historial general).
// Es idempotente: se puede ejecutar varias veces sin duplicar datos.
// - Crea el rol `professor` con el permiso `absence-requests:review`.
// - Asigna `absence-requests:history` al rol `admin`.
// - Crea un usuario profesor por cada docente demo de `academic_courses` (HU10), con la
//   contraseña de prueba DEMO_PASSWORD. Una cuenta existente no cambia de contraseña.
// Requisito: haber iniciado el backend al menos una vez para que TypeORM cree las tablas.
// Uso: yarn seed:absence-review
require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const DEMO_PASSWORD = 'SportPass-Docente-2026!';
const DEMO_TEACHERS = [
  { email: 'docente.demo1@icesi.edu.co', fullName: 'Docente Demo Uno' },
  { email: 'docente.demo2@icesi.edu.co', fullName: 'Docente Demo Dos' },
  { email: 'docente.demo3@icesi.edu.co', fullName: 'Docente Demo Tres' },
];
const PERMISSIONS = [
  { code: 'absence-requests:review', description: 'Revisar las solicitudes de ausencia de los cursos que dicta', role: 'professor' },
  { code: 'absence-requests:history', description: 'Consultar y exportar el historial general de solicitudes', role: 'admin' },
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
    const { rows: [tables] } = await client.query(`SELECT to_regclass('public.training_absence_requests') AS requests`);
    if (!tables.requests) throw new Error('Falta la tabla training_absence_requests. Inicia el backend una vez (yarn start:dev) y vuelve a ejecutar el seed.');

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO roles (name, description) VALUES ('professor', 'Profesor de la universidad')
       ON CONFLICT (name) DO NOTHING`,
    );
    for (const permission of PERMISSIONS) {
      const { rows: [saved] } = await client.query(
        `INSERT INTO permissions (code, description) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description RETURNING id`,
        [permission.code, permission.description],
      );
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, $1 FROM roles r WHERE r.name = $2
         ON CONFLICT DO NOTHING`,
        [saved.id, permission.role],
      );
    }
    for (const teacher of DEMO_TEACHERS) {
      const { rows: [user] } = await client.query(
        `INSERT INTO users (email, full_name, password_hash) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET full_name = users.full_name RETURNING id`,
        [teacher.email, teacher.fullName, passwordHash],
      );
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, r.id FROM roles r WHERE r.name = 'professor'
         ON CONFLICT DO NOTHING`,
        [user.id],
      );
    }
    await client.query('COMMIT');
    console.log(`Listo: rol professor con ${DEMO_TEACHERS.length} profesores demo y permisos de HU16/HU20 asignados.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => { console.error(error.message); process.exit(1); });
