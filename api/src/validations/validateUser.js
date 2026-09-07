const {
  isValidEmail,
  hasAllowedDomain,
} = require("../utils/validators/emailValidator");

module.exports = function validateUser({ name, email, role }, update) {
  if (update) {
    if (!name && !email && !role) {
      throw {
        status: 400,
        message: "Nenhum campo fornecido para atualizar.",
      };
    }
  } else {
    if (!name || !email || !role) {
      throw {
        status: 400,
        message: "Todos os campos devem ser preenchidos.",
      };
    }
  }

  if (email) {
    if (!isValidEmail(email)) {
      throw {
        status: 400,
        message: "Email inválido.",
      };
    }

    if (!hasAllowedDomain(email)) {
      throw {
        status: 400,
        message: "Domínio de email não permitido.",
      };
    }
  }

  const validRoles = ["MANAGER", "WAITER", "KITCHEN", "CASHIER"];
  if (role && !validRoles.includes(role)) {
    throw {
      status: 400,
      message: "Cargo de usuário inválido.",
    };
  }

};
