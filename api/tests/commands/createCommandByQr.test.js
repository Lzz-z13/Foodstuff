const request = require("supertest");
const crypto = require("crypto");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const {
  reset,
  insertTable,
  insertQrCode,
  closeDb,
} = require("../helpers/db");

const BASE = "/api/foodstuff";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function tokenOfQrCode(qrCodeId) {
  const [rows] = await connect.execute(
    "SELECT token FROM qr_codes WHERE qr_code_id = ?",
    [qrCodeId],
  );

  return rows[0].token;
}

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("POST /qr-codes/token/:token/commands", () => {
  test("abre comanda com sucesso sem JWT - 201 e registra audit INSERT", async () => {
    const tableId = await insertTable({ number: 5 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 2 });
    const token = await tokenOfQrCode(qrCodeId);

    const res = await request(app)
      .post(`${BASE}/qr-codes/token/${token}/commands`)
      .send({ customer_name: "José" });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(res.body.message).toBe("Comanda aberta com sucesso.");

    const { command_id, session_token, status, table_id, qr_code_id } =
      res.body.data;

    expect(typeof command_id).toBe("number");
    expect(session_token).toMatch(UUID_REGEX);
    expect(status).toBe("OPEN");
    expect(table_id).toBe(tableId);
    expect(qr_code_id).toBe(qrCodeId);

    const [commands] = await connect.execute(
      `SELECT command_id, customer_name, session_token, status, table_id,
              qr_code_id, opened_by, opened_at, closed_at
       FROM commands
       WHERE command_id = ?`,
      [command_id],
    );

    expect(commands).toHaveLength(1);
    const command = commands[0];
    expect(command.customer_name).toBe("José");
    expect(command.session_token).toBe(session_token);
    expect(command.session_token).toMatch(UUID_REGEX);
    expect(command.status).toBe("OPEN");
    expect(command.table_id).toBe(tableId);
    expect(command.qr_code_id).toBe(qrCodeId);
    expect(command.opened_by).toBeNull();
    expect(command.closed_at).toBeNull();
    expect(command.opened_at).toBeTruthy();

    const [logs] = await connect.execute(
      `SELECT user_id, action, entity, entity_id, description
       FROM audit_logs
       WHERE entity = 'commands'`,
    );

    expect(logs).toHaveLength(1);
    expect(logs[0].user_id).toBeNull();
    expect(logs[0].action).toBe("INSERT");
    expect(logs[0].entity).toBe("commands");
    expect(logs[0].entity_id).toBe(String(command_id));
    expect(logs[0].description).toContain(
      `Cliente José abriu a comanda #${command_id} da mesa #5.`,
    );
  });

  test("funciona sem header Authorization", async () => {
    const tableId = await insertTable({ number: 6 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
    const token = await tokenOfQrCode(qrCodeId);

    const res = await request(app)
      .post(`${BASE}/qr-codes/token/${token}/commands`)
      .send({ customer_name: "Maria" });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
  });

  test("retorna 400 para token de QR Code inválido e não cria comanda", async () => {
    const invalidTokens = [
      "abc",
      "123",
      "nao-e-um-uuid",
      "11111111-1111-1111-1111-11111111111",
    ];

    for (const token of invalidTokens) {
      const res = await request(app)
        .post(`${BASE}/qr-codes/token/${token}/commands`)
        .send({ customer_name: "José" });

      expect(res.status).toBe(400);
    }

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);
  });

  test("retorna 404 para QR Code inexistente", async () => {
    const token = crypto.randomUUID();

    const res = await request(app)
      .post(`${BASE}/qr-codes/token/${token}/commands`)
      .send({ customer_name: "José" });

    expect(res.status).toBe(404);

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);
  });

  test("retorna 404 para QR Code inativo sem criar comanda nem audit log", async () => {
    const tableId = await insertTable({ number: 7 });
    const qrCodeId = await insertQrCode({
      table_id: tableId,
      position: 1,
      is_active: 0,
    });
    const token = await tokenOfQrCode(qrCodeId);

    const res = await request(app)
      .post(`${BASE}/qr-codes/token/${token}/commands`)
      .send({ customer_name: "José" });

    expect(res.status).toBe(404);

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("retorna 404 para mesa inativa sem criar comanda nem audit log", async () => {
    const tableId = await insertTable({ number: 8, is_active: 0 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
    const token = await tokenOfQrCode(qrCodeId);

    const res = await request(app)
      .post(`${BASE}/qr-codes/token/${token}/commands`)
      .send({ customer_name: "José" });

    expect(res.status).toBe(404);

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("retorna 400 para customer_name inválido", async () => {
    const tableId = await insertTable({ number: 9 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
    const token = await tokenOfQrCode(qrCodeId);

    const invalidBodies = [
      {}, // ausente
      { customer_name: null },
      { customer_name: "" },
      { customer_name: "   " },
      { customer_name: "a".repeat(101) },
      { customer_name: 123 },
      { customer_name: true },
      { customer_name: {} },
    ];

    for (const body of invalidBodies) {
      const res = await request(app)
        .post(`${BASE}/qr-codes/token/${token}/commands`)
        .send(body);

      expect(res.status).toBe(400);
    }

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);
  });

  test("aceita customer_name com exatamente 100 caracteres", async () => {
    const tableId = await insertTable({ number: 10 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
    const token = await tokenOfQrCode(qrCodeId);
    const name = "a".repeat(100);

    const res = await request(app)
      .post(`${BASE}/qr-codes/token/${token}/commands`)
      .send({ customer_name: name });

    expect(res.status).toBe(201);

    const [commands] = await connect.execute(
      "SELECT customer_name FROM commands WHERE command_id = ?",
      [res.body.data.command_id],
    );
    expect(commands[0].customer_name).toBe(name);
  });

  test("ignora table_id e qr_code_id enviados pelo cliente", async () => {
    const tableId = await insertTable({ number: 11 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
    const token = await tokenOfQrCode(qrCodeId);

    const res = await request(app)
      .post(`${BASE}/qr-codes/token/${token}/commands`)
      .send({ customer_name: "José", table_id: 999, qr_code_id: 999 });

    expect(res.status).toBe(201);
    expect(res.body.data.table_id).toBe(tableId);
    expect(res.body.data.qr_code_id).toBe(qrCodeId);

    const [commands] = await connect.execute(
      "SELECT table_id, qr_code_id FROM commands WHERE command_id = ?",
      [res.body.data.command_id],
    );
    expect(commands[0].table_id).toBe(tableId);
    expect(commands[0].qr_code_id).toBe(qrCodeId);

    const [onOtherTable] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands WHERE table_id = 999",
    );
    expect(onOtherTable[0].total).toBe(0);
  });

  test("permite várias comandas OPEN na mesma mesa com session_token distintos", async () => {
    const tableId = await insertTable({ number: 12 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
    const token = await tokenOfQrCode(qrCodeId);

    const first = await request(app)
      .post(`${BASE}/qr-codes/token/${token}/commands`)
      .send({ customer_name: "Ana" });

    const second = await request(app)
      .post(`${BASE}/qr-codes/token/${token}/commands`)
      .send({ customer_name: "Bruno" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.command_id).not.toBe(second.body.data.command_id);
    expect(first.body.data.session_token).not.toBe(
      second.body.data.session_token,
    );

    const [commands] = await connect.execute(
      `SELECT command_id, customer_name, session_token, status, table_id, qr_code_id
       FROM commands
       WHERE table_id = ?
       ORDER BY command_id`,
      [tableId],
    );

    expect(commands).toHaveLength(2);
    expect(commands.map((c) => c.customer_name)).toEqual(["Ana", "Bruno"]);
    expect(commands.every((c) => c.status === "OPEN")).toBe(true);
    expect(commands.every((c) => c.table_id === tableId)).toBe(true);
    expect(commands.every((c) => c.qr_code_id === qrCodeId)).toBe(true);
    expect(commands[0].session_token).not.toBe(commands[1].session_token);
    expect(commands[0].session_token).toMatch(UUID_REGEX);
    expect(commands[1].session_token).toMatch(UUID_REGEX);
  });
});
