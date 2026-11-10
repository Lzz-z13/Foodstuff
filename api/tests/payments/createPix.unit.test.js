jest.mock('../../src/database/connect', () => ({ getConnection: jest.fn() }));
jest.mock('../../src/services/mercadoPagoService', () => ({
  buildPixRequest: jest.fn(), criarPix: jest.fn(),
}));

const db = require('../../src/database/connect');
const MercadoPago = require('../../src/services/mercadoPagoService');
const CashierService = require('../../src/services/cashierService');
let connection;

beforeEach(() => {
  connection = {
    beginTransaction: jest.fn().mockResolvedValue(),
    execute: jest.fn().mockResolvedValueOnce([[{ status: 'OPEN' }]])
      .mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]),
    rollback: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    release: jest.fn(),
  };
  db.getConnection.mockResolvedValue(connection);
  jest.spyOn(CashierService, 'readCheckout').mockResolvedValue({ balance: 110 });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  MercadoPago.buildPixRequest.mockReturnValue({ total_amount: '110.00' });
});
afterEach(() => jest.restoreAllMocks());

test('banco sem campos Pix retorna indisponibilidade, desfaz reserva e não solicita cobrança externa', async () => {
  connection.execute.mockRejectedValueOnce({ code: 'ER_BAD_FIELD_ERROR', sqlMessage: 'sensitive SQL' });
  await expect(CashierService.createPix(3, 'cashier')).rejects.toMatchObject({
    status: 503, message: expect.stringContaining('atualizar o banco de dados'),
  });
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.commit).not.toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalledTimes(1);
  expect(MercadoPago.criarPix).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledWith('Erro ao reservar cobrança Pix:', 'ER_BAD_FIELD_ERROR');
});

test('outras falhas do banco mantêm rollback e não expõem SQL nem pedem atualização da comanda', async () => {
  connection.execute.mockRejectedValueOnce({ code: 'ER_LOCK_DEADLOCK', sqlMessage: 'sensitive SQL' });
  await expect(CashierService.createPix(3, 'cashier')).rejects.toEqual({
    status: 500,
    message: 'Não foi possível iniciar a cobrança Pix. Tente novamente; se o erro persistir, contate o administrador.',
  });
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.release).toHaveBeenCalledTimes(1);
  expect(MercadoPago.criarPix).not.toHaveBeenCalled();
});

test('erros de negócio preservam o status e a mensagem originais', async () => {
  const error = { status: 400, message: 'Saldo inválido para gerar Pix.' };
  MercadoPago.buildPixRequest.mockImplementationOnce(() => { throw error; });
  await expect(CashierService.createPix(3, 'cashier')).rejects.toBe(error);
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.release).toHaveBeenCalledTimes(1);
  expect(console.error).not.toHaveBeenCalled();
});
