-- Schema foodstuff
CREATE DATABASE IF NOT EXISTS foodstuff;
USE foodstuff;

-- 1. USERS
-- Usuários do sistema / funcionários (cliente não incluso)
-- =========================================================
CREATE TABLE
    users (
        user_id CHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        phone CHAR(11) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM ('MANAGER', 'WAITER', 'KITCHEN', 'CASHIER') NOT NULL,
        first_login TINYINT NOT NULL DEFAULT TRUE,
        is_active TINYINT NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_users PRIMARY KEY (user_id),
        CONSTRAINT uk_users_email UNIQUE (email),
        CONSTRAINT uk_users_phone UNIQUE (phone)
    );

-- 2. TABLES
-- Mesas físicas do restaurante
-- =========================================================
CREATE TABLE
    tables (
        table_id INT NOT NULL AUTO_INCREMENT,
        number INT NOT NULL,
        is_active TINYINT NOT NULL DEFAULT TRUE,
        CONSTRAINT pk_tables PRIMARY KEY (table_id),
        CONSTRAINT uk_tables_number UNIQUE (number),
        CONSTRAINT chk_tables_number CHECK (number > 0)
    );

-- 3. QR_CODES
-- Cada QR Code representa uma posição física da mesa.
--
-- Uma mesa pode possuir até 4 QR Codes:
-- position = 1, 2, 3 ou 4
-- =========================================================
CREATE TABLE
    qr_codes (
        qr_code_id INT NOT NULL AUTO_INCREMENT,
        token VARCHAR(100) NOT NULL,
        position TINYINT NOT NULL,
        is_active TINYINT NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        table_id INT NOT NULL,
        CONSTRAINT pk_qr_codes PRIMARY KEY (qr_code_id),
        CONSTRAINT uk_qr_codes_token UNIQUE (token),
        CONSTRAINT uk_qr_codes_table_position UNIQUE (table_id, position),
        CONSTRAINT chk_qr_codes_position CHECK (position BETWEEN 1 AND 4),
        CONSTRAINT fk_qr_codes_table FOREIGN KEY (table_id) REFERENCES tables (table_id) ON UPDATE CASCADE ON DELETE RESTRICT
    );

