const { isValidProductId } = require("../utils/validators/productValidator");

module.exports = function validateProductId(product_id) {
  if (product_id === undefined || product_id === null || product_id === "") {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidProductId(product_id)) {
    throw {
      status: 400,
      message: "O ID do produto é inválido.",
    };
  }
};
