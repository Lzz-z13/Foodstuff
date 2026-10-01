const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const crypto = require("crypto");
const {
  reset,
  insertTable,
  insertQrCode,
  closeDb,
} = require("../helpers/db");

const BASE = "/api/foodstuff";

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("GET /qr-codes/token/:token", () => {
  test("resolve QR Code por token sem JWT - 200 e retorna somente os dados do QR e da mesa", async () => {
    const tableId = await insertTable({ number: 5 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 2 });

    const [qrCodes] = await connect.execute(
      "SELECT token FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );

    const res = await request(app).get(
      `${BASE}/qr-codes/token/${qrCodes[0].token}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.data).toEqual({
      qr_code_id: qrCodeId,
      position: 2,
      table_id: tableId,
      number: 5,
    });
    expect(Object.keys(res.body.data).sort()).toEqual([
      "number",
      "position",
      "qr_code_id",
      "table_id",
    ]);
  });

  test("retorna 404 para token inexistente", async () => {
    const res = await request(app).get(
      `${BASE}/qr-codes/token/${crypto.randomUUID()}`,
    );

    expect(res.status).toBe(404);
  });

  test("retorna 404 quando o QR Code está inativo", async () => {
    const tableId = await insertTable({ number: 5 });
    await insertQrCode({ table_id: tableId, position: 1, is_active: 0 });

    const [qrCodes] = await connect.execute(
      "SELECT token FROM qr_codes WHERE table_id = ?",
      [tableId],
    );

    const res = await request(app).get(
      `${BASE}/qr-codes/token/${qrCodes[0].token}`,
    );

    expect(res.status).toBe(404);
  });

  test("retorna 404 quando a mesa está inativa", async () => {
    const tableId = await insertTable({ number: 5, is_active: 0 });
    await insertQrCode({ table_id: tableId, position: 1 });

    const [qrCodes] = await connect.execute(
      "SELECT token FROM qr_codes WHERE table_id = ?",
      [tableId],
    );

    const res = await request(app).get(
      `${BASE}/qr-codes/token/${qrCodes[0].token}`,
    );

    expect(res.status).toBe(404);
  });

  test("retorna 400 para token vazio, em branco ou claramente inválido", async () => {
    const invalidTokens = [" ", "abc", "nao-e-um-token", "x".repeat(100)];

    for (const token of invalidTokens) {
      const res = await request(app).get(
        `${BASE}/qr-codes/token/${encodeURIComponent(token)}`,
      );

      expect(res.status).toBe(400);
    }
  });

  test("resolução do QR Code não cria audit_logs nem altera os dados", async () => {
    const tableId = await insertTable({ number: 5 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });

    const [before] = await connect.execute(
      "SELECT token, position, is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );

    const res = await request(app).get(
      `${BASE}/qr-codes/token/${before[0].token}`,
    );

    expect(res.status).toBe(200);

    const [after] = await connect.execute(
      "SELECT token, position, is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(after[0]).toEqual(before[0]);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'qr_codes'",
    );
    expect(logs[0].total).toBe(0);
  });
});