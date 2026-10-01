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

const BASE = "/api/foodstuff";

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("GET /tables/:table_id/qr-codes", () => {
  test("MANAGER lista QR Codes da mesa - 200 e dados batem com o banco", async () => {
    const tableId = await insertTable({ number: 1 });
    await insertQrCode({ table_id: tableId, position: 1 });

    const res = await request(app)
      .get(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.data).toHaveLength(1);

    const returned = res.body.data[0];
    expect(Object.keys(returned).sort()).toEqual([
      "created_at",
      "is_active",
      "position",
      "qr_code_id",
      "token",
    ]);

    const [dbQr] = await connect.execute(
      "SELECT token, position, is_active FROM qr_codes WHERE table_id = ?",
      [tableId],
    );
    expect(returned.token).toBe(dbQr[0].token);
    expect(returned.position).toBe(dbQr[0].position);
    expect(returned.is_active).toBe(dbQr[0].is_active);
  });

  test("retorna múltiplos QR Codes em ordem crescente de position", async () => {
    const tableId = await insertTable({ number: 2 });
    await insertQrCode({ table_id: tableId, position: 2 });
    await insertQrCode({ table_id: tableId, position: 4 });
    await insertQrCode({ table_id: tableId, position: 1 });

    const res = await request(app)
      .get(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.data.map((qr) => qr.position)).toEqual([1, 2, 4]);
  });

  test("retorna QR Codes ativos e inativos", async () => {
    const tableId = await insertTable({ number: 3 });
    await insertQrCode({ table_id: tableId, position: 1, is_active: 1 });
    await insertQrCode({ table_id: tableId, position: 2, is_active: 0 });

    const res = await request(app)
      .get(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);

    const qrPosition1 = res.body.data.find((qr) => qr.position === 1);
    const qrPosition2 = res.body.data.find((qr) => qr.position === 2);

    expect(qrPosition1.is_active).toBe(1);
    expect(qrPosition2.is_active).toBe(0);
  });

  test("mesa sem QR Codes - 200 com data []", async () => {
    const tableId = await insertTable({ number: 4 });

    const res = await request(app)
      .get(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.data).toEqual([]);
  });

  test("mesa inativa - 200", async () => {
    const tableId = await insertTable({ number: 5, is_active: 0 });
    await insertQrCode({ table_id: tableId, position: 1 });

    const res = await request(app)
      .get(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test("mesa inexistente - 404", async () => {
    const res = await request(app)
      .get(`${BASE}/tables/99999/qr-codes`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(404);
  });

  test("não retorna QR Codes de outra mesa", async () => {
    const tableA = await insertTable({ number: 6 });
    const tableB = await insertTable({ number: 7 });

    const qrA = await insertQrCode({ table_id: tableA, position: 1 });
    await insertQrCode({ table_id: tableB, position: 1 });
    await insertQrCode({ table_id: tableB, position: 2 });

    const res = await request(app)
      .get(`${BASE}/tables/${tableA}/qr-codes`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].qr_code_id).toBe(qrA);
  });

  test("retorna 401 sem token", async () => {
    const tableId = await insertTable({ number: 8 });

    const res = await request(app).get(`${BASE}/tables/${tableId}/qr-codes`);

    expect(res.status).toBe(401);
  });

  test("retorna 403 para WAITER, KITCHEN e CASHIER", async () => {
    const tableId = await insertTable({ number: 9 });

    for (const token of [waiterToken(), kitchenToken(), cashierToken()]) {
      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/qr-codes`)
        .set("Authorization", token);

      expect(res.status).toBe(403);
    }
  });

  test("leitura não altera os dados do QR Code", async () => {
    const tableId = await insertTable({ number: 10 });
    const qrCodeId = await insertQrCode({
      table_id: tableId,
      position: 1,
      is_active: 1,
    });

    const [before] = await connect.execute(
      "SELECT token, position, is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );

    const res = await request(app)
      .get(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);

    const [after] = await connect.execute(
      "SELECT token, position, is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );

    expect(after[0]).toEqual(before[0]);
    expect(res.body.data).toHaveLength(1);
  });
});