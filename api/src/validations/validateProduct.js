const {
  isValidProductName,
  isValidProductDescription,
  isValidPrice,
  isValidCost,
  isValidImage,
  isValidFlag,
} = require("../utils/validators/productValidator");
const {
  isValidCategoryId,
} = require("../utils/validators/categoryValidator");

module.exports = function validateProduct(
  { name, description, price, cost, image, requires_preparation, is_available, category_id },
  update,
) {
  if (update) {
    if (
      name === undefined &&
      description === undefined &&
      price === undefined &&
      cost === undefined &&
      image === undefined &&
      requires_preparation === undefined &&
      is_available === undefined &&
      category_id === undefined
    ) {
      throw {
        status: 400,
        message: "Nenhum campo fornecido para atualizar.",
      };
    }
  } else {
    if (
      name === undefined ||
      name === null ||
      name === "" ||
      price === undefined ||
      price === null ||
      price === "" ||
      category_id === undefined ||
      category_id === null ||
      category_id === ""
    ) {
      throw {
        status: 400,
        message: "Todos os campos devem ser preenchidos.",
      };
    }
  }

  if (name !== undefined && !isValidProductName(name)) {
    throw {
      status: 400,
      message: "O nome do produto é inválido.",
    };
  }

  if (
    description !== undefined &&
    description !== null &&
    !isValidProductDescription(description)
  ) {
    throw {
      status: 400,
      message: "A descrição do produto é inválida.",
    };
  }

  if (price !== undefined && !isValidPrice(price)) {
    throw {
      status: 400,
      message: "O preço do produto é inválido.",
    };
  }

  if (
    cost !== undefined &&
    cost !== null &&
    cost !== "" &&
    !isValidCost(cost)
  ) {
    throw {
      status: 400,
      message: "O custo do produto é inválido.",
    };
  }

  if (image !== undefined && image !== null && !isValidImage(image)) {
    throw {
      status: 400,
      message: "A imagem do produto é inválida.",
    };
  }

  if (
    requires_preparation !== undefined &&
    !isValidFlag(requires_preparation)
  ) {
    throw {
      status: 400,
      message: "O campo requires_preparation é inválido.",
    };
  }

  if (is_available !== undefined && !isValidFlag(is_available)) {
    throw {
      status: 400,
      message: "O campo is_available é inválido.",
    };
  }

  if (category_id !== undefined && !isValidCategoryId(category_id)) {
    throw {
      status: 400,
      message: "A categoria do produto é inválida.",
    };
  }
};
