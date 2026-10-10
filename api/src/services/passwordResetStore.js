const crypto = require("crypto");

const SECRET = process.env.SECRET;

if (!SECRET) {
  throw new Error("A variável SECRET precisa estar configurada.");
}

// Deriva chaves específicas a partir do SECRET existente via HKDF.
// O SECRET do JWT nunca é reutilizado diretamente como chave de HMAC.
function deriveKey(info) {
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(SECRET, "utf8"),
      Buffer.from("foodstuff-password-reset", "utf8"),
      Buffer.from(info, "utf8"),
      32,
    ),
  );
}

const otpKey = deriveKey("password-reset-otp-v1");
const resetTokenKey = deriveKey("password-reset-token-v1");

const OTP_TTL_MS = 5 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const REQUEST_COOLDOWN_MS = 60 * 1000;

// user_id -> { hash: <hex>, expiresAt, attempts }
const otpEntries = new Map();
// tokenHashHex -> { userId, expiresAt }
const resetTokens = new Map();
// tokenHashHex em processo de confirmação (trava contra consumo concorrente)
const resetTokensInFlight = new Set();
// email normalizado -> timestamp da última solicitação
const requestLog = new Map();

function hashOtp(userId, otp) {
  return crypto
    .createHmac("sha256", otpKey)
    .update(`${userId}:${String(otp)}`)
    .digest();
}

function hashResetToken(token) {
  return crypto
    .createHmac("sha256", resetTokenKey)
    .update(String(token))
    .digest();
}

// Localiza a entrada do token comparando hashes com timingSafeEqual,
// sem expor qual parte da verificação falhou.
function findResetEntry(hash) {
  for (const [key, entry] of resetTokens) {
    const stored = Buffer.from(key, "hex");

    if (
      stored.length === hash.length &&
      crypto.timingSafeEqual(stored, hash)
    ) {
      return { key, entry };
    }
  }

  return null;
}

function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

// Salvar um código novo invalida o anterior (um único OTP válido por usuário).
function saveOtp(userId, otp) {
  otpEntries.set(userId, {
    hash: hashOtp(userId, otp).toString("hex"),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
}

// Operação síncrona e atômica: verificar e consumir acontecem no mesmo tick,
// então duas requisições concorrentes nunca consomem o mesmo código.
function verifyOtp(userId, otp) {
  const entry = otpEntries.get(userId);

  if (!entry) {
    return { ok: false, reason: "invalid" };
  }

  if (Date.now() >= entry.expiresAt) {
    otpEntries.delete(userId);
    return { ok: false, reason: "expired" };
  }

  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    otpEntries.delete(userId);
    return { ok: false, reason: "locked" };
  }

  const received = hashOtp(userId, otp);
  const stored = Buffer.from(entry.hash, "hex");

  const matches =
    received.length === stored.length &&
    crypto.timingSafeEqual(received, stored);

  if (!matches) {
    entry.attempts += 1;

    if (entry.attempts >= MAX_OTP_ATTEMPTS) {
      otpEntries.delete(userId);
      return { ok: false, reason: "locked" };
    }

    return { ok: false, reason: "invalid" };
  }

  otpEntries.delete(userId);
  return { ok: true, reason: "ok" };
}

function removeOtp(userId) {
  otpEntries.delete(userId);
}

function revokeUserTokens(userId) {
  for (const [key, entry] of resetTokens) {
    if (entry.userId === userId) {
      resetTokensInFlight.delete(key);
      resetTokens.delete(key);
    }
  }
}

// Emite um token opaco de alta entropia (256 bits). Apenas o hash é guardado.
// Um token novo invalida os anteriores do mesmo usuário (uso único por fluxo).
function issueResetToken(userId) {
  revokeUserTokens(userId);

  const token = crypto.randomBytes(32).toString("hex");

  resetTokens.set(hashResetToken(token).toString("hex"), {
    userId,
    expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
  });

  return token;
}

// Reserva o token para a confirmação em andamento. Enquanto reservado, outras
// requisições com o mesmo token são recusadas (sem await entre checar e
// reservar, a operação é atômica no event loop de instância única).
function acquireResetToken(token) {
  const found = findResetEntry(hashResetToken(token));

  if (!found) {
    return null;
  }

  if (Date.now() >= found.entry.expiresAt) {
    resetTokensInFlight.delete(found.key);
    resetTokens.delete(found.key);
    return null;
  }

  if (resetTokensInFlight.has(found.key)) {
    return null;
  }

  resetTokensInFlight.add(found.key);

  return { userId: found.entry.userId, expiresAt: found.entry.expiresAt };
}

// Libera a reserva sem invalidar o token (falha antes da conclusão:
// o usuário pode tentar de novo dentro da validade).
function releaseResetToken(token) {
  const found = findResetEntry(hashResetToken(token));

  if (found) {
    resetTokensInFlight.delete(found.key);
  }
}

// Invalida definitivamente o token (uso único após a conclusão).
function destroyResetToken(token) {
  const found = findResetEntry(hashResetToken(token));

  if (found) {
    resetTokensInFlight.delete(found.key);
    resetTokens.delete(found.key);
  }
}

function isThrottled(emailKey) {
  const last = requestLog.get(emailKey);

  return last !== undefined && Date.now() - last < REQUEST_COOLDOWN_MS;
}

function markRequest(emailKey) {
  requestLog.set(emailKey, Date.now());
}

// Remove entradas expiradas para não acumular estado indefinidamente.
// Também é executada periodicamente (ver timer abaixo).
function purgeExpired() {
  const now = Date.now();

  for (const [key, entry] of otpEntries) {
    if (now >= entry.expiresAt) {
      otpEntries.delete(key);
    }
  }

  for (const [key, entry] of resetTokens) {
    if (now >= entry.expiresAt) {
      resetTokensInFlight.delete(key);
      resetTokens.delete(key);
    }
  }

  for (const [key, timestamp] of requestLog) {
    if (now - timestamp >= REQUEST_COOLDOWN_MS) {
      requestLog.delete(key);
    }
  }
}

const cleanupTimer = setInterval(purgeExpired, 60 * 1000);

if (typeof cleanupTimer.unref === "function") {
  cleanupTimer.unref();
}

module.exports = {
  OTP_TTL_MS,
  RESET_TOKEN_TTL_MS,
  MAX_OTP_ATTEMPTS,
  REQUEST_COOLDOWN_MS,
  generateOtp,
  saveOtp,
  verifyOtp,
  removeOtp,
  issueResetToken,
  acquireResetToken,
  releaseResetToken,
  destroyResetToken,
  revokeUserTokens,
  isThrottled,
  markRequest,
  purgeExpired,
};
