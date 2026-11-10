const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const {
  reset,
  insertTable,
  insertQrCode,
  closeDb,
} = require("../helpers/db");
const {
  managerToken,
  waiterToken,
  kitchenToken,
  cashierToken,
} = require("../helpers/auth");
const { ADMIN } = require("../setup/constants");

const BASE = "/api/foodstuff";

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("PUT /tables/:table_id/qr-codes/:qr_code_id", () => {
  test("regenera o token com sucesso - 200 e registra audit UPDATE", async () => {
    const tableId = await insertTable({ number: 12 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });

    const [before] = await connect.execute(
      "SELECT token FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    const previousToken = before[0].token;

    const res = await request(app)
      .put(`${BASE}/tables/${tableId}/qr-codes/${qrCodeId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.data.qr_code_id).toBe(qrCodeId);

    const [after] = await connect.execute(
      "SELECT token, position, is_active, table_id FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(after[0].token).not.toBe(previousToken);
    expect(after[0].token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(after[0].position).toBe(1);
    expect(after[0].is_active).toBe(1);
    expect(after[0].table_id).toBe(tableId);

    const [logs] = await connect.execute(
      `SELECT user_id, action, entity, entity_id, description
       FROM audit_logs
       WHERE entity = 'qr_codes'`,
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: ADMIN.user_id,
      action: "UPDATE",
      entity: "qr_codes",
    });
    expect(logs[0].entity_id).toBe(String(qrCodeId));
    expect(logs[0].description).toContain(
      "regenerou o QR Code da mesa #12 na posição 1",
    );
  });

  test("o token antigo deixa de resolver após regenerar", async () => {
    const tableId = await insertTable({ number: 13 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 2 });

    const [before] = await connect.execute(
      "SELECT token FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    const previousToken = before[0].token;

    const res = await request(app)
      .put(`${BASE}/tables/${tableId}/qr-codes/${qrCodeId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);

    const oldTokenRes = await request(app).get(
      `${BASE}/qr-codes/token/${previousToken}`,
    );
    expect(oldTokenRes.status).toBe(404);

    const [after] = await connect.execute(
      "SELECT token FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    const newTokenRes = await request(app).get(
      `${BASE}/qr-codes/token/${after[0].token}`,
    );
    expect(newTokenRes.status).toBe(200);
    expect(newTokenRes.body.data.table_id).toBe(tableId);
  });

  test("retorna 404 para mesa inexistente", async () => {
    const res = await request(app)
      .put(`${BASE}/tables/99999/qr-codes/1`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(404);
  });

  test("retorna 404 para mesa inativa", async () => {
    const tableId = await insertTable({ number: 14, is_active: 0 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });

    const res = await request(app)
      .put(`${BASE}/tables/${tableId}/qr-codes/${qrCodeId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(404);
  });

  test("retorna 404 para QR Code de outra mesa", async () => {
    const tableId = await insertTable({ number: 15 });
    const otherTableId = await insertTable({ number: 16 });
    const qrCodeId = await insertQrCode({
      table_id: otherTableId,
      position: 1,
    });

    const res = await request(app)
      .put(`${BASE}/tables/${tableId}/qr-codes/${qrCodeId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("QR Code não encontrado para esta mesa.");
  });

  test("retorna 404 para QR Code inexistente", async () => {
    const tableId = await insertTable({ number: 17 });

    const res = await request(app)
      .put(`${BASE}/tables/${tableId}/qr-codes/99999`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(404);
  });

  test("retorna 409 para QR Code inativo", async () => {
    const tableId = await insertTable({ number: 18 });
    const qrCodeId = await insertQrCode({
      table_id: tableId,
      position: 1,
      is_active: 0,
    });

    const res = await request(app)
      .put(`${BASE}/tables/${tableId}/qr-codes/${qrCodeId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(409);
  });

  test("retorna 400 para table_id ou qr_code_id malformados", async () => {
    const tableId = await insertTable({ number: 19 });

    for (const url of [
      `${BASE}/tables/abc/qr-codes/1`,
      `${BASE}/tables/0/qr-codes/1`,
      `${BASE}/tables/${tableId}/qr-codes/abc`,
      `${BASE}/tables/${tableId}/qr-codes/0`,
      `${BASE}/tables/${tableId}/qr-codes/-1`,
    ]) {
      const res = await request(app)
        .put(url)
        .set("Authorization", managerToken());

      expect(res.status).toBe(400);
    }
  });

  test("retorna 401 sem token", async () => {
    const tableId = await insertTable({ number: 20 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });

    const res = await request(app)
      .put(`${BASE}/tables/${tableId}/qr-codes/${qrCodeId}`);

    expect(res.status).toBe(401);
  });

  test("retorna 403 para role não autorizada", async () => {
    const tableId = await insertTable({ number: 21 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });

    for (const token of [waiterToken(), kitchenToken(), cashierToken()]) {
      const res = await request(app)
        .put(`${BASE}/tables/${tableId}/qr-codes/${qrCodeId}`)
        .set("Authorization", token);

      expect(res.status).toBe(403);
    }
  });
});
