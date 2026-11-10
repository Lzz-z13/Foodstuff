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
const { managerToken, waiterToken } = require("../helpers/auth");
const { ADMIN } = require("../setup/constants");

const BASE = "/api/foodstuff";

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("DELETE /tables/:table_id", () => {
  test("desativa mesa, dependências e registra audit DELETE - 200", async () => {
    const tableId = await insertTable({ number: 30 });

    // QR codes: dois ativos e um já inativo
    await insertQrCode({ table_id: tableId, position: 1, is_active: 1 });
    await insertQrCode({ table_id: tableId, position: 2, is_active: 1 });
    await insertQrCode({ table_id: tableId, position: 3, is_active: 0 });

    // Comanda OPEN com pedidos em todos os estados
    const openCommandId = await insertCommand({ table_id: tableId, status: "OPEN" });
    const orderPending = await insertOrder({ command_id: openCommandId, status: "PENDING" });
    const orderPreparing = await insertOrder({ command_id: openCommandId, status: "PREPARING" });
    const orderReady = await insertOrder({ command_id: openCommandId, status: "READY" });
    const orderDelivered = await insertOrder({ command_id: openCommandId, status: "DELIVERED" });
    const orderCancelled = await insertOrder({ command_id: openCommandId, status: "CANCELLED" });

    // Comandas que não devem ser alteradas
    const closedCommandId = await insertCommand({ table_id: tableId, status: "CLOSED" });
    const closedCommandOrder = await insertOrder({ command_id: closedCommandId, status: "PREPARING" });
    await insertCommand({ table_id: tableId, status: "PAID" });
    await insertCommand({ table_id: tableId, status: "CANCELLED" });

    // Payment da comanda aberta (não deve ser alterado)
    await insertPayment({ command_id: openCommandId, value: 25, method: "PIX" });

    const res = await request(app)
      .delete(`${BASE}/tables/${tableId}`)
      .set("Authorization", `Bearer ${managerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.data).toMatchObject({
      table_id: tableId,
      qr_codes_deactivated: 2,
      commands_cancelled: 1,
      orders_cancelled: 3,
    });
    expect(typeof res.body.data.table_id).toBe("number");

    // Mesa em soft delete, registro preservado
    const [tables] = await connect.execute(
      "SELECT is_active FROM tables WHERE table_id = ?",
      [tableId],
    );
    expect(tables).toHaveLength(1);
    expect(tables[0].is_active).toBe(0);

    // QR codes: ativos desativados, inativo permanece inativo
    const [qrCodes] = await connect.execute(
      "SELECT is_active FROM qr_codes WHERE table_id = ? ORDER BY position",
      [tableId],
    );
    expect(qrCodes.map((qr) => qr.is_active)).toEqual([0, 0, 0]);

    // Comanda OPEN cancelada
    const [openCommand] = await connect.execute(
      "SELECT status, closed_at FROM commands WHERE command_id = ?",
      [openCommandId],
    );
    expect(openCommand[0].status).toBe("CANCELLED");
    expect(openCommand[0].closed_at).not.toBeNull();

    // Comandas CLOSED/PAID/CANCELLED inalteradas
    const [closedCommand] = await connect.execute(
      "SELECT status, closed_at FROM commands WHERE command_id = ?",
      [closedCommandId],
    );
    expect(closedCommand[0].status).toBe("CLOSED");
    expect(closedCommand[0].closed_at).toBeNull();

    const [otherCommands] = await connect.execute(
      "SELECT status FROM commands WHERE table_id = ? AND command_id != ? AND command_id != ? ORDER BY command_id",
      [tableId, openCommandId, closedCommandId],
    );
    expect(otherCommands.map((command) => command.status)).toEqual(["PAID", "CANCELLED"]);

    // Pedidos da comanda cancelada
    const pending = await connect.execute("SELECT status, cancelled_at FROM orders WHERE order_id = ?", [orderPending]);
    const preparing = await connect.execute("SELECT status, cancelled_at FROM orders WHERE order_id = ?", [orderPreparing]);
    const ready = await connect.execute("SELECT status, cancelled_at FROM orders WHERE order_id = ?", [orderReady]);
    const delivered = await connect.execute("SELECT status, cancelled_at FROM orders WHERE order_id = ?", [orderDelivered]);
    const cancelled = await connect.execute("SELECT status, cancelled_at FROM orders WHERE order_id = ?", [orderCancelled]);

    for (const [rows] of [pending, preparing, ready]) {
      expect(rows[0].status).toBe("CANCELLED");
      expect(rows[0].cancelled_at).not.toBeNull();
    }
    expect(delivered[0][0].status).toBe("DELIVERED");
    expect(delivered[0][0].cancelled_at).toBeNull();
    expect(cancelled[0][0].status).toBe("CANCELLED");
    expect(cancelled[0][0].cancelled_at).toBeNull();

    // Pedido de comanda não cancelada permanece inalterado
    const [closedOrder] = await connect.execute(
      "SELECT status FROM orders WHERE order_id = ?",
      [closedCommandOrder],
    );
    expect(closedOrder[0].status).toBe("PREPARING");

    // Payments não alterados
    const [payments] = await connect.execute(
      "SELECT value, method, status FROM payments WHERE command_id = ?",
      [openCommandId],
    );
    expect(payments).toHaveLength(1);
    expect(Number(payments[0].value)).toBe(25);
    expect(payments[0].method).toBe("PIX");
    expect(payments[0].status).toBe("PAID");

    // Audit log com efeitos da operação
    const [logs] = await connect.execute(
      `SELECT user_id, action, entity, entity_id, description
       FROM audit_logs
       WHERE entity = 'tables' AND entity_id = ?`,
      [String(tableId)],
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: ADMIN.user_id,
      action: "DELETE",
      entity: "tables",
    });
    expect(logs[0].description).toContain("#30");
    expect(logs[0].description).toContain("2 QR codes desativados");
    expect(logs[0].description).toContain("1 comandas canceladas");
    expect(logs[0].description).toContain("3 pedidos cancelados");
  });

  test("desativa mesa sem dependências - 200 com contagens zero", async () => {
    const tableId = await insertTable({ number: 31 });

    const res = await request(app)
      .delete(`${BASE}/tables/${tableId}`)
      .set("Authorization", `Bearer ${managerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      qr_codes_deactivated: 0,
      commands_cancelled: 0,
      orders_cancelled: 0,
    });

    const [tables] = await connect.execute(
      "SELECT is_active FROM tables WHERE table_id = ?",
      [tableId],
    );
    expect(tables[0].is_active).toBe(0);

    const [logs] = await connect.execute(
      "SELECT action FROM audit_logs WHERE entity = 'tables'",
    );
    expect(logs.map((log) => log.action)).toEqual(["DELETE"]);
  });

  test("retorna 404 para mesa inexistente", async () => {
    const res = await request(app)
      .delete(`${BASE}/tables/999999`)
      .set("Authorization", `Bearer ${managerToken()}`);

    expect(res.status).toBe(404);
  });

  test("retorna 404 para mesa inativa", async () => {
    const tableId = await insertTable({ number: 32, is_active: 0 });

    const res = await request(app)
      .delete(`${BASE}/tables/${tableId}`)
      .set("Authorization", `Bearer ${managerToken()}`);

    expect(res.status).toBe(404);
  });

  test("retorna 400 para table_id malformado", async () => {
    const invalidIds = ["abc", "0", "-1", "1.5", "%20"];

    for (const tableId of invalidIds) {
      const res = await request(app)
        .delete(`${BASE}/tables/${tableId}`)
        .set("Authorization", `Bearer ${managerToken()}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O ID da mesa é inválido.");
    }
  });

  test("retorna 403 para WAITER", async () => {
    const tableId = await insertTable({ number: 33 });

    const res = await request(app)
      .delete(`${BASE}/tables/${tableId}`)
      .set("Authorization", `Bearer ${waiterToken()}`);

    expect(res.status).toBe(403);
  });
});