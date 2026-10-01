const request = require("supertest");
const app = require("../../src/index");
const { reset, insertTable, closeDb } = require("../helpers/db");
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

describe("GET /tables", () => {
  test("lista somente mesas ativas em ordem crescente de número - 200", async () => {
    await insertTable({ number: 3 });
    await insertTable({ number: 9, is_active: 0 });
    await insertTable({ number: 1 });
    await insertTable({ number: 2 });

    const res = await request(app)
      .get(`${BASE}/tables`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.data.map((table) => table.number)).toEqual([1, 2, 3]);
  });

  test("permite WAITER - 200", async () => {
    await insertTable({ number: 1 });

    const res = await request(app)
      .get(`${BASE}/tables`)
      .set("Authorization", waiterToken());

    expect(res.status).toBe(200);
  });

  test("retorna 401 sem token", async () => {
    const res = await request(app).get(`${BASE}/tables`);

    expect(res.status).toBe(401);
  });

  test("retorna 403 para KITCHEN e CASHIER", async () => {
    for (const token of [kitchenToken(), cashierToken()]) {
      const res = await request(app)
        .get(`${BASE}/tables`)
        .set("Authorization", token);

      expect(res.status).toBe(403);
    }
  });
});