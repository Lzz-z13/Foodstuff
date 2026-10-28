const { isValidUserPhoto } = require("../utils/validators/userValidator");

module.exports = function validateUserPhoto(photo) {
  if (photo === undefined) {
    throw {
      status: 400,
      message: "A foto deve ser informada.",
    };
  }

  if (!isValidUserPhoto(photo)) {
    throw {
      status: 400,
      message:
        "A foto informada é inválida. Envie uma URL http(s) ou uma imagem PNG, JPEG, GIF ou WEBP de até 5 MB.",
    };
  }
};
