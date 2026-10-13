const {
  isValidCategoryId,
} = require("../utils/validators/categoryValidator");

module.exports = function validateCategoryId(category_id) {
  if (category_id === undefined || category_id === null || category_id === "") {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidCategoryId(category_id)) {
    throw {
      status: 400,
      message: "O ID da categoria é inválido.",
    };
  }
};
