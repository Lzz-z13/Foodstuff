const {
  isValidQrCodeToken,
} = require("../utils/validators/qrCodeValidator");

module.exports = function validateQrCodeToken(token) {
  if (token === undefined || token === null || token === "") {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidQrCodeToken(token)) {
    throw {
      status: 400,
      message: "Token do QR Code inválido.",
    };
  }
};