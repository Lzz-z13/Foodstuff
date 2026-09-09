const {
  isValidEmail,
  hasAllowedDomain,
} = require("../utils/validators/emailValidator");

const {
  isValidPhone,
} = require("../utils/validators/phoneValidator");

module.exports = function validateUser({ name, email, phone, role }, update) {
  if (update) {
    if (!name && !email && !phone && !role) {
      throw {
        status: 400,
        message: "Nenhum campo fornecido para atualizar.",
      };
    }
  } else {
    if (!name || !email || !phone || !role) {
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

  if (phone && !isValidPhone(phone)) {
    throw {
      status: 400,
      message: "Telefone inválido.",
    };
  }

  const validRoles = ["MANAGER", "WAITER", "KITCHEN", "CASHIER"];

  if (role && !validRoles.includes(role)) {
    throw {
      status: 400,
      message: "Cargo de usuário inválido.",
    };
  }
};
