const UserService = require("../services/userService");
const validateUser = require("../validations/validateUser");
const {
  isValidEmail,
  normalizeEmail
} = require("../utils/validators/emailValidator");

module.exports = class UserController {
  static async createUser(req, res, next) {
    const jwt_user_id = req.user.id;
    req.body.email = normalizeEmail(req.body.email || ""); // Directly normalizes the req.body
    const { name, email, role } = req.body;
    
    try {
      validateUser(req.body, false);
      const result = await UserService.createUser(name, email, role, jwt_user_id);
      
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

    static async loginUser(req, res, next) {
    req.body.user_email = normalizeEmail(req.body.user_email || "");
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

      const { user, token } = await UserService.loginUser(
        email,
        password,
      );
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
}
