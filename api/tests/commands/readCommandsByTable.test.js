const request = require("supertest");
const crypto = require("crypto");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const {
  reset,
  insertTable,
  insertQrCode,
  insertCommand,
  insertOrder,
  insertPayment,
  closeDb,
} = require("../helpers/db");
const {
  managerToken,
  waiterToken,
  tokenFor,
} = require("../helpers/auth");
const { ADMIN, WAITER } = require("../setup/constants");

const BASE = "/api/foodstuff";

const EXPECTED_KEYS = [
  "closed_at",
  "closed_by",
  "command_id",
  "customer_name",
  "opened_at",
  "opened_by",
  "qr_code_id",
  "status",
  "table_id",
  "table_number",
];

// tests/helpers/db.js semeia apenas ADMIN (MANAGER) e WAITER e não pode ser
// alterado. Para que CASHIER (200) e KITCHEN (403) sejam decididos por
// verifyRole — e não por verifyActiveUser — criamos usuários reais e ativos.
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

describe("GET /tables/:table_id/commands", () => {
  describe("autorização", () => {
    test("MANAGER lista as comandas da mesa - 200", async () => {
      const tableId = await insertTable({ number: 1 });
      const commandId = await insertCommand({
        table_id: tableId,
        customer_name: "José",
      });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.message).toBe("Comandas buscadas com sucesso.");
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].command_id).toBe(commandId);
      expect(res.body.data[0].customer_name).toBe("José");
    });

    test("WAITER lista as comandas da mesa - 200", async () => {
      const tableId = await insertTable({ number: 2 });
      const commandId = await insertCommand({
        table_id: tableId,
        customer_name: "Ana",
      });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", waiterToken());

      expect(res.status).toBe(200);
      expect(res.body.data[0].command_id).toBe(commandId);
    });

    test("CASHIER (usuário real ativo) lista as comandas da mesa - 200", async () => {
      const { token } = await createInternalUser("CASHIER");

      const tableId = await insertTable({ number: 3 });
      const commandId = await insertCommand({
        table_id: tableId,
        customer_name: "Bruno",
      });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", token);

      expect(res.status).toBe(200);
      expect(res.body.data[0].command_id).toBe(commandId);
    });

    test("KITCHEN (role insuficiente) - 403", async () => {
      const { token } = await createInternalUser("KITCHEN");

      const tableId = await insertTable({ number: 4 });
      await insertCommand({ table_id: tableId });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", token);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Acesso negado.");
    });

    test("sem JWT - 401", async () => {
      const tableId = await insertTable({ number: 5 });
      await insertCommand({ table_id: tableId });

      const res = await request(app).get(`${BASE}/tables/${tableId}/commands`);

      expect(res.status).toBe(401);
      expect(res.body.auth).toBe(false);
      expect(res.body.message).toBe("Token não fornecido.");
    });

    test("first_login = 1 - 403", async () => {
      const tableId = await insertTable({ number: 6 });
      await insertCommand({ table_id: tableId });

      const firstLoginToken = tokenFor({
        id: ADMIN.user_id,
        role: ADMIN.role,
        first_login: 1,
      });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", firstLoginToken);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "Acesso negado. Altere sua senha para continuar.",
      );
    });

    test("usuário inativo - 403", async () => {
      const { user_id, token } = await createInternalUser("WAITER");

      await connect.execute(
        "UPDATE users SET is_active = 0 WHERE user_id = ?",
        [user_id],
      );

      const tableId = await insertTable({ number: 7 });
      await insertCommand({ table_id: tableId });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", token);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Usuário desativado.");
    });

    test("usuário inexistente - 403", async () => {
      const tableId = await insertTable({ number: 8 });
      await insertCommand({ table_id: tableId });

      const unknownToken = tokenFor({
        id: crypto.randomUUID(),
        role: "WAITER",
        first_login: 0,
      });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", unknownToken);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Usuário desativado.");
    });
  });

  describe("table_id", () => {
    test("table_id inválido - 400", async () => {
      const tableId = await insertTable({ number: 9 });
      await insertCommand({ table_id: tableId });

      // %20 é o espaço URL-encoded; um espaço literal no fim do path é
      // aparado pela camada HTTP e a rota nem chega a casar.
      for (const invalidId of ["abc", "0", "-1", "1.5", "%20"]) {
        const res = await request(app)
          .get(`${BASE}/tables/${invalidId}/commands`)
          .set("Authorization", managerToken());

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("O ID da mesa é inválido.");
      }
    });

    test("mesa inexistente - 404", async () => {
      const res = await request(app)
        .get(`${BASE}/tables/999999/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Mesa não encontrada.");

      const [commands] = await connect.execute(
        "SELECT COUNT(*) AS total FROM commands",
      );
      expect(commands[0].total).toBe(0);
    });
  });

  describe("lista", () => {
    test("mesa existente sem comandas - 200 e lista vazia", async () => {
      const tableId = await insertTable({ number: 10 });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.message).toBe("Comandas buscadas com sucesso.");
      expect(res.body.data).toEqual([]);
    });

    test("mesa com uma comanda retorna todos os campos", async () => {
      const tableId = await insertTable({ number: 11 });
      const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
      const commandId = await insertCommand({
        table_id: tableId,
        qr_code_id: qrCodeId,
        customer_name: "Cliente Único",
      });

      await connect.execute(
        `UPDATE commands
         SET opened_by = ?,
           closed_by = ?,
           status = 'CLOSED',
           closed_at = CURRENT_TIMESTAMP
         WHERE command_id = ?`,
        [WAITER.user_id, ADMIN.user_id, commandId],
      );

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);

      const item = res.body.data[0];
      expect(item.command_id).toBe(commandId);
      expect(item.customer_name).toBe("Cliente Único");
      expect(item.status).toBe("CLOSED");
      expect(item.table_id).toBe(tableId);
      expect(item.table_number).toBe(11);
      expect(item.qr_code_id).toBe(qrCodeId);
      expect(item.opened_by).toBe(WAITER.user_id);
      expect(item.closed_by).toBe(ADMIN.user_id);
      expect(item.opened_at).toBeTruthy();
      expect(item.closed_at).toBeTruthy();
    });

    test("múltiplas comandas na mesma mesa são todas retornadas", async () => {
      const tableId = await insertTable({ number: 12 });
      const first = await insertCommand({ table_id: tableId, customer_name: "A" });
      const second = await insertCommand({ table_id: tableId, customer_name: "B" });
      const third = await insertCommand({ table_id: tableId, customer_name: "C" });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data.map((command) => command.command_id)).toEqual([
        first,
        second,
        third,
      ]);
    });

    test("múltiplas comandas OPEN na mesma mesa são todas retornadas", async () => {
      const tableId = await insertTable({ number: 13 });
      const first = await insertCommand({ table_id: tableId, status: "OPEN" });
      const second = await insertCommand({ table_id: tableId, status: "OPEN" });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.map((command) => command.command_id)).toEqual([
        first,
        second,
      ]);
      expect(res.body.data.every((command) => command.status === "OPEN")).toBe(
        true,
      );
    });

    test("todos os estados são retornados", async () => {
      const tableId = await insertTable({ number: 14 });
      const statuses = ["OPEN", "CLOSED", "PAID", "CANCELLED"];

      for (const status of statuses) {
        await insertCommand({ table_id: tableId, status });
      }

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.data.map((command) => command.status).sort()).toEqual(
        [...statuses].sort(),
      );
    });

    test("não retorna comandas de outra mesa", async () => {
      const tableA = await insertTable({ number: 15 });
      const tableB = await insertTable({ number: 16 });

      const a1 = await insertCommand({ table_id: tableA, customer_name: "Mesa A 1" });
      const a2 = await insertCommand({ table_id: tableA, customer_name: "Mesa A 2" });
      await insertCommand({ table_id: tableB, customer_name: "Mesa B 1" });

      const res = await request(app)
        .get(`${BASE}/tables/${tableA}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.map((command) => command.command_id)).toEqual([a1, a2]);
      expect(res.body.data.every((command) => command.table_id === tableA)).toBe(
        true,
      );
    });
  });

  describe("histórico", () => {
    test("mesa inativa continua permitindo a leitura das comandas - 200", async () => {
      const tableId = await insertTable({ number: 17 });
      const commandId = await insertCommand({
        table_id: tableId,
        customer_name: "Mesa Inativa",
      });

      await connect.execute("UPDATE tables SET is_active = 0 WHERE table_id = ?", [
        tableId,
      ]);

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].command_id).toBe(commandId);
      expect(res.body.data[0].table_id).toBe(tableId);
      expect(res.body.data[0].table_number).toBe(17);
    });

    test("comanda com QR inativo continua retornada", async () => {
      const tableId = await insertTable({ number: 18 });
      const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
      const commandId = await insertCommand({
        table_id: tableId,
        qr_code_id: qrCodeId,
      });

      await connect.execute(
        "UPDATE qr_codes SET is_active = 0 WHERE qr_code_id = ?",
        [qrCodeId],
      );

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);
      expect(res.body.data[0].command_id).toBe(commandId);
      expect(res.body.data[0].qr_code_id).toBe(qrCodeId);
    });

    test("comanda com qr_code_id NULL é retornada", async () => {
      const tableId = await insertTable({ number: 19 });
      const commandId = await insertCommand({
        table_id: tableId,
        qr_code_id: null,
      });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);
      expect(res.body.data[0].command_id).toBe(commandId);
      expect(res.body.data[0].qr_code_id).toBeNull();
    });
  });

  describe("ordenação e payload", () => {
    test("ordena por command_id de forma estritamente crescente", async () => {
      const tableId = await insertTable({ number: 20 });

      for (let i = 0; i < 5; i += 1) {
        await insertCommand({ table_id: tableId });
      }

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);

      const ids = res.body.data.map((command) => command.command_id);
      expect(ids).toHaveLength(5);

      for (let i = 1; i < ids.length; i += 1) {
        expect(ids[i]).toBeGreaterThan(ids[i - 1]);
      }
    });

    test("payload contém exatamente as dez chaves e não expõe session_token", async () => {
      const tableId = await insertTable({ number: 21 });
      await insertCommand({ table_id: tableId });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", waiterToken());

      expect(res.status).toBe(200);
      expect(Object.keys(res.body.data[0]).sort()).toEqual(EXPECTED_KEYS);
      expect(res.body.data[0]).not.toHaveProperty("session_token");
    });
  });

  describe("integridade", () => {
    test("a leitura não cria audit_logs", async () => {
      const tableId = await insertTable({ number: 22 });
      await insertCommand({ table_id: tableId });

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);

      const [logs] = await connect.execute(
        "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
      );
      expect(logs[0].total).toBe(0);
    });

    test("a leitura não altera o banco", async () => {
      const tableId = await insertTable({ number: 23 });
      const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
      const commandId = await insertCommand({
        table_id: tableId,
        qr_code_id: qrCodeId,
        customer_name: "Imutável",
      });
      await insertOrder({ command_id: commandId });
      await insertPayment({ command_id: commandId, value: 50 });

      const snapshot = async () => {
        const [commands] = await connect.execute(
          "SELECT * FROM commands ORDER BY command_id",
        );
        const [tables] = await connect.execute(
          "SELECT * FROM tables ORDER BY table_id",
        );
        const [qrCodes] = await connect.execute(
          "SELECT * FROM qr_codes ORDER BY qr_code_id",
        );
        const [orders] = await connect.execute(
          "SELECT * FROM orders ORDER BY order_id",
        );
        const [payments] = await connect.execute(
          "SELECT * FROM payments ORDER BY payment_id",
        );

        return { commands, tables, qrCodes, orders, payments };
      };

      const before = await snapshot();

      const res = await request(app)
        .get(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(200);

      const after = await snapshot();

      expect(after.commands).toEqual(before.commands);
      expect(after.tables).toEqual(before.tables);
      expect(after.qrCodes).toEqual(before.qrCodes);
      expect(after.orders).toEqual(before.orders);
      expect(after.payments).toEqual(before.payments);

      expect(before.commands[0].command_id).toBe(commandId);
      expect(before.orders).toHaveLength(1);
      expect(before.payments).toHaveLength(1);
    });
  });
});
