const connect = require("../database/connect");
const createLog = require("../utils/createLog");

function toFlag(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === 1 || value === "1") return 1;
  if (value === false || value === 0 || value === "0") return 0;
  return fallback;
}

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const BASE_SELECT = `
  SELECT
    p.product_id,
    p.name,
    p.description,
    p.price,
    p.cost,
    p.image,
    p.requires_preparation,
    p.is_available,
    p.is_active,
    p.created_at,
    p.category_id,
    c.name AS category_name
  FROM products p
  INNER JOIN categories c ON c.category_id = p.category_id
`;

module.exports = class ProductService {
  static async createProduct(data, jwt_user_id) {
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

      const [categoryResult] = await connection.execute(
        `SELECT category_id, name FROM categories WHERE category_id = ? AND is_active = 1 LIMIT 1`,
        [data.category_id],
      );

      if (categoryResult.length === 0) {
        throw { status: 404, message: "Categoria não encontrada." };
      }

      const name = data.name.trim();
      const description = normalizeText(data.description);
      const price = Number(data.price);
      const cost =
        data.cost === undefined || data.cost === null || data.cost === ""
          ? null
          : Number(data.cost);
      const image = normalizeText(data.image);
      const requires_preparation = toFlag(data.requires_preparation, 1);
      const is_available = toFlag(data.is_available, 1);

      const [result] = await connection.execute(
        `INSERT INTO products
          (name, description, price, cost, image, requires_preparation, is_available, category_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description,
          price,
          cost,
          image,
          requires_preparation,
          is_available,
          data.category_id,
        ],
      );

      const newId = result.insertId;

      await createLog(
        connection,
        jwt_user_id,
        "INSERT",
        "products",
        newId,
        `Usuário ${user_name} criou o produto ${name}.`,
      );

      await connection.commit();

      return { message: "Produto criado com sucesso.", product_id: newId };
    } catch (error) {
      await connection.rollback();

      if (error.status) throw error;

      throw { status: 500, message: "Erro ao criar o produto." };
    } finally {
      connection.release();
    }
  }

  static async readAllProducts({ category_id, search, is_available, include_inactive } = {}) {
    const conditions = [];
    const values = [];

    if (!include_inactive) {
      conditions.push("p.is_active = 1");
    }

    if (category_id !== undefined && category_id !== null && category_id !== "") {
      conditions.push("p.category_id = ?");
      values.push(Number(category_id));
    }

    if (is_available !== undefined && is_available !== null && is_available !== "") {
      conditions.push("p.is_available = ?");
      values.push(Number(is_available));
    }

    if (search !== undefined && search !== null && String(search).trim() !== "") {
      conditions.push("(p.name LIKE ? OR p.description LIKE ?)");
      const term = `%${String(search).trim()}%`;
      values.push(term, term);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `${BASE_SELECT} ${where} ORDER BY p.product_id DESC`;

    try {
      const [rows] = await connect.execute(query, values);

      return rows.map((p) => ({
        ...p,
        price: Number(p.price),
        cost: p.cost === null ? null : Number(p.cost),
      }));
    } catch (error) {
      throw { status: 500, message: "Erro ao buscar os produtos." };
    }
  }

  static async readProductById(product_id) {
    try {
      const [rows] = await connect.execute(
        `${BASE_SELECT} WHERE p.product_id = ? LIMIT 1`,
        [product_id],
      );

      if (rows.length === 0) {
        throw { status: 404, message: "Produto não encontrado." };
      }

      const p = rows[0];

      return {
        ...p,
        price: Number(p.price),
        cost: p.cost === null ? null : Number(p.cost),
      };
    } catch (error) {
      if (error.status) throw error;

      throw { status: 500, message: "Erro ao buscar o produto." };
    }
  }

  static async updateProduct(product_id, data, jwt_user_id) {
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
        `SELECT product_id, name FROM products WHERE product_id = ? AND is_active = 1 LIMIT 1 FOR UPDATE`,
        [product_id],
      );

      if (target.length === 0) {
        throw { status: 404, message: "Produto não encontrado." };
      }

      if (data.category_id !== undefined) {
        const [categoryResult] = await connection.execute(
          `SELECT category_id FROM categories WHERE category_id = ? AND is_active = 1 LIMIT 1`,
          [data.category_id],
        );

        if (categoryResult.length === 0) {
          throw { status: 404, message: "Categoria não encontrada." };
        }
      }

      const updates = [];
      const values = [];

      if (data.name !== undefined) {
        updates.push("name = ?");
        values.push(data.name.trim());
      }

      if (data.description !== undefined) {
        updates.push("description = ?");
        values.push(normalizeText(data.description));
      }

      if (data.price !== undefined) {
        updates.push("price = ?");
        values.push(Number(data.price));
      }

      if (data.cost !== undefined) {
        updates.push("cost = ?");
        values.push(
          data.cost === null || data.cost === "" ? null : Number(data.cost),
        );
      }

      if (data.image !== undefined) {
        updates.push("image = ?");
        values.push(normalizeText(data.image));
      }

      if (data.requires_preparation !== undefined) {
        updates.push("requires_preparation = ?");
        values.push(toFlag(data.requires_preparation, 1));
      }

      if (data.is_available !== undefined) {
        updates.push("is_available = ?");
        values.push(toFlag(data.is_available, 1));
      }

      if (data.category_id !== undefined) {
        updates.push("category_id = ?");
        values.push(Number(data.category_id));
      }

      if (updates.length === 0) {
        throw {
          status: 400,
          message: "Nenhum campo fornecido para atualizar.",
        };
      }

      values.push(product_id);

      await connection.execute(
        `UPDATE products SET ${updates.join(", ")} WHERE product_id = ? AND is_active = 1`,
        values,
      );

      await createLog(
        connection,
        jwt_user_id,
        "UPDATE",
        "products",
        product_id,
        `Usuário ${user_name} atualizou o produto ${target[0].name}.`,
      );

      await connection.commit();

      return {
        message: "Produto atualizado com sucesso.",
        product_id: Number(product_id),
      };
    } catch (error) {
      await connection.rollback();

      if (error.status) throw error;

      throw { status: 500, message: "Erro ao atualizar o produto." };
    } finally {
      connection.release();
    }
  }

  static async updateAvailability(product_id, is_available, jwt_user_id) {
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
      const flag = toFlag(is_available, null);

      if (flag === null) {
        throw { status: 400, message: "O campo is_available é inválido." };
      }

      const [target] = await connection.execute(
        `SELECT product_id, name FROM products WHERE product_id = ? AND is_active = 1 LIMIT 1 FOR UPDATE`,
        [product_id],
      );

      if (target.length === 0) {
        throw { status: 404, message: "Produto não encontrado." };
      }

      await connection.execute(
        `UPDATE products SET is_available = ? WHERE product_id = ? AND is_active = 1`,
        [flag, product_id],
      );

      await createLog(
        connection,
        jwt_user_id,
        "UPDATE",
        "products",
        product_id,
        `Usuário ${user_name} alterou a disponibilidade do produto ${target[0].name} para ${flag ? "disponível" : "indisponível"}.`,
      );

      await connection.commit();

      return {
        message: flag
          ? "Produto marcado como disponível."
          : "Produto marcado como indisponível.",
        product_id: Number(product_id),
        is_available: flag,
      };
    } catch (error) {
      await connection.rollback();

      if (error.status) throw error;

      throw { status: 500, message: "Erro ao atualizar a disponibilidade." };
    } finally {
      connection.release();
    }
  }

  static async deleteProduct(product_id, jwt_user_id) {
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
        `SELECT product_id, name FROM products WHERE product_id = ? AND is_active = 1 LIMIT 1 FOR UPDATE`,
        [product_id],
      );

      if (target.length === 0) {
        throw { status: 404, message: "Produto não encontrado." };
      }

      await connection.execute(
        `UPDATE products SET is_active = 0 WHERE product_id = ? AND is_active = 1`,
        [product_id],
      );

      await createLog(
        connection,
        jwt_user_id,
        "DELETE",
        "products",
        product_id,
        `Usuário ${user_name} desativou o produto ${target[0].name}.`,
      );

      await connection.commit();

      return {
        message: "Produto desativado com sucesso.",
        product_id: Number(product_id),
      };
    } catch (error) {
      await connection.rollback();

      if (error.status) throw error;

      throw { status: 500, message: "Erro ao desativar o produto." };
    } finally {
      connection.release();
    }
  }
};
