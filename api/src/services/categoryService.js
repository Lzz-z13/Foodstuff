const connect = require("../database/connect");
const createLog = require("../utils/createLog");

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

module.exports = class CategoryService {
  static async createCategory(name, description, jwt_user_id) {
    const connection = await connect.getConnection();

    try {
      await connection.beginTransaction();

      const [userResult] = await connection.execute(
        `SELECT name FROM users WHERE user_id = ? AND is_active = 1 LIMIT 1`,
        [jwt_user_id],
      );

      if (userResult.length === 0) {
        throw { status: 404, message: "Usuário responsável não encontrado." };
      }

      const user_name = userResult[0].name;
      const cleanName = name.trim();
      const cleanDescription = normalizeText(description);

      const [existing] = await connection.execute(
        `SELECT category_id, is_active FROM categories WHERE name = ? LIMIT 1`,
        [cleanName],
      );

      if (existing.length > 0) {
        const category = existing[0];

        if (category.is_active) {
          throw {
            status: 409,
            message: "Já existe uma categoria ativa com esse nome.",
          };
        }

        await connection.execute(
          `UPDATE categories SET is_active = 1, description = ? WHERE category_id = ?`,
          [cleanDescription, category.category_id],
        );

        await createLog(
          connection,
          jwt_user_id,
          "REACTIVATE",
          "categories",
          category.category_id,
          `Usuário ${user_name} reativou a categoria ${cleanName}.`,
        );

        await connection.commit();

        return {
          message: "Categoria reativada com sucesso.",
          category_id: category.category_id,
        };
      }

      const [result] = await connection.execute(
        `INSERT INTO categories (name, description) VALUES (?, ?)`,
        [cleanName, cleanDescription],
      );

      const newId = result.insertId;

      await createLog(
        connection,
        jwt_user_id,
        "INSERT",
        "categories",
        newId,
        `Usuário ${user_name} criou a categoria ${cleanName}.`,
      );

      await connection.commit();

      return { message: "Categoria criada com sucesso.", category_id: newId };
    } catch (error) {
      await connection.rollback();

      if (error.status) throw error;

      if (error.code === "ER_DUP_ENTRY") {
        throw {
          status: 409,
          message: "Já existe uma categoria com esse nome.",
        };
      }

      throw { status: 500, message: "Erro ao criar a categoria." };
    } finally {
      connection.release();
    }
  }

  static async readAllCategories(includeInactive = false) {
    const query = includeInactive
      ? `SELECT category_id, name, description, is_active FROM categories ORDER BY name`
      : `SELECT category_id, name, description, is_active FROM categories WHERE is_active = 1 ORDER BY name`;

    try {
      const [rows] = await connect.execute(query);
      return rows;
    } catch (error) {
      throw { status: 500, message: "Erro ao buscar as categorias." };
    }
  }

  static async updateCategory(category_id, { name, description }, jwt_user_id) {
    const connection = await connect.getConnection();

    try {
      await connection.beginTransaction();

      const [userResult] = await connection.execute(
        `SELECT name FROM users WHERE user_id = ? AND is_active = 1 LIMIT 1`,
        [jwt_user_id],
      );

      if (userResult.length === 0) {
        throw { status: 404, message: "Usuário responsável não encontrado." };
      }

      const user_name = userResult[0].name;

      const [target] = await connection.execute(
        `SELECT category_id, name FROM categories WHERE category_id = ? AND is_active = 1 LIMIT 1`,
        [category_id],
      );

      if (target.length === 0) {
        throw { status: 404, message: "Categoria não encontrada." };
      }

      const updates = [];
      const values = [];

      let newName = target[0].name;

      if (name !== undefined) {
        newName = name.trim();

        const [conflict] = await connection.execute(
          `SELECT category_id FROM categories WHERE name = ? AND category_id != ? AND is_active = 1 LIMIT 1`,
          [newName, category_id],
        );

        if (conflict.length > 0) {
          throw {
            status: 409,
            message: "Já existe uma categoria ativa com esse nome.",
          };
        }

        updates.push("name = ?");
        values.push(newName);
      }

      if (description !== undefined) {
        updates.push("description = ?");
        values.push(normalizeText(description));
      }

      if (updates.length === 0) {
        throw {
          status: 400,
          message: "Nenhum campo fornecido para atualizar.",
        };
      }

      values.push(category_id);

      await connection.execute(
        `UPDATE categories SET ${updates.join(", ")} WHERE category_id = ? AND is_active = 1`,
        values,
      );

      await createLog(
        connection,
        jwt_user_id,
        "UPDATE",
        "categories",
        category_id,
        `Usuário ${user_name} atualizou a categoria ${newName}.`,
      );

      await connection.commit();

      return { message: "Categoria atualizada com sucesso.", category_id: Number(category_id) };
    } catch (error) {
      await connection.rollback();

      if (error.status) throw error;

      if (error.code === "ER_DUP_ENTRY") {
        throw {
          status: 409,
          message: "Já existe uma categoria com esse nome.",
        };
      }

      throw { status: 500, message: "Erro ao atualizar a categoria." };
    } finally {
      connection.release();
    }
  }

  static async deleteCategory(category_id, jwt_user_id) {
    const connection = await connect.getConnection();

    try {
      await connection.beginTransaction();

      const [userResult] = await connection.execute(
        `SELECT name FROM users WHERE user_id = ? AND is_active = 1 LIMIT 1`,
        [jwt_user_id],
      );

      if (userResult.length === 0) {
        throw { status: 404, message: "Usuário responsável não encontrado." };
      }

      const user_name = userResult[0].name;

      const [target] = await connection.execute(
        `SELECT category_id, name FROM categories WHERE category_id = ? AND is_active = 1 LIMIT 1 FOR UPDATE`,
        [category_id],
      );

      if (target.length === 0) {
        throw { status: 404, message: "Categoria não encontrada." };
      }

      const [linked] = await connection.execute(
        `SELECT COUNT(*) AS total FROM products WHERE category_id = ? AND is_active = 1`,
        [category_id],
      );

      if (Number(linked[0].total) > 0) {
        throw {
          status: 409,
          message: "Categoria possui produtos ativos e não pode ser desativada.",
        };
      }

      await connection.execute(
        `UPDATE categories SET is_active = 0 WHERE category_id = ? AND is_active = 1`,
        [category_id],
      );

      await createLog(
        connection,
        jwt_user_id,
        "DELETE",
        "categories",
        category_id,
        `Usuário ${user_name} desativou a categoria ${target[0].name}.`,
      );

      await connection.commit();

      return {
        message: "Categoria desativada com sucesso.",
        category_id: Number(category_id),
      };
    } catch (error) {
      await connection.rollback();

      if (error.status) throw error;

      throw { status: 500, message: "Erro ao desativar a categoria." };
    } finally {
      connection.release();
    }
  }
};
