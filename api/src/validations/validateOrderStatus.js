const { isValidOrderStatus } = require("../utils/validators/orderValidator");

module.exports = function validateOrderStatus(status) {
  if (status === undefined || status === null || status === "") {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidOrderStatus(status)) {
    throw {
      status: 400,
      message: "O status do pedido é inválido.",
    };
  }
};
