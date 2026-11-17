const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { TEST_DB_NAME } = require("./constants");
const { loadEnvFile } = require("./environment");

loadEnvFile();

module.exports = async function globalSetup() {
  if (TEST_DB_NAME !== 'foodstuff_test' || !process.env.TEST_DB_USER || process.env.TEST_DB_PASSWORD === undefined) {
    throw new Error('Testes exigem foodstuff_test e credenciais exclusivas em TEST_DB_USER/TEST_DB_PASSWORD.');
  }
  const schemaPath = path.join(
    __dirname,
    "..",
    "..",
    "mysql-database",
    "database.sql",
  );

  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  // Remove `CREATE DATABASE ...;` e `USE foodstuff;` do arquivo:
  // os testes nunca tocam no banco de desenvolvimento.
  const statements = schemaSql
    .replace(/^CREATE DATABASE\s+[^;]*;\s*/im, "")
    .replace(/^USE\s+[^;]*;\s*/im, "");

  const fixtureSql = fs.readFileSync(path.join(__dirname, "demo-fixture.sql"), "utf8");

  const fullSql = `
    DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\`;
    CREATE DATABASE \`${TEST_DB_NAME}\`;
    USE \`${TEST_DB_NAME}\`;
    ${statements}
    ${fixtureSql}
  `;

  // Conexão administrativa separada, com credenciais próprias de teste.
  // Nunca usa as credenciais de desenvolvimento.
  const connection = await mysql.createConnection({
    host: process.env.TEST_DB_HOST || process.env.DB_HOST,
    port: process.env.TEST_DB_PORT || process.env.DB_PORT,
    user: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD,
    charset: "UTF8MB4_0900_AI_CI",
    multipleStatements: true,
  });

  await connection.query(fullSql);
  await connection.end();

  console.log(`Banco de testes ${TEST_DB_NAME} recriado com sucesso.`);
};
