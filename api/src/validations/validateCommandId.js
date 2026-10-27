const {
  isValidCommandId,
} = require("../utils/validators/commandValidator");

module.exports = function validateCommandId(command_id) {
  if (
    command_id === undefined ||
    command_id === null ||
    command_id === ""
  ) {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidCommandId(command_id)) {
    throw {
      status: 400,
      message: "O ID da comanda é inválido.",
    };
  }
};