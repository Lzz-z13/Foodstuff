const connect = require("../database/connect");

async function verifyActiveUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      auth: false,
      message: "Usuário não autenticado.",
    });
  }

  try {
    const [rows] = await connect.execute(
      `SELECT user_id
       FROM users
       WHERE user_id = ?
         AND is_active = 1
       LIMIT 1`,
      [req.user.id],
    );

    if (rows.length === 0) {
      return res.status(403).json({
        auth: false,
        message: "Usuário desativado.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = verifyActiveUser;