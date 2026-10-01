const {
  isValidQrCodeId,
} = require("../utils/validators/qrCodeValidator");

module.exports = function validateQrCodeId(qr_code_id) {
  if (qr_code_id === undefined || qr_code_id === null || qr_code_id === "") {
    throw {
      status: 400,
      message: "Todos os campos devem ser preenchidos.",
    };
  }

  if (!isValidQrCodeId(qr_code_id)) {
    throw {
      status: 400,
      message: "O ID do QR Code é inválido.",
    };
  }
};