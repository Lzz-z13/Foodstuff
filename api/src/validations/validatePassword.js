const { isValidPassword } = require("../utils/validators/passwordValidator");

module.exports = function validatePassword(password) {
  if (!password) {
    throw {
      status: 400,
      message: "Senha não fornecida.",
    };
  }

  if (!isValidPassword(password)) {
    throw {
      status: 400,
      message: "A senha deve ter no mínimo 8 caracteres, incluindo uma letra maiúscula, uma minúscula e um caractere especial.",
    };
  }
};