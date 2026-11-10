jest.mock('../../src/database/connect', () => ({ execute: jest.fn() }));
jest.mock('axios');

const axios = require('axios');
const express = require('express');
const request = require('supertest');
const db = require('../../src/database/connect');
const CashierService = require('../../src/services/cashierService');
const MercadoPago = require('../../src/services/mercadoPagoService');
const paymentRoutes = require('../../src/routes/paymentRoutes');

const pending = { payment_id: 7, command_id: 3, mp_order_id: 'ORD7', status: 'PENDING', mp_status: 'action_required' };
let read;
let cancel;
let savedToken;

beforeEach(() => {
  savedToken = process.env.MP_ACCESS_TOKEN;
  process.env.MP_ACCESS_TOKEN = 'unit-test-token';
  read = jest.spyOn(CashierService, 'readPixStatus');
  cancel = jest.spyOn(MercadoPago, 'cancelOrder').mockResolvedValue();
  db.execute.mockResolvedValue([[{ idempotency_key: '11111111-1111-1111-1111-111111111111' }]]);
});
afterEach(() => {
  jest.restoreAllMocks();
  if (savedToken === undefined) delete process.env.MP_ACCESS_TOKEN;
  else process.env.MP_ACCESS_TOKEN = savedToken;
});

test('cancela no provedor e só libera depois do GET confirmar CANCELLED', async () => {
  read.mockResolvedValueOnce(pending).mockResolvedValueOnce({ ...pending, status: 'CANCELLED' });
  await expect(CashierService.cancelPix(7, 'cashier')).resolves.toMatchObject({ status: 'CANCELLED' });
  expect(cancel).toHaveBeenCalledWith('ORD7', 'cancel-11111111-1111-1111-1111-111111111111');
  expect(read).toHaveBeenNthCalledWith(2, 7, 'cashier');
  // O único acesso direto ao banco consulta a chave. As atualizações ficam no
  // caminho já existente de readPixStatus/applyPixOrder, com transação e auditoria.
  expect(db.execute).toHaveBeenCalledTimes(1);
  expect(db.execute.mock.calls[0][0]).toMatch(/^SELECT/);
});

test.each(['PAID', 'CANCELLED'])('não solicita cancelamento de cobrança finalizada: %s', async status => {
  read.mockResolvedValue({ ...pending, status });
  await expect(CashierService.cancelPix(7, 'cashier')).resolves.toMatchObject({ status });
  expect(cancel).not.toHaveBeenCalled();
});

test('pagamento recebido durante cancelamento prevalece sobre a tentativa de trocar método', async () => {
  read.mockResolvedValueOnce(pending).mockResolvedValueOnce({ ...pending, status: 'PAID' });
  cancel.mockRejectedValue({ status: 502, message: 'Provedor recusou cancelamento.' });
  await expect(CashierService.cancelPix(7, 'cashier')).resolves.toMatchObject({ status: 'PAID' });
});

test('timeout de cancelamento pode ser recuperado por GET confirmado', async () => {
  read.mockResolvedValueOnce(pending).mockResolvedValueOnce({ ...pending, status: 'CANCELLED' });
  cancel.mockRejectedValue({ status: 504 });
  await expect(CashierService.cancelPix(7, 'cashier')).resolves.toMatchObject({ status: 'CANCELLED' });
});

test('resposta de sucesso no POST não libera cobrança que o GET mantém pendente', async () => {
  read.mockResolvedValue(pending);
  await expect(CashierService.cancelPix(7, 'cashier')).rejects.toMatchObject({ status: 409 });
});

test('timeout sem confirmação mantém tentativa bloqueada e usa a mesma chave ao repetir', async () => {
  read.mockResolvedValue(pending);
  cancel.mockRejectedValue({ status: 504 });
  await expect(CashierService.cancelPix(7, 'cashier')).rejects.toMatchObject({ status: 504 });
  await expect(CashierService.cancelPix(7, 'cashier')).rejects.toMatchObject({ status: 504 });
  expect(cancel.mock.calls[0]).toEqual(cancel.mock.calls[1]);
});

test('não libera outro método se a consulta após cancelamento falhar', async () => {
  read.mockResolvedValueOnce(pending).mockRejectedValueOnce({ status: 502 });
  await expect(CashierService.cancelPix(7, 'cashier')).rejects.toMatchObject({ status: 502 });
});

test('não tenta cancelar cobrança em processamento', async () => {
  read.mockResolvedValue({ ...pending, mp_status: 'processing' });
  await expect(CashierService.cancelPix(7, 'cashier')).rejects.toMatchObject({ status: 409 });
  expect(cancel).not.toHaveBeenCalled();
});

test('cobrança inexistente não envia cancelamento ao provedor', async () => {
  read.mockRejectedValue({ status: 404 });
  await expect(CashierService.cancelPix(7, 'cashier')).rejects.toMatchObject({ status: 404 });
  expect(cancel).not.toHaveBeenCalled();
});

test('integra o endpoint oficial com chave de cancelamento separada', async () => {
  cancel.mockRestore();
  axios.post.mockResolvedValue({ data: { status: 'canceled' } });
  await MercadoPago.cancelOrder('ORD7', 'cancel-key');
  expect(axios.post).toHaveBeenCalledWith('https://api.mercadopago.com/v1/orders/ORD7/cancel', {},
    expect.objectContaining({ timeout: 8000, headers: expect.objectContaining({ 'X-Idempotency-Key': 'cancel-key' }) }));
});

test('não expõe Access Token em erros do cancelamento', async () => {
  cancel.mockRestore();
  axios.post.mockRejectedValue({ code: 'ECONNABORTED', config: { headers: { Authorization: 'SENSITIVE' } } });
  const error = await MercadoPago.cancelOrder('ORD7', 'cancel-key').catch(e => e);
  expect(error.status).toBe(504);
  expect(JSON.stringify(error)).not.toContain('SENSITIVE');
});

function app() {
  const instance = express();
  instance.use((req, res, next) => { req.user = { id: 'cashier', role: req.headers['x-test-role'] }; next(); });
  instance.use('/payments', paymentRoutes);
  instance.use((error, req, res, next) => res.status(error.status || 500).json({ message: error.message }));
  return instance;
}

test.each(['CASHIER', 'MANAGER'])('permite cancelamento para %s e retorna a cobrança confirmada', async role => {
  read.mockResolvedValue({ ...pending, status: 'CANCELLED' });
  const response = await request(app()).post('/payments/7/cancel').set('x-test-role', role);
  expect(response.status).toBe(200);
  expect(response.body.data.status).toBe('CANCELLED');
});

test.each(['WAITER', 'KITCHEN'])('nega cancelamento para %s', async role => {
  expect((await request(app()).post('/payments/7/cancel').set('x-test-role', role)).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
});

test('valida o identificador local antes de consultar a cobrança', async () => {
  expect((await request(app()).post('/payments/abc/cancel').set('x-test-role', 'CASHIER')).status).toBe(400);
  expect(read).not.toHaveBeenCalled();
});
