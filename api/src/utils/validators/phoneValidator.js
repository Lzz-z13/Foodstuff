function normalizePhone(phone) {
  return String(phone).replace(/\D/g, "");
}

function isValidPhone(phone) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  return /^\d{11}$/.test(phone);
}

module.exports = {
  normalizePhone,
  isValidPhone,
};