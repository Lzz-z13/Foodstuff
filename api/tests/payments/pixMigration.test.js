const fs = require('fs');
const path = require('path');
const { connect, closeDb } = require('../helpers/db');

afterAll(closeDb);

test('migração Pix preserva pagamentos antigos e produz as mesmas colunas do schema novo', async () => {
  const [database] = await connect.execute('SELECT DATABASE() AS name');
  expect(database[0].name).toBe('foodstuff_test');
  await connect.execute(`CREATE TABLE payments_migration_check (
    payment_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    value DECIMAL(10, 2) NOT NULL,
    method ENUM ('CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'VOUCHER', 'OTHER') NOT NULL,
    status ENUM ('PAID', 'CANCELLED') NOT NULL DEFAULT 'PAID',
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    command_id BIGINT NOT NULL
  )`);
  try {
    await connect.execute(`INSERT INTO payments_migration_check (value, method, status, paid_at, command_id)
      VALUES (50.15, 'PIX', 'PAID', '2026-01-02 12:30:00', 1),
             (25.00, 'CASH', 'CANCELLED', '2026-01-01 12:30:00', 1)`);
    const [before] = await connect.execute('SELECT * FROM payments_migration_check ORDER BY payment_id');
    const migration = fs.readFileSync(path.join(__dirname, '../../mysql-database/migrations/003_add_pix_payments.sql'), 'utf8');
    await connect.query(migration.replace('ALTER TABLE payments', 'ALTER TABLE payments_migration_check'));
    const [after] = await connect.execute('SELECT payment_id, value, method, status, paid_at, command_id FROM payments_migration_check ORDER BY payment_id');
    expect(after).toEqual(before);
    const [freshColumns] = await connect.query('SHOW COLUMNS FROM payments');
    const [migratedColumns] = await connect.query('SHOW COLUMNS FROM payments_migration_check');
    // As tabelas têm FKs diferentes neste teste; tipos, defaults e geração são iguais.
    const definitions = columns => columns.map(({ Key, ...column }) => column);
    expect(definitions(migratedColumns)).toEqual(definitions(freshColumns));
    await connect.execute(`INSERT INTO payments_migration_check
      (value, method, status, paid_at, command_id, idempotency_key) VALUES
      (10, 'PIX', 'PENDING', NULL, 2, '11111111-1111-1111-1111-111111111111')`);
    await expect(connect.execute(`INSERT INTO payments_migration_check
      (value, method, status, paid_at, command_id, idempotency_key) VALUES
      (10, 'PIX', 'PENDING', NULL, 2, '22222222-2222-2222-2222-222222222222')`))
      .rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  } finally {
    await connect.execute('DROP TABLE payments_migration_check');
  }
});
