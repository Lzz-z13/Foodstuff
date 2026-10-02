function isValidTableNumber(number) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  return Number.isInteger(number) && number > 0;
}

function isValidTableId(table_id) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  // req.params chega sempre como string
  const id = Number(table_id);

  return Number.isInteger(id) && id > 0;
}

module.exports = {
  isValidTableNumber,
  isValidTableId,
};