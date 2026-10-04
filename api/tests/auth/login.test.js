const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const { reset, closeDb } = require("../helpers/db");
const { ADMIN } = require("../setup/constants");

const BASE = "/api/foodstuff";

// Senha em texto claro correspondente ao hash semeado em setup/constants.js.
const SEED_PASSWORD = "admin";

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("POST /auth/login", () => {
  test("usuário ativo faz login - 200", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ email: ADMIN.email, password: SEED_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.data.user.email).toBe(ADMIN.email);
  });

  test("usuário inativo não faz login - 401 (endpoint público, fora do verifyActiveUser)", async () => {
    await connect.execute(
      "UPDATE users SET is_active = 0 WHERE user_id = ?",
      [ADMIN.user_id],
    );

    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ email: ADMIN.email, password: SEED_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Email ou senha inválido.");
  });
});
