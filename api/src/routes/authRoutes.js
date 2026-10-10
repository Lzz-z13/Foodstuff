const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");

// const loginRateLimiter = require("../middlewares/rateLimiter");

const UserController = require("../controllers/userController");

function tooManyRequestsHandler(message) {
  return (req, res) =>
    res.status(429).json({
      error: true,
      message,
    });
}

// Limites por IP (proteção complementar ao controle por conta que vive no
// passwordResetStore e aos limites de tentativas por código). O rate limiting
// em memória não é proteção absoluta com múltiplas instâncias da API.
const requestPasswordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooManyRequestsHandler(
    "Muitas solicitações. Tente novamente em alguns minutos.",
  ),
});

const verifyPasswordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooManyRequestsHandler(
    "Muitas tentativas. Tente novamente em alguns minutos.",
  ),
});

const confirmPasswordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooManyRequestsHandler(
    "Muitas tentativas. Tente novamente em alguns minutos.",
  ),
});

router.post(
  "/login",
  UserController.loginUser
);

router.post(
  "/password-reset/request",
  requestPasswordResetLimiter,
  UserController.requestPasswordReset
);

router.post(
  "/password-reset/verify",
  verifyPasswordResetLimiter,
  UserController.verifyPasswordReset
);

router.post(
  "/password-reset/confirm",
  confirmPasswordResetLimiter,
  UserController.confirmPasswordReset
);

module.exports = router;
