-- Executar uma única vez no banco configurado pela API (MySQL 8).
-- Não remove registros nem modifica valores/status dos pagamentos existentes.
ALTER TABLE payments
    MODIFY COLUMN status ENUM ('PAID', 'CANCELLED', 'PENDING') NOT NULL DEFAULT 'PAID',
    MODIFY COLUMN paid_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN mp_order_id VARCHAR(64) NULL,
    ADD COLUMN mp_payment_id VARCHAR(64) NULL,
    ADD COLUMN idempotency_key CHAR(36) NULL,
    ADD COLUMN mp_request JSON NULL,
    ADD COLUMN pix_data JSON NULL,
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN active_pix_command_id BIGINT GENERATED ALWAYS AS (
        CASE WHEN method = 'PIX' AND status = 'PENDING' THEN command_id ELSE NULL END
    ) VIRTUAL,
    ADD CONSTRAINT uk_payments_mp_order UNIQUE (mp_order_id),
    ADD CONSTRAINT uk_payments_mp_payment UNIQUE (mp_payment_id),
    ADD CONSTRAINT uk_payments_idempotency UNIQUE (idempotency_key),
    ADD CONSTRAINT uk_payments_active_pix UNIQUE (active_pix_command_id);