-- 4. COMMANDS
-- Comandas dos clientes.
--
-- Exemplo de exibição:
-- José - #1234
--
-- table_id:
-- Sempre identifica em qual mesa a comanda está.
--
-- qr_code_id:
-- Pode ser NULL quando a comanda foi criada diretamente
-- pelo garçom através do aplicativo.
--
-- session_token:
-- Identifica o acesso do cliente à própria comanda,
-- sem necessidade de login.
-- =========================================================
CREATE TABLE
    commands (
        command_id BIGINT NOT NULL AUTO_INCREMENT,
        customer_name VARCHAR(100) NOT NULL,
        session_token VARCHAR(255) NOT NULL,
        status ENUM ('OPEN', 'CLOSED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
        opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME NULL,
        table_id INT NOT NULL,
        qr_code_id INT NULL,
        opened_by CHAR(36) NULL,
        closed_by CHAR(36) NULL,
        CONSTRAINT pk_commands PRIMARY KEY (command_id),
        CONSTRAINT uk_commands_session_token UNIQUE (session_token),
        CONSTRAINT fk_commands_table FOREIGN KEY (table_id) REFERENCES tables (table_id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_commands_qr_code FOREIGN KEY (qr_code_id) REFERENCES qr_codes (qr_code_id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_commands_opened_by FOREIGN KEY (opened_by) REFERENCES users (user_id) ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_commands_closed_by FOREIGN KEY (closed_by) REFERENCES users (user_id) ON UPDATE CASCADE ON DELETE SET NULL
    );

-- 5. TABLE_WAITERS
-- Relação N:N entre USERS e TABLES. (redundante, relação removida)
--
-- Um garçom pode atender várias mesas.
-- Uma mesa pode possuir vários garçons.
-- =========================================================
-- CREATE TABLE
--     table_waiters (
--         table_waiter_id BIGINT NOT NULL AUTO_INCREMENT,
--         user_id CHAR(36) NOT NULL,
--         table_id INT NOT NULL,
--         assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--         is_active TINYINT NOT NULL DEFAULT TRUE,
--         CONSTRAINT pk_table_waiters PRIMARY KEY (table_waiter_id),
--         CONSTRAINT uk_table_waiters_user_table UNIQUE (user_id, table_id),
--         CONSTRAINT fk_table_waiters_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON UPDATE CASCADE ON DELETE CASCADE,
--         CONSTRAINT fk_table_waiters_table FOREIGN KEY (table_id) REFERENCES tables (table_id) ON UPDATE CASCADE ON DELETE CASCADE
--     );

-- 6. CATEGORIES
-- Categorias do cardápio
-- =========================================================
CREATE TABLE
    categories (
        category_id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255) NULL,
        is_active TINYINT NOT NULL DEFAULT TRUE,
        CONSTRAINT pk_categories PRIMARY KEY (category_id),
        CONSTRAINT uk_categories_name UNIQUE (name)
    );

-- 7. PRODUCTS
-- Produtos disponíveis no cardápio
-- =========================================================
CREATE TABLE
    products (
        product_id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(150) NOT NULL,
        description TEXT NULL,
        price DECIMAL(10, 2) NOT NULL,
        cost DECIMAL(10, 2) NULL,
        image VARCHAR(500) NULL,
        requires_preparation TINYINT NOT NULL DEFAULT TRUE,
        is_available TINYINT NOT NULL DEFAULT TRUE,
        is_active TINYINT NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        category_id INT NOT NULL,
        CONSTRAINT pk_products PRIMARY KEY (product_id),
        CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT chk_products_price CHECK (price >= 0),
        CONSTRAINT chk_products_cost CHECK (
            cost IS NULL
            OR cost >= 0
        )
    );

-- 8. ORDERS
-- Pedido realizado dentro de uma comanda.
--
-- origin:
-- CUSTOMER = pedido feito pelo cliente
-- WAITER   = pedido feito pelo garçom
-- =========================================================
CREATE TABLE
    orders (
        order_id BIGINT NOT NULL AUTO_INCREMENT,
        created_by CHAR(36) NULL,
        origin ENUM ('CUSTOMER', 'WAITER') NOT NULL,
        status ENUM (
            'PENDING',
            'PREPARING',
            'READY',
            'DELIVERED',
            'CANCELLED'
        ) NOT NULL DEFAULT 'PENDING',
        observations TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME NULL,
        finished_at DATETIME NULL,
        cancelled_at DATETIME NULL,
        command_id BIGINT NOT NULL,
        CONSTRAINT pk_orders PRIMARY KEY (order_id),
        CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_orders_command FOREIGN KEY (command_id) REFERENCES commands (command_id) ON UPDATE CASCADE ON DELETE RESTRICT
    );

-- 9. ORDER_ITEMS
-- Entidade associativa entre ORDERS e PRODUCTS.
--
-- Um ORDER possui vários ORDER_ITEMS.
-- Um PRODUCT pode aparecer em vários ORDER_ITEMS.
--
-- unit_price:
-- Guarda o preço do produto no momento da compra.
-- =========================================================
CREATE TABLE
    order_items (
        order_item_id BIGINT NOT NULL AUTO_INCREMENT,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        observation VARCHAR(255) NULL,
        order_id BIGINT NOT NULL,
        product_id INT NOT NULL,
        CONSTRAINT pk_order_items PRIMARY KEY (order_item_id),
        CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
        CONSTRAINT chk_order_items_unit_price CHECK (unit_price >= 0)
    );

-- 10. PAYMENTS
-- Uma comanda pode possuir vários pagamentos.
--
-- Isso permite:
-- R$50 PIX + R$50 CRÉDITO
-- R$50 DÉBITO + R$50 VALE
-- etc.
-- =========================================================
CREATE TABLE
    payments (
        payment_id BIGINT NOT NULL AUTO_INCREMENT,
        value DECIMAL(10, 2) NOT NULL,
        method ENUM (
            'CASH',
            'PIX',
            'CREDIT_CARD',
            'DEBIT_CARD',
            'VOUCHER',
            'OTHER'
        ) NOT NULL,
        status ENUM ('PAID', 'CANCELLED') NOT NULL DEFAULT 'PAID',
        paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        command_id BIGINT NOT NULL,
        CONSTRAINT pk_payments PRIMARY KEY (payment_id),
        CONSTRAINT fk_payments_command FOREIGN KEY (command_id) REFERENCES commands (command_id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT chk_payments_value CHECK (value > 0)
    );

-- 11. AUDIT_LOGS
-- Registro das ações realizadas no sistema.
--
-- entity + entity_id são referências lógicas.
-- Não criamos FK para cada tabela do sistema.
--
-- Exemplos:
--
-- action    = 'CLOSE_COMMAND'
-- entity    = 'commands'
-- entity_id = '1234'
--
-- action    = 'REGISTER_PAYMENT'
-- entity    = 'payments'
-- entity_id = '55'
-- =========================================================
CREATE TABLE
    audit_logs (
        log_id BIGINT NOT NULL AUTO_INCREMENT,
        user_id CHAR(36) NULL,
        action VARCHAR(100) NOT NULL,
        entity VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100) NULL,
        description TEXT NULL,
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_audit_logs PRIMARY KEY (log_id),
        CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON UPDATE CASCADE ON DELETE SET NULL
    );

-- First insert (just for development):
-- password: admin
INSERT INTO users (user_id, name, email, phone, password, role, first_login) values
("1c869085-e414-4b18-8f8f-1ca8181c1033", "admin_first_user", "admin@admin.com", "11999551188", "$2b$10$YS0iwI4iNnnmwyVy8WatdOEgOPWWohkEFixRvKfEKXYlE7OPLmgP.", "MANAGER", 0);