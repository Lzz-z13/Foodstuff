const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..", "..");
const testEnvPath = path.join(projectRoot, ".env.test");
const envPath = fs.existsSync(testEnvPath) ? testEnvPath : path.join(projectRoot, ".env");

function loadEnvFile() {
  return require("dotenv-safe").config({ path: envPath });
}

module.exports = {
  envPath,
  loadEnvFile,
};