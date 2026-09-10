module.exports = function validateCourse(
  { number },
  update
) {
  if (update) {
    if (!number) {
      throw {
        status: 400,
        message: "Nenhum campo fornecido para atualizar.",
      };
    }
  } else {
    if (!number) {
      throw {
        status: 400,
        message: "Todos os campos devem ser preenchidos.",
      };
    }
  }

  if (number && isNaN(number)) {
    throw {
      status: 400,
      message: "O número de mesa inválido.",
    };
  }
};