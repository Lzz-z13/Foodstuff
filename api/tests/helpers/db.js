const connect = require("../../src/database/connect");
const { TEST_TABLES, ADMIN, WAITER } = require("../setup/constants");

async function reset() {
  const connection = await connect.getConnection();

  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of TEST_TABLES) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    connection.release();
  }

  await seedUsers();
}

async function seedUsers() {
  const users = [ADMIN, WAITER];

  for (const user of users) {
    await connect.execute(
      `INSERT INTO users (user_id, name, email, phone, password, role, first_login)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.user_id,
        user.name,
        user.email,
        user.phone,
        user.password,
        user.role,
        user.first_login,
      ],
    );
  }
}

async function insertTable({ number, is_active = 1 }) {
  const [result] = await connect.execute(
    "INSERT INTO tables (number, is_active) VALUES (?, ?)",
    [number, is_active],
  );

  return result.insertId;
}

async function insertQrCode({ table_id, position, is_active = 1 }) {
  const token = `${require("crypto").randomUUID()}`;

  const [result] = await connect.execute(
    "INSERT INTO qr_codes (token, position, is_active, table_id) VALUES (?, ?, ?, ?)",
    [token, position, is_active, table_id],
  );

  return result.insertId;
}

async function insertCommand({
  table_id,
  status = "OPEN",
  qr_code_id = null,
  customer_name = "Cliente Teste",
}) {
  const session_token = require("crypto").randomUUID();

  const [result] = await connect.execute(
    `INSERT INTO commands
      (customer_name, session_token, status, table_id, qr_code_id)
     VALUES (?, ?, ?, ?, ?)`,
    [customer_name, session_token, status, table_id, qr_code_id],
  );

  return result.insertId;
}

async function insertOrder({ command_id, status = "PENDING", origin = "WAITER" }) {
  const [result] = await connect.execute(
    "INSERT INTO orders (origin, status, command_id) VALUES (?, ?, ?)",
    [origin, status, command_id],
  );

  return result.insertId;
}

async function insertPayment({ command_id, value = 25, method = "PIX" }) {
  const [result] = await connect.execute(
    "INSERT INTO payments (value, method, command_id) VALUES (?, ?, ?)",
    [value, method, command_id],
  );

  return result.insertId;
}

async function closeDb() {
  await connect.end();
}

module.exports = {
  connect,
  reset,
  seedUsers,
  insertTable,
  insertQrCode,
  insertCommand,
  insertOrder,
  insertPayment,
  closeDb,
};