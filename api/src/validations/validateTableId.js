const { isValidTableId } = require("../utils/validators/tableValidator");

module.exports = function validateTableId(table_id) {
  if (table_id === undefined || table_id === null || table_id === "") {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidTableId(table_id)) {
    throw {
      status: 400,
      message: "O ID da mesa é inválido.",
    };
  }
};