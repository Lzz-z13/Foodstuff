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

const MAX_PHOTO_LENGTH = 8 * 1024 * 1024;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_URL_LENGTH = 2048;

function hasValidImageSignature(buffer, mime) {
  if (mime === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mime === "image/jpeg" || mime === "image/jpg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mime === "image/gif") {
    return (
      buffer.length >= 6 &&
      buffer.toString("ascii", 0, 3) === "GIF" &&
      buffer[3] >= 0x37 &&
      buffer[3] <= 0x39 &&
      buffer[4] === 0x61
    );
  }

  if (mime === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return false;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidUserPhoto(photo) {
  if (process.env.SKIP_VALIDATORS === "true") return true;

  if (photo === null || photo === "") return true;

  if (typeof photo !== "string") return false;

  const trimmed = photo.trim();

  if (trimmed === "") return true;

  if (trimmed.length > MAX_PHOTO_LENGTH) return false;

  if (isHttpUrl(trimmed)) {
    return trimmed.length <= MAX_PHOTO_URL_LENGTH;
  }

  const match = trimmed.match(
    /^data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=]+)$/i,
  );

  if (!match) return false;

  const mime = `image/${match[1].toLowerCase()}`;
  const buffer = Buffer.from(match[2], "base64");

  if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) {
    return false;
  }

  return hasValidImageSignature(buffer, mime);
}

module.exports = {
  isValidUserName,
  isValidUserId,
  isValidUserPhoto,
};