const {
  isValidQrCodePosition,
} = require("../utils/validators/qrCodeValidator");

module.exports = function validateQrCode({ position }) {
  if (position === undefined || position === null || position === "") {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidQrCodePosition(position)) {
    throw {
      status: 400,
      message: "A posição do QR Code é inválida.",
    };
  }
};