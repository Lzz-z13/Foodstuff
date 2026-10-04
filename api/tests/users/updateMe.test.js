const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const { reset, closeDb } = require("../helpers/db");
const { waiterToken, managerToken } = require("../helpers/auth");
const { WAITER, ADMIN } = require("../setup/constants");

const BASE = "/api/foodstuff";

async function waiterRow() {
  const [rows] = await connect.execute(
    "SELECT name, email, phone, role, is_active FROM users WHERE user_id = ?",
    [WAITER.user_id],
  );
  return rows[0];
}

async function managerRow() {
  const [rows] = await connect.execute(
    "SELECT name, email, phone, role, is_active FROM users WHERE user_id = ?",
    [ADMIN.user_id],
  );
  return rows[0];
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

describe("PATCH /users/me", () => {
  test("atualiza credenciais com sucesso - 200 e registra audit UPDATE", async () => {
    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", waiterToken())
      .send({ name: "Garcom Atualizado" });

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.message).toBe("Usuário atualizado com sucesso.");

    const user = await waiterRow();
    expect(user.name).toBe("Garcom Atualizado");
    expect(user.role).toBe("WAITER");

    const [logs] = await connect.execute(
      "SELECT user_id, action, entity FROM audit_logs WHERE entity = 'users'",
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: WAITER.user_id,
      action: "UPDATE",
      entity: "users",
    });
  });

  test("name ausente continua aceito - 200", async () => {
    const before = await waiterRow();

    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", waiterToken())
      .send({ email: "garcom.novo@foodstuff.test" });

    expect(res.status).toBe(200);

    const after = await waiterRow();
    expect(after.email).toBe("garcom.novo@foodstuff.test");
    expect(after.name).toBe(before.name);
  });

  test("body vazio mantém 'Nenhum campo fornecido para atualizar.'", async () => {
    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", waiterToken())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Nenhum campo fornecido para atualizar.");
    expect(await usersLogsCount()).toBe(0);
  });

  test("retorna 401 sem token", async () => {
    const res = await request(app).patch(`${BASE}/users/me`).send({ name: "X" });

    expect(res.status).toBe(401);
  });
});

describe("PATCH /users/me - validação de name", () => {
  test("aceita name com exatamente 100 caracteres - 200", async () => {
    const name = "B".repeat(100);

    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", waiterToken())
      .send({ name });

    expect(res.status).toBe(200);

    const [users] = await connect.execute(
      "SELECT name, CHAR_LENGTH(name) AS name_length FROM users WHERE user_id = ?",
      [WAITER.user_id],
    );
    expect(users[0].name).toBe(name);
    expect(users[0].name_length).toBe(100);
  });

  test("retorna 400 para name acima de 100 caracteres sem alterar o banco", async () => {
    for (const name of ["B".repeat(101), "B".repeat(301)]) {
      const res = await request(app)
        .patch(`${BASE}/users/me`)
        .set("Authorization", waiterToken())
        .send({ name });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O nome deve ter entre 1 e 100 caracteres.");
    }

    const user = await waiterRow();
    expect(user.name).toBe(WAITER.name);
    expect(await usersLogsCount()).toBe(0);
  });

  test("retorna 400 para name vazio ou null junto de um campo válido, sem alterar nada", async () => {
    const before = await waiterRow();

    for (const name of ["", null]) {
      const res = await request(app)
        .patch(`${BASE}/users/me`)
        .set("Authorization", waiterToken())
        .send({ name, email: "deveria.mudar@foodstuff.test" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O nome deve ter entre 1 e 100 caracteres.");
    }

    const after = await waiterRow();
    expect(after).toEqual(before);
    expect(await usersLogsCount()).toBe(0);
  });

  test("name vazio sozinho mantém 'Nenhum campo fornecido para atualizar.'", async () => {
    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", waiterToken())
      .send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Nenhum campo fornecido para atualizar.");
    expect(await usersLogsCount()).toBe(0);
  });

  test("retorna 400 para name só com espaços sem alterar o banco", async () => {
    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", waiterToken())
      .send({ name: "   " });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("O nome deve ter entre 1 e 100 caracteres.");

    const user = await waiterRow();
    expect(user.name).toBe(WAITER.name);
    expect(await usersLogsCount()).toBe(0);
  });

  test("retorna 400 para name com tipo inválido", async () => {
    for (const name of [123, true, ["Bruno"], { nome: "Bruno" }]) {
      const res = await request(app)
        .patch(`${BASE}/users/me`)
        .set("Authorization", waiterToken())
        .send({ name });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O nome deve ter entre 1 e 100 caracteres.");
    }

    const user = await waiterRow();
    expect(user.name).toBe(WAITER.name);
  });
});

describe("PATCH /users/me - role não pode ser alterado", () => {
  const forbiddenMessage = "O cargo não pode ser alterado pelo próprio usuário.";

  test("role sozinho retorna 400", async () => {
    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", waiterToken())
      .send({ role: "MANAGER" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(forbiddenMessage);

    const user = await waiterRow();
    expect(user.role).toBe("WAITER");
    expect(await usersLogsCount()).toBe(0);
  });

  test("role junto de campo válido retorna 400 e não altera nenhum campo", async () => {
    const before = await waiterRow();

    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", waiterToken())
      .send({
        role: "MANAGER",
        name: "Novo Nome",
        email: "novo.email@foodstuff.test",
        phone: "11987654321",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(forbiddenMessage);

    // Nenhum campo do corpo pode ter sido aplicado.
    const after = await waiterRow();
    expect(after).toEqual(before);
    expect(after.role).toBe("WAITER");
    expect(await usersLogsCount()).toBe(0);
  });

  test("role inválido junto de campo válido também retorna 400", async () => {
    const before = await waiterRow();

    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", waiterToken())
      .send({ role: "DIRETOR", name: "Novo Nome" });

    // O problema é o campo proibido, não o valor informado.
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(forbiddenMessage);

    expect(await waiterRow()).toEqual(before);
    expect(await usersLogsCount()).toBe(0);
  });

  test("role null também retorna 400 - a regra vale para qualquer presença do campo", async () => {
    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", waiterToken())
      .send({ role: null, name: "Novo Nome" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(forbiddenMessage);

    const user = await waiterRow();
    expect(user.role).toBe("WAITER");
    expect(user.name).toBe(WAITER.name);
  });

  test("MANAGER também não consegue alterar o próprio cargo", async () => {
    const before = await managerRow();

    const res = await request(app)
      .patch(`${BASE}/users/me`)
      .set("Authorization", managerToken())
      .send({ role: "WAITER" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(forbiddenMessage);
    expect(await usersLogsCount()).toBe(0);
    expect(await managerRow()).toEqual(before);
  });
});