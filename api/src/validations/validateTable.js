const { isValidTableNumber } = require("../utils/validators/tableValidator");

module.exports = function validateTable({ number }, update) {
  if (update) {
    if (number === undefined) {
      throw {
        status: 400,
        message: "Nenhum campo fornecido para atualizar.",
      };
    }
  } else {
    if (number === undefined || number === null || number === "") {
      throw {
        status: 400,
        message: "Todos os campos devem ser preenchidos.",
      };
    }
  }

  if (!isValidTableNumber(number)) {
    throw {
      status: 400,
      message: "O número da mesa é inválido.",
    };
  }
};