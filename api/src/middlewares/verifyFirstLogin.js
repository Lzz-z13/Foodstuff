function verifyFirstLogin(req, res, next) {
  const user = req.user; 

  if (!user) {
    return res.status(401).json({ message: "Usuário não autenticado." });
  }

  if (user.first_login === 1) {
    return res.status(403).json({ 
      message: "Acesso negado. Altere sua senha para continuar." 
    });
  }

  next();
};

module.exports = verifyFirstLogin;