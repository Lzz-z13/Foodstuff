const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const { reset, closeDb } = require("../helpers/db");
const { waiterToken } = require("../helpers/auth");
const { WAITER } = require("../setup/constants");

const URL = "/api/foodstuff/users/me";

beforeEach(reset);
afterAll(closeDb);

describe("GET /users/me", () => {
  test("retorna apenas o perfil autenticado, sem senha, para um garçom", async () => {
    const res = await request(app).get(URL).set("Authorization", `Bearer ${waiterToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.data).toEqual({
      user_id: WAITER.user_id,
      name: WAITER.name,
      email: WAITER.email,
      phone: WAITER.phone,
      photo: null,
      role: WAITER.role,
      first_login: WAITER.first_login,
      is_active: 1,
      created_at: expect.any(String),
    });
  });

  test("permite consultar o perfil durante o primeiro login", async () => {
    await connect.execute("UPDATE users SET first_login = 1 WHERE user_id = ?", [WAITER.user_id]);

    const res = await request(app).get(URL).set("Authorization", `Bearer ${waiterToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.first_login).toBe(1);
  });

  test("exige autenticação", async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });

  test("bloqueia usuários desativados", async () => {
    await connect.execute("UPDATE users SET is_active = 0 WHERE user_id = ?", [WAITER.user_id]);

    const res = await request(app).get(URL).set("Authorization", `Bearer ${waiterToken()}`);

    expect(res.status).toBe(403);
    expect(res.body).not.toHaveProperty("data");
  });
});
