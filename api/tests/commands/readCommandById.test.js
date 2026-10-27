const request = require("supertest");
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
  kitchenToken,
  tokenFor,
} = require("../helpers/auth");
const { ADMIN, WAITER } = require("../setup/constants");

const BASE = "/api/foodstuff";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CASHIER = {
  user_id: "44444444-4444-4444-4444-444444444444",
  name: "caixa_teste",
  email: "cashier@foodstuff.test",
  phone: "21999990001",
  role: "CASHIER",
};

// tests/helpers/db.js não possui um CASHIER semeado e não pode ser alterado.
async function createCashierUser() {
  await connect.execute(
    `INSERT INTO users (user_id, name, email, phone, password, role, first_login)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      CASHIER.user_id,
      CASHIER.name,
      CASHIER.email,
      CASHIER.phone,
      ADMIN.password,
      CASHIER.role,
    ],
  );

  return tokenFor({
    id: CASHIER.user_id,
    role: CASHIER.role,
    first_login: 0,
  });
}

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

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("GET /commands/:command_id", () => {
  test("MANAGER lê comanda - 200", async () => {
    const tableId = await insertTable({ number: 1 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "José",
    });

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.message).toBe("Comanda encontrada com sucesso.");
    expect(res.body.data.command_id).toBe(commandId);
    expect(res.body.data.customer_name).toBe("José");
  });

  test("WAITER lê comanda - 200", async () => {
    const tableId = await insertTable({ number: 2 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Ana",
    });

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", waiterToken());

    expect(res.status).toBe(200);
    expect(res.body.data.command_id).toBe(commandId);
  });

  test("CASHIER lê comanda - 200", async () => {
    const cashierToken = await createCashierUser();

    const tableId = await insertTable({ number: 3 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Bruno",
    });

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", cashierToken);

    expect(res.status).toBe(200);
    expect(res.body.data.command_id).toBe(commandId);
    expect(res.body.data.customer_name).toBe("Bruno");
  });

  test("KITCHEN não pode ler comanda - 403", async () => {
    const tableId = await insertTable({ number: 4 });
    const commandId = await insertCommand({ table_id: tableId });

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", kitchenToken());

    expect(res.status).toBe(403);
  });

  test("sem JWT - 401", async () => {
    const tableId = await insertTable({ number: 5 });
    const commandId = await insertCommand({ table_id: tableId });

    const res = await request(app).get(`${BASE}/commands/${commandId}`);

    expect(res.status).toBe(401);
  });

  test("first_login = 1 - 403", async () => {
    const tableId = await insertTable({ number: 6 });
    const commandId = await insertCommand({ table_id: tableId });

    const firstLoginToken = tokenFor({
      id: ADMIN.user_id,
      role: ADMIN.role,
      first_login: 1,
    });

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", firstLoginToken);

    expect(res.status).toBe(403);
  });

  test("command inexistente - 404", async () => {
    const res = await request(app)
      .get(`${BASE}/commands/999999`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Comanda não encontrada.");

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);
  });

  test("command_id inválido - 400", async () => {
    const tableId = await insertTable({ number: 7 });
    await insertCommand({ table_id: tableId });

    // %20 é o espaço URL-encoded; um espaço literal no fim do path é aparado
    // pela camada HTTP e a rota nem chega a casar.
    for (const commandId of ["abc", "0", "-1", "1.5", "%20"]) {
      const res = await request(app)
        .get(`${BASE}/commands/${commandId}`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O ID da comanda é inválido.");
    }
  });

  test("payload contém exatamente as dez chaves e não expõe session_token", async () => {
    const tableId = await insertTable({ number: 8 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Carla",
    });

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", waiterToken());

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual(EXPECTED_KEYS);
    expect(res.body.data).not.toHaveProperty("session_token");
  });

  test("opened_by e closed_by são retornados", async () => {
    const tableId = await insertTable({ number: 9 });
    const commandId = await insertCommand({ table_id: tableId });

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
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.data.opened_by).toBe(WAITER.user_id);
    expect(res.body.data.closed_by).toBe(ADMIN.user_id);
  });

  test("comanda aberta pelo QR tem opened_by NULL", async () => {
    const tableId = await insertTable({ number: 10 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
    const commandId = await insertCommand({
      table_id: tableId,
      qr_code_id: qrCodeId,
      customer_name: "Cliente QR",
    });

    const [stored] = await connect.execute(
      "SELECT opened_by FROM commands WHERE command_id = ?",
      [commandId],
    );
    expect(stored[0].opened_by).toBeNull();

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.data.opened_by).toBeNull();
    expect(res.body.data.qr_code_id).toBe(qrCodeId);
  });

  test.each([
    ["OPEN", null],
    ["CLOSED", true],
    ["PAID", true],
    ["CANCELLED", true],
  ])("lê comanda %s - 200", async (status, hasClosedAt) => {
    const tableId = await insertTable({ number: 11 });
    const commandId = await insertCommand({
      table_id: tableId,
      status,
    });

    if (hasClosedAt) {
      await connect.execute(
        "UPDATE commands SET closed_at = CURRENT_TIMESTAMP WHERE command_id = ?",
        [commandId],
      );
    }

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(status);

    if (hasClosedAt) {
      expect(res.body.data.closed_at).toBeTruthy();
    } else {
      expect(res.body.data.closed_at).toBeNull();
    }
  });

  test("mesa inativa continua permitindo a leitura", async () => {
    const tableId = await insertTable({ number: 12 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Mesa Inativa",
    });

    await connect.execute("UPDATE tables SET is_active = 0 WHERE table_id = ?", [
      tableId,
    ]);

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.data.command_id).toBe(commandId);
    expect(res.body.data.table_id).toBe(tableId);
    expect(res.body.data.table_number).toBe(12);
  });

  test("QR inativo continua permitindo a leitura", async () => {
    const tableId = await insertTable({ number: 13 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
    const commandId = await insertCommand({
      table_id: tableId,
      qr_code_id: qrCodeId,
      customer_name: "QR Inativo",
    });

    await connect.execute(
      "UPDATE qr_codes SET is_active = 0 WHERE qr_code_id = ?",
      [qrCodeId],
    );

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.data.command_id).toBe(commandId);
    expect(res.body.data.qr_code_id).toBe(qrCodeId);
  });

  test("duas comandas diferentes retornam dados independentes", async () => {
    const tableId = await insertTable({ number: 14 });

    const firstId = await insertCommand({
      table_id: tableId,
      customer_name: "Primeiro",
    });

    const secondId = await insertCommand({
      table_id: tableId,
      customer_name: "Segundo",
      status: "CLOSED",
    });

    await connect.execute(
      "UPDATE commands SET closed_at = CURRENT_TIMESTAMP WHERE command_id = ?",
      [secondId],
    );

    const first = await request(app)
      .get(`${BASE}/commands/${firstId}`)
      .set("Authorization", managerToken());

    const second = await request(app)
      .get(`${BASE}/commands/${secondId}`)
      .set("Authorization", managerToken());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    expect(first.body.data.customer_name).toBe("Primeiro");
    expect(first.body.data.status).toBe("OPEN");
    expect(first.body.data.closed_at).toBeNull();

    expect(second.body.data.customer_name).toBe("Segundo");
    expect(second.body.data.status).toBe("CLOSED");
    expect(second.body.data.closed_at).toBeTruthy();

    expect(first.body.data.command_id).not.toBe(second.body.data.command_id);
    expect(first.body.data.table_id).toBe(second.body.data.table_id);
  });

  test("a leitura não cria audit_logs", async () => {
    const tableId = await insertTable({ number: 15 });
    const commandId = await insertCommand({ table_id: tableId });

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("a leitura não altera o banco", async () => {
    const tableId = await insertTable({ number: 16 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });
    const commandId = await insertCommand({
      table_id: tableId,
      qr_code_id: qrCodeId,
      customer_name: "Imutável",
    });
    const orderId = await insertOrder({ command_id: commandId });
    await insertPayment({ command_id: commandId, value: 50 });

    const [commandsBefore] = await connect.execute(
      "SELECT * FROM commands ORDER BY command_id",
    );
    const [tablesBefore] = await connect.execute(
      "SELECT * FROM tables ORDER BY table_id",
    );
    const [qrBefore] = await connect.execute(
      "SELECT * FROM qr_codes ORDER BY qr_code_id",
    );
    const [ordersBefore] = await connect.execute(
      "SELECT * FROM orders ORDER BY order_id",
    );
    const [paymentsBefore] = await connect.execute(
      "SELECT * FROM payments ORDER BY payment_id",
    );
    const [usersBefore] = await connect.execute(
      "SELECT * FROM users ORDER BY user_id",
    );

    const res = await request(app)
      .get(`${BASE}/commands/${commandId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);

    const [commandsAfter] = await connect.execute(
      "SELECT * FROM commands ORDER BY command_id",
    );
    const [tablesAfter] = await connect.execute(
      "SELECT * FROM tables ORDER BY table_id",
    );
    const [qrAfter] = await connect.execute(
      "SELECT * FROM qr_codes ORDER BY qr_code_id",
    );
    const [ordersAfter] = await connect.execute(
      "SELECT * FROM orders ORDER BY order_id",
    );
    const [paymentsAfter] = await connect.execute(
      "SELECT * FROM payments ORDER BY payment_id",
    );
    const [usersAfter] = await connect.execute(
      "SELECT * FROM users ORDER BY user_id",
    );

    expect(commandsAfter).toEqual(commandsBefore);
    expect(tablesAfter).toEqual(tablesBefore);
    expect(qrAfter).toEqual(qrBefore);
    expect(ordersAfter).toEqual(ordersBefore);
    expect(paymentsAfter).toEqual(paymentsBefore);
    expect(usersAfter).toEqual(usersBefore);
    expect(commandsBefore[0].command_id).toBe(commandId);
    expect(ordersBefore[0].order_id).toBe(orderId);
  });

  test("a rota pública por session_token continua intacta e sem campos internos", async () => {
    const tableId = await insertTable({ number: 17 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Via QR",
    });

    const [stored] = await connect.execute(
      "SELECT session_token FROM commands WHERE command_id = ?",
      [commandId],
    );

    const sessionToken = stored[0].session_token;
    expect(sessionToken).toMatch(UUID_REGEX);

    const publicRes = await request(app).get(
      `${BASE}/commands/session/${sessionToken}`,
    );

    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.command_id).toBe(commandId);
    expect(publicRes.body.data).not.toHaveProperty("opened_by");
    expect(publicRes.body.data).not.toHaveProperty("closed_by");

    // O session_token não é aceito como command_id.
    const idRes = await request(app)
      .get(`${BASE}/commands/${sessionToken}`)
      .set("Authorization", managerToken());

    expect(idRes.status).toBe(400);
  });
});