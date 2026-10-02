const request = require("supertest");
const crypto = require("crypto");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const {
  reset,
  insertTable,
  insertQrCode,
  insertCommand,
  closeDb,
} = require("../helpers/db");

const BASE = "/api/foodstuff";

async function sessionTokenOf(commandId) {
  const [rows] = await connect.execute(
    "SELECT session_token FROM commands WHERE command_id = ?",
    [commandId],
  );

  return rows[0].session_token;
}

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("GET /commands/session/:session_token", () => {
  test("retorna a comanda pelo session_token sem JWT - 200", async () => {
    const tableId = await insertTable({ number: 5 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 2 });
    const commandId = await insertCommand({
      table_id: tableId,
      qr_code_id: qrCodeId,
      customer_name: "José",
    });
    const token = await sessionTokenOf(commandId);

    const res = await request(app).get(`${BASE}/commands/session/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.message).toBe("Comanda encontrada com sucesso.");
    expect(res.body.data).toMatchObject({
      command_id: commandId,
      customer_name: "José",
      status: "OPEN",
      closed_at: null,
      table_id: tableId,
      table_number: 5,
      qr_code_id: qrCodeId,
    });
    expect(res.body.data.opened_at).toBeTruthy();

    const [commands] = await connect.execute(
      `SELECT command_id, customer_name, status, table_id, qr_code_id
       FROM commands
       WHERE command_id = ?`,
      [commandId],
    );
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      command_id: commandId,
      customer_name: "José",
      status: "OPEN",
      table_id: tableId,
      qr_code_id: qrCodeId,
    });
  });

  test("funciona sem header Authorization", async () => {
    const tableId = await insertTable({ number: 6 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Maria",
    });
    const token = await sessionTokenOf(commandId);

    const res = await request(app).get(`${BASE}/commands/session/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.customer_name).toBe("Maria");
  });

  test("retorna 400 para session_token inválido", async () => {
    const invalidTokens = [
      "abc",
      " ",
      "nao-e-um-uuid",
      "11111111-1111-1111-1111-11111111111",
      "x".repeat(100),
    ];

    for (const token of invalidTokens) {
      const res = await request(app).get(
        `${BASE}/commands/session/${encodeURIComponent(token)}`,
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
    }
  });

  test("retorna 404 para session_token válido porém inexistente", async () => {
    const res = await request(app).get(
      `${BASE}/commands/session/${crypto.randomUUID()}`,
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe(true);
    expect(res.body.message).toBe("Comanda não encontrada.");
  });

  test("isolamento: token A retorna somente a comanda A", async () => {
    const tableId = await insertTable({ number: 7 });
    const commandA = await insertCommand({
      table_id: tableId,
      customer_name: "Cliente A",
    });
    const commandB = await insertCommand({
      table_id: tableId,
      customer_name: "Cliente B",
    });
    const tokenA = await sessionTokenOf(commandA);
    const tokenB = await sessionTokenOf(commandB);

    const res = await request(app).get(`${BASE}/commands/session/${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.command_id).toBe(commandA);
    expect(res.body.data.customer_name).toBe("Cliente A");
    expect(res.body.data.command_id).not.toBe(commandB);
    expect(res.body.data.customer_name).not.toBe("Cliente B");
    expect(JSON.stringify(res.body)).not.toContain("Cliente B");

    const resB = await request(app).get(`${BASE}/commands/session/${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.data.command_id).toBe(commandB);
    expect(resB.body.data.customer_name).toBe("Cliente B");
  });

  test("não expõe session_token, opened_by nem closed_by", async () => {
    const tableId = await insertTable({ number: 8 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "José",
    });
    const token = await sessionTokenOf(commandId);

    const res = await request(app).get(`${BASE}/commands/session/${token}`);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual([
      "closed_at",
      "command_id",
      "customer_name",
      "opened_at",
      "qr_code_id",
      "status",
      "table_id",
      "table_number",
    ]);
    expect(res.body.data).not.toHaveProperty("session_token");
    expect(res.body.data).not.toHaveProperty("opened_by");
    expect(res.body.data).not.toHaveProperty("closed_by");
  });

  test("lê comanda OPEN", async () => {
    const tableId = await insertTable({ number: 9 });
    const commandId = await insertCommand({
      table_id: tableId,
      status: "OPEN",
    });
    const token = await sessionTokenOf(commandId);

    const res = await request(app).get(`${BASE}/commands/session/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("OPEN");
  });

  test("lê comanda CLOSED", async () => {
    const tableId = await insertTable({ number: 10 });
    const commandId = await insertCommand({
      table_id: tableId,
      status: "CLOSED",
    });
    const token = await sessionTokenOf(commandId);

    const res = await request(app).get(`${BASE}/commands/session/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CLOSED");
  });

  test("lê comanda PAID", async () => {
    const tableId = await insertTable({ number: 11 });
    const commandId = await insertCommand({
      table_id: tableId,
      status: "PAID",
    });
    const token = await sessionTokenOf(commandId);

    const res = await request(app).get(`${BASE}/commands/session/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("PAID");
  });

  test("lê comanda CANCELLED", async () => {
    const tableId = await insertTable({ number: 12 });
    const commandId = await insertCommand({
      table_id: tableId,
      status: "CANCELLED",
    });
    const token = await sessionTokenOf(commandId);

    const res = await request(app).get(`${BASE}/commands/session/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CANCELLED");
  });

  test("mesa desativada depois não impede a leitura da comanda", async () => {
    const tableId = await insertTable({ number: 13 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Mesa Inativa",
    });
    const token = await sessionTokenOf(commandId);

    await connect.execute("UPDATE tables SET is_active = 0 WHERE table_id = ?", [
      tableId,
    ]);

    const res = await request(app).get(`${BASE}/commands/session/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.command_id).toBe(commandId);
    expect(res.body.data.table_id).toBe(tableId);
    expect(res.body.data.table_number).toBe(13);
  });

  test("QR Code desativado depois não impede a leitura da comanda", async () => {
    const tableId = await insertTable({ number: 14 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
    const commandId = await insertCommand({
      table_id: tableId,
      qr_code_id: qrCodeId,
      customer_name: "QR Inativo",
    });
    const token = await sessionTokenOf(commandId);

    await connect.execute(
      "UPDATE qr_codes SET is_active = 0 WHERE qr_code_id = ?",
      [qrCodeId],
    );

    const res = await request(app).get(`${BASE}/commands/session/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.command_id).toBe(commandId);
    expect(res.body.data.qr_code_id).toBe(qrCodeId);
  });

  test("a leitura não cria audit_logs", async () => {
    const tableId = await insertTable({ number: 15 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Sem Log",
    });
    const token = await sessionTokenOf(commandId);

    const res = await request(app).get(`${BASE}/commands/session/${token}`);
    expect(res.status).toBe(200);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("a leitura não altera os dados da comanda", async () => {
    const tableId = await insertTable({ number: 16 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Imutável",
    });
    const token = await sessionTokenOf(commandId);

    const [before] = await connect.execute(
      `SELECT command_id, customer_name, session_token, status, opened_at,
              closed_at, table_id, qr_code_id
       FROM commands
       WHERE command_id = ?`,
      [commandId],
    );

    const res = await request(app).get(`${BASE}/commands/session/${token}`);
    expect(res.status).toBe(200);

    const [after] = await connect.execute(
      `SELECT command_id, customer_name, session_token, status, opened_at,
              closed_at, table_id, qr_code_id
       FROM commands
       WHERE command_id = ?`,
      [commandId],
    );

    expect(after[0]).toEqual(before[0]);
  });
});
