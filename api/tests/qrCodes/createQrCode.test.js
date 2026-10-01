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

describe("POST /tables/:table_id/qr-codes", () => {
  test("cria QR Code com sucesso - 201 e registra audit INSERT", async () => {
    const tableId = await insertTable({ number: 12 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 1 });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(typeof res.body.data.qr_code_id).toBe("number");

    const [qrCodes] = await connect.execute(
      "SELECT table_id, token, position, is_active FROM qr_codes WHERE table_id = ?",
      [tableId],
    );
    expect(qrCodes).toHaveLength(1);
    expect(qrCodes[0].table_id).toBe(tableId);
    expect(qrCodes[0].position).toBe(1);
    expect(qrCodes[0].is_active).toBe(1);
    expect(qrCodes[0].token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const [logs] = await connect.execute(
      `SELECT user_id, action, entity, entity_id, description
       FROM audit_logs
       WHERE entity = 'qr_codes'`,
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: ADMIN.user_id,
      action: "INSERT",
      entity: "qr_codes",
    });
    expect(logs[0].entity_id).toBe(String(res.body.data.qr_code_id));
    expect(logs[0].description).toContain(
      "criou o QR Code da mesa #12 na posição 1",
    );
  });

  test("ignora token enviado pelo cliente e gera token próprio", async () => {
    const tableId = await insertTable({ number: 14 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 2, token: "token-do-cliente" });

    expect(res.status).toBe(201);

    const [qrCodes] = await connect.execute(
      "SELECT token FROM qr_codes WHERE table_id = ? AND position = 2",
      [tableId],
    );
    expect(qrCodes).toHaveLength(1);
    expect(qrCodes[0].token).not.toBe("token-do-cliente");
    expect(qrCodes[0].token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test("reativa QR Code inativo na mesma posição - 201 e registra audit REACTIVATE", async () => {
    const tableId = await insertTable({ number: 12 });
    const qrCodeId = await insertQrCode({
      table_id: tableId,
      position: 3,
      is_active: 0,
    });

    const [existing] = await connect.execute(
      "SELECT token FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    const previousToken = existing[0].token;

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 3 });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(res.body.data.qr_code_id).toBe(qrCodeId);

    const [qrCodes] = await connect.execute(
      "SELECT token, position, is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(qrCodes).toHaveLength(1);
    expect(qrCodes[0].is_active).toBe(1);
    expect(qrCodes[0].position).toBe(3);
    expect(qrCodes[0].token).toBe(previousToken);

    const [logs] = await connect.execute(
      "SELECT action, entity, entity_id FROM audit_logs WHERE entity = 'qr_codes'",
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "REACTIVATE",
      entity: "qr_codes",
    });
    expect(logs[0].entity_id).toBe(String(qrCodeId));
  });

  test("retorna 400 para posição ausente ou inválida", async () => {
    const tableId = await insertTable({ number: 12 });
    const invalidValues = [undefined, null, "", 0, -1, 5, 1.5, true, "1", " "];

    for (const position of invalidValues) {
      const body =
        position === undefined || position === null ? {} : { position };

      const res = await request(app)
        .post(`${BASE}/tables/${tableId}/qr-codes`)
        .set("Authorization", managerToken())
        .send(body);

      expect(res.status).toBe(400);
    }
  });

  test("retorna 404 para mesa inexistente", async () => {
    const res = await request(app)
      .post(`${BASE}/tables/99999/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 1 });

    expect(res.status).toBe(404);
  });

  test("retorna 404 para mesa inativa", async () => {
    const tableId = await insertTable({ number: 13, is_active: 0 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 1 });

    expect(res.status).toBe(404);
  });

  test("retorna 409 quando já existe QR Code ativo na posição", async () => {
    const tableId = await insertTable({ number: 12 });
    await insertQrCode({ table_id: tableId, position: 1, is_active: 1 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 1 });

    expect(res.status).toBe(409);
  });

  test("retorna 401 sem token", async () => {
    const tableId = await insertTable({ number: 12 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .send({ position: 1 });

    expect(res.status).toBe(401);
  });

  test("retorna 403 para role não autorizada", async () => {
    const tableId = await insertTable({ number: 12 });

    for (const token of [waiterToken(), kitchenToken(), cashierToken()]) {
      const res = await request(app)
        .post(`${BASE}/tables/${tableId}/qr-codes`)
        .set("Authorization", token)
        .send({ position: 1 });

      expect(res.status).toBe(403);
    }
  });
});