const connect = require('../database/connect');
const createLog = require('../utils/createLog');

const cents = value => Math.round(Number(value) * 100);
const money = value => value / 100;

function totals(subtotal, rate, paid) {
  const subtotalCents = cents(subtotal);
  const feeCents = Math.round(subtotalCents * Number(rate) / 100);
  const totalCents = subtotalCents + feeCents;
  return { subtotal: money(subtotalCents), service_fee_percent: Number(rate),
    service_fee: money(feeCents), total: money(totalCents), paid: Number(paid),
    balance: money(Math.max(0, totalCents - cents(paid))) };
}

module.exports = class CashierService {
  static async readSummary() {
    const [rows] = await connect.execute(`SELECT COALESCE(SUM(value), 0) AS received_today
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
    return commands.map(command => ({ ...command,
      ...totals(command.subtotal, command.service_fee_percent, command.paid) }));
  }

  static async readCheckout(commandId, db = connect) {
    const [commands] = await db.execute(`
      SELECT c.command_id, c.customer_name, c.status, c.opened_at, c.closed_at,
        c.service_fee_percent, t.number AS table_number, u.name AS waiter_name
      FROM commands c JOIN tables t ON t.table_id = c.table_id
      LEFT JOIN users u ON u.user_id = c.opened_by WHERE c.command_id = ?
    `, [commandId]);
    if (!commands.length) throw { status: 404, message: 'Comanda não encontrada.' };
    const [items] = await db.execute(`
      SELECT oi.order_item_id, oi.quantity, oi.unit_price, p.name AS product_name,
        oi.quantity * oi.unit_price AS subtotal
      FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
      JOIN products p ON p.product_id = oi.product_id
      WHERE o.command_id = ? AND o.status <> 'CANCELLED' ORDER BY oi.order_item_id
    `, [commandId]);
    const [payments] = await db.execute(
      'SELECT payment_id, value, method, status, paid_at FROM payments WHERE command_id = ? ORDER BY payment_id', [commandId]);
    const subtotalCents = items.reduce((sum, item) => sum + cents(item.subtotal), 0);
    const paidCents = payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + cents(p.value), 0);
    return { ...commands[0], items: items.map(item => ({ ...item, unit_price: Number(item.unit_price), subtotal: Number(item.subtotal) })),
      payments, ...totals(money(subtotalCents), commands[0].service_fee_percent, money(paidCents)) };
  }

  static async pay(commandId, body, userId) {
    const connection = await connect.getConnection();
    try {
      await connection.beginTransaction();
      const [commands] = await connection.execute('SELECT status FROM commands WHERE command_id = ? FOR UPDATE', [commandId]);
      if (!commands.length) throw { status: 404, message: 'Comanda não encontrada.' };
      if (!['OPEN', 'CLOSED'].includes(commands[0].status)) {
        throw { status: 409, message: 'Esta comanda já foi paga ou cancelada.' };
      }
      // Mesmo bloqueio usado ao criar pedidos; estabiliza os pedidos antes de calcular a conta.
      await connection.execute('SELECT order_id FROM orders WHERE command_id = ? FOR UPDATE', [commandId]);
      const checkout = await this.readCheckout(commandId, connection);
      const balance = cents(checkout.balance);
      const value = cents(body.value);
      if (balance !== cents(body.expected_balance)) {
        throw { status: 409, message: 'O saldo da comanda mudou. Atualize a conta antes de confirmar.' };
      }
      if (value > balance || balance <= 0) throw { status: 400, message: 'O pagamento deve ser maior que zero e não pode ultrapassar o saldo.' };
      const [result] = await connection.execute(
        "INSERT INTO payments (value, method, command_id) VALUES (?, ?, ?)", [money(value), body.method, commandId]);
      const status = value === balance ? 'PAID' : 'CLOSED';
      await connection.execute(`UPDATE commands SET status = ?, closed_at = COALESCE(closed_at, NOW()),
        closed_by = COALESCE(closed_by, ?) WHERE command_id = ?`, [status, userId, commandId]);
      const change = body.method === 'CASH' ? money(cents(body.received_amount) - value) : 0;
      await createLog(connection, userId, 'REGISTER_PAYMENT', 'payments', result.insertId,
        `Pagamento registrado na comanda #${commandId}.`, JSON.stringify({ command_id: commandId, value: money(value),
          method: body.method, received_amount: body.method === 'CASH' ? body.received_amount : null, change, status }));
      await connection.commit();
      return { payment_id: result.insertId, command_id: commandId, status, change, balance: money(balance - value) };
    } catch (error) {
      await connection.rollback();
      if (error.status) throw error;
      throw { status: 500, message: 'Erro ao registrar o pagamento.' };
    } finally { connection.release(); }
  }
};
