const request = require("supertest");
const app = require("../../src/index");
const { reset, insertTable, insertCommand, insertOrder, closeDb } = require("../helpers/db");
const { managerToken } = require("../helpers/auth");

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await closeDb();
});

describe("GET /orders e /pedidos", () => {
  test("retorna pedidos em formato consumível pelo mobile", async () => {
    const tableId = await insertTable({ number: 20 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Cliente Pedido",
    });
    const orderId = await insertOrder({
      command_id: commandId,
      status: "PENDING",
      origin: "WAITER",
    });

    const res = await request(app)
      .get("/api/foodstuff/orders")
      .set("Authorization", `Bearer ${managerToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: orderId,
          order_id: orderId,
          status: "PENDING",
          table_number: 20,
          mesa: expect.objectContaining({ codigo: 20 }),
        }),
      ]),
    );
  });

  test("aceita a rota /pedidos como alias do mobile", async () => {
    const tableId = await insertTable({ number: 21 });
    const commandId = await insertCommand({
      table_id: tableId,
      customer_name: "Cliente Alias",
    });
    await insertOrder({
      command_id: commandId,
      status: "READY",
      origin: "WAITER",
    });

    const res = await request(app)
      .get("/api/foodstuff/pedidos")
      .set("Authorization", `Bearer ${managerToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({
      status: "READY",
      mesa: expect.objectContaining({ codigo: 21 }),
    });
  });
});
