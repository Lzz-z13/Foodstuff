-- Executar uma vez em bancos existentes. Pagamentos históricos mantêm taxa zero.
ALTER TABLE commands
  ADD COLUMN service_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00 AFTER status;

UPDATE commands SET service_fee_percent = 10.00 WHERE status IN ('OPEN', 'CLOSED');

ALTER TABLE commands ALTER COLUMN service_fee_percent SET DEFAULT 10.00;
