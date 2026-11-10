const connect = require("../database/connect");
const createLog = require("../utils/createLog");

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

const ORDER_STATUS_TRANSITIONS = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["PENDING", "READY", "CANCELLED"],
  READY: ["PREPARING", "DELIVERED", "CANCELLED"],
  DELIVERED: ["READY"],
  CANCELLED: [],
};

module.exports = class OrderService {
  // Lista os pedidos no formato utilizado pelo aplicativo do garçom.
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
        p.name AS product_name
      FROM order_items oi
      INNER JOIN products p ON p.product_id = oi.product_id
      WHERE oi.order_id IN (${placeholders})
      ORDER BY oi.order_item_id ASC
    `;

    const [items] = await connect.execute(itemsQuery, orderIds);
    const groupedItems = {};

    for (const item of items) {
      if (!groupedItems[item.order_id]) {
        groupedItems[item.order_id] = [];
      }

      groupedItems[item.order_id].push({
        id: item.product_id,
        quantidade: item.quantity,
        quantity: item.quantity,
        nome: item.product_name,
        name: item.product_name,
        preco: Number(item.unit_price),
        price: Number(item.unit_price),
        unit_price: Number(item.unit_price),
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

  // Cria um pedido para uma comanda aberta.
  static async createOrder(command_id, items, jwt_user_id, options = {}) {
    const origin = options.origin === "CUSTOMER" ? "CUSTOMER" : "WAITER";
    const created_by =
      options.createdBy !== undefined ? options.createdBy : jwt_user_id;

    const connection = await connect.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      if (!Array.isArray(items) || items.length === 0) {
        throw {
          status: 400,
          message: "O pedido precisa ter pelo menos um item.",
        };
      }

      // Verifica e bloqueia a comanda durante a criação do pedido.
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

      if (commandResult[0].status !== "OPEN") {
        throw {
          status: 400,
          message: "A comanda não está aberta para novos pedidos.",
        };
      }

      // Busca os produtos e seus preços atuais.
      const productIds = items.map((item) => item.product_id);
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

      const productsMap = new Map();

      for (const product of productsResult) {
        productsMap.set(product.product_id, product);
      }

      // Valida todos os itens antes de inserir o pedido.
      for (const item of items) {
        const product = productsMap.get(item.product_id);

        if (!product || Number(product.is_active) !== 1) {
          throw {
            status: 404,
            message: "Produto não encontrado ou inativo.",
          };
        }

        if (Number(product.is_available) === 0) {
          throw {
            status: 400,
            message: `O produto "${product.name}" está indisponível.`,
          };
        }

        if (
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) <= 0
        ) {
          throw {
            status: 400,
            message: "A quantidade dos itens deve ser maior que zero.",
          };
        }
      }

      // Insere o pedido.
      const insertOrderQuery = `
        INSERT INTO orders
          (created_by, origin, status, command_id)
        VALUES (?, ?, ?, ?)
      `;

      const [orderResult] = await connection.execute(insertOrderQuery, [
        created_by,
        origin,
        "PENDING",
        command_id,
      ]);

      const orderId = orderResult.insertId;

      // Insere os itens do pedido com os preços atuais.
      const insertOrderItemQuery = `
        INSERT INTO order_items
          (quantity, unit_price, observation, order_id, product_id)
        VALUES (?, ?, ?, ?, ?)
      `;

      for (const item of items) {
        const product = productsMap.get(item.product_id);

        const observation =
          item.observation == null ||
          String(item.observation).trim() === ""
            ? null
            : String(item.observation).trim();

        await connection.execute(insertOrderItemQuery, [
          Number(item.quantity),
          product.price,
          observation,
          orderId,
          item.product_id,
        ]);
      }

      // Registra a criação no log de auditoria.
      await createLog(
        connection,
        created_by,
        "CREATE",
        "orders",
        orderId,
        origin === "CUSTOMER"
          ? "Pedido criado pelo cliente."
          : "Pedido criado",
        null,
      );

      await connection.commit();
      transactionStarted = false;

      return {
        order_id: orderId,
        status: "PENDING",
      };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }

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

  // Cria um pedido feito pelo próprio cliente a partir do token de sessão.
  static async createCustomerOrderBySession(session_token, items) {
    const [commands] = await connect.execute(
      `SELECT command_id FROM commands WHERE session_token = ? LIMIT 1`,
      [session_token],
    );

    if (commands.length === 0) {
      throw {
        status: 404,
        message: "Comanda não encontrada.",
      };
    }

    return this.createOrder(commands[0].command_id, items, null, {
      origin: "CUSTOMER",
      createdBy: null,
    });
  }

  // Atualiza o status do pedido e registra a alteração.
  static async updateOrderStatus(order_id, status, jwt_user_id) {
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
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      // Serializa alterações de consumo com o fechamento/pagamento da comanda.
      const [orderCommands] = await connection.execute(
        'SELECT command_id FROM orders WHERE order_id = ?',
        [order_id],
      );
      const [commandRows] = orderCommands.length ? await connection.execute(
        'SELECT command_id, status FROM commands WHERE command_id = ? FOR UPDATE',
        [orderCommands[0].command_id],
      ) : [[]];
      if (normalized === 'CANCELLED' && commandRows.length && commandRows[0].status !== 'OPEN') {
        throw { status: 409, message: 'Não é possível cancelar consumo de uma comanda fechada ou paga.' };
      }

      const [orderResult] = await connection.execute(
        `SELECT
          order_id,
          status,
          started_at,
          finished_at,
          cancelled_at
         FROM orders
         WHERE order_id = ?
         LIMIT 1
         FOR UPDATE`,
        [order_id],
      );

      if (orderResult.length === 0) {
        throw {
          status: 404,
          message: "Pedido não encontrado.",
        };
      }

      const current = orderResult[0];
      const currentStatus = normalizeStatus(current.status);

      if (currentStatus === normalized) {
        throw {
          status: 400,
          message: "O pedido já está neste status.",
        };
      }

      const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];

      if (!allowed.includes(normalized)) {
        throw {
          status: 400,
          message: `Não é possível alterar o status de ${currentStatus} para ${normalized}.`,
        };
      }

      const updates = ["status = ?"];
      const values = [normalized];

      if (normalized === "PENDING") {
        updates.push(
          "started_at = NULL",
          "finished_at = NULL",
          "cancelled_at = NULL",
        );
      } else if (normalized === "PREPARING") {
        updates.push(
          "started_at = COALESCE(started_at, CURRENT_TIMESTAMP)",
          "finished_at = NULL",
          "cancelled_at = NULL",
        );
      } else if (
        normalized === "READY" ||
        normalized === "DELIVERED"
      ) {
        updates.push(
          "started_at = COALESCE(started_at, CURRENT_TIMESTAMP)",
          "finished_at = COALESCE(finished_at, CURRENT_TIMESTAMP)",
          "cancelled_at = NULL",
        );
      } else if (normalized === "CANCELLED") {
        updates.push(
          "cancelled_at = COALESCE(cancelled_at, CURRENT_TIMESTAMP)",
        );
      }

      values.push(order_id);

      await connection.execute(
        `UPDATE orders
         SET ${updates.join(", ")}
         WHERE order_id = ?`,
        values,
      );

      await createLog(
        connection,
        jwt_user_id,
        "UPDATE",
        "orders",
        order_id,
        `Status do pedido alterado de ${currentStatus} para ${normalized}`,
        null,
      );

      await connection.commit();
      transactionStarted = false;

      return {
        order_id: Number(order_id),
        status: normalized,
        previous_status: currentStatus,
      };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }

      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: "Erro ao atualizar o status do pedido.",
      };
    } finally {
      connection.release();
    }
  }

  // Lista os pedidos para o painel administrativo.
  static async readAllOrders() {
    const ordersQuery = `
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

      const orderIds = orders.map((order) => order.order_id);
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

      return orders.map((order) => {
        const orderItems = itemsByOrder.get(order.order_id) || [];

        const total = orderItems.reduce(
          (sum, item) =>
            sum +
            Number(item.quantity) * Number(item.unit_price),
          0,
        );

        return {
          order_id: order.order_id,
          created_by: order.created_by,
          origin: order.origin,
          status: order.status,
          observations: order.observations,
          created_at: order.created_at,
          started_at: order.started_at,
          finished_at: order.finished_at,
          cancelled_at: order.cancelled_at,
          command_id: order.command_id,
          customer_name: order.customer_name,
          table_id: order.table_id,
          table_number: order.table_number,
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

  // Busca os detalhes de um pedido específico.
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

      const normalizedItems = items.map((item) => ({
        id: item.product_id,
        quantidade: item.quantity,
        quantity: item.quantity,
        nome: item.product_name,
        name: item.product_name,
        preco: Number(item.unit_price),
        price: Number(item.unit_price),
        unit_price: Number(item.unit_price),
        observacao: item.observation,
        observation: item.observation,
        product_id: item.product_id,
        product_name: item.product_name,
      }));

      const total = normalizedItems.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity) * Number(item.unit_price),
        0,
      );

      return {
        id: order.order_id,
        order_id: order.order_id,
        created_by: order.created_by,
        origin: order.origin,
        status: order.status,
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
        command_id: order.command_id,
        customer_name: order.customer_name,

        mesa: {
          codigo: order.table_number,
          table_id: order.table_id,
        },

        table_id: order.table_id,
        table_number: order.table_number,
        total,
        itens: normalizedItems,
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

  // Solicita a conta de um pedido fechando a comanda para o caixa.
  static async requestAccount(order_id, jwt_user_id) {
    const connection = await connect.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      // Serializa o fechamento com a criação de pedidos e o pagamento.
      const [orders] = await connection.execute(
        "SELECT command_id FROM orders WHERE order_id = ? LIMIT 1",
        [order_id],
      );

      if (orders.length === 0) {
        throw {
          status: 404,
          message: "Pedido não encontrado.",
        };
      }

      const command_id = orders[0].command_id;

      const [commands] = await connection.execute(
        "SELECT status FROM commands WHERE command_id = ? FOR UPDATE",
        [command_id],
      );

      if (commands.length === 0) {
        throw {
          status: 404,
          message: "Comanda não encontrada.",
        };
      }

      const status = commands[0].status;

      if (status === "CLOSED") {
        throw {
          status: 409,
          message: "A conta desta comanda já foi solicitada.",
        };
      }

      if (status !== "OPEN") {
        throw {
          status: 409,
          message: "Esta comanda já foi encerrada.",
        };
      }

      // A comanda fechada deixa de aceitar novos pedidos e passa a aparecer
      // para o caixa como "Fechada", pronta para o checkout.
      await connection.execute(
        `UPDATE commands
         SET status = 'CLOSED',
             closed_at = COALESCE(closed_at, NOW()),
             closed_by = COALESCE(closed_by, ?)
         WHERE command_id = ?`,
        [jwt_user_id, command_id],
      );

      await createLog(
        connection,
        jwt_user_id,
        "UPDATE",
        "commands",
        command_id,
        `Conta da comanda #${command_id} solicitada pelo pedido #${order_id}.`,
        null,
      );

      await connection.commit();
      transactionStarted = false;

      return {
        order_id: Number(order_id),
        command_id: Number(command_id),
        status: "CLOSED",
      };
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }

      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: "Erro ao solicitar a conta.",
      };
    } finally {
      connection.release();
    }
  }
};
