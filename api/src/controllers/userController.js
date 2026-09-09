const UserService = require("../services/userService");
const validateUser = require("../validations/validateUser");

const {
  isValidEmail,
  normalizeEmail,
} = require("../utils/validators/emailValidator");

const { normalizePhone } = require("../utils/validators/phoneValidator");

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
};
