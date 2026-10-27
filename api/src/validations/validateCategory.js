const {
  isValidCategoryName,
  isValidCategoryDescription,
} = require("../utils/validators/categoryValidator");

module.exports = function validateCategory({ name, description }, update) {
  if (update) {
    if (name === undefined && description === undefined) {
      throw {
        status: 400,
        message: "Nenhum campo fornecido para atualizar.",
      };
    }
  } else {
    if (name === undefined || name === null || name === "") {
      throw {
        status: 400,
        message: "Todos os campos devem ser preenchidos.",
      };
    }
  }

  if (name !== undefined && !isValidCategoryName(name)) {
    throw {
      status: 400,
      message: "O nome da categoria é inválido.",
    };
  }

  if (
    description !== undefined &&
    description !== null &&
    !isValidCategoryDescription(description)
  ) {
    throw {
      status: 400,
      message: "A descrição da categoria é inválida.",
    };
  }
};
