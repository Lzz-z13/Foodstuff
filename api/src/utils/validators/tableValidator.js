function isValidTableNumber(number) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  return Number.isInteger(number) && number > 0;
}

module.exports = {
  isValidTableNumber,
};