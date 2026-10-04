const request = require("supertest");
const crypto = require("crypto");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const {
  reset,
  insertTable,
  insertCommand,
  insertOrder,
  insertPayment,
  closeDb,
} = require("../helpers/db");
const {
  managerToken,
  waiterToken,
  kitchenToken,
  cashierToken,
  tokenFor,
} = require("../helpers/auth");
const { ADMIN, WAITER } = require("../setup/constants");

const BASE = "/api/foodstuff";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sincronização real, sem sleep e sem mock: só avança quando o próprio MySQL
// confirma, via performance_schema, o estado dos locks. As condições são
// escopadas na linha exata para não casar com transações de outros testes.
async function waitingOnTableRow(table_id) {
  const query = `
    SELECT ENGINE_TRANSACTION_ID AS trx_id, LOCK_MODE
    FROM performance_schema.data_locks
    WHERE OBJECT_SCHEMA = ?
      AND OBJECT_NAME = 'tables'
      AND INDEX_NAME = 'PRIMARY'
      AND LOCK_STATUS = 'WAITING'
      AND LOCK_DATA = ?
  `;

  for (let attempt = 0; attempt < 500; attempt += 1) {
    const [rows] = await connect.execute(query, [process.env.DB_NAME, String(table_id)]);

    if (rows.length > 0) {
      return rows[0];
    }
  }

  return null;
}

