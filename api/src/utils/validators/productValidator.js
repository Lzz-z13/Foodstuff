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

  if (trimmed.startsWith("data:")) {
    const match = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(trimmed);
    if (!match || match[2].length % 4 !== 0) return false;
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > 2 * 1024 * 1024) return false;
    const signatures = {
      jpeg: bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
      png: bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      gif: ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString()),
      webp: bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP",
    };
    return signatures[match[1]];
  }
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
