const { isValidItems } = require("../utils/validators/orderValidator");

module.exports = function validateOrder({ items }) {
  if (items === undefined || items === null) {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidItems(items)) {
    throw {
      status: 400,
      message: "Os itens do pedido são inválidos.",
    };
  }
};
