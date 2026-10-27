const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const {
  reset,
  insertTable,
  insertQrCode,
  closeDb,
} = require("../helpers/db");
const {
  managerToken,
  waiterToken,
  kitchenToken,
  cashierToken,
} = require("../helpers/auth");
const { ADMIN } = require("../setup/constants");

const BASE = "/api/foodstuff";

// Sincronização real, sem sleep e sem mock: só avança quando o próprio MySQL
// confirma, via performance_schema, o estado dos locks na linha exata da mesa.
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
    const [rows] = await connect.execute(query, [
      process.env.DB_NAME,
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

describe("POST /tables/:table_id/qr-codes", () => {
  test("cria QR Code com sucesso - 201 e registra audit INSERT", async () => {
    const tableId = await insertTable({ number: 12 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 1 });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(typeof res.body.data.qr_code_id).toBe("number");

    const [qrCodes] = await connect.execute(
      "SELECT table_id, token, position, is_active FROM qr_codes WHERE table_id = ?",
      [tableId],
    );
    expect(qrCodes).toHaveLength(1);
    expect(qrCodes[0].table_id).toBe(tableId);
    expect(qrCodes[0].position).toBe(1);
    expect(qrCodes[0].is_active).toBe(1);
    expect(qrCodes[0].token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const [logs] = await connect.execute(
      `SELECT user_id, action, entity, entity_id, description
       FROM audit_logs
       WHERE entity = 'qr_codes'`,
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: ADMIN.user_id,
      action: "INSERT",
      entity: "qr_codes",
    });
    expect(logs[0].entity_id).toBe(String(res.body.data.qr_code_id));
    expect(logs[0].description).toContain(
      "criou o QR Code da mesa #12 na posição 1",
    );
  });

  test("ignora token enviado pelo cliente e gera token próprio", async () => {
    const tableId = await insertTable({ number: 14 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 2, token: "token-do-cliente" });

    expect(res.status).toBe(201);

    const [qrCodes] = await connect.execute(
      "SELECT token FROM qr_codes WHERE table_id = ? AND position = 2",
      [tableId],
    );
    expect(qrCodes).toHaveLength(1);
    expect(qrCodes[0].token).not.toBe("token-do-cliente");
    expect(qrCodes[0].token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test("reativa QR Code inativo na mesma posição - 201 e registra audit REACTIVATE", async () => {
    const tableId = await insertTable({ number: 12 });
    const qrCodeId = await insertQrCode({
      table_id: tableId,
      position: 3,
      is_active: 0,
    });

    const [existing] = await connect.execute(
      "SELECT token FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    const previousToken = existing[0].token;

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 3 });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(res.body.data.qr_code_id).toBe(qrCodeId);

    const [qrCodes] = await connect.execute(
      "SELECT token, position, is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(qrCodes).toHaveLength(1);
    expect(qrCodes[0].is_active).toBe(1);
    expect(qrCodes[0].position).toBe(3);
    expect(qrCodes[0].token).toBe(previousToken);

    const [logs] = await connect.execute(
      "SELECT action, entity, entity_id FROM audit_logs WHERE entity = 'qr_codes'",
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "REACTIVATE",
      entity: "qr_codes",
    });
    expect(logs[0].entity_id).toBe(String(qrCodeId));
  });

  test("retorna 400 para posição ausente ou inválida", async () => {
    const tableId = await insertTable({ number: 12 });
    const invalidValues = [undefined, null, "", 0, -1, 5, 1.5, true, "1", " "];

    for (const position of invalidValues) {
      const body =
        position === undefined || position === null ? {} : { position };

      const res = await request(app)
        .post(`${BASE}/tables/${tableId}/qr-codes`)
        .set("Authorization", managerToken())
        .send(body);

      expect(res.status).toBe(400);
    }
  });

  test("retorna 404 para mesa inexistente", async () => {
    const res = await request(app)
      .post(`${BASE}/tables/99999/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 1 });

    expect(res.status).toBe(404);
  });

  test("retorna 404 para mesa inativa", async () => {
    const tableId = await insertTable({ number: 13, is_active: 0 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 1 });

    expect(res.status).toBe(404);
  });

  test("retorna 409 quando já existe QR Code ativo na posição", async () => {
    const tableId = await insertTable({ number: 12 });
    await insertQrCode({ table_id: tableId, position: 1, is_active: 1 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 1 });

    expect(res.status).toBe(409);
  });

  test("retorna 401 sem token", async () => {
    const tableId = await insertTable({ number: 12 });

    const res = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .send({ position: 1 });

    expect(res.status).toBe(401);
  });

  test("retorna 400 para table_id malformado", async () => {
    const invalidIds = ["abc", "0", "-1", "1.5", "%20"];

    for (const tableId of invalidIds) {
      const res = await request(app)
        .post(`${BASE}/tables/${tableId}/qr-codes`)
        .set("Authorization", managerToken())
        .send({ position: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O ID da mesa é inválido.");
    }
  });

  test("retorna 403 para role não autorizada", async () => {
    const tableId = await insertTable({ number: 12 });

    for (const token of [waiterToken(), kitchenToken(), cashierToken()]) {
      const res = await request(app)
        .post(`${BASE}/tables/${tableId}/qr-codes`)
        .set("Authorization", token)
        .send({ position: 1 });

      expect(res.status).toBe(403);
    }
  });
});

describe("POST /tables/:table_id/qr-codes e DELETE /tables/:table_id", () => {
  test("a criação espera o lock da mesa e falha com 404 se a mesa for desativada enquanto espera", async () => {
    const tableId = await insertTable({ number: 30 });

    // Simula a transação de TableService.deleteTable: localiza a mesa e trava
    // a linha com FOR UPDATE antes de desativá-la.
    const blocker = await connect.getConnection();
    let pendingRequest;
    let blockerFinished = false;

    try {
      await blocker.beginTransaction();

      await blocker.execute(
        `SELECT table_id, number
         FROM tables
         WHERE table_id = ?
           AND is_active = 1
         LIMIT 1
         FOR UPDATE`,
        [tableId],
      );

      pendingRequest = request(app)
        .post(`${BASE}/tables/${tableId}/qr-codes`)
        .set("Authorization", managerToken())
        .send({ position: 1 })
        .then((res) => res);

      // Sem FOR UPDATE na leitura da mesa, createQrCode não esperaria aqui: a
      // leitura não bloqueante veria a mesa ativa e só travaria no INSERT (lock
      // S do FK), criando um QR Code em uma mesa já desativada. O lock em espera
      // precisa ser X, prova de que a leitura agora bloqueia a linha da mesa.
      const waitingLock = await waitingOnTableRow(tableId);

      expect(waitingLock).not.toBeNull();
      expect(waitingLock.LOCK_MODE).toContain("X");

      const [qrDuringLock] = await connect.execute(
        "SELECT COUNT(*) AS total FROM qr_codes WHERE table_id = ?",
        [tableId],
      );
      expect(qrDuringLock[0].total).toBe(0);

      // Resto do deleteTable: desativa a mesa e libera o lock.
      await blocker.execute(
        "UPDATE tables SET is_active = 0 WHERE table_id = ? AND is_active = 1",
        [tableId],
      );

      await blocker.commit();
      blockerFinished = true;

      const res = await pendingRequest;

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Mesa não encontrada.");

      const [qrCodes] = await connect.execute(
        "SELECT COUNT(*) AS total FROM qr_codes WHERE table_id = ?",
        [tableId],
      );
      expect(qrCodes[0].total).toBe(0);

      const [logs] = await connect.execute(
        "SELECT COUNT(*) AS total FROM audit_logs WHERE entity = 'qr_codes'",
      );
      expect(logs[0].total).toBe(0);
    } finally {
      if (!blockerFinished) {
        await blocker.rollback();
      }

      blocker.release();
    }
  });

  test("cria QR Code ativo e o DELETE da mesa o desativa", async () => {
    const tableId = await insertTable({ number: 31 });

    const createRes = await request(app)
      .post(`${BASE}/tables/${tableId}/qr-codes`)
      .set("Authorization", managerToken())
      .send({ position: 1 });

    expect(createRes.status).toBe(201);
    const qrCodeId = createRes.body.data.qr_code_id;

    const [active] = await connect.execute(
      "SELECT is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(active).toHaveLength(1);
    expect(active[0].is_active).toBe(1);

    const deleteRes = await request(app)
      .delete(`${BASE}/tables/${tableId}`)
      .set("Authorization", managerToken());

    expect(deleteRes.status).toBe(200);

    const [inactive] = await connect.execute(
      "SELECT is_active FROM qr_codes WHERE qr_code_id = ?",
      [qrCodeId],
    );
    expect(inactive).toHaveLength(1);
    expect(inactive[0].is_active).toBe(0);
  });
});