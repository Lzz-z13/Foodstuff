const connect = require("../database/connect");
const createLog = require("../utils/createLog");

module.exports = class OrderService {
  static async createOrder(command_id, items, jwt_user_id) {
    const connection = await connect.getConnection();

    try {
      await connection.beginTransaction();

      // 1) Lock da command para proteger a invariante: só OPEN aceita pedidos
      const commandQuery = `
        SELECT command_id, status
        FROM commands
        WHERE command_id = ?
        FOR UPDATE
      `;

      const [commandResult] = await connection.execute(commandQuery, [
        command_id,
      ]);

      if (commandResult.length === 0) {
        throw {
          status: 404,
          message: "Comanda não encontrada.",
        };
      }

      const command = commandResult[0];

      if (command.status !== "OPEN") {
        // Apenas OPEN aceita novos pedidos
        throw {
          status: 400,
          message: "A comanda não está aberta para novos pedidos.",
        };
      }

      // 2) Validar produtos e extrair preços atuais (snapshot)
      const productIds = items.map((item) => item.product_id);

      // Buscar produtos ativos com seus preços
      // Usamos IN para buscar todos de uma vez
      const placeholders = productIds.map(() => "?").join(", ");

      const productsQuery = `
        SELECT
          product_id,
          price,
          is_active,
          is_available,
          name
        FROM products
        WHERE product_id IN (${placeholders})
      `;

      const [productsResult] = await connection.execute(
        productsQuery,
        productIds,
      );

      // Mapear produtos encontrados
      const productsMap = new Map();
      for (const product of productsResult) {
        productsMap.set(product.product_id, product);
      }

      // Verificar se todos os produtos existem e estão ativos
      for (const item of items) {
        const product = productsMap.get(item.product_id);

        if (!product || product.is_active !== 1) {
          throw {
            status: 404,
            message: "Produto não encontrado.",
          };
        }
      }

      // 3) Inserir pedido (orders)
      const insertOrderQuery = `
        INSERT INTO orders
          (created_by, origin, status, command_id)
        VALUES (?, ?, ?, ?)
      `;

      const [orderResult] = await connection.execute(insertOrderQuery, [
        jwt_user_id,
        "WAITER",
        "PENDING",
        command_id,
      ]);

      const orderId = orderResult.insertId;

      // 4) Inserir itens do pedido (order_items)
      const insertOrderItemQuery = `
        INSERT INTO order_items
          (quantity, unit_price, observation, order_id, product_id)
        VALUES (?, ?, ?, ?, ?)
      `;

      for (const item of items) {
        const product = productsMap.get(item.product_id);

        await connection.execute(insertOrderItemQuery, [
          item.quantity,
          product.price,
          item.observation === undefined || item.observation === null
            ? null
            : item.observation.trim().length === 0
              ? null
              : item.observation.trim(),
          orderId,
          item.product_id,
        ]);
      }

      // 5) Auditoria
      await createLog(
        connection,
        jwt_user_id,
        "CREATE",
        "orders",
        orderId,
        "Pedido criado",
        null,
      );

      await connection.commit();

      return {
        order_id: orderId,
      };
    } catch (error) {
      await connection.rollback();

      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: "Erro ao criar o pedido.",
      };
    } finally {
      connection.release();
    }
  }
};
