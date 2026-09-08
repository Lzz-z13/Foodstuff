function verifyRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: "Usuário não identificado no token.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: "Acesso negado.",
      });
    }

    next();
  };
}

module.exports = verifyRole;