const {
  isValidCustomerName,
} = require("../utils/validators/commandValidator");

module.exports = function validateCommand({ customer_name }) {
  if (
    customer_name === undefined ||
    customer_name === null ||
    customer_name === ""
  ) {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidCustomerName(customer_name)) {
    throw {
      status: 400,
      message: "O nome do cliente é inválido.",
    };
  }
};
