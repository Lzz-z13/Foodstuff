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

describe("POST /tables", () => {
  test("cria mesa com sucesso - 201 e registra audit INSERT", async () => {
    const res = await request(app)
      .post(`${BASE}/tables`)
      .set("Authorization", managerToken())
      .send({ number: 1 });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(typeof res.body.data.table_id).toBe("number");

    const [tables] = await connect.execute(
      "SELECT table_id, number, is_active FROM tables WHERE number = 1",
    );
    expect(tables).toHaveLength(1);
    expect(tables[0].is_active).toBe(1);

    const [logs] = await connect.execute(
      `SELECT user_id, action, entity, entity_id, description
       FROM audit_logs
       WHERE entity = 'tables'`,
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: ADMIN.user_id,
      action: "INSERT",
      entity: "tables",
    });
    expect(logs[0].entity_id).toBe(String(res.body.data.table_id));
    expect(logs[0].description).toContain("criou a mesa");
    expect(logs[0].description).toContain("#1");
  });

  test("reativa mesa inativa com o mesmo número - 201", async () => {
    const inactiveId = await insertTable({ number: 7, is_active: 0 });

    const res = await request(app)
      .post(`${BASE}/tables`)
      .set("Authorization", managerToken())
      .send({ number: 7 });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(res.body.data.table_id).toBe(inactiveId);

    const [tables] = await connect.execute(
      "SELECT is_active FROM tables WHERE table_id = ?",
      [inactiveId],
    );
    expect(tables[0].is_active).toBe(1);

    const [logs] = await connect.execute(
      "SELECT action FROM audit_logs WHERE entity = 'tables' AND entity_id = ?",
      [String(inactiveId)],
    );
    expect(logs.map((log) => log.action)).toEqual(["REACTIVATE"]);
  });

  test("retorna 400 para número ausente ou inválido", async () => {
    const invalidValues = [undefined, "", 0, -3, 1.5, true, " "];

    for (const number of invalidValues) {
      const body = number === undefined ? {} : { number };

      const res = await request(app)
        .post(`${BASE}/tables`)
        .set("Authorization", managerToken())
        .send(body);

      expect(res.status).toBe(400);
    }
  });

  test("retorna 401 sem token", async () => {
    const res = await request(app)
      .post(`${BASE}/tables`)
      .send({ number: 1 });

    expect(res.status).toBe(401);
  });

  test("retorna 403 para WAITER", async () => {
    const res = await request(app)
      .post(`${BASE}/tables`)
      .set("Authorization", waiterToken())
      .send({ number: 1 });

    expect(res.status).toBe(403);
  });

  test("retorna 409 para número já existente e ativo", async () => {
    await insertTable({ number: 5 });

    const res = await request(app)
      .post(`${BASE}/tables`)
      .set("Authorization", managerToken())
      .send({ number: 5 });

    expect(res.status).toBe(409);
  });
});