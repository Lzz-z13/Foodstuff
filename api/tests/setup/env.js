const { TEST_DB_NAME } = require("./constants");
const { loadEnvFile } = require("./environment");

// Aponta o pool da aplicação para o banco de testes antes de qualquer
// require do src/. O dotenv-safe existente não sobrescreve variáveis que
// já estejam definidas no ambiente.
process.env.DB_NAME = TEST_DB_NAME;

loadEnvFile();