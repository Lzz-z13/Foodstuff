const fs = require('fs');
const path = require('path');
const { connect, closeDb } = require('../helpers/db');

afterAll(closeDb);

const schema = fs.readFileSync(path.join(__dirname, '../../mysql-database/database.sql'), 'utf8');
const update = schema.split('-- BEGIN FOODSTUFF PIX SCHEMA UPDATE')[1]
  .split('-- END FOODSTUFF PIX SCHEMA UPDATE')[0];

async function updatePix(db, table) {
  // O bloco usa PREPARE e variáveis de sessão: todas as instruções ficam
  // na mesma conexão, sem habilitar multipleStatements na aplicação.
  for (const statement of update.replace(/\bpayments\b/g, table).split(';')) {
    if (statement.trim()) await db.query(statement);
  }
}

test('database.sql atualiza pagamentos antigos, permite repetição e impede Pix pendente duplicado', async () => {
  const db = await connect.getConnection();
  try {
    const [database] = await db.query('SELECT DATABASE() AS name');
    expect(database[0].name).toBe('foodstuff_test');
    await db.query(`CREATE TABLE payments_schema_check (
      payment_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      value DECIMAL(10, 2) NOT NULL,
      method ENUM ('CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'VOUCHER', 'OTHER') NOT NULL,
      status ENUM ('PAID', 'CANCELLED') NOT NULL DEFAULT 'PAID',
      paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      command_id BIGINT NOT NULL
    )`);
    await db.execute(`INSERT INTO payments_schema_check (value, method, status, paid_at, command_id)
      VALUES (50.15, 'PIX', 'PAID', '2026-01-02 12:30:00', 1),
             (25.00, 'CASH', 'CANCELLED', '2026-01-01 12:30:00', 1)`);
    const [before] = await db.query('SELECT * FROM payments_schema_check ORDER BY payment_id');

    await updatePix(db, 'payments_schema_check');
    await updatePix(db, 'payments_schema_check');

    const [after] = await db.query('SELECT payment_id, value, method, status, paid_at, command_id FROM payments_schema_check ORDER BY payment_id');
    expect(after).toEqual(before);
    const [freshColumns] = await db.query('SHOW COLUMNS FROM payments');
    const [updatedColumns] = await db.query('SHOW COLUMNS FROM payments_schema_check');
    const definitions = columns => columns.map(({ Key, ...column }) => column);
    expect(definitions(updatedColumns)).toEqual(definitions(freshColumns));
    const [indexes] = await db.query('SHOW INDEX FROM payments_schema_check');
    for (const name of ['uk_payments_mp_order', 'uk_payments_mp_payment',
      'uk_payments_idempotency', 'uk_payments_active_pix']) {
      expect(indexes).toEqual(expect.arrayContaining([expect.objectContaining({ Key_name: name, Non_unique: 0 })]));
    }
    await db.execute(`INSERT INTO payments_schema_check
      (value, method, status, paid_at, command_id, idempotency_key) VALUES
      (10, 'PIX', 'PENDING', NULL, 2, '11111111-1111-1111-1111-111111111111')`);
    await expect(db.execute(`INSERT INTO payments_schema_check
      (value, method, status, paid_at, command_id, idempotency_key) VALUES
      (10, 'PIX', 'PENDING', NULL, 2, '22222222-2222-2222-2222-222222222222')`))
      .rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  } finally {
    await db.query('DROP TABLE IF EXISTS payments_schema_check');
    db.release();
  }
});

test('atualização do database.sql completa um schema Pix parcialmente atualizado', async () => {
  const db = await connect.getConnection();
  try {
    await db.query('CREATE TABLE payments_partial_check LIKE payments');
    await db.query(`ALTER TABLE payments_partial_check
      DROP INDEX uk_payments_active_pix, DROP COLUMN active_pix_command_id,
      DROP COLUMN pix_data`);
    await updatePix(db, 'payments_partial_check');
    const [fresh] = await db.query('SHOW COLUMNS FROM payments');
    const [partial] = await db.query('SHOW COLUMNS FROM payments_partial_check');
    expect(partial).toEqual(fresh);
    await updatePix(db, 'payments_partial_check');
  } finally {
    await db.query('DROP TABLE IF EXISTS payments_partial_check');
    db.release();
  }
});
