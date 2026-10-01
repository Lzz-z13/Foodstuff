const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const crypto = require("crypto");
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
  cashierToken,
  tokenFor,
} = require("../helpers/auth");
const { ADMIN } = require("../setup/constants");

const BASE = "/api/foodstuff";

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("DELETE /qr-codes/:qr_code_id", () => {
  test("MANAGER desativa QR Code ativo - 200, soft delete preserva dados e registra audit DELETE", async () => {
    const tableId = await insertTable({ number: 5 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 2 });

    const [before] = await connect.execute(
      "SELECT token, position, table_id, created_at FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );

    const res = await request(app)
      .delete(`${BASE}/qr-codes/${qrCodeId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.data).toEqual({ qr_code_id: qrCodeId });
    expect(Object.keys(res.body.data)).toEqual(["qr_code_id"]);

    // A linha continua existindo e apenas is_active mudou
    const [after] = await connect.execute(
      "SELECT token, position, table_id, created_at, is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(after).toHaveLength(1);
    expect(after[0].is_active).toBe(0);
    expect(after[0].token).toBe(before[0].token);
    expect(after[0].position).toBe(before[0].position);
    expect(after[0].table_id).toBe(before[0].table_id);
    expect(after[0].created_at).toEqual(before[0].created_at);

    const [logs] = await connect.execute(
      `SELECT user_id, action, entity, entity_id, description
       FROM audit_logs
       WHERE entity = 'qr_codes'`,
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: ADMIN.user_id,
      action: "DELETE",
      entity: "qr_codes",
    });
    expect(logs[0].entity_id).toBe(String(qrCodeId));
    expect(logs[0].description).toContain(
      "desativou o QR Code da mesa #5 na posição 2",
    );
  });

  test("retorna 404 para QR Code inexistente e não cria audit log", async () => {
    const res = await request(app)
      .delete(`${BASE}/qr-codes/999999`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(404);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'qr_codes'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("retorna 409 para QR Code já inativo e não cria novo audit log", async () => {
    const tableId = await insertTable({ number: 6 });
    const qrCodeId = await insertQrCode({
      table_id: tableId,
      position: 1,
      is_active: 0,
    });

    const [before] = await connect.execute(
      "SELECT token, position, is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );

    const res = await request(app)
      .delete(`${BASE}/qr-codes/${qrCodeId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(409);

    const [after] = await connect.execute(
      "SELECT token, position, is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(after[0]).toEqual(before[0]);
    expect(after[0].is_active).toBe(0);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'qr_codes'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("retorna 400 para ID inválido", async () => {
    const invalidIds = ["abc", "0", "-1", "1.5"];

    for (const id of invalidIds) {
      const res = await request(app)
        .delete(`${BASE}/qr-codes/${id}`)
        .set("Authorization", managerToken());

      expect(res.status).toBe(400);
    }

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'qr_codes'",
    );
    expect(logs[0].total).toBe(0);
  });

  test("retorna 401 sem token", async () => {
    const tableId = await insertTable({ number: 7 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });

    const res = await request(app).delete(`${BASE}/qr-codes/${qrCodeId}`);

    expect(res.status).toBe(401);

    const [qrCodes] = await connect.execute(
      "SELECT is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(qrCodes[0].is_active).toBe(1);
  });

  test("retorna 403 para WAITER, KITCHEN e CASHIER", async () => {
    const tableId = await insertTable({ number: 8 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });

    for (const token of [waiterToken(), kitchenToken(), cashierToken()]) {
      const res = await request(app)
        .delete(`${BASE}/qr-codes/${qrCodeId}`)
        .set("Authorization", token);

      expect(res.status).toBe(403);
    }

    const [qrCodes] = await connect.execute(
      "SELECT is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(qrCodes[0].is_active).toBe(1);
  });

  test("desativar um QR não afeta o outro QR da mesma mesa", async () => {
    const tableId = await insertTable({ number: 9 });
    const qrPosition1 = await insertQrCode({ table_id: tableId, position: 1 });
    const qrPosition2 = await insertQrCode({ table_id: tableId, position: 2 });

    const res = await request(app)
      .delete(`${BASE}/qr-codes/${qrPosition1}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);

    const [qrCodes] = await connect.execute(
      "SELECT qr_code_id, is_active FROM qr_codes WHERE table_id = ? ORDER BY position",
      [tableId],
    );
    expect(qrCodes).toEqual([
      { qr_code_id: qrPosition1, is_active: 0 },
      { qr_code_id: qrPosition2, is_active: 1 },
    ]);

    const [tables] = await connect.execute(
      "SELECT is_active FROM tables WHERE table_id = ?",
      [tableId],
    );
    expect(tables[0].is_active).toBe(1);
  });

  test("não altera comanda, pedidos, pagamentos e mesa que referenciam o QR", async () => {
    const tableId = await insertTable({ number: 10 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });

    const commandId = await insertCommand({
      table_id: tableId,
      qr_code_id: qrCodeId,
      status: "OPEN",
    });
    const orderId = await insertOrder({
      command_id: commandId,
      status: "PREPARING",
    });
    await insertPayment({ command_id: commandId, value: 30, method: "PIX" });

    const [commandBefore] = await connect.execute(
      "SELECT qr_code_id, status, session_token FROM commands WHERE command_id = ?",
      [commandId],
    );
    const [orderBefore] = await connect.execute(
      "SELECT status, cancelled_at FROM orders WHERE order_id = ?",
      [orderId],
    );
    const [paymentBefore] = await connect.execute(
      "SELECT value, method, status FROM payments WHERE command_id = ?",
      [commandId],
    );

    const res = await request(app)
      .delete(`${BASE}/qr-codes/${qrCodeId}`)
      .set("Authorization", managerToken());

    expect(res.status).toBe(200);

    const [commandAfter] = await connect.execute(
      "SELECT qr_code_id, status, session_token FROM commands WHERE command_id = ?",
      [commandId],
    );
    expect(commandAfter[0]).toEqual(commandBefore[0]);
    expect(commandAfter[0].qr_code_id).toBe(qrCodeId);
    expect(commandAfter[0].status).toBe("OPEN");

    const [orderAfter] = await connect.execute(
      "SELECT status, cancelled_at FROM orders WHERE order_id = ?",
      [orderId],
    );
    expect(orderAfter[0]).toEqual(orderBefore[0]);

    const [paymentAfter] = await connect.execute(
      "SELECT value, method, status FROM payments WHERE command_id = ?",
      [commandId],
    );
    expect(paymentAfter[0]).toEqual(paymentBefore[0]);

    const [tables] = await connect.execute(
      "SELECT is_active FROM tables WHERE table_id = ?",
      [tableId],
    );
    expect(tables[0].is_active).toBe(1);
  });

  test("segundo DELETE do mesmo QR Code retorna 409", async () => {
    const tableId = await insertTable({ number: 11 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });

    const first = await request(app)
      .delete(`${BASE}/qr-codes/${qrCodeId}`)
      .set("Authorization", managerToken());
    expect(first.status).toBe(200);

    const second = await request(app)
      .delete(`${BASE}/qr-codes/${qrCodeId}`)
      .set("Authorization", managerToken());
    expect(second.status).toBe(409);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'qr_codes'",
    );
    expect(logs[0].total).toBe(1);
  });

  test("faz rollback e retorna 404 quando o usuário responsável não existe", async () => {
    const tableId = await insertTable({ number: 12 });
    const qrCodeId = await insertQrCode({ table_id: tableId, position: 1 });

    const unknownManagerToken = tokenFor({
      id: crypto.randomUUID(),
      role: "MANAGER",
      first_login: 0,
    });

    const res = await request(app)
      .delete(`${BASE}/qr-codes/${qrCodeId}`)
      .set("Authorization", unknownManagerToken);

    expect(res.status).toBe(404);

    // Nada foi alterado e nenhum log foi criado pela transação revertida
    const [qrCodes] = await connect.execute(
      "SELECT is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(qrCodes[0].is_active).toBe(1);

    const [logs] = await connect.execute(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'qr_codes'",
    );
    expect(logs[0].total).toBe(0);
  });
});