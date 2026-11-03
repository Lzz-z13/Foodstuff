function verifyFirstLogin(req, res, next) {
  if (Number(req.user.first_login) === 1) {
    return res.status(403).json({
      error: true,
      message: "Acesso negado. Altere sua senha para continuar.",
    });
  }

  next();
}

module.exports = verifyFirstLogin;
