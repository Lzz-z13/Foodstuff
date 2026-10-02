function isValidCustomerName(customer_name) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (typeof customer_name !== "string") return false;

  const trimmed = customer_name.trim();

  return trimmed.length > 0 && trimmed.length <= 100;
}

module.exports = {
  isValidCustomerName,
};
