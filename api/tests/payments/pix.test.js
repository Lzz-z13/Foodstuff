jest.mock('axios');

const axios = require('axios');
const request = require('supertest');
const { createHmac, randomUUID } = require('crypto');
const app = require('../../src/index');
const CashierService = require('../../src/services/cashierService');
const TableService = require('../../src/services/tableService');
const { reset, closeDb, connect, insertTable, insertCommand, insertOrder, insertProduct } = require('../helpers/db');
const { managerToken, cashierToken, waiterToken, kitchenToken, tokenFor } = require('../helpers/auth');
const { ADMIN } = require('../setup/constants');

const BASE = '/api/foodstuff';
let commandId;
let tableId;
let orderId;
let orders;
let savedEnv;

const create = (body = { command_id: commandId }, token = cashierToken()) => request(app)
  .post(`${BASE}/payments/pix`).set('Authorization', `Bearer ${token}`).send(body);
const read = (paymentId, token = cashierToken()) => request(app)
  .get(`${BASE}/payments/${paymentId}`).set('Authorization', `Bearer ${token}`);
const checkout = () => request(app).get(`${BASE}/commands/${commandId}/checkout`)
  .set('Authorization', `Bearer ${cashierToken()}`);
const manual = (extra = {}) => request(app).post(`${BASE}/commands/${commandId}/payments`)
  .set('Authorization', `Bearer ${cashierToken()}`)
  .send({ method: 'CASH', value: 50, received_amount: 50, expected_balance: 110, ...extra });

function providerOrder(payload) {
  const suffix = payload.external_reference.replace(/-/g, '').slice(-32);
  return {
    id: `ORD${suffix}`, type: 'online', processing_mode: 'automatic',
    external_reference: payload.external_reference, total_amount: payload.total_amount, total_paid_amount: '0.00',
    status: 'action_required', status_detail: 'waiting_transfer',
    transactions: { payments: [{ id: `PAY${suffix}`, amount: payload.total_amount,
      status: 'action_required', status_detail: 'waiting_transfer',
      payment_method: { id: 'pix', type: 'bank_transfer', qr_code: 'pix-copia-cola',
        qr_code_base64: 'cXItY29kZQ==', ticket_url: 'https://www.mercadopago.com.br/test-ticket' } }] },
  };
}

function approve(order) {
  order.status = 'processed';
  order.status_detail = 'accredited';
  order.total_paid_amount = order.total_amount;
  order.transactions.payments[0].status = 'processed';
  order.transactions.payments[0].status_detail = 'accredited';
}

function webhook(order, { timestamp = String(Math.floor(Date.now() / 1000)), hash, queryId = order.id } = {}) {
  const requestId = randomUUID();
  const digest = hash || createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
    .update(`id:${queryId};request-id:${requestId};ts:${timestamp};`).digest('hex');
  return request(app).post(`${BASE}/payments/webhook`).query({ 'data.id': queryId, type: 'order' })
    .set('x-request-id', requestId).set('x-signature', `ts=${timestamp},v1=${digest}`)
    .send({ data: { id: 'IGNORED_BODY', status: 'processed' } });
}

beforeEach(async () => {
  await reset();
  savedEnv = { MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN, MP_PAYER_EMAIL: process.env.MP_PAYER_EMAIL,
    MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET };
  await connect.execute(`INSERT INTO users (user_id, name, email, phone, password, role, first_login) VALUES
    (?, 'Caixa Pix', 'cashier@foodstuff.test', '11900009999', ?, 'CASHIER', 0),
    (?, 'Cozinha Pix', 'kitchen@foodstuff.test', '11900009998', ?, 'KITCHEN', 0)`,
  ['44444444-4444-4444-4444-444444444444', ADMIN.password, '33333333-3333-3333-3333-333333333333', ADMIN.password]);
  tableId = await insertTable({ number: 12 });
  commandId = await insertCommand({ table_id: tableId });
  orderId = await insertOrder({ command_id: commandId, status: 'PENDING' });
  const productId = await insertProduct({ name: 'Produto Pix', price: 80 });
  await connect.execute('INSERT INTO order_items (quantity, unit_price, order_id, product_id) VALUES (2, 50, ?, ?)', [orderId, productId]);
  orders = new Map();
  axios.post.mockReset();
  axios.get.mockReset();
  axios.post.mockImplementation(async (url, payload) => {
    if (!orders.has(payload.external_reference)) orders.set(payload.external_reference, providerOrder(payload));
    return { data: structuredClone(orders.get(payload.external_reference)) };
  });
  axios.get.mockImplementation(async url => {
    const order = [...orders.values()].find(item => url.endsWith(`/${item.id}`));
    return { data: structuredClone(order) };
  });
});
afterEach(() => Object.assign(process.env, savedEnv));
afterAll(closeDb);

