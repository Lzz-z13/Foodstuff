const request = require("supertest");
const crypto = require("crypto");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const { reset, closeDb } = require("../helpers/db");
const { tokenFor, managerToken, waiterToken } = require("../helpers/auth");
const { ADMIN, WAITER } = require("../setup/constants");

const BASE = "/api/foodstuff";

const PASSWORD = "$2b$10$YS0iwI4iNnnmwyVy8WatdOEgOPWWohkEFixRvKfEKXYlE7OPLmgP.";

const LAST_MANAGER_MESSAGE =
  "Não é possível desativar o último gerente ativo do sistema.";

async function insertUser({ name, email, phone, role, is_active = 1 }) {
  const user_id = crypto.randomUUID();

  await connect.execute(
    `INSERT INTO users
       (user_id, name, email, phone, password, role, first_login, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [user_id, name, email, phone, PASSWORD, role, is_active],
  );

  return user_id;
}

async function insertManager(suffix) {
  return insertUser({
    name: `Gerente ${suffix}`,
    email: `gerente.${suffix}@foodstuff.test`,
    phone: `1190000000${suffix}`,
    role: "MANAGER",
  });
}

async function activeManagers() {
  const [rows] = await connect.execute(
    `SELECT user_id
     FROM users
     WHERE role = 'MANAGER'
       AND is_active = 1
     ORDER BY user_id`,
  );
  return rows.map((row) => row.user_id);
}

async function isActive(user_id) {
  const [rows] = await connect.execute(
    "SELECT is_active FROM users WHERE user_id = ?",
    [user_id],
  );
  return rows[0].is_active;
}

async function usersLogsCount() {
  const [rows] = await connect.execute(
    "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'users'",
  );
  return rows[0].total;
}

// O token informa o cargo; o banco diz se o usuário existe e está ativo. Basta
// um lock em espera na tabela users para provar que a segunda desativação está
// serializada com a primeira.
async function waitingOnUsersLock() {
  const query = `
    SELECT ENGINE_TRANSACTION_ID AS trx_id, LOCK_MODE
    FROM performance_schema.data_locks
    WHERE OBJECT_SCHEMA = ?
      AND OBJECT_NAME = 'users'
      AND LOCK_STATUS = 'WAITING'
    LIMIT 1
  `;

  for (let attempt = 0; attempt < 500; attempt += 1) {
    const [rows] = await connect.execute(query, [process.env.DB_NAME]);

    if (rows.length > 0) {
      return rows[0];
    }
  }

  return null;
}

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("DELETE /users/me", () => {
  test("último gerente ativo não desativa a própria conta - 409", async () => {
    const res = await request(app)
      .delete(`${BASE}/users/me`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(409);
    expect(res.body.message).toBe(LAST_MANAGER_MESSAGE);
    expect(await isActive(ADMIN.user_id)).toBe(1);
    expect(await usersLogsCount()).toBe(0);
  });

  test("gerente com outro gerente ativo desativa a própria conta - 200", async () => {
    const otherManager = await insertManager(2);

    const res = await request(app)
      .delete(`${BASE}/users/me`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Conta desativada com sucesso.");
    expect(await isActive(ADMIN.user_id)).toBe(0);
    expect(await isActive(otherManager)).toBe(1);

    const [logs] = await connect.execute(
      "SELECT action, entity, entity_id FROM audit_logs WHERE entity = 'users'",
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ action: "DELETE", entity: "users" });
    expect(logs[0].entity_id).toBe(ADMIN.user_id);
  });

  test("usuário não-MANAGER desativa a própria conta - 200", async () => {
    const res = await request(app)
      .delete(`${BASE}/users/me`)
      .set("Authorization", waiterToken());

    expect(res.status).toBe(200);
    expect(await isActive(WAITER.user_id)).toBe(0);
    expect(await isActive(ADMIN.user_id)).toBe(1);
  });
});

describe("DELETE /users/:user_id", () => {
  test("não desativa o último gerente ativo - 409", async () => {
    // O chamador precisa passar por verifyRole('MANAGER'), que lê o cargo do
    // token. Aqui o WAITER ativo carrega um token reivindicando MANAGER, o que
    // permite alcançar o cenário em que o alvo é o único gerente ativo do banco.
    const forgedManagerToken = tokenFor({
      id: WAITER.user_id,
      role: "MANAGER",
      first_login: 0,
    });

    const res = await request(app)
      .delete(`${BASE}/users/${ADMIN.user_id}`)
      .set("Authorization", forgedManagerToken);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe(LAST_MANAGER_MESSAGE);
    expect(await isActive(ADMIN.user_id)).toBe(1);
    expect(await usersLogsCount()).toBe(0);
  });

  test("desativa outro gerente quando existe mais de um ativo - 200", async () => {
    const otherManager = await insertManager(3);

    const res = await request(app)
      .delete(`${BASE}/users/${otherManager}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Usuário desativado com sucesso.");
    expect(await isActive(otherManager)).toBe(0);
    expect(await isActive(ADMIN.user_id)).toBe(1);
    expect(await activeManagers()).toEqual([ADMIN.user_id]);
  });

  test("desativa usuário não-MANAGER - 200", async () => {
    const res = await request(app)
      .delete(`${BASE}/users/${WAITER.user_id}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(await isActive(WAITER.user_id)).toBe(0);
  });

  test("retorna 400 para user_id malformado", async () => {
    const invalidIds = ["abc", "0", "-1", "1.5"];

    for (const user_id of invalidIds) {
      const res = await request(app)
        .delete(`${BASE}/users/${user_id}`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O ID do usuário é inválido.");
    }
  });

  test("retorna 404 para user_id válido inexistente", async () => {
    const res = await request(app)
      .delete(`${BASE}/users/${crypto.randomUUID()}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Usuário não encontrado.");
  });

  test("retorna 404 para alvo já inativo e não cria audit log", async () => {
    const inactiveUser = await insertUser({
      name: "Usuário Inativo",
      email: "inativo@foodstuff.test",
      phone: "11900000099",
      role: "WAITER",
      is_active: 0,
    });

    const res = await request(app)
      .delete(`${BASE}/users/${inactiveUser}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Usuário não encontrado.");
    expect(await isActive(inactiveUser)).toBe(0);
    expect(await usersLogsCount()).toBe(0);
  });

  test("retorna 400 ao tentar desativar a própria conta pela rota por id", async () => {
    const res = await request(app)
      .delete(`${BASE}/users/${ADMIN.user_id}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Para desativar sua própria conta, utilize a rota /me.",
    );
    expect(await isActive(ADMIN.user_id)).toBe(1);
    expect(await usersLogsCount()).toBe(0);
  });

  test("serializa desativações concorrentes e preserva ao menos um gerente ativo", async () => {
    const managerA = ADMIN.user_id;
    const managerB = await insertManager(4);

    // A primeira transação executa a parte de bloqueio do deleteOwnUserAccount
    // do managerA e fica segurando os gerentes ativos até o commit.
    const firstTransaction = await connect.getConnection();
    let pendingSecond;
    let firstFinished = false;

    try {
      await firstTransaction.beginTransaction();

      const [lockedManagers] = await firstTransaction.execute(
        `SELECT user_id
         FROM users
         WHERE role = 'MANAGER'
           AND is_active = 1
         ORDER BY user_id
         FOR UPDATE`,
      );
      expect(lockedManagers.map((manager) => manager.user_id).sort()).toEqual(
        [managerA, managerB].sort(),
      );

      await firstTransaction.execute(
        "UPDATE users SET is_active = 0 WHERE user_id = ?",
        [managerA],
      );

      // A segunda desativação (managerB) fica bloqueada no FOR UPDATE dos
      // gerentes enquanto a primeira não commitar.
      const managerBToken = tokenFor({
        id: managerB,
        role: "MANAGER",
        first_login: 0,
      });

      pendingSecond = request(app)
        .delete(`${BASE}/users/me`)
        .set("Authorization", managerBToken)
        .then((res) => res);

      const waitingLock = await waitingOnUsersLock();
      expect(waitingLock).not.toBeNull();

      // Sem o lock, as duas leituras veriam 2 gerentes e ambas desativariam,
      // deixando o sistema sem nenhum MANAGER ativo.
      let settled = false;
      const markSettled = () => {
        settled = true;
      };
      pendingSecond.then(markSettled, markSettled);

      for (let attempt = 0; attempt < 20 && !settled; attempt += 1) {
        await connect.execute("SELECT 1");
      }

      expect(settled).toBe(false);

      await firstTransaction.commit();
      firstFinished = true;

      const res = await pendingSecond;

      expect(res.status).toBe(409);
      expect(res.body.message).toBe(LAST_MANAGER_MESSAGE);

      const remaining = await activeManagers();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]).toBe(managerB);
    } finally {
      if (!firstFinished) {
        await firstTransaction.rollback();
      }

      firstTransaction.release();
    }
  });
});
