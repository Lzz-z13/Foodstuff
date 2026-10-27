const request = require("supertest");
const app = require("../../src/index");
const { reset, insertCategory, insertProduct, closeDb } = require("../helpers/db");
const { managerToken, waiterToken } = require("../helpers/auth");

const BASE = "/api/foodstuff";

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("Categories", () => {
  test("POST /categories cria - 201", async () => {
    const res = await request(app)
      .post(`${BASE}/categories`)
      .set("Authorization", managerToken())
      .send({ name: "Entradas", description: "Porções e entradas" });

    expect(res.status).toBe(201);
    expect(typeof res.body.data.category_id).toBe("number");
  });

  test("GET /categories lista para WAITER - 200", async () => {
    await insertCategory({ name: "Bebidas" });

    const res = await request(app)
      .get(`${BASE}/categories`)
      .set("Authorization", waiterToken());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test("DELETE /categories bloqueia com produtos ativos - 409", async () => {
    const categoryId = await insertCategory({ name: "Sobremesas" });
    await insertProduct({ name: "Tiramisù", price: 22, category_id: categoryId });

    const res = await request(app)
      .delete(`${BASE}/categories/${categoryId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(409);
  });
});
