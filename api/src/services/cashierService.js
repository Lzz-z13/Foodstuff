const connect = require("../database/connect");
const createLog = require("../utils/createLog");
const MercadoPago = require("./mercadoPagoService");
const { randomUUID } = require("crypto");

const cents = (value) => Math.round(Number(value) * 100);
const money = (value) => value / 100;

function totals(subtotal, rate, paid) {
  const subtotalCents = cents(subtotal);
  const feeCents = Math.round((subtotalCents * Number(rate)) / 100);
  const totalCents = subtotalCents + feeCents;
  return {
    subtotal: money(subtotalCents),
    service_fee_percent: Number(rate),
    service_fee: money(feeCents),
    total: money(totalCents),
    paid: Number(paid),
    balance: money(Math.max(0, totalCents - cents(paid))),
  };
}

function json(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function pixResponse(payment) {
  const pix = json(payment.pix_data) || {};
  return {
    payment_id: payment.payment_id,
    command_id: payment.command_id,
    value: Number(payment.value),
    method: payment.method,
    status: payment.status,
    paid_at: payment.paid_at,
    mp_order_id: payment.mp_order_id,
    mp_payment_id: payment.mp_payment_id,
    ...pix,
  };
}

function providerCents(value) {
  return typeof value === "string" &&
    /^\d+(\.\d{1,2})?$/.test(value) &&
    Number.isSafeInteger(cents(value))
    ? cents(value)
    : NaN;
}

function validatePixOrder(local, order) {
  const request = json(local.mp_request);
  const payment = order?.transactions?.payments?.[0];
  if (
    order?.type !== "online" ||
    order.processing_mode !== "automatic" ||
    typeof order.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(order.id) ||
    order.external_reference !== request?.external_reference ||
    providerCents(order.total_amount) !== cents(local.value) ||
    order.transactions?.payments?.length !== 1 ||
    typeof payment?.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(payment.id) ||
    providerCents(payment.amount) !== cents(local.value) ||
    payment.payment_method?.id !== "pix" ||
    payment.payment_method?.type !== "bank_transfer" ||
    (local.mp_order_id && local.mp_order_id !== order.id) ||
    (local.mp_payment_id && local.mp_payment_id !== payment.id)
  ) {
    throw {
      status: 409,
      message:
        "A confirmação do Mercado Pago não corresponde à cobrança local. Verificação necessária.",
    };
  }
  return payment;
}

async function lockCommand(connection, commandId) {
  const [commands] = await connection.execute(
    "SELECT status FROM commands WHERE command_id = ? FOR UPDATE",
    [commandId],
  );
  if (!commands.length)
    throw { status: 404, message: "Comanda não encontrada." };
  return commands[0];
}

module.exports = class CashierService {
  static async readSummary() {
    const [rows] =
      await connect.execute(`SELECT COALESCE(SUM(value), 0) AS received_today
      FROM payments WHERE status = 'PAID' AND paid_at >= CURRENT_DATE() AND paid_at < CURRENT_DATE() + INTERVAL 1 DAY`);
    return { received_today: Number(rows[0].received_today) };
  }
  static async readCommands() {
    const [commands] = await connect.execute(`
      SELECT c.command_id, c.customer_name, c.status, c.opened_at, c.closed_at,
        c.service_fee_percent, t.number AS table_number,
        COALESCE((SELECT SUM(oi.quantity * oi.unit_price) FROM orders o
          JOIN order_items oi ON oi.order_id = o.order_id
          WHERE o.command_id = c.command_id AND o.status <> 'CANCELLED'), 0) AS subtotal,
        COALESCE((SELECT SUM(p.value) FROM payments p
          WHERE p.command_id = c.command_id AND p.status = 'PAID'), 0) AS paid
      FROM commands c JOIN tables t ON t.table_id = c.table_id
      WHERE c.status IN ('OPEN', 'CLOSED')
      ORDER BY c.opened_at ASC, c.command_id ASC
    `);
    return commands.map((command) => ({
      ...command,
      ...totals(command.subtotal, command.service_fee_percent, command.paid),
    }));
  }

  static async readCheckout(commandId, db = connect) {
    const [commands] = await db.execute(
      `
      SELECT c.command_id, c.customer_name, c.status, c.opened_at, c.closed_at,
        c.service_fee_percent, t.number AS table_number, u.name AS waiter_name
      FROM commands c JOIN tables t ON t.table_id = c.table_id
      LEFT JOIN users u ON u.user_id = c.opened_by WHERE c.command_id = ?
    `,
      [commandId],
    );
    if (!commands.length)
      throw { status: 404, message: "Comanda não encontrada." };
    const [items] = await db.execute(
      `
      SELECT oi.order_item_id, oi.quantity, oi.unit_price, p.name AS product_name,
        oi.quantity * oi.unit_price AS subtotal
      FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
      JOIN products p ON p.product_id = oi.product_id
      WHERE o.command_id = ? AND o.status <> 'CANCELLED' ORDER BY oi.order_item_id
    `,
      [commandId],
    );
    const [payments] = await db.execute(
      "SELECT payment_id, value, method, status, paid_at FROM payments WHERE command_id = ? ORDER BY payment_id",
      [commandId],
    );
    const subtotalCents = items.reduce(
      (sum, item) => sum + cents(item.subtotal),
      0,
    );
    const paidCents = payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + cents(p.value), 0);
    return {
      ...commands[0],
      items: items.map((item) => ({
        ...item,
        unit_price: Number(item.unit_price),
        subtotal: Number(item.subtotal),
      })),
      payments,
      ...totals(
        money(subtotalCents),
        commands[0].service_fee_percent,
        money(paidCents),
      ),
    };
  }

  static async pay(commandId, body, userId) {
    if (body.method === "PIX")
      throw {
        status: 400,
        message: "Pix só pode ser confirmado pelo Mercado Pago.",
      };
    const connection = await connect.getConnection();
    try {
      await connection.beginTransaction();
      const [commands] = await connection.execute(
        "SELECT status FROM commands WHERE command_id = ? FOR UPDATE",
        [commandId],
      );
      if (!commands.length)
        throw { status: 404, message: "Comanda não encontrada." };
      if (!["OPEN", "CLOSED"].includes(commands[0].status)) {
        throw {
          status: 409,
          message: "Esta comanda já foi paga ou cancelada.",
        };
      }
      const [pending] = await connection.execute(
        "SELECT payment_id FROM payments WHERE command_id = ? AND method = 'PIX' AND status = 'PENDING' FOR UPDATE",
        [commandId],
      );
      if (pending.length)
        throw {
          status: 409,
          message:
            "Existe um Pix pendente ou com resultado desconhecido. Consulte a cobrança antes de registrar outro pagamento.",
        };
      // Mesmo bloqueio usado ao criar pedidos; estabiliza os pedidos antes de calcular a conta.
      await connection.execute(
        "SELECT order_id FROM orders WHERE command_id = ? FOR UPDATE",
        [commandId],
      );
      const checkout = await this.readCheckout(commandId, connection);
      const balance = cents(checkout.balance);
      const value = cents(body.value);
      if (balance !== cents(body.expected_balance)) {
        throw {
          status: 409,
          message:
            "O saldo da comanda mudou. Atualize a conta antes de confirmar.",
        };
      }
      if (value > balance || balance <= 0)
        throw {
          status: 400,
          message:
            "O pagamento deve ser maior que zero e não pode ultrapassar o saldo.",
        };
      const [result] = await connection.execute(
        "INSERT INTO payments (value, method, command_id) VALUES (?, ?, ?)",
        [money(value), body.method, commandId],
      );
      const status = value === balance ? "PAID" : "CLOSED";
      await connection.execute(
        `UPDATE commands SET status = ?, closed_at = COALESCE(closed_at, NOW()),
        closed_by = COALESCE(closed_by, ?) WHERE command_id = ?`,
        [status, userId, commandId],
      );
      const change =
        body.method === "CASH" ? money(cents(body.received_amount) - value) : 0;
      await createLog(
        connection,
        userId,
        "REGISTER_PAYMENT",
        "payments",
        result.insertId,
        `Pagamento registrado na comanda #${commandId}.`,
        JSON.stringify({
          command_id: commandId,
          value: money(value),
          method: body.method,
          received_amount: body.method === "CASH" ? body.received_amount : null,
          change,
          status,
        }),
      );
      await connection.commit();
      return {
        payment_id: result.insertId,
        command_id: commandId,
        status,
        change,
        balance: money(balance - value),
      };
    } catch (error) {
      await connection.rollback();
      if (error.status) throw error;
      throw { status: 500, message: "Erro ao registrar o pagamento." };
    } finally {
      connection.release();
    }
  }

  static async createPix(commandId, userId) {
    const connection = await connect.getConnection();
    let local;
    let created = false;
    try {
      await connection.beginTransaction();
      const command = await lockCommand(connection, commandId);
      if (!["OPEN", "CLOSED"].includes(command.status)) {
        throw {
          status: 409,
          message: "Esta comanda já foi paga ou cancelada.",
        };
      }
      const [pending] = await connection.execute(
        "SELECT * FROM payments WHERE command_id = ? AND method = 'PIX' AND status = 'PENDING' FOR UPDATE",
        [commandId],
      );
      if (pending.length) {
        local = pending[0];
      } else {
        await connection.execute(
          "SELECT order_id FROM orders WHERE command_id = ? FOR UPDATE",
          [commandId],
        );
        const checkout = await this.readCheckout(commandId, connection);
        const balance = checkout.balance;
        const key = randomUUID();
        const payload = MercadoPago.buildPixRequest(
          balance,
          `foodstuff-pix-${key}`,
        );
        const [result] = await connection.execute(
          `INSERT INTO payments
          (value, method, status, paid_at, command_id, idempotency_key, mp_request)
          VALUES (?, 'PIX', 'PENDING', NULL, ?, ?, ?)`,
          [balance, commandId, key, JSON.stringify(payload)],
        );
        await connection.execute(
          `UPDATE commands SET status = 'CLOSED', closed_at = COALESCE(closed_at, NOW()),
          closed_by = COALESCE(closed_by, ?) WHERE command_id = ?`,
          [userId, commandId],
        );
        await createLog(
          connection,
          userId,
          "CREATE_PIX",
          "payments",
          result.insertId,
          `Cobrança Pix criada para a comanda #${commandId}.`,
          JSON.stringify({ command_id: commandId, value: balance }),
        );
        const [rows] = await connection.execute(
          "SELECT * FROM payments WHERE payment_id = ?",
          [result.insertId],
        );
        local = rows[0];
        created = true;
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.status) throw error;
      // Não registrar SQL, payload ou credenciais nos logs técnicos.
      console.error("Erro ao reservar cobrança Pix:", error.code || "UNKNOWN");
      if (error.code === "ER_BAD_FIELD_ERROR") {
        throw {
          status: 503,
          message:
            "A configuração do Pix no servidor está incompleta. Contate o administrador para atualizar o banco de dados.",
        };
      }
      throw {
        status: 500,
        message:
          "Não foi possível iniciar a cobrança Pix. Tente novamente; se o erro persistir, contate o administrador.",
      };
    } finally {
      connection.release();
    }

    // Nenhuma conexão transacional fica aberta durante chamadas externas.
    if (local.mp_order_id)
      return { created: false, payment: pixResponse(local) };
    const payment = await this.recoverPix(local, userId);
    return { created, payment };
  }

  static async recoverPix(local, userId) {
    // Não repetir um POST antigo indefinidamente: o provedor tem retenção limitada
    // de idempotência. Mantém a reserva para verificação externa após uma hora.
    const [ages] = await connect.execute(
      "SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds FROM payments WHERE payment_id = ?",
      [local.payment_id],
    );
    if (
      !ages.length ||
      ages[0].age_seconds < 0 ||
      ages[0].age_seconds > 60 * 60
    ) {
      throw {
        status: 409,
        message: `A tentativa Pix #${local.payment_id} não possui order confirmada. Verifique no Mercado Pago; a cobrança continua bloqueada para evitar duplicidade.`,
      };
    }
    const order = await MercadoPago.criarPix({
      payload: json(local.mp_request),
      idempotencyKey: local.idempotency_key,
    });
    return this.applyPixOrder(
      local.payment_id,
      local.command_id,
      order,
      userId,
      false,
    );
  }

  static async readPixStatus(paymentId, userId) {
    const [rows] = await connect.execute(
      "SELECT * FROM payments WHERE payment_id = ? AND method = 'PIX' AND idempotency_key IS NOT NULL",
      [paymentId],
    );
    if (!rows.length)
      throw { status: 404, message: "Cobrança Pix não encontrada." };
    const local = rows[0];
    if (local.status !== "PENDING") return pixResponse(local);
    if (!local.mp_order_id) {
      // Recupera também uma resposta de criação perdida, usando o mesmo payload/chave.
      await this.recoverPix(local, userId);
      return this.readPixStatus(paymentId, userId);
    }
    const order = await MercadoPago.readOrder(local.mp_order_id);
    if (order?.id !== local.mp_order_id)
      throw { status: 409, message: "Identificador de confirmação inválido." };
    return this.applyPixOrder(
      local.payment_id,
      local.command_id,
      order,
      userId,
    );
  }

  static async cancelPix(paymentId, userId) {
    // Consulta também recupera uma criação cuja resposta se perdeu e reconhece
    // pagamentos já recebidos. Nunca cancela apenas o registro local.
    const payment = await this.readPixStatus(paymentId, userId);
    if (payment.status !== "PENDING") return payment;
    if (!["created", "action_required"].includes(payment.mp_status)) {
      throw {
        status: 409,
        message:
          "Este Pix está em processamento. Aguarde a confirmação antes de trocar a forma de pagamento.",
      };
    }
    const [rows] = await connect.execute(
      "SELECT idempotency_key FROM payments WHERE payment_id = ? AND method = 'PIX'",
      [paymentId],
    );
    if (!rows[0]?.idempotency_key)
      throw {
        status: 409,
        message:
          "Não foi possível identificar a tentativa Pix para cancelamento.",
      };
    let cancellationError;
    try {
      await MercadoPago.cancelOrder(
        payment.mp_order_id,
        `cancel-${rows[0].idempotency_key}`,
      );
    } catch (error) {
      cancellationError = error;
    }
    // Um timeout pode ter cancelado no provedor; ou o cliente pode ter pago no
    // mesmo instante. O GET validado e transacional decide o resultado final.
    const current = await this.readPixStatus(paymentId, userId);
    if (current.status === "PAID" || current.status === "CANCELLED")
      return current;
    if (cancellationError) throw cancellationError;
    throw {
      status: 409,
      message:
        "O cancelamento do Pix ainda não foi confirmado. Consulte novamente antes de escolher outro método.",
    };
  }

  static async confirmPixOrder(orderId) {
    const order = await MercadoPago.readOrder(orderId);
    if (order?.id !== orderId)
      throw { status: 409, message: "Identificador de confirmação inválido." };
    // A referência consultada na API permite recuperar webhook anterior à resposta do POST.
    const key =
      typeof order.external_reference === "string" &&
      order.external_reference.startsWith("foodstuff-pix-")
        ? order.external_reference.slice("foodstuff-pix-".length)
        : null;
    const [rows] = key
      ? await connect.execute(
          "SELECT payment_id, command_id FROM payments WHERE idempotency_key = ? AND method = 'PIX'",
          [key],
        )
      : [[]];
    if (!rows.length) return; // Outra cobrança da mesma conta Mercado Pago.
    return this.applyPixOrder(
      rows[0].payment_id,
      rows[0].command_id,
      order,
      null,
    );
  }

  static async applyPixOrder(
    paymentId,
    commandId,
    order,
    userId,
    confirm = true,
  ) {
    const connection = await connect.getConnection();
    try {
      await connection.beginTransaction();
      const command = await lockCommand(connection, commandId);
      const [rows] = await connection.execute(
        "SELECT * FROM payments WHERE payment_id = ? FOR UPDATE",
        [paymentId],
      );
      if (!rows.length)
        throw { status: 404, message: "Cobrança Pix não encontrada." };
      const local = rows[0];
      const externalPayment = validatePixOrder(local, order);
      // Uma consulta antiga em voo nunca reverte uma confirmação já aplicada.
      if (local.status !== "PENDING") {
        await connection.commit();
        return pixResponse(local);
      }
      const previousPix = json(local.pix_data) || {};
      const pix = {
        mp_status: order.status,
        mp_status_detail: order.status_detail,
        qr_code:
          externalPayment.payment_method.qr_code || previousPix.qr_code || null,
        qr_code_base64:
          externalPayment.payment_method.qr_code_base64 ||
          previousPix.qr_code_base64 ||
          null,
        ticket_url:
          externalPayment.payment_method.ticket_url ||
          previousPix.ticket_url ||
          null,
      };
      const approved =
        confirm &&
        order.status === "processed" &&
        order.status_detail === "accredited" &&
        externalPayment.status === "processed" &&
        externalPayment.status_detail === "accredited";
      const cancelled =
        confirm &&
        ["canceled", "failed"].includes(order.status) &&
        ["canceled", "failed"].includes(externalPayment.status) &&
        providerCents(order.total_paid_amount) === 0;
      let status = "PENDING";
      if (approved) {
        if (
          providerCents(order.total_paid_amount) !== cents(local.value) ||
          command.status !== "CLOSED"
        ) {
          throw {
            status: 409,
            message:
              "Valor recebido ou estado da comanda divergente. Verificação necessária.",
          };
        }
        await connection.execute(
          "SELECT order_id FROM orders WHERE command_id = ? FOR UPDATE",
          [commandId],
        );
        const checkout = await this.readCheckout(commandId, connection);
        if (cents(checkout.balance) !== cents(local.value)) {
          throw {
            status: 409,
            message:
              "O saldo da comanda diverge da cobrança Pix. Verificação necessária.",
          };
        }
        status = "PAID";
      } else if (cancelled) {
        status = "CANCELLED";
      }
      await connection.execute(
        `UPDATE payments SET mp_order_id = ?, mp_payment_id = ?, pix_data = ?,
        status = ?, paid_at = CASE WHEN ? = 'PAID' THEN NOW() ELSE NULL END WHERE payment_id = ?`,
        [
          order.id,
          externalPayment.id,
          JSON.stringify(pix),
          status,
          status,
          paymentId,
        ],
      );
      if (status === "PAID") {
        const checkout = await this.readCheckout(commandId, connection);
        await connection.execute(
          "UPDATE commands SET status = ? WHERE command_id = ?",
          [cents(checkout.balance) === 0 ? "PAID" : "CLOSED", commandId],
        );
      }
      if (status !== "PENDING") {
        await createLog(
          connection,
          userId,
          status === "PAID" ? "REGISTER_PAYMENT" : "CANCEL_PIX",
          "payments",
          paymentId,
          `Pix ${status === "PAID" ? "confirmado" : "encerrado sem recebimento"} pelo Mercado Pago na comanda #${commandId}.`,
          JSON.stringify({
            command_id: commandId,
            value: Number(local.value),
            method: "PIX",
            mp_order_id: order.id,
          }),
        );
      }
      const [updated] = await connection.execute(
        "SELECT * FROM payments WHERE payment_id = ?",
        [paymentId],
      );
      await connection.commit();
      return pixResponse(updated[0]);
    } catch (error) {
      await connection.rollback();
      if (error.status) throw error;
      throw {
        status: 500,
        message:
          "Erro ao atualizar o Pix. A tentativa foi preservada; consulte o status novamente.",
      };
    } finally {
      connection.release();
    }
  }
};
