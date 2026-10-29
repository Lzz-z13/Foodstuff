const request = require('supertest');
const app = require('../../src/index');
const { reset, closeDb, connect, insertTable, insertCommand, insertOrder, insertProduct } = require('../helpers/db');
const { managerToken, cashierToken, waiterToken } = require('../helpers/auth');
const { ADMIN } = require('../setup/constants');
const BASE = '/api/foodstuff';
let commandId;
let orderId;
const checkout = () => request(app).get(`${BASE}/commands/${commandId}/checkout`).set('Authorization', `Bearer ${cashierToken()}`);
const pay = body => request(app).post(`${BASE}/commands/${commandId}/payments`).set('Authorization', `Bearer ${cashierToken()}`).send(body);
const payment = (extra = {}) => ({ method: 'PIX', value: 110, expected_balance: 110, ...extra });

beforeEach(async () => {
  await reset();
  await connect.execute('INSERT INTO users (user_id, name, email, phone, password, role, first_login) VALUES (?, ?, ?, ?, ?, ?, 0)',
    ['44444444-4444-4444-4444-444444444444', 'Caixa Teste', 'cashier@foodstuff.test', '11900009999', ADMIN.password, 'CASHIER']);
  const tableId = await insertTable({ number: 12 });
  commandId = await insertCommand({ table_id: tableId, customer_name: 'Cliente Caixa' });
  orderId = await insertOrder({ command_id: commandId, status: 'DELIVERED' });
  const productId = await insertProduct({ name: 'Produto Caixa', price: 80 });
  // O valor cobrado usa o preço histórico, não o preço atual do produto.
  await connect.execute('INSERT INTO order_items (quantity, unit_price, order_id, product_id) VALUES (2, 50, ?, ?)', [orderId, productId]);
});
afterAll(closeDb);