// Procura a transação que está esperando na linha da comanda e que, ao mesmo
// tempo, já segura o lock X na linha da mesa. É exatamente a ordem que o
// FOR UPDATE em deleteTable precisa garantir.
async function waitingOnCommandRowWhileHoldingTable(table_id, command_id) {
  const query = `
    SELECT waiter.ENGINE_TRANSACTION_ID AS trx_id
    FROM performance_schema.data_locks waiter
    JOIN performance_schema.data_locks held
      ON held.ENGINE_TRANSACTION_ID = waiter.ENGINE_TRANSACTION_ID
    WHERE waiter.OBJECT_SCHEMA = ?
      AND waiter.OBJECT_NAME = 'commands'
      AND waiter.INDEX_NAME = 'PRIMARY'
      AND waiter.LOCK_STATUS = 'WAITING'
      AND waiter.LOCK_DATA = ?
      AND held.OBJECT_NAME = 'tables'
      AND held.INDEX_NAME = 'PRIMARY'
      AND held.LOCK_MODE LIKE 'X%'
      AND held.LOCK_STATUS = 'GRANTED'
      AND held.LOCK_DATA = ?
    LIMIT 1
  `;

  for (let attempt = 0; attempt < 500; attempt += 1) {
    const [rows] = await connect.execute(query, [
      process.env.DB_NAME,
      String(command_id),
      String(table_id),
    ]);

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

describe("POST /tables/:table_id/commands", () => {
  test("WAITER abre comanda - 201, qr_code_id NULL e opened_by do garçom", async () => {
    const tableId = await insertTable({ number: 5 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "José" });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(res.body.message).toBe("Comanda aberta com sucesso.");
    expect(typeof res.body.data.command_id).toBe("number");
    expect(res.body.data.session_token).toMatch(UUID_REGEX);
    expect(res.body.data.status).toBe("OPEN");
    expect(res.body.data.table_id).toBe(tableId);
    expect(res.body.data.qr_code_id).toBeNull();
    expect(Object.keys(res.body.data).sort()).toEqual([
      "command_id",
      "qr_code_id",
      "session_token",
      "status",
      "table_id",
    ]);

    const [commands] = await connect.execute(
      `SELECT command_id, customer_name, session_token, status, table_id,
              qr_code_id, opened_by, opened_at, closed_at
       FROM commands
       WHERE command_id = ?`,
      [res.body.data.command_id],
    );

    expect(commands).toHaveLength(1);
    expect(commands[0].customer_name).toBe("José");
    expect(commands[0].session_token).toBe(res.body.data.session_token);
    expect(commands[0].status).toBe("OPEN");
    expect(commands[0].table_id).toBe(tableId);
    expect(commands[0].qr_code_id).toBeNull();
    expect(commands[0].opened_by).toBe(WAITER.user_id);
    expect(commands[0].closed_at).toBeNull();
    expect(commands[0].opened_at).toBeTruthy();
  });

  test("MANAGER abre comanda - 201 com opened_by do gerente", async () => {
    const tableId = await insertTable({ number: 6 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", managerToken())
      .send({ customer_name: "Ana" });

    expect(res.status).toBe(201);

    const [commands] = await connect.execute(
      "SELECT opened_by, qr_code_id, status FROM commands WHERE command_id = ?",
      [res.body.data.command_id],
    );

    expect(commands[0].opened_by).toBe(ADMIN.user_id);
    expect(commands[0].qr_code_id).toBeNull();
    expect(commands[0].status).toBe("OPEN");
  });

  test("persist customer_name com trim", async () => {
    const tableId = await insertTable({ number: 7 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "  José  " });

    expect(res.status).toBe(201);

    const [commands] = await connect.execute(
      "SELECT customer_name FROM commands WHERE command_id = ?",
      [res.body.data.command_id],
    );

    expect(commands[0].customer_name).toBe("José");
  });

  test("gera session_token UUID diferente para cada comanda", async () => {
    const tableId = await insertTable({ number: 8 });

    const first = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "Ana" });

    const second = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "Bruno" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.session_token).toMatch(UUID_REGEX);
    expect(second.body.data.session_token).toMatch(UUID_REGEX);
    expect(first.body.data.session_token).not.toBe(
      second.body.data.session_token,
    );

    const [commands] = await connect.execute(
      "SELECT session_token FROM commands WHERE table_id = ? ORDER BY command_id",
      [tableId],
    );

    expect(commands.map((c) => c.session_token)).toEqual([
      first.body.data.session_token,
      second.body.data.session_token,
    ]);
  });

  test("permite várias comandas OPEN na mesma mesa", async () => {
    const tableId = await insertTable({ number: 9 });

    const first = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "Ana" });

    const second = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "Bruno" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const [commands] = await connect.execute(
      `SELECT customer_name, status, opened_by
       FROM commands
       WHERE table_id = ?
       ORDER BY command_id`,
      [tableId],
    );

    expect(commands).toHaveLength(2);
    expect(commands.map((c) => c.customer_name)).toEqual(["Ana", "Bruno"]);
    expect(commands.every((c) => c.status === "OPEN")).toBe(true);
    expect(commands.every((c) => c.opened_by === WAITER.user_id)).toBe(true);
  });

  test("ignora campos controlados pelo backend enviados no body", async () => {
    const tableId = await insertTable({ number: 10 });
    const otherTableId = await insertTable({ number: 11 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({
        customer_name: "José",
        table_id: otherTableId,
        qr_code_id: 999,
        session_token: "token-do-funcionario",
        opened_by: ADMIN.user_id,
        status: "CLOSED",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.table_id).toBe(tableId);
    expect(res.body.data.qr_code_id).toBeNull();
    expect(res.body.data.status).toBe("OPEN");
    expect(res.body.data.session_token).not.toBe("token-do-funcionario");

    const [commands] = await connect.execute(
      `SELECT table_id, qr_code_id, opened_by, status, session_token
       FROM commands
       WHERE command_id = ?`,
      [res.body.data.command_id],
    );

    expect(commands[0].table_id).toBe(tableId);
    expect(commands[0].qr_code_id).toBeNull();
    expect(commands[0].opened_by).toBe(WAITER.user_id);
    expect(commands[0].status).toBe("OPEN");
    expect(commands[0].session_token).toMatch(UUID_REGEX);

    const [otherTableCommands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands WHERE table_id = ?",
      [otherTableId],
    );
    expect(otherTableCommands[0].total).toBe(0);
  });

  test("registra audit INSERT com o funcionário responsável", async () => {
    const tableId = await insertTable({ number: 12 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "José" });

    expect(res.status).toBe(201);

    const [logs] = await connect.execute(
      `SELECT user_id, action, entity, entity_id, description
       FROM audit_logs
       WHERE entity = 'commands'`,
    );

    expect(logs).toHaveLength(1);
    expect(logs[0].user_id).toBe(WAITER.user_id);
    expect(logs[0].action).toBe("INSERT");
    expect(logs[0].entity).toBe("commands");
    expect(logs[0].entity_id).toBe(String(res.body.data.command_id));
    expect(logs[0].description).toBe(
      `Usuário ${WAITER.name} abriu a comanda #${res.body.data.command_id} da mesa #12 para José.`,
    );
  });

  test("retorna 404 para mesa inexistente", async () => {
    const res = await request(app)
      .post(`${BASE}/tables/999999/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "José" });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Mesa não encontrada.");

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("retorna 404 para mesa inativa", async () => {
    const tableId = await insertTable({ number: 13, is_active: 0 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "José" });

    expect(res.status).toBe(404);

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("retorna 400 para table_id inválido", async () => {
    const invalidIds = ["abc", "0", "-1", "1.5", " ", "1e2x"];

    for (const tableId of invalidIds) {
      const res = await request(app)
        .post(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", waiterToken())
        .send({ customer_name: "José" });

      expect(res.status).toBe(400);
    }

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);
  });

  test("retorna 400 para customer_name inválido", async () => {
    const tableId = await insertTable({ number: 14 });

    const invalidBodies = [
      {},
      { customer_name: null },
      { customer_name: "" },
      { customer_name: "   " },
      { customer_name: "a".repeat(101) },
      { customer_name: 123 },
      { customer_name: true },
      { customer_name: {} },
    ];

    for (const body of invalidBodies) {
      const res = await request(app)
        .post(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", waiterToken())
        .send(body);

      expect(res.status).toBe(400);
    }

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("retorna 401 sem JWT", async () => {
    const tableId = await insertTable({ number: 15 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .send({ customer_name: "José" });

    expect(res.status).toBe(401);

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);
  });

  test("retorna 403 para KITCHEN e CASHIER", async () => {
    const tableId = await insertTable({ number: 16 });

    for (const token of [kitchenToken(), cashierToken()]) {
      const res = await request(app)
        .post(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", token)
        .send({ customer_name: "José" });

      expect(res.status).toBe(403);
    }

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);
  });

  test("retorna 403 quando first_login = 1", async () => {
    const tableId = await insertTable({ number: 17 });

    const firstLoginToken = tokenFor({
      id: ADMIN.user_id,
      role: ADMIN.role,
      first_login: 1,
    });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", firstLoginToken)
      .send({ customer_name: "José" });

    expect(res.status).toBe(403);

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);
  });

  test("retorna 403 para token de usuário inexistente e não cria nada", async () => {
    const tableId = await insertTable({ number: 18 });

    const unknownWaiterToken = tokenFor({
      id: crypto.randomUUID(),
      role: "WAITER",
      first_login: 0,
    });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", unknownWaiterToken)
      .send({ customer_name: "José" });

    expect(res.status).toBe(403);

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(0);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("não cria QR Code, não altera mesa, pedidos e pagamentos", async () => {
    const tableId = await insertTable({ number: 19 });

    // Dependências pré-existentes que não devem ser alteradas
    const existingCommandId = await insertCommand({
      table_id: tableId,
      customer_name: "Comanda Anterior",
    });
    await insertOrder({ command_id: existingCommandId, status: "PREPARING" });
    await insertPayment({ command_id: existingCommandId, value: 42 });

    const [tablesBefore] = await connect.execute(
      "SELECT table_id, number, is_active FROM tables WHERE table_id = ?",
      [tableId],
    );
    const [qrBefore] = await connect.execute(
      "SELECT COUNT(*) AS total FROM qr_codes",
    );
    const [ordersBefore] = await connect.execute(
      "SELECT order_id, status FROM orders",
    );
    const [paymentsBefore] = await connect.execute(
      "SELECT payment_id, value, status FROM payments",
    );
    const [previousCommandBefore] = await connect.execute(
      "SELECT status, opened_by FROM commands WHERE command_id = ?",
      [existingCommandId],
    );

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "José" });

    expect(res.status).toBe(201);

    const [qrAfter] = await connect.execute(
      "SELECT COUNT(*) AS total FROM qr_codes",
    );
    expect(qrAfter[0].total).toBe(qrBefore[0].total);

    const [tablesAfter] = await connect.execute(
      "SELECT table_id, number, is_active FROM tables WHERE table_id = ?",
      [tableId],
    );
    expect(tablesAfter[0]).toEqual(tablesBefore[0]);
    expect(tablesAfter[0].is_active).toBe(1);

    const [ordersAfter] = await connect.execute("SELECT order_id, status FROM orders");
    expect(ordersAfter).toEqual(ordersBefore);

    const [paymentsAfter] = await connect.execute(
      "SELECT payment_id, value, status FROM payments",
    );
    expect(paymentsAfter).toEqual(paymentsBefore);

    const [previousCommandAfter] = await connect.execute(
      "SELECT status, opened_by FROM commands WHERE command_id = ?",
      [existingCommandId],
    );
    expect(previousCommandAfter[0]).toEqual(previousCommandBefore[0]);

    const [commands] = await connect.execute(
      "SELECT COUNT(*) AS total FROM commands",
    );
    expect(commands[0].total).toBe(2);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
    );
    expect(logs[0].total).toBe(1);
  });
});

describe("POST /tables/:table_id/commands e DELETE /tables/:table_id", () => {
  test("a abertura espera o lock da mesa e falha com 404 se a mesa for desativada enquanto espera", async () => {
    const tableId = await insertTable({ number: 20 });
    const openCommandId = await insertCommand({
      table_id: tableId,
      customer_name: "Comanda Anterior",
    });

    // Simula a transação de TableService.deleteTable: primeiro localizam a
    // mesa e travam a linha com FOR UPDATE, e só depois leem as comandas OPEN.
    const deleteTransaction = await connect.getConnection();
    let pendingRequest;
    let lockHolderFinished = false;

    try {
      await deleteTransaction.beginTransaction();

      await deleteTransaction.execute(
        `SELECT table_id, number
         FROM tables
         WHERE table_id = ?
           AND is_active = 1
         LIMIT 1
         FOR UPDATE`,
        [tableId],
      );

      // A resposta só é consumida depois que o lock da mesa for liberado.
      pendingRequest = request(app)
        .post(`${BASE}/tables/${tableId}/commands`)
        .set("Authorization", waiterToken())
        .send({ customer_name: "José" })
        .then((res) => res);

      // Sem travar a linha da mesa antes de ler as comandas OPEN, a abertura
      // entraria e criaria uma comanda que o DELETE não cancelaria.
      const waitingLock = await waitingOnTableRow(tableId);

      expect(waitingLock).not.toBeNull();
      expect(waitingLock.LOCK_MODE).toContain("X");

      // A comanda do garçom ainda não existe: a transação está em lock-wait.
      const [commandsDuringLock] = await connect.execute(
        "SELECT COUNT(*) AS total FROM commands WHERE customer_name = ?",
        ["José"],
      );
      expect(commandsDuringLock[0].total).toBe(0);

      // A abertura permanece bloqueada enquanto o DELETE não fizer commit.
      let settled = false;
      const markSettled = () => {
        settled = true;
      };

      pendingRequest.then(markSettled, markSettled);

      for (let attempt = 0; attempt < 20 && !settled; attempt += 1) {
        await connect.execute("SELECT 1");
      }

      expect(settled).toBe(false);

      // Resto do deleteTable: cancela as comandas OPEN e desativa a mesa.
      await deleteTransaction.execute(
        `UPDATE commands
         SET status = 'CANCELLED',
           closed_at = CURRENT_TIMESTAMP
         WHERE table_id = ?
           AND status = 'OPEN'`,
        [tableId],
      );

      await deleteTransaction.execute(
        "UPDATE tables SET is_active = 0 WHERE table_id = ? AND is_active = 1",
        [tableId],
      );

      await deleteTransaction.commit();
      lockHolderFinished = true;

      const res = await pendingRequest;

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Mesa não encontrada.");

      const [commands] = await connect.execute(
        "SELECT command_id, customer_name, status FROM commands ORDER BY command_id",
      );

      expect(commands).toHaveLength(1);
      expect(commands[0].command_id).toBe(openCommandId);
      expect(commands[0].status).toBe("CANCELLED");

      const [tables] = await connect.execute(
        "SELECT is_active FROM tables WHERE table_id = ?",
        [tableId],
      );
      expect(tables[0].is_active).toBe(0);

      const [logs] = await connect.execute(
        "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'commands'",
      );
      expect(logs[0].total).toBe(0);
    } finally {
      if (!lockHolderFinished) {
        await deleteTransaction.rollback();
      }

      deleteTransaction.release();
    }
  });

  test("o DELETE segura o lock da mesa antes de cancelar as comandas OPEN", async () => {
    const tableId = await insertTable({ number: 22 });
    const openCommandId = await insertCommand({
      table_id: tableId,
      customer_name: "Comanda Anterior",
    });

    // Bloqueia a linha da comanda para que o DELETE pare no UPDATE de commands,
    // ou seja, depois de já ter lido as comandas OPEN.
    const blocker = await connect.getConnection();
    let pendingDelete;
    let blockerFinished = false;

    try {
      await blocker.beginTransaction();

      await blocker.execute(
        "SELECT command_id FROM commands WHERE command_id = ? FOR UPDATE",
        [openCommandId],
      );

      pendingDelete = request(app)
        .delete(`${BASE}/tables/${tableId}`)
        .set("Authorization", managerToken())
        .then((res) => res);

      // O DELETE já está travado na comanda, mas precisa ter travado a mesa
      // antes. Sem isso, uma abertura concorrente criaria uma comanda OPEN
      // depois da leitura das comandas OPEN e ela sobreviveria à desativação.
      const waitingLock = await waitingOnCommandRowWhileHoldingTable(
        tableId,
        openCommandId,
      );

      expect(waitingLock).not.toBeNull();

      await blocker.rollback();
      blockerFinished = true;

      const res = await pendingDelete;

      expect(res.status).toBe(200);

      const [commands] = await connect.execute(
        "SELECT status FROM commands WHERE command_id = ?",
        [openCommandId],
      );
      expect(commands[0].status).toBe("CANCELLED");

      const [tables] = await connect.execute(
        "SELECT is_active FROM tables WHERE table_id = ?",
        [tableId],
      );
      expect(tables[0].is_active).toBe(0);
    } finally {
      if (!blockerFinished) {
        await blocker.rollback();
      }

      blocker.release();
    }
  });

  test("abertura concluída antes do DELETE é cancelada por ele", async () => {
    const tableId = await insertTable({ number: 21 });

    const created = await request(app)
      .post(`${BASE}/tables/${tableId}/commands`)
      .set("Authorization", waiterToken())
      .send({ customer_name: "José" });

    expect(created.status).toBe(201);

    const deleted = await request(app)
      .delete(`${BASE}/tables/${tableId}`)
      .set("Authorization", managerToken());

    expect(deleted.status).toBe(200);

    const [commands] = await connect.execute(
      "SELECT status, closed_at FROM commands WHERE command_id = ?",
      [created.body.data.command_id],
    );

    expect(commands[0].status).toBe("CANCELLED");
    expect(commands[0].closed_at).toBeTruthy();
  });
});