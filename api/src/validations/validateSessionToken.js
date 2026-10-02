const {
  isValidSessionToken,
} = require("../utils/validators/commandValidator");

module.exports = function validateSessionToken(session_token) {
  if (
    session_token === undefined ||
    session_token === null ||
    session_token === ""
  ) {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidSessionToken(session_token)) {
    throw {
      status: 400,
      message: "Token de sessão inválido.",
    };
  }
};
