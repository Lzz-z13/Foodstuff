const connect = require("../database/connect");
const createLog = require("../utils/createLog");
const jwt = require("jsonwebtoken");

const {
  sendEmail,
  passGenerator,
  templateEmail,
} = require("../services/mailService");

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const SALT_ROUNDS = 10;

module.exports = class UserService {
  static async createUser(name, email, role, jwt_user_id) {
    const user_password = passGenerator(8);
    const hashed_password = await bcrypt.hash(user_password, SALT_ROUNDS);

    const connection = await connect.getConnection();

    try {
      await connection.beginTransaction();

      // Checks if there is an active user with this email
      const checkActiveQuery = `
        SELECT user_id
        FROM users
        WHERE email = ?
          AND is_active = 1
        LIMIT 1
      `;

      const [activeConflict] = await connection.execute(checkActiveQuery, [
        email,
      ]);

      if (activeConflict.length > 0) {
        throw {
          status: 409,
          message: "Email já cadastrado.",
        };
      }

      // Checks if there is an inactive user with this email
      const verifyInactiveQuery = `
        SELECT user_id
        FROM users
        WHERE email = ?
          AND is_active = 0
        LIMIT 1
      `;

      const [inactiveUser] = await connection.execute(verifyInactiveQuery, [
        email,
      ]);

      if (inactiveUser.length > 0) {
        // Reactivate existing user
        const existingId = inactiveUser[0].user_id;

        const reactivateQuery = `
          UPDATE users
          SET
            name = ?,
            password = ?,
            role = ?,
            first_login = 1,
            is_active = 1
          WHERE user_id = ?
        `;

        await connection.execute(reactivateQuery, [
          name,
          hashed_password,
          role,
          existingId,
        ]);

        await createLog(
          connection,
          jwt_user_id,
          "REACTIVATE",
          "users",
          existingId,
          `Usuário ${name} reativado.`,
        );
      } else {
        // Create new user
        const user_id = crypto.randomUUID();

        const createQuery = `
          INSERT INTO users
          (
            user_id,
            name,
            email,
            password,
            role
          )
          VALUES (?, ?, ?, ?, ?)
        `;

        await connection.execute(createQuery, [
          user_id,
          name,
          email,
          hashed_password,
          role,
        ]);

        await createLog(
          connection,
          jwt_user_id, // who made the action
          "INSERT", // action
          "users", // entity
          user_id, // affected ID (target ID)
          `Usuário ${name} criado.`,
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();

      if (error.status) {
        throw error;
      }

      if (error.code === "ER_DUP_ENTRY") {
        throw {
          status: 409,
          message: "Email já cadastrado.",
        };
      }

      console.error(error);

      throw {
        status: 500,
        message: "Erro interno do servidor.",
      };
    } finally {
      connection.release();
    }

    // Send the credentials just after then databases
    // Confirmed the creation/reactivation
    try {
      await sendEmail(
        email,
        "Credenciais de acesso",
        templateEmail(name, email, user_password),
      );

      return {
        message:
          "Usuário criado com sucesso. Credenciais enviadas no email inserido.",
      };
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de credenciais:", emailError);

      return {
        warning:
          "Usuário criado no sistema, porém o servidor de email falhou. Tente 'Reenviar Credenciais' no painel.",
      };
    }
  }

  static async readAllUsers() {
    const query = `
      SELECT
        user_id,
        name,
        email,
        role,
        first_login,
        is_active,
        created_at
      FROM users
      WHERE is_active = 1
    `;

    try {
      const [users] = await connect.execute(query);

      return users;
    } catch (error) {
      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: "Erro interno do servidor.",
      };
    }
  }

  static async loginUser(email, password) {
    const query = `
      SELECT user_id, name, email, password, role, first_login
      FROM users
      WHERE email = ? AND is_active = 1
      LIMIT 1
    `;

    try {
      const [result] = await connect.execute(query, [email]);
      if (result.length === 0) {
        throw { status: 401, message: "Email ou senha inválido." };
      }
      const user = result[0];
      const correct_password = await bcrypt.compare(
        password,
        user.password,
      );

      if (!correct_password) {
        throw { status: 401, message: "Email ou senha inválido." };
      }

      const token = jwt.sign(
        {
          id: user.user_id,
          type: user.user_type,
          first_login: user.first_login,
        },
        process.env.SECRET,
        {
          expiresIn: "1h",
        },
      );

      delete user.password;

      return { user, token };
    } catch (error) {
      if (error.status) throw error;
      throw { status: 500, message: "Erro interno do servidor." };
    }
  }
};