test('calcula saldo histórico com taxa, ignora cancelados e não confia no frontend', async () => {
  const cancelled = await insertOrder({ command_id: commandId, status: 'CANCELLED' });
  const productId = await insertProduct({ name: 'Cancelado Pix', price: 999 });
  await connect.execute('INSERT INTO order_items (quantity, unit_price, order_id, product_id) VALUES (1, 999, ?, ?)', [cancelled, productId]);
  const res = await create();
  expect(res.status).toBe(201);
  expect(res.body.data).toMatchObject({ command_id: commandId, value: 110, status: 'PENDING', paid_at: null,
    qr_code: 'pix-copia-cola', qr_code_base64: 'cXItY29kZQ==' });
  const [url, payload, config] = axios.post.mock.calls[0];
  expect(url).toBe('https://api.mercadopago.com/v1/orders');
  expect(payload).toMatchObject({ type: 'online', processing_mode: 'automatic', total_amount: '110.00',
    payer: { email: 'payer@foodstuff.test' }, transactions: { payments: [{ amount: '110.00',
      payment_method: { id: 'pix', type: 'bank_transfer' } }] } });
  expect(payload.payer).not.toHaveProperty('first_name');
  expect(config.timeout).toBe(8000);
  const [rows] = await connect.execute('SELECT * FROM payments WHERE payment_id = ?', [res.body.data.payment_id]);
  expect(config.headers['X-Idempotency-Key']).toBe(rows[0].idempotency_key);
  expect(payload.external_reference).toBe(`foodstuff-pix-${rows[0].idempotency_key}`);
  expect(res.body.data).not.toHaveProperty('mp_request');
  expect(res.body.data).not.toHaveProperty('idempotency_key');
  expect((await checkout()).body.data).toMatchObject({ status: 'CLOSED', paid: 0, balance: 110 });
  expect((await create({ command_id: commandId, total: 1 })).status).toBe(400);
});

test('desconta pagamento parcial anterior e confirma somente o restante', async () => {
  expect((await manual()).status).toBe(201);
  const res = await create();
  expect(res.body.data.value).toBe(60);
  expect(axios.post.mock.calls[0][1].total_amount).toBe('60.00');
  approve([...orders.values()][0]);
  expect((await read(res.body.data.payment_id)).body.data.status).toBe('PAID');
  expect((await checkout()).body.data).toMatchObject({ paid: 110, balance: 0, status: 'PAID' });
});

test('preserva arredondamento da taxa', async () => {
  await connect.execute('UPDATE order_items SET quantity = 1, unit_price = 11.87 WHERE order_id = ?', [orderId]);
  expect((await create()).body.data.value).toBe(13.06);
});

