const {
  isValidEmail,
  hasAllowedDomain,
} = require("../utils/validators/emailValidator");

const {
  isValidPhone,
} = require("../utils/validators/phoneValidator");

const { isValidUserName } = require("../utils/validators/userValidator");

module.exports = function validateUser(body, update) {
  const { name, email, phone, role } = body;

  // O cargo é controlado pelo MANAGER. Em PATCH /users/me qualquer presença do
  // campo é recusada, independentemente do valor, para impedir autopromoção.
  if (update && Object.hasOwn(body, "role")) {
    throw {
      status: 400,
      message: "O cargo não pode ser alterado pelo próprio usuário.",
    };
  }

  if (update) {
    if (!name && !email && !phone) {
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

  // Só valida o nome quando a chave veio no corpo. Ausente continua tratado
  // pelas regras de presença acima; presente e inválido é sempre erro.
  if (Object.hasOwn(body, "name") && !isValidUserName(name)) {
    throw {
      status: 400,
      message: "O nome deve ter entre 1 e 100 caracteres.",
    };
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
