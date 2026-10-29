const request = require("supertest");
const app = require("../../src/index");
const connect = require("../../src/database/connect");
const { reset, closeDb } = require("../helpers/db");
const { waiterToken } = require("../helpers/auth");
const { WAITER } = require("../setup/constants");

const BASE = "/api/foodstuff";
const URL_PHOTO = `${BASE}/users/me/photo`;
const PNG_PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function photoFromDb() {
  const [rows] = await connect.execute(
    "SELECT photo FROM users WHERE user_id = ?",
    [WAITER.user_id],
  );
  return rows[0].photo;
}

beforeEach(reset);
afterAll(closeDb);

describe("PATCH /users/me/photo", () => {
  test("salva uma imagem base64 e registra audit UPDATE", async () => {
    const res = await request(app)
      .patch(URL_PHOTO)
      .set("Authorization", `Bearer ${waiterToken()}`)
      .send({ photo: PNG_PHOTO });

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.message).toBe("Foto atualizada com sucesso.");
    expect(res.body.data.photo).toBe(PNG_PHOTO);
    expect(await photoFromDb()).toBe(PNG_PHOTO);

    const [logs] = await connect.execute(
      "SELECT user_id, action, entity FROM audit_logs WHERE entity = 'users'",
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      user_id: WAITER.user_id,
      action: "UPDATE",
      entity: "users",
    });
  });

  test("aceita uma URL http(s) como foto", async () => {
    const photo = "https://example.com/foto.png";

    const res = await request(app)
      .patch(URL_PHOTO)
      .set("Authorization", `Bearer ${waiterToken()}`)
      .send({ photo });

    expect(res.status).toBe(200);
    expect(res.body.data.photo).toBe(photo);
    expect(await photoFromDb()).toBe(photo);
  });

  test("retorna a foto no GET /users/me", async () => {
    await connect.execute("UPDATE users SET photo = ? WHERE user_id = ?", [
      PNG_PHOTO,
      WAITER.user_id,
    ]);

    const res = await request(app)
      .get(`${BASE}/users/me`)
      .set("Authorization", `Bearer ${waiterToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.photo).toBe(PNG_PHOTO);
  });

  test("remove a foto ao enviar null", async () => {
    await connect.execute("UPDATE users SET photo = ? WHERE user_id = ?", [
      PNG_PHOTO,
      WAITER.user_id,
    ]);

    const res = await request(app)
      .patch(URL_PHOTO)
      .set("Authorization", `Bearer ${waiterToken()}`)
      .send({ photo: null });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Foto removida com sucesso.");
    expect(res.body.data.photo).toBeNull();
    expect(await photoFromDb()).toBeNull();
  });

  test("remove a foto ao enviar string vazia", async () => {
    await connect.execute("UPDATE users SET photo = ? WHERE user_id = ?", [
      PNG_PHOTO,
      WAITER.user_id,
    ]);

    const res = await request(app)
      .patch(URL_PHOTO)
      .set("Authorization", `Bearer ${waiterToken()}`)
      .send({ photo: "   " });

    expect(res.status).toBe(200);
    expect(await photoFromDb()).toBeNull();
  });

  test("rejeita foto sem o campo photo", async () => {
    const res = await request(app)
      .patch(URL_PHOTO)
      .set("Authorization", `Bearer ${waiterToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("A foto deve ser informada.");
    expect(await photoFromDb()).toBeNull();
  });

  test("rejeita data URI que não é uma imagem válida", async () => {
    const res = await request(app)
      .patch(URL_PHOTO)
      .set("Authorization", `Bearer ${waiterToken()}`)
      .send({ photo: "data:image/png;base64,aGVsbG8=" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("A foto informada é inválida");
    expect(await photoFromDb()).toBeNull();
  });

  test("rejeita formato não suportado", async () => {
    const res = await request(app)
      .patch(URL_PHOTO)
      .set("Authorization", `Bearer ${waiterToken()}`)
      .send({ photo: "data:text/plain;base64,aGVsbG8=" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("A foto informada é inválida");
  });

  test("exige autenticação", async () => {
    const res = await request(app)
      .patch(URL_PHOTO)
      .send({ photo: PNG_PHOTO });

    expect(res.status).toBe(401);
  });
});
