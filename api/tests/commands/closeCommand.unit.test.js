jest.mock("../../src/database/connect", () => ({ getConnection: jest.fn() }));
jest.mock("../../src/utils/createLog", () => jest.fn().mockResolvedValue());
const db = require("../../src/database/connect");
const createLog = require("../../src/utils/createLog");
const CommandService = require("../../src/services/commandService");
let connection;
beforeEach(() => {
  connection = {
    beginTransaction: jest.fn().mockResolvedValue(),
    execute: jest.fn(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
  };
  db.getConnection.mockResolvedValue(connection);
});
function responses(status, orders = []) {
  connection.execute
    .mockResolvedValueOnce([[{ command_id: 7, status }]])
    .mockResolvedValueOnce([orders])
    .mockResolvedValueOnce([{ affectedRows: 1 }]);
}
test("fecha pela comanda sem adicionar pedido e preserva pedidos em preparo", async () => {
  responses("OPEN", [{ order_id: 9, status: "PREPARING" }]);
  await expect(
    CommandService.closeCommand({ command_id: 7, jwt_user_id: "waiter" }),
  ).resolves.toEqual({ command_id: 7, status: "CLOSED" });
  expect(connection.execute.mock.calls[0][0]).toContain("FOR UPDATE");
  expect(connection.execute.mock.calls[2][1]).toEqual(["CLOSED", "waiter", 7]);
  expect(
    connection.execute.mock.calls.some(([sql]) =>
      /INSERT INTO orders|UPDATE orders/.test(sql),
    ),
  ).toBe(false);
  expect(createLog).toHaveBeenCalledWith(
    connection,
    "waiter",
    "CLOSE_COMMAND",
    "commands",
    7,
    expect.any(String),
  );
  expect(connection.commit).toHaveBeenCalledTimes(1);
});
test("comanda vazia é encerrada sem criar cobrança e deixa de ocupar a mesa", async () => {
  responses("OPEN");
  await expect(
    CommandService.closeCommand({ command_id: 7, jwt_user_id: "waiter" }),
  ).resolves.toMatchObject({ status: "CANCELLED" });
  expect(connection.execute.mock.calls[2][1][0]).toBe("CANCELLED");
});
test("cliente pode fechar apenas a comanda identificada por seu token privado", async () => {
  responses("OPEN", [{ order_id: 9, status: "DELIVERED" }]);
  await CommandService.closeCommand({
    session_token: "private-session",
    command_id: 100,
    jwt_user_id: null,
  });
  expect(connection.execute.mock.calls[0]).toEqual([
    expect.stringContaining("WHERE session_token = ? FOR UPDATE"),
    ["private-session"],
  ]);
  expect(connection.execute.mock.calls[2][1]).toEqual(["CLOSED", null, 7]);
});
test.each(["CLOSED", "PAID", "CANCELLED"])(
  "repetir fechamento de %s não altera status nem cria novo log",
  async (status) => {
    responses(status);
    await expect(
      CommandService.closeCommand({ command_id: 7 }),
    ).resolves.toMatchObject({ status });
    expect(connection.execute).toHaveBeenCalledTimes(1);
    expect(createLog).not.toHaveBeenCalled();
  },
);
test("token inexistente não fecha nenhuma comanda", async () => {
  connection.execute.mockResolvedValueOnce([[]]);
  await expect(
    CommandService.closeCommand({ session_token: "unknown" }),
  ).rejects.toMatchObject({ status: 404 });
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.release).toHaveBeenCalledTimes(1);
});
test("falha no log desfaz fechamento e não expõe detalhe SQL", async () => {
  responses("OPEN", [{ order_id: 9, status: "DELIVERED" }]);
  createLog.mockRejectedValueOnce(new Error("sensitive SQL"));
  await expect(CommandService.closeCommand({ command_id: 7 })).rejects.toEqual({
    status: 500,
    message: "Erro ao fechar a comanda.",
  });
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.commit).not.toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalledTimes(1);
});
