const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const { reset, closeDb } = require("../helpers/db");
const { managerToken, waiterToken } = require("../helpers/auth");
const { ADMIN } = require("../setup/constants");

const BASE = "/api/foodstuff";

let emailCounter = 0;
let phoneCounter = 0;

// Cada requisição precisa de email e telefone inéditos: users tem UNIQUE em
// ambos. Os contadores existem porque o email é normalizado (lowercase) e o
// telefone só pode conter dígitos.
function uniqueEmail(prefix) {
  emailCounter += 1;
  return `${prefix}${emailCounter}@foodstuff.test`;
}

function uniquePhone() {
  phoneCounter += 1;
  return `11988${String(phoneCounter).padStart(6, "0")}`;
}

async function usersCount() {
  const [rows] = await connect.execute("SELECT COUNT(*) AS total FROM users");
  return rows[0].total;
}

async function usersLogsCount() {
  const [rows] = await connect.execute(
    "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'users'",
  );
  return rows[0].total;
}

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("POST /users", () => {
  test("cria usuário com sucesso - 201 e registra audit INSERT", async () => {
    const email = uniqueEmail("novo");
    const phone = uniquePhone();

    const res = await request(app)
      .post(`${BASE}/users`)
      .set("Authorization", managerToken())
      .send({ name: "Bruno Souza", email, phone, role: "WAITER" });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);

    const [users] = await connect.execute(
      `SELECT name, email, phone, role, first_login, is_active
       FROM users
       WHERE email = ?`,
      [email],
    );

    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      name: "Bruno Souza",
      email,
      phone,
      role: "WAITER",
    });

    const [logs] = await connect.execute(
      `SELECT user_id, action, entity
       FROM audit_logs
       WHERE entity = 'users'`,
    );

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: ADMIN.user_id,
      action: "INSERT",
      entity: "users",
    });
  });

  test("continua aceitando cargo válido na criação - 201", async () => {
    const email = uniqueEmail("cargo");
    const phone = uniquePhone();

    const res = await request(app)
      .post(`${BASE}/users`)
      .set("Authorization", managerToken())
      .send({ name: "Gerente Novo", email, phone, role: "MANAGER" });

    expect(res.status).toBe(201);

    const [users] = await connect.execute(
      "SELECT role FROM users WHERE email = ?",
      [email],
    );
    expect(users[0].role).toBe("MANAGER");
  });

  test("retorna 400 e mensagem atual para cargo inválido na criação", async () => {
    const res = await request(app)
      .post(`${BASE}/users`)
      .set("Authorization", managerToken())
      .send({
        name: "Diretor",
        email: uniqueEmail("invalido"),
        phone: uniquePhone(),
        role: "DIRETOR",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cargo de usuário inválido.");
    expect(await usersCount()).toBe(2);
  });

  test("aceita name com exatamente 100 caracteres - 201", async () => {
    const name = "A".repeat(100);
    const email = uniqueEmail("cem");

    const res = await request(app)
      .post(`${BASE}/users`)
      .set("Authorization", managerToken())
      .send({ name, email, phone: uniquePhone(), role: "WAITER" });

    expect(res.status).toBe(201);

    const [users] = await connect.execute(
      "SELECT name, CHAR_LENGTH(name) AS name_length FROM users WHERE email = ?",
      [email],
    );
    expect(users[0].name).toBe(name);
    expect(users[0].name_length).toBe(100);
  });

  test("retorna 400 para name acima de 100 caracteres sem gravar nada", async () => {
    const invalidNames = ["A".repeat(101), "A".repeat(301)];

    for (const name of invalidNames) {
      const res = await request(app)
        .post(`${BASE}/users`)
        .set("Authorization", managerToken())
        .send({ name, email: uniqueEmail("longo"), phone: uniquePhone(), role: "WAITER" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O nome deve ter entre 1 e 100 caracteres.");
    }

    // Apenas ADMIN e WAITER, sem o usuário rejeitado e sem audit log.
    expect(await usersCount()).toBe(2);
    expect(await usersLogsCount()).toBe(0);
  });

  test("retorna 400 para name vazio, só espaços ou tipo inválido", async () => {
    const invalidNames = ["   ", 123, true, ["Bruno"], { nome: "Bruno" }];

    for (const name of invalidNames) {
      const res = await request(app)
        .post(`${BASE}/users`)
        .set("Authorization", managerToken())
        .send({ name, email: uniqueEmail("nome"), phone: uniquePhone(), role: "WAITER" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O nome deve ter entre 1 e 100 caracteres.");
    }

    expect(await usersCount()).toBe(2);
    expect(await usersLogsCount()).toBe(0);
  });

  test("name vazio ou null mantém 'Todos os campos devem ser preenchidos.'", async () => {
    for (const name of ["", null]) {
      const res = await request(app)
        .post(`${BASE}/users`)
        .set("Authorization", managerToken())
        .send({ name, email: uniqueEmail("ausente"), phone: uniquePhone(), role: "WAITER" });

      expect(res.status).toBe(400);
      // Na criação todos os campos são obrigatórios. "" e null contam como
      // ausentes e a validação de presença (que roda antes da validação de
      // nome) responde com a mensagem de campos faltantes.
      expect(res.body.message).toBe("Todos os campos devem ser preenchidos.");
    }

    expect(await usersCount()).toBe(2);
    expect(await usersLogsCount()).toBe(0);
  });

  test("retorna 400 quando o campo name está ausente na criação", async () => {
    const res = await request(app)
      .post(`${BASE}/users`)
      .set("Authorization", managerToken())
      .send({ email: uniqueEmail("ausente"), phone: uniquePhone(), role: "WAITER" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Todos os campos devem ser preenchidos.");
    expect(await usersCount()).toBe(2);
    expect(await usersLogsCount()).toBe(0);
  });

  test("retorna 401 sem token e 403 para role não autorizada", async () => {
    const body = {
      name: "Sem permissão",
      email: uniqueEmail("permissao"),
      phone: uniquePhone(),
      role: "WAITER",
    };

    const anonymous = await request(app).post(`${BASE}/users`).send(body);
    expect(anonymous.status).toBe(401);

    const waiter = await request(app)
      .post(`${BASE}/users`)
      .set("Authorization", waiterToken())
      .send(body);
    expect(waiter.status).toBe(403);

    expect(await usersCount()).toBe(2);
    expect(await usersLogsCount()).toBe(0);
  });
});