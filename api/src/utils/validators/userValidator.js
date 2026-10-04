function isValidUserName(name) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (typeof name !== "string") return false;

  // users.name é VARCHAR(100) NOT NULL: a API valida antes do banco para não
  // transformar "Data too long" em erro 500.
  const trimmed = name.trim();

  return trimmed.length >= 1 && trimmed.length <= 100;
}

function isValidUserId(user_id) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  // req.params chega sempre como string
  if (typeof user_id !== "string") return false;

  // users.user_id é CHAR(36) preenchido com UUID gerado pelo backend
  // (crypto.randomUUID()).
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return uuidRegex.test(user_id);
}

module.exports = {
  isValidUserName,
  isValidUserId,
};