test('repete cobrança pendente com o mesmo QR sem novo POST externo', async () => {
  const first = await create();
  const second = await create();
  expect(second.status).toBe(200);
  expect(second.body.data).toEqual(first.body.data);
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test('requisições concorrentes reservam uma única tentativa e reutilizam a chave', async () => {
  const responses = await Promise.all([create(), create()]);
  expect(responses.every(res => [200, 201].includes(res.status))).toBe(true);
  expect(new Set(responses.map(res => res.body.data.payment_id)).size).toBe(1);
  expect(new Set(axios.post.mock.calls.map(call => call[2].headers['X-Idempotency-Key'])).size).toBe(1);
  expect(orders.size).toBe(1);
  const [rows] = await connect.execute('SELECT payment_id FROM payments WHERE command_id = ?', [commandId]);
  expect(rows).toHaveLength(1);
});

test('Pix concorrente com pagamento manual reserva exatamente o saldo restante', async () => {
  const [pix, cash] = await Promise.all([create(), manual()]);
  expect(pix.status).toBe(201);
  expect([201, 409]).toContain(cash.status);
  const detail = (await checkout()).body.data;
  expect(detail.paid + pix.body.data.value).toBe(110);
});

test('libera a transação antes de aguardar o Mercado Pago', async () => {
  const post = axios.post.getMockImplementation();
  let release;
  let started;
  const waiting = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { started = resolve; });
  axios.post.mockImplementationOnce(async (...args) => {
    started();
    await waiting;
    return post(...args);
  });
  const pendingCreate = create().then(res => res);
  try {
    await entered;
    // Se a reserva ainda estivesse aberta, esta operação esperaria o bloqueio.
    const payment = await manual().timeout({ response: 2000 });
    expect(payment.status).toBe(409);
  } finally {
    release();
    await pendingCreate;
  }
});

test('timeout conserva reserva e recupera a mesma tentativa/payload após mudança de configuração', async () => {
  const post = axios.post.getMockImplementation();
  axios.post.mockImplementationOnce(async (...args) => {
    await post(...args); // Provedor criou a order, mas a resposta se perdeu.
    throw { code: 'ECONNABORTED', config: { headers: { Authorization: 'SENSITIVE-TOKEN' } } };
  });
  const first = await create();
  expect(first.status).toBe(504);
  expect(JSON.stringify(first.body)).not.toContain('SENSITIVE-TOKEN');
  expect((await manual()).status).toBe(409);
  process.env.MP_PAYER_EMAIL = 'changed@foodstuff.test';
  const second = await create();
  expect(second.status).toBe(200);
  expect(axios.post.mock.calls[1][1]).toEqual(axios.post.mock.calls[0][1]);
  expect(axios.post.mock.calls[1][2].headers['X-Idempotency-Key']).toBe(axios.post.mock.calls[0][2].headers['X-Idempotency-Key']);
  expect(orders.size).toBe(1);
});

test('consulta recupera tentativa sem order e consulta a confirmação real', async () => {
  axios.post.mockRejectedValueOnce({ code: 'ECONNABORTED' });
  await create();
  const [rows] = await connect.execute('SELECT payment_id FROM payments WHERE command_id = ?', [commandId]);
  const res = await read(rows[0].payment_id);
  expect(res.status).toBe(200);
  expect(res.body.data.mp_order_id).toBeTruthy();
  expect(axios.get).toHaveBeenCalledTimes(1);
});

test('não repete POST antigo de resultado desconhecido nem libera pagamento manual', async () => {
  axios.post.mockRejectedValueOnce({ code: 'ECONNABORTED' });
  await create();
  await connect.execute('UPDATE payments SET created_at = NOW() - INTERVAL 2 HOUR WHERE command_id = ?', [commandId]);
  expect((await create()).status).toBe(409);
  expect((await manual()).status).toBe(409);
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test('confirma por consulta e audita uma única vez', async () => {
  const created = await create();
  expect((await read(created.body.data.payment_id)).body.data.status).toBe('PENDING');
  approve([...orders.values()][0]);
  const res = await read(created.body.data.payment_id);
  expect(res.body.data.status).toBe('PAID');
  expect(res.body.data.paid_at).toBeTruthy();
  expect((await checkout()).body.data).toMatchObject({ status: 'PAID', paid: 110, balance: 0 });
  await read(created.body.data.payment_id);
  const [logs] = await connect.execute("SELECT * FROM audit_logs WHERE action = 'REGISTER_PAYMENT'");
  expect(logs).toHaveLength(1);
});

test('webhook público assinado consulta API, ignora body e tolera notificações concorrentes repetidas', async () => {
  await create();
  const order = [...orders.values()][0];
  approve(order);
  const results = await Promise.all([webhook(order), webhook(order)]);
  expect(results.map(res => res.status)).toEqual([200, 200]);
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect((await checkout()).body.data.status).toBe('PAID');
  const [logs] = await connect.execute("SELECT user_id FROM audit_logs WHERE action = 'REGISTER_PAYMENT'");
  expect(logs).toEqual([{ user_id: null }]);
});

test('webhook recupera pagamento cuja resposta de criação foi perdida', async () => {
  const post = axios.post.getMockImplementation();
  axios.post.mockImplementationOnce(async (...args) => { await post(...args); throw { code: 'ECONNABORTED' }; });
  await create();
  const order = [...orders.values()][0];
  approve(order);
  expect((await webhook(order)).status).toBe(200);
  expect((await checkout()).body.data.status).toBe('PAID');
});

test('assinatura ausente, adulterada, timestamp antigo e ID alterado não consultam API', async () => {
  await create();
  const order = [...orders.values()][0];
  expect((await request(app).post(`${BASE}/payments/webhook`).send({ data: { id: order.id } })).status).toBe(401);
  expect((await webhook(order, { hash: '0'.repeat(64) })).status).toBe(401);
  expect((await webhook(order, { timestamp: String(Math.floor(Date.now() / 1000) - 600) })).status).toBe(401);
  expect((await webhook(order, { hash: 'é'.repeat(64) })).status).toBe(401);
  expect(axios.get).not.toHaveBeenCalled();
  expect((await checkout()).body.data.paid).toBe(0);
});

test.each(['amount', 'method', 'reference', 'order_id', 'payment_id', 'total_paid'])('rejeita confirmação divergente: %s', async field => {
  const res = await create();
  const order = [...orders.values()][0];
  approve(order);
  if (field === 'amount') order.total_amount = '1.00';
  if (field === 'method') order.transactions.payments[0].payment_method.id = 'visa';
  if (field === 'reference') order.external_reference = 'wrong';
  if (field === 'order_id') order.id = 'ORDwrong';
  if (field === 'payment_id') order.transactions.payments[0].id = 'PAYwrong';
  if (field === 'total_paid') order.total_paid_amount = '1.00';
  // Mantém GET por ID original mesmo quando a resposta foi adulterada.
  axios.get.mockResolvedValue({ data: order });
  expect((await read(res.body.data.payment_id)).status).toBe(409);
  expect((await checkout()).body.data).toMatchObject({ status: 'CLOSED', paid: 0, balance: 110 });
});

test('QR gerado e body de webhook aprovado não confirmam transferência pendente', async () => {
  await create();
  expect((await webhook([...orders.values()][0])).status).toBe(200);
  expect((await checkout()).body.data.paid).toBe(0);
});

test('erro de consulta mantém bloqueio e permite consultar novamente', async () => {
  const res = await create();
  axios.get.mockRejectedValueOnce({ response: { status: 401, data: 'SENSITIVE' } });
  const failed = await read(res.body.data.payment_id);
  expect(failed.status).toBe(502);
  expect(JSON.stringify(failed.body)).not.toContain('SENSITIVE');
  expect((await manual()).status).toBe(409);
  expect((await read(res.body.data.payment_id)).status).toBe(200);
});

test('falha de auditoria reverte confirmação e deixa a cobrança recuperável', async () => {
  const res = await create();
  approve([...orders.values()][0]);
  await expect(CashierService.readPixStatus(res.body.data.payment_id, 'usuario-inexistente')).rejects.toMatchObject({ status: 500 });
  expect((await checkout()).body.data.paid).toBe(0);
  expect((await read(res.body.data.payment_id)).body.data.status).toBe('PAID');
});

test('snapshot pendente antigo não reverte confirmação aplicada', async () => {
  const res = await create();
  const order = [...orders.values()][0];
  const stale = structuredClone(order);
  approve(order);
  await read(res.body.data.payment_id);
  await CashierService.applyPixOrder(res.body.data.payment_id, commandId, stale, ADMIN.user_id);
  expect((await checkout()).body.data.status).toBe('PAID');
});

test('bloqueia recebimento manual e novos pedidos durante Pix, mas mantém outros métodos sem Pix', async () => {
  expect((await manual()).status).toBe(201);
  await create();
  expect((await manual({ value: 60, received_amount: 60, expected_balance: 60 })).status).toBe(409);
  expect((await manual({ method: 'PIX', value: 60, expected_balance: 60 })).status).toBe(400);
  const productId = await insertProduct({ name: 'Pedido bloqueado Pix' });
  const newOrder = await request(app).post(`${BASE}/commands/${commandId}/orders`)
    .set('Authorization', `Bearer ${managerToken()}`).send({ items: [{ product_id: productId, quantity: 1 }] });
  expect(newOrder.status).toBe(400);
  const cancel = await request(app).patch(`${BASE}/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${managerToken()}`).send({ status: 'CANCELLED' });
  expect(cancel.status).toBe(409);
});

test('cancelamento/expiração confirmado externamente libera outros métodos', async () => {
  const res = await create();
  const order = [...orders.values()][0];
  order.status = 'canceled';
  order.status_detail = 'expired';
  order.transactions.payments[0].status = 'canceled';
  expect((await read(res.body.data.payment_id)).body.data.status).toBe('CANCELLED');
  expect((await manual()).status).toBe(201);
});

test('desativar mesa com Pix em andamento preserva itens e permite confirmação', async () => {
  const res = await create();
  await TableService.deleteTable(tableId, ADMIN.user_id);
  expect((await checkout()).body.data).toMatchObject({ status: 'CLOSED', total: 110 });
  approve([...orders.values()][0]);
  expect((await read(res.body.data.payment_id)).body.data.status).toBe('PAID');
});

test('desativação aguarda fechamento em andamento e não cancela consumo da comanda fechada', async () => {
  const blocker = await connect.getConnection();
  const deletion = await connect.getConnection();
  let started;
  const selecting = new Promise(resolve => { started = resolve; });
  const execute = deletion.execute.bind(deletion);
  const spy = jest.spyOn(deletion, 'execute').mockImplementation((sql, values) => {
    const pending = execute(sql, values);
    if (/SELECT command_id\s+FROM commands/.test(sql)) started();
    return pending;
  });
  const getConnection = jest.spyOn(connect, 'getConnection').mockResolvedValueOnce(deletion);
  let pendingDelete;
  try {
    await blocker.beginTransaction();
    await blocker.execute("UPDATE commands SET status = 'CLOSED' WHERE command_id = ?", [commandId]);
    pendingDelete = TableService.deleteTable(tableId, ADMIN.user_id);
    await selecting;
    await blocker.commit();
    await pendingDelete;
    expect((await checkout()).body.data).toMatchObject({ status: 'CLOSED', total: 110 });
  } finally {
    await blocker.rollback();
    blocker.release();
    if (pendingDelete) await pendingDelete.catch(() => {});
    spy.mockRestore();
    getConnection.mockRestore();
  }
});

test.each(['MP_ACCESS_TOKEN', 'MP_PAYER_EMAIL'])('configuração ausente %s não reserva nem cobra', async key => {
  delete process.env[key];
  expect((await create()).status).toBe(503);
  expect(axios.post).not.toHaveBeenCalled();
  expect((await checkout()).body.data).toMatchObject({ status: 'OPEN', payments: [] });
});

test.each(['PAID', 'CANCELLED'])('rejeita comanda %s', async status => {
  await connect.execute('UPDATE commands SET status = ? WHERE command_id = ?', [status, commandId]);
  expect((await create()).status).toBe(409);
  expect(axios.post).not.toHaveBeenCalled();
});

test('valida IDs, saldo zero, inexistência e entrada sem valor', async () => {
  expect((await create({ command_id: 999999 })).status).toBe(404);
  expect((await create({})).status).toBe(400);
  expect((await create({ command_id: 'abc' })).status).toBe(400);
  expect((await create({ command_id: true })).status).toBe(400);
  expect((await create({ command_id: [commandId] })).status).toBe(400);
  expect((await create({ command_id: commandId, email: 'forged@example.com' })).status).toBe(400);
  expect((await read('abc')).status).toBe(400);
  expect((await read(999999)).status).toBe(404);
  await connect.execute("UPDATE orders SET status = 'CANCELLED' WHERE order_id = ?", [orderId]);
  expect((await create()).status).toBe(400);
  expect(axios.post).not.toHaveBeenCalled();
});

test('somente caixa/gerente podem criar e consultar; exige JWT, usuário ativo e senha inicial alterada', async () => {
  expect((await request(app).post(`${BASE}/payments/pix`).send({ command_id: commandId })).status).toBe(401);
  for (const token of [waiterToken(), kitchenToken()]) {
    expect((await create(undefined, token)).status).toBe(403);
    expect((await read(1, token)).status).toBe(403);
  }
  const res = await create(undefined, managerToken());
  expect(res.status).toBe(201);
  expect((await read(res.body.data.payment_id, cashierToken())).status).toBe(200);
  expect((await read(res.body.data.payment_id, managerToken())).status).toBe(200);
  const firstLogin = tokenFor({ id: ADMIN.user_id, role: 'MANAGER', first_login: 1 });
  expect((await create(undefined, firstLogin)).status).toBe(403);
  await connect.execute('UPDATE users SET is_active = 0 WHERE user_id = ?', ['44444444-4444-4444-4444-444444444444']);
  expect((await read(res.body.data.payment_id)).status).toBe(403);
});
