const request = require("supertest");
const crypto = require("crypto");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const {
  reset,
  insertTable,
  insertCommand,
  closeDb,
} = require("../helpers/db");
const {
  managerToken,
  waiterToken,
  tokenFor,
} = require("../helpers/auth");
const { ADMIN, WAITER } = require("../setup/constants");

const BASE = "/api/foodstuff";

async function insertCategory(name = "Categoria Teste", isActive = 1) {
  const [result] = await connect.execute(
    "INSERT INTO categories (name, is_active) VALUES (?, ?)",
    [name, isActive],
  );
  return result.insertId;
}

async function insertProduct(categoryId, name = "Produto Teste", price = 10.5, isActive = 1, isAvailable = 1) {
  const [result] = await connect.execute(
    "INSERT INTO products (name, description, price, cost, requires_preparation, is_available, is_active, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [name, "descricao", price, null, 1, isAvailable, isActive, categoryId],
  );
  return result.insertId;
}

let userCounter = 0;
async function createInternalUser(role) {
  userCounter += 1;
  const user_id = crypto.randomUUID();
  const email = `${role.toLowerCase()}${userCounter}@foodstuff.test`;
  const phone = `11988${String(userCounter).padStart(6, "0")}`;

  await connect.execute(
    `INSERT INTO users (user_id, name, email, phone, password, role, first_login)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      user_id,
      `${role} Teste ${userCounter}`,
      email,
      phone,
      ADMIN.password,
      role,
    ],
  );

  return {
    user_id,
    token: tokenFor({ id: user_id, role, first_login: 0 }),
  };
}

beforeEach(async () => {
  await reset();
  userCounter = 0;
});

afterAll(async () => {
  await closeDb();
});

describe("POST /commands/:command_id/orders", () => {
  describe("autorização", () => {
    test("MANAGER cria pedido com sucesso - 201", async () => {
      const tableId = await insertTable({ number: 1 });
      const commandId = await insertCommand({ table_id: tableId });
      const categoryId = await insertCategory();
      const productId = await insertProduct(categoryId);

      const res = await request(app)
        .post(`${BASE}/commands/${commandId}/orders`)
        .set("Authorization", managerToken())
        .send({
          items: [
            { product_id: productId, quantity: 2, observation: "sem cebola" },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.error).toBe(false);
      expect(res.body.message).toBe("Pedido criado com sucesso.");
      expect(res.body.data).toHaveProperty("order_id");
      expect(typeof res.body.data.order_id).toBe("number");
    });

    test("WAITER cria pedido com sucesso - 201", async () => {
      const tableId = await insertTable({ number: 2 });
      const commandId = await insertCommand({ table_id: tableId });
      const categoryId = await insertCategory();
      const productId = await insertProduct(categoryId, "Pizza", 25.0);

      const res = await request(app)
        .post(`${BASE}/commands/${commandId}/orders`)
        .set("Authorization", waiterToken())
        .send({
          items: [{ product_id: productId, quantity: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.error).toBe(false);
      expect(res.body.message).toBe("Pedido criado com sucesso.");
    });

    test("CASHIER não pode criar pedido - 403", async () => {
      const { token } = await createInternalUser("CASHIER");
      const tableId = await insertTable({ number: 3 });
      const commandId = await insertCommand({ table_id: tableId });
      const categoryId = await insertCategory();
      const productId = await insertProduct(categoryId);

      const res = await request(app)
        .post(`${BASE}/commands/${commandId}/orders`)
        .set("Authorization", token)
        .send({
          items: [{ product_id: productId, quantity: 1 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toBe("Acesso negado.");
    });

    test("KITCHEN não pode criar pedido - 403", async () => {
      const { token } = await createInternalUser("KITCHEN");
      const tableId = await insertTable({ number: 4 });
      const commandId = await insertCommand({ table_id: tableId });
      const categoryId = await insertCategory();
      const productId = await insertProduct(categoryId);

      const res = await request(app)
        .post(`${BASE}/commands/${commandId}/orders`)
        .set("Authorization", token)
        .send({
          items: [{ product_id: productId, quantity: 1 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toBe("Acesso negado.");
    });

    test("sem JWT - 401", async () => {
      const tableId = await insertTable({ number: 5 });
      const commandId = await insertCommand({ table_id: tableId });
      const categoryId = await insertCategory();
      const productId = await insertProduct(categoryId);

      const res = await request(app)
        .post(`${BASE}/commands/${commandId}/orders`)
        .send({
          items: [{ product_id: productId, quantity: 1 }],
        });

      expect(res.status).toBe(401);
      expect(res.body.auth).toBe(false);
      expect(res.body.message).toBe("Token não fornecido.");
    });

    test("first_login = 1 - 403", async () => {
      const tableId = await insertTable({ number: 6 });
      const commandId = await insertCommand({ table_id: tableId });
      const categoryId = await insertCategory();
      const productId = await insertProduct(categoryId);

      const firstLoginToken = tokenFor({
        id: ADMIN.user_id,
        role: ADMIN.role,
        first_login: 1,
      });

      const res = await request(app)
        .post(`${BASE}/commands/${commandId}/orders`)
        .set("Authorization", firstLoginToken)
        .send({
          items: [{ product_id: productId, quantity: 1 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Acesso negado. Altere sua senha para continuar.");
    });

    test("usuário inativo - 403", async () => {
      const { user_id, token } = await createInternalUser("WAITER");
      await connect.execute(
        "UPDATE users SET is_active = 0 WHERE user_id = ?",
        [user_id],
      );

      const tableId = await insertTable({ number: 7 });
      const commandId = await insertCommand({ table_id: tableId });
      const categoryId = await insertCategory();
      const productId = await insertProduct(categoryId);

      const res = await request(app)
        .post(`${BASE}/commands/${commandId}/orders`)
        .set("Authorization", token)
        .send({
          items: [{ product_id: productId, quantity: 1 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.auth).toBe(false);
      expect(res.body.message).toBe("Usuário desativado.");
    });

    test("usuário inexistente - 403", async () => {
      const tableId = await insertTable({ number: 8 });
      const commandId = await insertCommand({ table_id: tableId });
      const categoryId = await insertCategory();
      const productId = await insertProduct(categoryId);

      const unknownToken = tokenFor({
        id: crypto.randomUUID(),
        role: "MANAGER",
        first_login: 0,
      });

      const res = await request(app)
        .post(`${BASE}/commands/${commandId}/orders`)
        .set("Authorization", unknownToken)
        .send({
          items: [{ product_id: productId, quantity: 1 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.auth).toBe(false);
      expect(res.body.message).toBe("Usuário desativado.");
    });
  });
});
