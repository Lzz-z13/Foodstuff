const UserService = require("../services/userService");
const validateUser = require("../validations/validateUser");
const validateUserId = require("../validations/validateUserId");

const {
  isValidEmail,
  hasAllowedDomain,
  normalizeEmail,
} = require("../utils/validators/emailValidator");

const {
  isValidPhone,
  normalizePhone,
} = require("../utils/validators/phoneValidator");

const { isValidUserName } = require("../utils/validators/userValidator");

module.exports = class UserController {
  static async createUser(req, res, next) {
    const jwt_user_id = req.user.id;

    req.body.email = normalizeEmail(req.body.email || "");
    req.body.phone = normalizePhone(req.body.phone || "");

    const { name, email, phone, role } = req.body;

    try {
      validateUser(req.body, false);

      const result = await UserService.createUser(
        name,
        email,
        role,
        phone,
        jwt_user_id,
      );

      return res.status(201).json({
        error: false,
        message: result.warning || result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async readAllUsers(req, res, next) {
    try {
      const users = await UserService.readAllUsers();

      return res.status(200).json({
        error: false,
        message: "Usuários buscados com sucesso.",
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserCredentials(req, res, next) {
    const jwt_user_id = req.user.id;
    if (req.body.email) {
      req.body.email = normalizeEmail(req.body.email);
    }
    if (req.body.phone) {
      req.body.phone = normalizePhone(req.body.phone);
    }
    const { name, email, phone } = req.body;

    try {
      validateUser(req.body, true);

      await UserService.updateUserCredentials(
        name,
        email,
        phone,
        jwt_user_id
      );
      return res.status(200).json({
        error: false,
        message: "Usuário atualizado com sucesso.",
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserById(req, res, next) {
    const jwt_user_id = req.user.id;
    const { user_id } = req.params;

    if (req.body.email) {
      req.body.email = normalizeEmail(req.body.email);
    }
    if (req.body.phone) {
      req.body.phone = normalizePhone(req.body.phone);
    }
    const { name, email, phone, role } = req.body;

    try {
      validateUserId(user_id);

      if (!name && !email && !phone && !role) {
        throw {
          status: 400,
          message: "Nenhum campo fornecido para atualizar.",
        };
      }

      if (name && !isValidUserName(name)) {
        throw {
          status: 400,
          message: "O nome deve ter entre 1 e 100 caracteres.",
        };
      }

      if (email) {
        if (!isValidEmail(email)) {
          throw { status: 400, message: "Email inválido." };
        }
        if (!hasAllowedDomain(email)) {
          throw { status: 400, message: "Domínio de email não permitido." };
        }
      }

      if (phone && !isValidPhone(phone)) {
        throw { status: 400, message: "Telefone inválido." };
      }

      if (role && !["MANAGER", "WAITER", "KITCHEN", "CASHIER"].includes(role)) {
        throw { status: 400, message: "Cargo de usuário inválido." };
      }

      await UserService.updateUserById(user_id, jwt_user_id, {
        name,
        email,
        phone,
        role,
      });

      return res.status(200).json({
        error: false,
        message: "Usuário atualizado com sucesso.",
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserPassword(req, res, next) {
    const jwt_user_id = req.user.id;
    const { current_password, new_password } = req.body;

    try {
      if (!current_password || !new_password) {
        throw {
          status: 400,
          message: "Todos os campos devem ser preenchidos.",
        };
      }

      const result = await UserService.updateUserPassword(jwt_user_id, current_password, new_password);
      return res.status(200).json({
        error: false,
        message: "Senha atualizada com sucesso.",
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  static async loginUser(req, res, next) {
    req.body.email = normalizeEmail(req.body.email || "");

    const { email, password } = req.body;

    try {
      if (!email || !password) {
        throw {
          status: 400,
          message: "Todos os campos devem ser preenchidos.",
        };
      }

      if (!isValidEmail(email)) {
        throw {
          status: 400,
          message: "Email inválido.",
        };
      }

      const { user, token } = await UserService.loginUser(email, password);

      return res.status(200).json({
        error: false,
        message: "Login efetuado com sucesso.",
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteOwnUserAccount(req, res, next) {
    const jwt_user_id = req.user.id;
    try {
      await UserService.deleteOwnUserAccount(jwt_user_id);
      return res.status(200).json({
        error: false,
        message: "Conta desativada com sucesso.",
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUserById(req, res, next) {
    const jwt_user_id = req.user.id;
    const { user_id } = req.params;
    try {
      validateUserId(user_id);
      await UserService.deleteUserById(user_id, jwt_user_id);
      return res.status(200).json({
        error: false,
        message: "Usuário desativado com sucesso.",
      });
    } catch (error) {
      next(error);
    }
  }
};
