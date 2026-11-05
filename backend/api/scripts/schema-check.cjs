// Dry-run de `synchronize`: muestra el SQL que TypeORM ejecutaría sobre la BD al iniciar
// Nest con synchronize=true, SIN ejecutarlo. Si la salida dice "Sin diferencias", las
// entidades coinciden con la BD y arrancar Nest no la modifica.
// Uso: yarn build && yarn schema:check
require('dotenv').config({ quiet: true });
require('reflect-metadata');
const path = require('node:path');
const { DataSource } = require('typeorm');

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    entities: [path.join(__dirname, '../dist/**/*.entity.js')],
    synchronize: false,
  });
  await dataSource.initialize();
  try {
    const { upQueries } = await dataSource.driver.createSchemaBuilder().log();
    if (upQueries.length === 0) {
      console.log('Sin diferencias: las entidades coinciden con la BD. Es seguro iniciar Nest.');
      return;
    }
    console.log(`ATENCIÓN: synchronize ejecutaría ${upQueries.length} sentencia(s):\n`);
    for (const { query } of upQueries) console.log(`${query};`);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
