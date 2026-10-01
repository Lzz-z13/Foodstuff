function isValidQrCodePosition(position) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  return Number.isInteger(position) && position >= 1 && position <= 4;
}

module.exports = {
  isValidQrCodePosition,
};