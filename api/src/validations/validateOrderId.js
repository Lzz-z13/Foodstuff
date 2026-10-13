const { isValidOrderId } = require("../utils/validators/orderValidator");

module.exports = function validateOrderId(order_id) {
  if (order_id === undefined || order_id === null || order_id === "") {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidOrderId(order_id)) {
    throw {
      status: 400,
      message: "O ID do pedido é inválido.",
    };
  }
};
