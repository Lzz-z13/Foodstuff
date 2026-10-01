function isValidQrCodePosition(position) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  return Number.isInteger(position) && position >= 1 && position <= 4;
}

function isValidQrCodeToken(token) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (typeof token !== "string") return false;

  // Formato UUID gerado pelo backend (crypto.randomUUID()).
  const tokenRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return tokenRegex.test(token);
}

function isValidQrCodeId(qr_code_id) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  // req.params chega sempre como string
  const id = Number(qr_code_id);

  return Number.isInteger(id) && id > 0;
}

module.exports = {
  isValidQrCodePosition,
  isValidQrCodeToken,
  isValidQrCodeId,
};