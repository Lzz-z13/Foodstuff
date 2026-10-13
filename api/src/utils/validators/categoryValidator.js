function isValidCategoryName(name) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (typeof name !== "string") return false;

  const trimmed = name.trim();

  return trimmed.length >= 1 && trimmed.length <= 100;
}

function isValidCategoryDescription(description) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (description === undefined || description === null) return true;

  if (typeof description !== "string") return false;

  return description.trim().length <= 255;
}

function isValidCategoryId(category_id) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  const id = Number(category_id);

  return Number.isInteger(id) && id > 0;
}

module.exports = {
  isValidCategoryName,
  isValidCategoryDescription,
  isValidCategoryId,
};
