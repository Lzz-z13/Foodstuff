const connect = require("../database/connect");
const createLog = require("../utils/createLog");
const jwt = require("jsonwebtoken");
const {
  sendEmail,
  passGenerator,
  templateEmail,
} = require("../services/mailService");
const validatePassword = require("../validations/validatePassword");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const SALT_ROUNDS = 10;

module.exports = class UserService {
  static async createUser(user_name, user_cpf, user_email, user_type, jwt_user_id) {
    const user_password = passGenerator(8);
    const hashed_password = await bcrypt.hash(user_password, SALT_ROUNDS);
    const connection = await connect.getConnection();
    try {
      await connection.beginTransaction();

      const checkActiveQuery = `SELECT user_id FROM users WHERE (user_cpf = ? OR user_email = ?) AND is_active = 1 LIMIT 1`;
      const [activeConflict] = await connection.execute(checkActiveQuery, [
        user_cpf,
        user_email,
      ]);
      if (activeConflict.length > 0) {
        throw { status: 409, message: "CPF ou email já cadastrado." };
      }

      const verifyQuery = `SELECT user_id FROM users WHERE (user_cpf = ? OR user_email = ?) AND is_active = 0 LIMIT 1`;
      const [result] = await connection.execute(verifyQuery, [
        user_cpf,
        user_email,
      ]);

      if (result.length > 0) {
        const activeQuery = `UPDATE users SET user_name = ?, user_email = ?, user_password = ?, user_type = ?, is_active = 1 WHERE user_id = ?`;
        const existingId = result[0].user_id;
        await connection.execute(activeQuery, [
          user_name,
          user_email,
          hashed_password,
          user_type,
          existingId,
        ]);

       await createLog(connection, 'users', 'REACTIVATE', existingId, user_name, jwt_user_id);
      } else {
        const user_id = crypto.randomUUID();
        const createQuery = `INSERT INTO users (user_id, user_name, user_cpf, user_email, user_password, user_type)
                values (?, ?, ?, ?, ?, ?)`;
        const createValues = [
          user_id,
          user_name,
          user_cpf,
          user_email,
          hashed_password,
          user_type,
        ];
        await connection.execute(createQuery, createValues);

       await createLog(connection, 'users', 'INSERT', user_id, user_name, jwt_user_id);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.status) throw error;
      if (error.code === "ER_DUP_ENTRY") {
        throw { status: 409, message: "CPF ou email já registrado." };
      }
      throw { status: 500, message: "Erro interno do servidor." };
    } finally {
      connection.release();
    }

    try {
      await sendEmail(
        user_email,
        "Credenciais de acesso",
        templateEmail(user_name, user_email, user_password),
      );

      return {
        message: "Usuário criado com sucesso. Credenciais enviadas no email inserido."
      }

    } catch (emailError) {
      console.error("Erro ao enviar e-mail de credenciais:", emailError);

      return {
        warning: "Usuário criado no sistema, porém o servidor e-mail falhou. Tente 'Reenviar Credenciais' no painel."
      }
    }
  }

  static async readAllUsers() {
    const query = `SELECT user_id, user_name, user_cpf, user_email, user_type, user_picture FROM users WHERE is_active = 1`;
    try {
      const [users] = await connect.execute(query);
      return users.map(user => ({
        ...user,
        user_picture: user.user_picture ? user.user_picture.toString('base64') : null
      }));
    } catch (error) {
      if (error.status) throw error;
      throw { status: 500, message: "Erro interno do servidor." };
    }
  }

  static async updateUser(
    user_id,
    user_name,
    user_email,
    user_type,
    jwt_user_id
  ) {
    const updates = [];
    const values = [];

    if (user_name) {
      updates.push("user_name = ?");
      values.push(user_name);
    }
    if (user_email) {
      updates.push("user_email = ?");
      values.push(user_email);
    }
    if (user_type) {
      updates.push("user_type = ?");
      values.push(user_type);
    }

    values.push(user_id);
    const query = `UPDATE users SET ${updates.join(", ")} WHERE user_id = ? AND is_active = 1`;
    const userQuery = `SELECT user_name FROM users WHERE user_id = ? AND is_active = 1 LIMIT 1`;

    const connection = await connect.getConnection();
    try {
      await connection.beginTransaction();

      const [userResult] = await connection.execute( userQuery, [user_id] );
      
      if (userResult.length === 0) {
        throw { status: 404, message: "Usuário não encontrado." };
      }

      const old_name = userResult[0].user_name;
      
      const [result] = await connection.execute(query, values);

      const final_name = user_name || old_name;
      await createLog(connection, "users", "UPDATE", user_id, final_name, jwt_user_id )

      await connection.commit();
      return result;
    } catch (error) {
      console.error(error)
      await connection.rollback();
      if (error.status) throw error;
      if (error.code === "ER_DUP_ENTRY") {
        throw { status: 409, message: "Email já registrado." };
      }
      throw { status: 500, message: "Erro interno do servidor." };
    } finally {
      connection.release();
    }
  }

  static async updateUserPassword(jwt_user_id, password, user_password, user_picture) {
    validatePassword(user_password);
    
    const hashed_password = await bcrypt.hash(user_password, SALT_ROUNDS);
    const connection = await connect.getConnection();
    try {
      await connection.beginTransaction();

      const validateQuery = `SELECT user_name, user_password, user_type FROM users WHERE user_id = ? AND is_active = 1 LIMIT 1`;
      const [result] = await connection.execute(validateQuery, [jwt_user_id]);

      if (result.length === 0) {
        throw { status: 404, message: "Usuário não encontrado." };
      }

      const old_password = result[0].user_password;
      const user_name = result[0].user_name;
      const user_type = result[0].user_type;

      const correct_password = await bcrypt.compare(password, old_password);
      if (!correct_password) {
        throw { status: 400, message: "Senha incorreta." };
      }

      let pictureBuffer = null;
      if (user_picture) {
        if (typeof user_picture === 'string') {
          const matches = user_picture.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
          if (matches && matches[2]) {
            pictureBuffer = Buffer.from(matches[2], 'base64');
          } else {
            pictureBuffer = Buffer.from(user_picture, 'base64');
          }
        } else if (Buffer.isBuffer(user_picture)) {
          pictureBuffer = user_picture;
        }
      }

      const query = `UPDATE users SET user_password = ?, first_login = 0, user_picture = ? WHERE user_id = ? AND is_active = 1`;
      await connection.execute(query, [hashed_password, pictureBuffer, jwt_user_id]);

      await createLog(connection, 'users', 'UPDATE', jwt_user_id, user_name, jwt_user_id);

      await connection.commit();

      const token = jwt.sign(
        {
          id: jwt_user_id,
          type: user_type,
          first_login: 0,
        },
        process.env.SECRET,
        {
          expiresIn: "1h",
        }
      );

      return { token };
    } catch (error) {
      await connection.rollback();
      if (error.status) throw error;
      throw { status: 500, message: "Erro interno do servidor." };
    } finally {
      connection.release();
    }
  }

  static async resetPassword(user_id, jwt_user_id) {
    const new_password = passGenerator(8);
    const hashed_password = await bcrypt.hash(new_password, SALT_ROUNDS);

    let target_user_name;
    let target_user_email;

    const connection = await connect.getConnection();
    try {
      await connection.beginTransaction();

      const verifyQuery = `SELECT user_name, user_email FROM users WHERE user_id = ? AND is_active = 1 LIMIT 1`;
      const [userResult] = await connection.execute(verifyQuery, [user_id]);

      if (userResult.length === 0) {
        throw { status: 404, message: "Usuário não encontrado." };
      }
      
      target_user_name = userResult[0].user_name;
      target_user_email = userResult[0].user_email;

      const updateQuery = `UPDATE users SET user_password = ?, first_login = 1 WHERE user_id = ?`;
      await connection.execute(updateQuery, [hashed_password, user_id]);

      await createLog(connection, 'users', 'RESET-PASSWORD', user_id, target_user_name, jwt_user_id);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.status) throw error;
      throw { status: 500, message: "Erro ao resetar senha e enviar e-mail." };
    } finally {
      connection.release();
    }

    try {
      await sendEmail(
        target_user_email,
        "Sua senha foi resetada",
        templateEmail(target_user_name, target_user_email, new_password)
      );

      return {
        message: "Senha resetada com sucesso. Credenciais enviadas no email do usuário."
      };
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de reset:", emailError);
      return {
        warning: "Houve uma falha ao enviar o e-mail para o usuário. Tente novamente."
      };
    }
  }

  static async deleteUser(user_id, jwt_user_id) {
    const userQuery = `SELECT user_name FROM users WHERE user_id = ? AND is_active = 1 LIMIT 1`;
    const deleteQuery = `UPDATE users SET is_active = 0 WHERE user_id = ? AND is_active = 1`;

    const connection = await connect.getConnection();
    try {
      await connection.beginTransaction();

      const [userResult] = await connection.execute( userQuery, [user_id]);
      if (userResult.length === 0) {
        throw { status: 404, message: "User não encontrado." };
      }
      const user_name = userResult[0].user_name;

      await connection.execute(deleteQuery, [user_id]);

      await createLog(connection, 'users', 'DELETE', user_id, user_name, jwt_user_id);

      await connection.commit();
      return;
    } catch (error) {
      await connection.rollback();
      if (error.status) throw error;
      throw { status: 500, message: "Erro interno do servidor." };
    } finally {
      connection.release();
    }
  }

  static async loginUser(user_email, user_password) {
    const query = `SELECT user_id, user_name, user_cpf, user_email, user_password, user_type, first_login, user_picture
        FROM users
        WHERE user_email = ? AND is_active = 1
        LIMIT 1`;

    try {
      const [result] = await connect.execute(query, [user_email]);
      if (result.length === 0) {
        throw { status: 401, message: "Email ou senha inválido." };
      }
      const user = result[0];
      const correct_password = await bcrypt.compare(
        user_password,
        user.user_password,
      );

      if (!correct_password) {
        throw { status: 401, message: "Email ou senha inválido." };
      }

      const token = jwt.sign(
        {
          id: user.user_id,
          type: user.user_type,
          first_login: user.first_login
        },
        process.env.SECRET,
        {
          expiresIn: "1h",
        },
      );

      delete user.user_password;
      
      user.user_picture = user.user_picture ? user.user_picture.toString('base64') : null;

      return { user, token };
    } catch (error) {
      if (error.status) throw error;
      throw { status: 500, message: "Erro interno do servidor." };
    }
  }
};
