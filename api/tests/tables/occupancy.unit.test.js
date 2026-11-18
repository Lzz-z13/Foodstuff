jest.mock("../../src/database/connect", () => ({ execute: jest.fn() }));
const db = require("../../src/database/connect");
const TableService = require("../../src/services/tableService");
test("mesa livre, mesa aberta e aguardando pagamento são mapeadas sem expor tokens", async () => {
  db.execute.mockResolvedValueOnce([
    [
      { table_id: 1, number: 1, command_id: null },
      {
        table_id: 2,
        number: 2,
        command_id: 8,
        customer_name: "Ana",
        command_status: "OPEN",
        opened_at: "2026-11-17T10:00:00Z",
      },
      {
        table_id: 2,
        number: 2,
        command_id: 9,
        customer_name: "Bia",
        command_status: "CLOSED",
        opened_at: "2026-11-17T10:10:00Z",
      },
      {
        table_id: 3,
        number: 3,
        command_id: 10,
        customer_name: "Caio",
        command_status: "CLOSED",
        opened_at: "2026-11-17T10:20:00Z",
      },
    ],
  ]);
  const tables = await TableService.readAllTables();
  expect(tables.map((t) => t.status)).toEqual(["livre", "ocupada", "ocupada"]);
  expect(tables[1].active_commands.map((c) => c.customer_name)).toEqual([
    "Ana",
    "Bia",
  ]);
  expect(tables[1]).toMatchObject({
    open_commands_count: 1,
    awaiting_payment_count: 1,
    occupied_since: "2026-11-17T10:00:00Z",
  });
  expect(tables[2].awaiting_payment_count).toBe(1);
  expect(db.execute.mock.calls[0][0]).toContain(
    "c.status IN ('OPEN', 'CLOSED')",
  );
  expect(JSON.stringify(tables)).not.toContain("session_token");
});
test("não converte falha de consulta em mesas livres", async () => {
  db.execute.mockRejectedValueOnce(new Error("offline"));
  await expect(TableService.readAllTables()).rejects.toMatchObject({
    status: 500,
  });
});
