const request = require("supertest");
const crypto = require("crypto");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const { reset, closeDb } = require("../helpers/db");
const { tokenFor, managerToken, waiterToken } = require("../helpers/auth");
const { WAITER } = require("../setup/constants");

const BASE = "/api/foodstuff";

const PASSWORD = "$2b$10$YS0iwI4iNnnmwyVy8WatdOEgOPWWohkEFixRvKfEKXYlE7OPLmgP.";

async function deactivate(user_id) {
  await connect.execute("UPDATE users SET is_active = 0 WHERE user_id = ?", [
    user_id,
  ]);
}

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("verifyActiveUser", () => {
  test("deixa usuário ativo seguir para a rota - 200", async () => {
    const res = await request(app)
      .get(`${BASE}/users`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  test("bloqueia usuário desativado com 403 e mensagem própria", async () => {
    await deactivate(WAITER.user_id);

    const res = await request(app)
      .get(`${BASE}/tables`)
      .set("Authorization", waiterToken());

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Usuário desativado.");
  });

  test("bloqueia token de usuário inexistente com 403", async () => {
    const token = tokenFor({
      id: crypto.randomUUID(),
      role: "MANAGER",
      first_login: 0,
    });

    const res = await request(app)
      .get(`${BASE}/users`)
      .set("Authorization", token);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Usuário desativado.");
  });

  test("roda antes de verifyRole e não vaza 'Acesso negado.'", async () => {
    await deactivate(WAITER.user_id);

    const res = await request(app)
      .get(`${BASE}/users`)
      .set("Authorization", waiterToken());

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Usuário desativado.");
  });

  test("roda antes de verifyFirstLogin", async () => {
    const user_id = crypto.randomUUID();

    await connect.execute(
      `INSERT INTO users
         (user_id, name, email, phone, password, role, first_login, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        user_id,
        "Inativo Primeiro Login",
        "inativo.firstlogin@foodstuff.test",
        "11900000001",
        PASSWORD,
        "WAITER",
      ],
    );

    const token = tokenFor({ id: user_id, role: "WAITER", first_login: 1 });

    const res = await request(app)
      .get(`${BASE}/tables`)
      .set("Authorization", token);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Usuário desativado.");
  });

  test("não interfere nas rotas públicas", async () => {
    const res = await request(app).get(`${BASE}/health`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("o mesmo token continua bloqueado enquanto o usuário estiver desativado", async () => {
    await deactivate(WAITER.user_id);

    const first = await request(app)
      .get(`${BASE}/tables`)
      .set("Authorization", waiterToken());

    const second = await request(app)
      .get(`${BASE}/tables`)
      .set("Authorization", waiterToken());

    expect(first.status).toBe(403);
    expect(second.status).toBe(403);
    expect(second.body.message).toBe("Usuário desativado.");
  });
});
