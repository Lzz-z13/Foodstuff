const { isValidUserId } = require("../utils/validators/userValidator");

module.exports = function validateUserId(user_id) {
  if (user_id === undefined || user_id === null || user_id === "") {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidUserId(user_id)) {
    throw {
      status: 400,
      message: "O ID do usuário é inválido.",
    };
  }
};