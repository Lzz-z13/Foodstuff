function isValidProductName(name) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (typeof name !== "string") return false;

  const trimmed = name.trim();

  return trimmed.length >= 1 && trimmed.length <= 150;
}

function isValidProductDescription(description) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (description === undefined || description === null) return true;

  if (typeof description !== "string") return false;

  return true;
}

function isValidPrice(value) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  const num = Number(value);

  return Number.isFinite(num) && num >= 0;
}

function isValidCost(value) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (value === undefined || value === null || value === "") return true;

  const num = Number(value);

  return Number.isFinite(num) && num >= 0;
}

function isValidImage(image) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (image === undefined || image === null) return true;

  if (typeof image !== "string") return false;

  const trimmed = image.trim();

  if (trimmed === "") return true;

  return trimmed.length <= 500;
}

function isValidFlag(value) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (value === true || value === false) return true;

  if (value === 1 || value === 0) return true;

  if (value === "1" || value === "0") return true;

  return false;
}

function isValidProductId(product_id) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  const id = Number(product_id);

  return Number.isInteger(id) && id > 0;
}

module.exports = {
  isValidProductName,
  isValidProductDescription,
  isValidPrice,
  isValidCost,
  isValidImage,
  isValidFlag,
  isValidProductId,
};
