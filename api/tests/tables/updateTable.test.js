const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const { reset, insertTable, closeDb } = require("../helpers/db");
const { managerToken, waiterToken } = require("../helpers/auth");
const { ADMIN } = require("../setup/constants");

const BASE = "/api/foodstuff";

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("PATCH /tables/:table_id", () => {
  test("altera o número com sucesso - 200 e registra audit UPDATE", async () => {
    const tableId = await insertTable({ number: 10 });

    const res = await request(app)
      .patch(`${BASE}/tables/${tableId}`)
      .set("Authorization", managerToken())
      .send({ number: 11 });

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);

    const [tables] = await connect.execute(
      "SELECT number FROM tables WHERE table_id = ?",
      [tableId],
    );
    expect(tables[0].number).toBe(11);

    const [logs] = await connect.execute(
      `SELECT user_id, action, entity, entity_id, description
       FROM audit_logs
       WHERE entity = 'tables' AND entity_id = ?`,
      [String(tableId)],
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: ADMIN.user_id,
      action: "UPDATE",
      entity: "tables",
    });
    expect(logs[0].description).toContain("alterou a mesa #10 para #11");
  });

  test("retorna 404 para mesa inexistente", async () => {
    const res = await request(app)
      .patch(`${BASE}/tables/999999`)
      .set("Authorization", managerToken())
      .send({ number: 11 });

    expect(res.status).toBe(404);
  });

  test("retorna 404 para mesa inativa", async () => {
    const tableId = await insertTable({ number: 12, is_active: 0 });

    const res = await request(app)
      .patch(`${BASE}/tables/${tableId}`)
      .set("Authorization", managerToken())
      .send({ number: 13 });

    expect(res.status).toBe(404);
  });

  test("retorna 409 para o próprio número atual", async () => {
    const tableId = await insertTable({ number: 13 });

    const res = await request(app)
      .patch(`${BASE}/tables/${tableId}`)
      .set("Authorization", managerToken())
      .send({ number: 13 });

    expect(res.status).toBe(409);
  });

  test("retorna 409 quando o número pertence a outra mesa ativa", async () => {
    const tableId = await insertTable({ number: 15 });
    await insertTable({ number: 16 });

    const res = await request(app)
      .patch(`${BASE}/tables/${tableId}`)
      .set("Authorization", managerToken())
      .send({ number: 16 });

    expect(res.status).toBe(409);
  });

  test("retorna 409 quando o número pertence a uma mesa inativa", async () => {
    const tableId = await insertTable({ number: 17 });
    await insertTable({ number: 18, is_active: 0 });

    const res = await request(app)
      .patch(`${BASE}/tables/${tableId}`)
      .set("Authorization", managerToken())
      .send({ number: 18 });

    expect(res.status).toBe(409);
  });

  test("retorna 400 para número ausente ou inválido", async () => {
    const tableId = await insertTable({ number: 20 });
    const invalidValues = [undefined, 0, -1, 1.5, true, " "];

    for (const number of invalidValues) {
      const body = number === undefined ? {} : { number };

      const res = await request(app)
        .patch(`${BASE}/tables/${tableId}`)
        .set("Authorization", managerToken())
        .send(body);

      expect(res.status).toBe(400);
    }
  });

  test("retorna 403 para WAITER", async () => {
    const tableId = await insertTable({ number: 21 });

    const res = await request(app)
      .patch(`${BASE}/tables/${tableId}`)
      .set("Authorization", waiterToken())
      .send({ number: 22 });

    expect(res.status).toBe(403);
  });
});