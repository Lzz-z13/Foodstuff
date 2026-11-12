const path = require("node:path");
const { createRequire } = require("node:module");

// Reutiliza a mesma função que o Expo já usa para mostrar o QR no terminal.
const expoRequire = createRequire(require.resolve("expo/package.json"));
const cliPath = path.dirname(expoRequire.resolve("@expo/cli/package.json"));
const { printQRCode } = require(path.join(cliPath, "build/src/utils/qr"));

async function main() {
  const token = process.argv[2];
  const mode = process.argv[3] || "expo";
  if (!token || !["expo", "app"].includes(mode)) {
    console.log("Uso: npm run qr:cliente -- TOKEN_DA_MESA [expo|app]");
    process.exitCode = 1;
    return;
  }

  const response = await fetch(
    `http://10.89.240.3:5000/api/foodstuff/qr-codes/token/${encodeURIComponent(token)}`,
    {
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.message || "QR Code não encontrado.");

  const prefix =
    mode === "app" ? "foodstuff://" : "exp://10.89.240.3:8081/--/";
  const url = `${prefix}mesa/${encodeURIComponent(token)}`;
  console.log(
    `\nMesa ${result.data.number} — ${mode === "app" ? "Foodstuff instalado" : "Expo Go"}`,
  );
  console.log(url);
  printQRCode(url).print();
}

main().catch((error) => {
  console.error("Não foi possível gerar o QR:", error.message);
  process.exitCode = 1;
});