test('lista comandas e calcula total com taxa de 10%, sem expor sessão do cliente', async () => {
  const res = await request(app).get(`${BASE}/commands`).set('Authorization', `Bearer ${cashierToken()}`);
  expect(res.status).toBe(200);
  expect(res.body.data[0]).toMatchObject({ command_id: commandId, subtotal: 100, service_fee: 10, total: 110, balance: 110 });
  expect(res.body.data[0]).not.toHaveProperty('session_token');
});
test('detalhe usa preço histórico e ignora pedidos cancelados', async () => {
  const cancelledId = await insertOrder({ command_id: commandId, status: 'CANCELLED' });
  const productId = await insertProduct({ name: 'Cancelado', price: 999 });
  await connect.execute('INSERT INTO order_items (quantity, unit_price, order_id, product_id) VALUES (1, 999, ?, ?)', [cancelledId, productId]);
  const res = await checkout();
  expect(res.status).toBe(200);
  expect(res.body.data).toMatchObject({ subtotal: 100, service_fee_percent: 10, total: 110, balance: 110 });
  expect(res.body.data.items).toHaveLength(1);
  expect(res.body.data.items[0].unit_price).toBe(50);
});
test('dinheiro registra apenas o devido, calcula troco, quita e audita', async () => {
  const res = await pay(payment({ method: 'CASH', received_amount: 150 }));
  expect(res.status).toBe(201);
  expect(res.body.data).toMatchObject({ status: 'PAID', change: 40, balance: 0 });
  const detail = await checkout();
  expect(detail.body.data.paid).toBe(110);
  const [logs] = await connect.execute("SELECT metadata FROM audit_logs WHERE action = 'REGISTER_PAYMENT'");
  expect(logs).toHaveLength(1);
  const [rows] = await connect.execute('SELECT closed_by, closed_at FROM commands WHERE command_id = ?', [commandId]);
  expect(rows[0].closed_by).toBe('44444444-4444-4444-4444-444444444444');
  expect(rows[0].closed_at).not.toBeNull();
});
test('pagamento parcial permite completar com outro método e bloqueia novos pedidos', async () => {
  const first = await pay(payment({ value: 50 }));
  expect(first.status).toBe(201);
  expect(first.body.data).toMatchObject({ status: 'CLOSED', balance: 60 });
  const second = await pay(payment({ value: 60, expected_balance: 60, method: 'CREDIT_CARD' }));
  expect(second.status).toBe(201);
  expect(second.body.data.status).toBe('PAID');
  expect((await checkout()).body.data.payments).toHaveLength(2);
});
test('envios simultâneos não duplicam a cobrança', async () => {
  const results = await Promise.all([pay(payment()), pay(payment())]);
  expect(results.map(r => r.status).sort()).toEqual([201, 409]);
  const [rows] = await connect.execute('SELECT COUNT(*) AS count FROM payments WHERE command_id = ?', [commandId]);
  expect(rows[0].count).toBe(1);
});
test('tentativa repetida de pagamento parcial com saldo antigo é rejeitada', async () => {
  await pay(payment({ value: 30 }));
  expect((await pay(payment({ value: 30 }))).status).toBe(409);
});
test.each([
  { method: 'INVALID' }, { value: -1 }, { value: 0 }, { value: 1.001 },
  { value: '110' }, { value: 111 }, { method: 'CASH', received_amount: 100 },
  { method: 'CASH' }, { expected_balance: 0 },
])('rejeita valor ou método inválido %j', async invalid => {
  expect((await pay(payment(invalid))).status).toBe(400);
  expect((await checkout()).body.data.paid).toBe(0);
});
test('comanda cancelada não aceita pagamento', async () => {
  await connect.execute("UPDATE commands SET status = 'CANCELLED' WHERE command_id = ?", [commandId]);
  expect((await pay(payment())).status).toBe(409);
});
test('saldo desatualizado é rejeitado', async () => {
  expect((await pay(payment({ expected_balance: 100 }))).status).toBe(409);
});
test('reverte pagamento se a auditoria falhar', async () => {
  const CashierService = require('../../src/services/cashierService');
  await expect(CashierService.pay(commandId, payment(), 'usuario-inexistente')).rejects.toMatchObject({ status: 500 });
  expect((await checkout()).body.data.paid).toBe(0);
  expect((await checkout()).body.data.status).toBe('OPEN');
});
test('restringe acesso a caixa e gerente e exige autenticação', async () => {
  expect((await request(app).get(`${BASE}/commands`)).status).toBe(401);
  expect((await request(app).get(`${BASE}/commands`).set('Authorization', `Bearer ${waiterToken()}`)).status).toBe(403);
  expect((await request(app).get(`${BASE}/commands`).set('Authorization', `Bearer ${managerToken()}`)).status).toBe(200);
});
test('comanda inexistente retorna 404', async () => {
  expect((await request(app).get(`${BASE}/commands/999999/checkout`).set('Authorization', `Bearer ${cashierToken()}`)).status).toBe(404);
});
test('resumo traz apenas pagamentos recebidos hoje', async () => {
  await pay(payment());
  const res = await request(app).get(`${BASE}/cashier/summary`).set('Authorization', `Bearer ${cashierToken()}`);
  expect(res.status).toBe(200);
  expect(res.body.data.received_today).toBe(110);
});
test('não permite novos pedidos depois de um pagamento parcial', async () => {
  await pay(payment({ value: 50 }));
  const OrderService = require('../../src/services/orderService');
  await expect(OrderService.createOrder(commandId, [{ product_id: 1, quantity: 1 }], ADMIN.user_id))
    .rejects.toMatchObject({ status: 400, message: 'A comanda não está aberta para novos pedidos.' });
});
test('cancelamento não altera o consumo de comanda já paga', async () => {
  await connect.execute("UPDATE orders SET status = 'PENDING' WHERE order_id = ?", [orderId]);
  await pay(payment());
  const res = await request(app).patch(`${BASE}/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${managerToken()}`).send({ status: 'CANCELLED' });
  expect(res.status).toBe(409);
  expect((await checkout()).body.data.total).toBe(110);
});
test('cancelamento antes do fechamento remove o consumo da conta', async () => {
  await connect.execute("UPDATE orders SET status = 'PENDING' WHERE order_id = ?", [orderId]);
  const res = await request(app).patch(`${BASE}/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${managerToken()}`).send({ status: 'CANCELLED' });
  expect(res.status).toBe(200);
  expect((await checkout()).body.data.total).toBe(0);
});
test('arredonda a taxa em centavos no servidor', async () => {
  await connect.execute('UPDATE order_items SET quantity = 1, unit_price = 11.87 WHERE order_id = ?', [orderId]);
  const detail = await checkout();
  expect(detail.body.data).toMatchObject({ subtotal: 11.87, service_fee: 1.19, total: 13.06 });
  expect((await pay(payment({ value: 13.06, expected_balance: 13.06 }))).status).toBe(201);
});
