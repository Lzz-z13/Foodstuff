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

  static async readAllOrders() {
    // Leitura sem transaction/logs: pedidos são registros operacionais,
    // mesas/comandas inativas continuam legíveis como histórico.
    const ordersQuery = `
      SELECT
        o.order_id,
        o.origin,
        o.status,
        o.observations,
        o.created_at,
        o.started_at,
        o.finished_at,
        o.command_id,
        c.customer_name,
        c.table_id,
        tbl.number AS table_number
      FROM orders o
      INNER JOIN commands c ON c.command_id = o.command_id
      INNER JOIN tables tbl ON tbl.table_id = c.table_id
      ORDER BY o.order_id DESC
    `;

    try {
      const [orders] = await connect.execute(ordersQuery);

      if (orders.length === 0) {
        return [];
      }

      const orderIds = orders.map((o) => o.order_id);
      const placeholders = orderIds.map(() => "?").join(", ");

      const itemsQuery = `
        SELECT
          oi.order_id,
          oi.quantity,
          oi.unit_price,
          oi.observation,
          oi.product_id,
          p.name AS product_name
        FROM order_items oi
        INNER JOIN products p ON p.product_id = oi.product_id
        WHERE oi.order_id IN (${placeholders})
        ORDER BY oi.order_item_id ASC
      `;

      const [items] = await connect.execute(itemsQuery, orderIds);

      const itemsByOrder = new Map();
      for (const item of items) {
        if (!itemsByOrder.has(item.order_id)) {
          itemsByOrder.set(item.order_id, []);
        }
        itemsByOrder.get(item.order_id).push({
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          observation: item.observation,
          product_id: item.product_id,
          product_name: item.product_name,
        });
      }

      return orders.map((o) => {
        const orderItems = itemsByOrder.get(o.order_id) ?? [];
        const total = orderItems.reduce(
          (sum, i) => sum + Number(i.quantity) * Number(i.unit_price),
          0,
        );
        return {
          order_id: o.order_id,
          origin: o.origin,
          status: o.status,
          observations: o.observations,
          created_at: o.created_at,
          started_at: o.started_at,
          finished_at: o.finished_at,
          command_id: o.command_id,
          customer_name: o.customer_name,
          table_id: o.table_id,
          table_number: o.table_number,
          total,
          items: orderItems,
        };
      });
    } catch (error) {
      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: "Erro ao buscar os pedidos.",
      };
    }
  }

  static async readOrderById(order_id) {
    const orderQuery = `
      SELECT
        o.order_id,
        o.origin,
        o.status,
        o.observations,
        o.created_at,
        o.started_at,
        o.finished_at,
        o.command_id,
        c.customer_name,
        c.table_id,
        tbl.number AS table_number
      FROM orders o
      INNER JOIN commands c ON c.command_id = o.command_id
      INNER JOIN tables tbl ON tbl.table_id = c.table_id
      WHERE o.order_id = ?
      LIMIT 1
    `;

    try {
      const [orders] = await connect.execute(orderQuery, [order_id]);

      if (orders.length === 0) {
        throw {
          status: 404,
          message: "Pedido não encontrado.",
        };
      }

      const order = orders[0];

      const itemsQuery = `
        SELECT
          oi.quantity,
          oi.unit_price,
          oi.observation,
          oi.product_id,
          p.name AS product_name
        FROM order_items oi
        INNER JOIN products p ON p.product_id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY oi.order_item_id ASC
      `;

      const [items] = await connect.execute(itemsQuery, [order_id]);

      const normalizedItems = items.map((i) => ({
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
        observation: i.observation,
        product_id: i.product_id,
        product_name: i.product_name,
      }));

      const total = normalizedItems.reduce(
        (sum, i) => sum + Number(i.quantity) * Number(i.unit_price),
        0,
      );

      return {
        order_id: order.order_id,
        origin: order.origin,
        status: order.status,
        observations: order.observations,
        created_at: order.created_at,
        started_at: order.started_at,
        finished_at: order.finished_at,
        command_id: order.command_id,
        customer_name: order.customer_name,
        table_id: order.table_id,
        table_number: order.table_number,
        total,
        items: normalizedItems,
      };
    } catch (error) {
      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: "Erro ao buscar o pedido.",
      };
    }
  }
};
