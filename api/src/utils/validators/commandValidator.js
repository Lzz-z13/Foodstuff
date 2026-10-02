function isValidCustomerName(customer_name) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (typeof customer_name !== "string") return false;

  const trimmed = customer_name.trim();

  return trimmed.length > 0 && trimmed.length <= 100;
}

function isValidSessionToken(session_token) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (typeof session_token !== "string") return false;

  // Formato UUID gerado pelo backend (crypto.randomUUID()).
  const tokenRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return tokenRegex.test(session_token);
}

module.exports = {
  isValidCustomerName,
  isValidSessionToken,
};
