const connect = require("../database/connect");

function normalizeStatus(status) {
  const value = String(status || "").trim().toUpperCase();

  const mapping = {
    PENDENTE: "PENDING",
    PENDING: "PENDING",
    PREPARANDO: "PREPARING",
    PREPARING: "PREPARING",
    PRONTO: "READY",
    READY: "READY",
    ENTREGUE: "DELIVERED",
    DELIVERED: "DELIVERED",
    CANCELADO: "CANCELLED",
    CANCELLED: "CANCELLED",
  };

  return mapping[value] || value;
}

module.exports = class OrderService {
  static async readOrders() {
    const query = `
      SELECT
        o.order_id,
        o.created_by,
        o.origin,
        o.status,
        o.observations,
        o.created_at,
        o.started_at,
        o.finished_at,
        o.cancelled_at,
        c.command_id,
        c.table_id,
        t.number AS table_number
      FROM orders o
      INNER JOIN commands c ON c.command_id = o.command_id
      INNER JOIN tables t ON t.table_id = c.table_id
      ORDER BY o.created_at DESC
    `;

    const [orders] = await connect.execute(query);

    if (orders.length === 0) {
      return [];
    }

    const orderIds = orders.map((order) => order.order_id);
    const placeholders = orderIds.map(() => "?").join(", ");

    const itemsQuery = `
      SELECT
        oi.order_id,
        oi.quantity,
        oi.unit_price,
        oi.observation,
        p.product_id,
        p.name AS product_name,
        p.price AS product_price
      FROM order_items oi
      INNER JOIN products p ON p.product_id = oi.product_id
      WHERE oi.order_id IN (${placeholders})
      ORDER BY oi.order_item_id ASC
    `;

    const [items] = await connect.execute(itemsQuery, orderIds);

    const groupedItems = {};

    for (const item of items) {
      const orderId = item.order_id;
      if (!groupedItems[orderId]) {
        groupedItems[orderId] = [];
      }

      groupedItems[orderId].push({
        id: item.product_id,
        quantidade: item.quantity,
        quantity: item.quantity,
        nome: item.product_name,
        name: item.product_name,
        preco: Number(item.unit_price),
        price: Number(item.unit_price),
        observacao: item.observation,
        observation: item.observation,
        product_id: item.product_id,
        product_name: item.product_name,
      });
    }

    return orders.map((order) => ({
      id: order.order_id,
      order_id: order.order_id,
      command_id: order.command_id,
      status: order.status,
      origin: order.origin,
      observations: order.observations,
      observacao: order.observations,
      created_at: order.created_at,
      criado_em: order.created_at,
      started_at: order.started_at,
      finished_at: order.finished_at,
      cancelled_at: order.cancelled_at,
      mesa: {
        codigo: order.table_number,
        table_id: order.table_id,
      },
      table_number: order.table_number,
      table_id: order.table_id,
      itens: groupedItems[order.order_id] || [],
      items: groupedItems[order.order_id] || [],
      recebido_em: order.started_at || order.created_at,
      cozinha_em: order.started_at,
      pronto_em: order.finished_at,
    }));
  }

  static async readOrderById(order_id) {
    const query = `
      SELECT
        o.order_id,
        o.created_by,
        o.origin,
        o.status,
        o.observations,
        o.created_at,
        o.started_at,
        o.finished_at,
        o.cancelled_at,
        c.command_id,
        c.table_id,
        t.number AS table_number
      FROM orders o
      INNER JOIN commands c ON c.command_id = o.command_id
      INNER JOIN tables t ON t.table_id = c.table_id
      WHERE o.order_id = ?
      LIMIT 1
    `;

    const [rows] = await connect.execute(query, [order_id]);

    if (rows.length === 0) {
      throw {
        status: 404,
        message: "Pedido não encontrado.",
      };
    }

    const order = rows[0];
    const itemsQuery = `
      SELECT
        oi.order_item_id,
        oi.quantity,
        oi.unit_price,
        oi.observation,
        p.product_id,
        p.name AS product_name
      FROM order_items oi
      INNER JOIN products p ON p.product_id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.order_item_id ASC
    `;

    const [items] = await connect.execute(itemsQuery, [order_id]);

    const mappedItems = items.map((item) => ({
      id: item.product_id,
      quantidade: item.quantity,
      quantity: item.quantity,
      nome: item.product_name,
      name: item.product_name,
      preco: Number(item.unit_price),
      price: Number(item.unit_price),
      observacao: item.observation,
      observation: item.observation,
      product_id: item.product_id,
      product_name: item.product_name,
    }));

    return {
      id: order.order_id,
      order_id: order.order_id,
      command_id: order.command_id,
      status: order.status,
      origin: order.origin,
      observations: order.observations,
      observacao: order.observations,
      created_at: order.created_at,
      criado_em: order.created_at,
      started_at: order.started_at,
      finished_at: order.finished_at,
      cancelled_at: order.cancelled_at,
      recebido_em: order.started_at || order.created_at,
      cozinha_em: order.started_at,
      pronto_em: order.finished_at,
      mesa: {
        codigo: order.table_number,
        table_id: order.table_id,
      },
      table_number: order.table_number,
      table_id: order.table_id,
      itens: mappedItems,
      items: mappedItems,
    };
  }

  static async updateOrderStatus(order_id, status) {
    const normalized = normalizeStatus(status);

    const allowedStatuses = [
      "PENDING",
      "PREPARING",
      "READY",
      "DELIVERED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(normalized)) {
      throw {
        status: 400,
        message: "Status de pedido inválido.",
      };
    }

    const connection = await connect.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        "SELECT status, started_at, finished_at, cancelled_at FROM orders WHERE order_id = ? LIMIT 1",
        [order_id],
      );

      if (rows.length === 0) {
        throw {
          status: 404,
          message: "Pedido não encontrado.",
        };
      }

      const current = rows[0];
      const updates = [];
      const values = [];

      updates.push("status = ?");
      values.push(normalized);

      if (normalized === "PREPARING" && !current.started_at) {
        updates.push("started_at = CURRENT_TIMESTAMP");
      }

      if (["READY", "DELIVERED", "CANCELLED"].includes(normalized) && !current.finished_at) {
        updates.push("finished_at = CURRENT_TIMESTAMP");
      }

      if (normalized === "CANCELLED" && !current.cancelled_at) {
        updates.push("cancelled_at = CURRENT_TIMESTAMP");
      }

      values.push(order_id);

      await connection.execute(
        `UPDATE orders SET ${updates.join(", ")} WHERE order_id = ?`,
        values,
      );

      await connection.commit();

      return {
        order_id: Number(order_id),
        status: normalized,
        message: "Status do pedido atualizado com sucesso.",
      };
    } catch (error) {
      await connection.rollback();

      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: "Erro ao atualizar o pedido.",
      };
    } finally {
      connection.release();
    }
  }

  static async requestAccount(order_id) {
    const [rows] = await connect.execute(
      "SELECT order_id FROM orders WHERE order_id = ? LIMIT 1",
      [order_id],
    );

    if (rows.length === 0) {
      throw {
        status: 404,
        message: "Pedido não encontrado.",
      };
    }

    return {
      order_id: Number(order_id),
      message: "Conta solicitada com sucesso.",
    };
  }
};
