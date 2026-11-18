jest.mock("../../src/database/connect", () => ({}));
jest.mock("../../src/services/commandService", () => ({
  closeCommand: jest
    .fn()
    .mockResolvedValue({ command_id: 7, status: "CLOSED" }),
}));
const express = require("express");
const request = require("supertest");
const app = express();
app.use(express.json());
// Simula somente a identidade já validada pelo middleware JWT no roteador principal.
app.use((req, res, next) => {
  if (req.headers["x-test-role"])
    req.user = {
      id: "staff",
      role: req.headers["x-test-role"],
      first_login: 0,
    };
  next();
});
app.use("/public", require("../../src/routes/publicRoutes"));
app.use(require("../../src/routes/commandRoutes"));
app.use((error, req, res, next) =>
  res.status(error.status || 500).json({ message: error.message }),
);
const service = require("../../src/services/commandService");
test.each(["MANAGER", "WAITER", "CASHIER"])(
  "%s fecha comanda por id sem pedido",
  async (role) => {
    const result = await request(app)
      .post("/commands/7/close")
      .set("x-test-role", role);
    expect(result.status).toBe(200);
    expect(service.closeCommand).toHaveBeenCalledWith({
      command_id: "7",
      jwt_user_id: "staff",
    });
  },
);
test("sem identidade é 401; cozinha não pode fechar comanda", async () => {
  expect((await request(app).post("/commands/7/close")).status).toBe(401);
  expect(
    (await request(app).post("/commands/7/close").set("x-test-role", "KITCHEN"))
      .status,
  ).toBe(403);
  expect(service.closeCommand).not.toHaveBeenCalled();
});
test("cliente não precisa de login, mas exige token privado válido", async () => {
  const token = "11111111-1111-4111-8111-111111111111";
  const result = await request(app)
    .post(`/public/commands/${token}/close`)
    .send({ command_id: 999, jwt_user_id: "forged" });
  expect(result.status).toBe(200);
  expect(result.headers["cache-control"]).toBe("no-store");
  expect(service.closeCommand).toHaveBeenCalledWith({ session_token: token });
});
test("id ou token inválido é rejeitado antes de acessar o serviço", async () => {
  expect((await request(app).post("/public/commands/123/close")).status).toBe(
    400,
  );
  expect(
    (
      await request(app)
        .post("/commands/nope/close")
        .set("x-test-role", "WAITER")
    ).status,
  ).toBe(400);
  expect(service.closeCommand).not.toHaveBeenCalled();
});
