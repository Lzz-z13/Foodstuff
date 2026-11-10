const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..", "..");
const testEnvPath = path.join(projectRoot, ".env.test");
const envPath = fs.existsSync(testEnvPath) ? testEnvPath : path.join(projectRoot, ".env");

function loadEnvFile() {
  // Nunca usar credenciais reais de Pix nos testes automatizados.
  process.env.MP_ACCESS_TOKEN = 'test-access-token';
  process.env.MP_PAYER_EMAIL = 'payer@foodstuff.test';
  process.env.MP_WEBHOOK_SECRET = 'foodstuff-test-webhook-secret';
  return require("dotenv-safe").config({ path: envPath });
}

module.exports = {
  envPath,
  loadEnvFile,
};
