require("dotenv-safe").config();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("../src/database/connect");
const { isValidPassword } = require("../src/utils/validators/passwordValidator");

async function main() {
  const { BOOTSTRAP_NAME: name, BOOTSTRAP_EMAIL: email, BOOTSTRAP_PHONE: phone, BOOTSTRAP_PASSWORD: password } = process.env;
  if (!name || name.length > 100 || !email || email.length > 150 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !/^\d{11}$/.test(phone || "") || !password || password.length < 12 || !isValidPassword(password)) {
    throw new Error("Configure nome, email, telefone de 11 dígitos e senha forte de pelo menos 12 caracteres nas variáveis BOOTSTRAP_*. ");
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT user_id FROM users LIMIT 1 FOR UPDATE");
    if (rows.length) throw new Error("Já existem usuários; a inicialização foi recusada.");
    await connection.execute("INSERT INTO users (user_id, name, email, phone, password, role, first_login) VALUES (?, ?, ?, ?, ?, 'MANAGER', 1)", [crypto.randomUUID(), name, email, phone, await bcrypt.hash(password, 12)]);
    await connection.commit();
    console.log("Gerente inicial criado. Troque a senha no primeiro acesso.");
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
