const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const { reset, insertCategory, closeDb } = require("../helpers/db");
const { managerToken, waiterToken } = require("../helpers/auth");
const { ADMIN } = require("../setup/constants");

const BASE = "/api/foodstuff";

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("POST /products", () => {
  test("cria produto com sucesso - 201 e registra audit INSERT", async () => {
    const categoryId = await insertCategory({ name: "Entradas" });

    const res = await request(app)
      .post(`${BASE}/products`)
      .set("Authorization", managerToken())
      .send({
        name: "Burger FoodStuff Duplo",
        description: "Dois blends artesanais 120g",
        price: 42.9,
        cost: 18.5,
        image: "https://example.com/burger.jpg",
        requires_preparation: 1,
        is_available: 1,
        category_id: categoryId,
      });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(typeof res.body.data.product_id).toBe("number");

    const [rows] = await connect.execute(
      "SELECT name, price, is_active, is_available FROM products WHERE product_id = ?",
      [res.body.data.product_id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Burger FoodStuff Duplo");
    expect(Number(rows[0].price)).toBe(42.9);

    const [logs] = await connect.execute(
      "SELECT action, entity FROM audit_logs WHERE entity = 'products'",
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ action: "INSERT", entity: "products" });
  });

  test("retorna 400 sem campos obrigatórios", async () => {
    const res = await request(app)
      .post(`${BASE}/products`)
      .set("Authorization", managerToken())
      .send({ name: "Sem preço" });

    expect(res.status).toBe(400);
  });

  test("retorna 404 para categoria inexistente", async () => {
    const res = await request(app)
      .post(`${BASE}/products`)
      .set("Authorization", managerToken())
      .send({ name: "Item X", price: 10, category_id: 99999 });

    expect(res.status).toBe(404);
  });

  test("retorna 401 sem token", async () => {
    const res = await request(app)
      .post(`${BASE}/products`)
      .send({ name: "X", price: 10, category_id: 1 });

    expect(res.status).toBe(401);
  });

  test("retorna 403 para WAITER", async () => {
    const categoryId = await insertCategory({ name: "Bebidas" });

    const res = await request(app)
      .post(`${BASE}/products`)
      .set("Authorization", waiterToken())
      .send({ name: "Soda", price: 14, category_id: categoryId });

    expect(res.status).toBe(403);
  });
});
