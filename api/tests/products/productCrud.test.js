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

describe("GET /products", () => {
  test("lista produtos com categoria - 200", async () => {
    const catId = await insertCategory({ name: "Entradas" });
    await insertProduct({ name: "Batata Rústica", price: 24.9, category_id: catId });

    const res = await request(app)
      .get(`${BASE}/products`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toMatchObject({
      name: "Batata Rústica",
      category_name: "Entradas",
    });
  });

  test("WAITER pode listar cardápio - 200", async () => {
    const res = await request(app)
      .get(`${BASE}/products`)
      .set("Authorization", waiterToken());

    expect(res.status).toBe(200);
  });

  test("filtra por search e category_id", async () => {
    const entradas = await insertCategory({ name: "Entradas" });
    const bebidas = await insertCategory({ name: "Bebidas" });
    await insertProduct({ name: "Batata Rústica", price: 24.9, category_id: entradas });
    await insertProduct({ name: "Soda Italiana", price: 14, category_id: bebidas });

    const bySearch = await request(app)
      .get(`${BASE}/products?search=batata`)
      .set("Authorization", managerToken());

    expect(bySearch.status).toBe(200);
    expect(bySearch.body.data).toHaveLength(1);

    const byCategory = await request(app)
      .get(`${BASE}/products?category_id=${bebidas}`)
      .set("Authorization", managerToken());

    expect(byCategory.status).toBe(200);
    expect(byCategory.body.data).toHaveLength(1);
    expect(byCategory.body.data[0].name).toBe("Soda Italiana");
  });

  test("retorna 401 sem token", async () => {
    const res = await request(app).get(`${BASE}/products`);

    expect(res.status).toBe(401);
  });
});

describe("PATCH /products/:id e DELETE", () => {
  test("atualiza preço e disponibilidade - 200", async () => {
    const catId = await insertCategory({ name: "Pratos Principais" });
    const productId = await insertProduct({
      name: "Nhoque",
      price: 58,
      category_id: catId,
    });

    const patch = await request(app)
      .patch(`${BASE}/products/${productId}`)
      .set("Authorization", managerToken())
      .send({ price: 62.5 });

    expect(patch.status).toBe(200);

    const toggle = await request(app)
      .patch(`${BASE}/products/${productId}/availability`)
      .set("Authorization", managerToken())
      .send({ is_available: 0 });

    expect(toggle.status).toBe(200);
    expect(toggle.body.data.is_available).toBe(0);
  });

  test("soft delete - 200", async () => {
    const catId = await insertCategory({ name: "Sobremesas" });
    const productId = await insertProduct({
      name: "Pudim",
      price: 18.9,
      category_id: catId,
    });

    const res = await request(app)
      .delete(`${BASE}/products/${productId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);

    const list = await request(app)
      .get(`${BASE}/products`)
      .set("Authorization", managerToken());

    expect(list.body.data.find((p) => p.product_id === productId)).toBeUndefined();
  });
});
