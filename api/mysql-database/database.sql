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

-- 7. CATEGORIES
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

-- 8. PRODUCTS
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

-- 9. ORDERS
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

-- 10. ORDER_ITEMS
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

-- 11. PAYMENTS
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

-- 12. AUDIT_LOGS
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
INSERT INTO
    users (
        user_id,
        name,
        email,
        phone,
        password,
        role,
        first_login
    )
values
    (
        "1c869085-e414-4b18-8f8f-1ca8181c1033",
        "admin_first_user",
        "admin@admin.com",
        "11999551188",
        "$2b$10$YS0iwI4iNnnmwyVy8WatdOEgOPWWohkEFixRvKfEKXYlE7OPLmgP.",
        "MANAGER",
        0
    );

-- Dados genéricos de desenvolvimento, inseridos junto com o schema.
-- Senha dos funcionários Demo: admin (mesmo hash do administrador inicial).
-- Este arquivo cria as tabelas: importe em um banco novo, não sobre tabelas existentes.
START TRANSACTION;

SET @demo_manager = '1c869085-e414-4b18-8f8f-1ca8181c1033';
SET @demo_waiter = UUID();
SET @demo_kitchen = UUID();
SET @demo_cashier = UUID();
SET @demo_password = (SELECT password FROM users WHERE user_id = @demo_manager);
SET @demo_now = NOW();

INSERT INTO users (user_id, name, email, phone, password, role, first_login, is_active) VALUES
(@demo_waiter, 'Garçom Demo', 'garcom@foodstuff.test', '11900009002', @demo_password, 'WAITER', 0, 1),
(@demo_kitchen, 'Cozinha Demo', 'cozinha@foodstuff.test', '11900009003', @demo_password, 'KITCHEN', 0, 1),
(@demo_cashier, 'Caixa Demo', 'caixa@foodstuff.test', '11900009004', @demo_password, 'CASHIER', 0, 1);

-- Categorias e produtos são criados antes dos itens dos pedidos.
INSERT INTO categories (name, description, is_active)
VALUES ('Pizzas Demo', 'Pizzas de exemplo para desenvolvimento.', 1);
SET @demo_pizzas = LAST_INSERT_ID();
INSERT INTO categories (name, description, is_active)
VALUES ('Bebidas Demo', 'Bebidas de exemplo para desenvolvimento.', 1);
SET @demo_drinks = LAST_INSERT_ID();
INSERT INTO categories (name, description, is_active)
VALUES ('Sobremesas Demo', 'Sobremesas de exemplo para desenvolvimento.', 1);
SET @demo_desserts = LAST_INSERT_ID();

INSERT INTO products (name, description, price, cost, requires_preparation, category_id)
VALUES ('Pizza Margherita Demo', 'Mussarela, tomate e manjericão.', 45.00, 18.00, 1, @demo_pizzas);
SET @demo_margherita = LAST_INSERT_ID();
INSERT INTO products (name, description, price, cost, requires_preparation, category_id)
VALUES ('Pizza Calabresa Demo', 'Mussarela, calabresa e cebola.', 49.00, 21.00, 1, @demo_pizzas);
SET @demo_calabresa = LAST_INSERT_ID();
INSERT INTO products (name, description, price, cost, requires_preparation, category_id)
VALUES ('Pizza Quatro Queijos Demo', 'Mussarela, provolone, parmesão e requeijão.', 55.00, 24.00, 1, @demo_pizzas);
SET @demo_cheese = LAST_INSERT_ID();
INSERT INTO products (name, description, price, cost, requires_preparation, category_id)
VALUES ('Refrigerante Lata Demo', 'Lata de 350 ml.', 7.00, 3.00, 0, @demo_drinks);
SET @demo_soda = LAST_INSERT_ID();
INSERT INTO products (name, description, price, cost, requires_preparation, category_id)
VALUES ('Água Mineral Demo', 'Garrafa de 500 ml.', 4.00, 1.50, 0, @demo_drinks);
SET @demo_water = LAST_INSERT_ID();
INSERT INTO products (name, description, price, cost, requires_preparation, category_id)
VALUES ('Brownie Demo', 'Brownie de chocolate.', 12.00, 5.00, 1, @demo_desserts);
SET @demo_brownie = LAST_INSERT_ID();

INSERT INTO tables (number, is_active) VALUES
(901, 1), (902, 1), (903, 1), (904, 1), (905, 1), (906, 1);
SET @demo_table_1 = (SELECT table_id FROM tables WHERE number = 901);
SET @demo_table_2 = (SELECT table_id FROM tables WHERE number = 902);
SET @demo_table_3 = (SELECT table_id FROM tables WHERE number = 903);
SET @demo_table_4 = (SELECT table_id FROM tables WHERE number = 904);
SET @demo_table_5 = (SELECT table_id FROM tables WHERE number = 905);
SET @demo_table_6 = (SELECT table_id FROM tables WHERE number = 906);

-- Dois pontos de acesso por mesa. Tokens diferentes para cada posição.
INSERT INTO qr_codes (token, position, table_id) VALUES
(UUID(), 1, @demo_table_1), (UUID(), 2, @demo_table_1),
(UUID(), 1, @demo_table_2), (UUID(), 2, @demo_table_2),
(UUID(), 1, @demo_table_3), (UUID(), 2, @demo_table_3),
(UUID(), 1, @demo_table_4), (UUID(), 2, @demo_table_4),
(UUID(), 1, @demo_table_5), (UUID(), 2, @demo_table_5),
(UUID(), 1, @demo_table_6), (UUID(), 2, @demo_table_6);
SET @demo_qr_1 = (SELECT qr_code_id FROM qr_codes WHERE table_id = @demo_table_1 AND position = 1);
SET @demo_qr_3 = (SELECT qr_code_id FROM qr_codes WHERE table_id = @demo_table_3 AND position = 1);
SET @demo_qr_6 = (SELECT qr_code_id FROM qr_codes WHERE table_id = @demo_table_6 AND position = 1);

-- Clientes são registrados nas comandas, não na tabela users.
INSERT INTO commands (customer_name, session_token, status, opened_at, table_id, qr_code_id)
VALUES ('Ana Demo', UUID(), 'OPEN', @demo_now - INTERVAL 8 MINUTE, @demo_table_1, @demo_qr_1);
SET @demo_ana = LAST_INSERT_ID();
INSERT INTO commands (customer_name, session_token, status, opened_at, table_id, opened_by)
VALUES ('Bruno Demo', UUID(), 'OPEN', @demo_now - INTERVAL 25 MINUTE, @demo_table_2, @demo_waiter);
SET @demo_bruno = LAST_INSERT_ID();
INSERT INTO commands (customer_name, session_token, status, opened_at, table_id, qr_code_id)
VALUES ('Carla Demo', UUID(), 'OPEN', @demo_now - INTERVAL 40 MINUTE, @demo_table_3, @demo_qr_3);
SET @demo_carla = LAST_INSERT_ID();
INSERT INTO commands (customer_name, session_token, status, opened_at, closed_at, table_id, opened_by, closed_by)
VALUES ('Diego Demo', UUID(), 'CLOSED', @demo_now - INTERVAL 60 MINUTE, @demo_now - INTERVAL 30 MINUTE, @demo_table_4, @demo_waiter, @demo_cashier);
SET @demo_diego = LAST_INSERT_ID();
INSERT INTO commands (customer_name, session_token, status, opened_at, closed_at, table_id, opened_by, closed_by)
VALUES ('Eva Demo', UUID(), 'PAID', @demo_now - INTERVAL 90 MINUTE, @demo_now - INTERVAL 60 MINUTE, @demo_table_5, @demo_waiter, @demo_cashier);
SET @demo_eva = LAST_INSERT_ID();
INSERT INTO commands (customer_name, session_token, status, opened_at, closed_at, table_id, qr_code_id, closed_by)
VALUES ('Fabio Demo', UUID(), 'PAID', @demo_now - INTERVAL 1 DAY - INTERVAL 90 MINUTE, @demo_now - INTERVAL 1 DAY - INTERVAL 60 MINUTE, @demo_table_6, @demo_qr_6, @demo_cashier);
SET @demo_fabio = LAST_INSERT_ID();
INSERT INTO commands (customer_name, session_token, status, opened_at, closed_at, table_id, opened_by, closed_by)
VALUES ('Gabi Demo', UUID(), 'PAID', @demo_now - INTERVAL 3 DAY - INTERVAL 90 MINUTE, @demo_now - INTERVAL 3 DAY - INTERVAL 60 MINUTE, @demo_table_6, @demo_waiter, @demo_cashier);
SET @demo_gabi = LAST_INSERT_ID();
INSERT INTO commands (customer_name, session_token, status, opened_at, closed_at, table_id, opened_by, closed_by)
VALUES ('Hugo Demo', UUID(), 'CANCELLED', @demo_now - INTERVAL 50 MINUTE, @demo_now - INTERVAL 40 MINUTE, @demo_table_6, @demo_waiter, @demo_cashier);
SET @demo_hugo = LAST_INSERT_ID();

-- Exemplos de todos os status da cozinha, com horários coerentes.
INSERT INTO orders (created_by, origin, status, observations, created_at, started_at, finished_at, cancelled_at, command_id) VALUES
(NULL, 'CUSTOMER', 'PENDING', 'Sem manjericão.', @demo_now - INTERVAL 8 MINUTE, NULL, NULL, NULL, @demo_ana),
(@demo_waiter, 'WAITER', 'PREPARING', NULL, @demo_now - INTERVAL 25 MINUTE, @demo_now - INTERVAL 20 MINUTE, NULL, NULL, @demo_bruno),
(NULL, 'CUSTOMER', 'READY', NULL, @demo_now - INTERVAL 40 MINUTE, @demo_now - INTERVAL 35 MINUTE, @demo_now - INTERVAL 20 MINUTE, NULL, @demo_carla),
(@demo_waiter, 'WAITER', 'DELIVERED', NULL, @demo_now - INTERVAL 60 MINUTE, @demo_now - INTERVAL 55 MINUTE, @demo_now - INTERVAL 40 MINUTE, NULL, @demo_diego),
(@demo_waiter, 'WAITER', 'DELIVERED', NULL, @demo_now - INTERVAL 90 MINUTE, @demo_now - INTERVAL 85 MINUTE, @demo_now - INTERVAL 70 MINUTE, NULL, @demo_eva),
(NULL, 'CUSTOMER', 'DELIVERED', NULL, @demo_now - INTERVAL 1 DAY - INTERVAL 90 MINUTE, @demo_now - INTERVAL 1 DAY - INTERVAL 85 MINUTE, @demo_now - INTERVAL 1 DAY - INTERVAL 70 MINUTE, NULL, @demo_fabio),
(@demo_waiter, 'WAITER', 'DELIVERED', NULL, @demo_now - INTERVAL 3 DAY - INTERVAL 90 MINUTE, @demo_now - INTERVAL 3 DAY - INTERVAL 85 MINUTE, @demo_now - INTERVAL 3 DAY - INTERVAL 70 MINUTE, NULL, @demo_gabi),
(@demo_waiter, 'WAITER', 'CANCELLED', 'Cliente desistiu antes do preparo.', @demo_now - INTERVAL 50 MINUTE, NULL, NULL, @demo_now - INTERVAL 40 MINUTE, @demo_hugo);

SET @demo_order_ana = (SELECT order_id FROM orders WHERE command_id = @demo_ana);
SET @demo_order_bruno = (SELECT order_id FROM orders WHERE command_id = @demo_bruno);
SET @demo_order_carla = (SELECT order_id FROM orders WHERE command_id = @demo_carla);
SET @demo_order_diego = (SELECT order_id FROM orders WHERE command_id = @demo_diego);
SET @demo_order_eva = (SELECT order_id FROM orders WHERE command_id = @demo_eva);
SET @demo_order_fabio = (SELECT order_id FROM orders WHERE command_id = @demo_fabio);
SET @demo_order_gabi = (SELECT order_id FROM orders WHERE command_id = @demo_gabi);
SET @demo_order_hugo = (SELECT order_id FROM orders WHERE command_id = @demo_hugo);

INSERT INTO order_items (quantity, unit_price, observation, order_id, product_id) VALUES
(1, 45.00, 'Sem manjericão.', @demo_order_ana, @demo_margherita),
(2, 7.00, NULL, @demo_order_ana, @demo_soda),
(1, 49.00, NULL, @demo_order_bruno, @demo_calabresa),
(2, 4.00, NULL, @demo_order_bruno, @demo_water),
(1, 55.00, NULL, @demo_order_carla, @demo_cheese),
(1, 7.00, NULL, @demo_order_carla, @demo_soda),
(1, 45.00, NULL, @demo_order_diego, @demo_margherita),
(2, 12.00, NULL, @demo_order_diego, @demo_brownie),
(2, 49.00, NULL, @demo_order_eva, @demo_calabresa),
(2, 7.00, NULL, @demo_order_eva, @demo_soda),
(1, 55.00, NULL, @demo_order_fabio, @demo_cheese),
(2, 4.00, NULL, @demo_order_fabio, @demo_water),
(2, 45.00, NULL, @demo_order_gabi, @demo_margherita),
(1, 12.00, NULL, @demo_order_gabi, @demo_brownie),
(1, 49.00, NULL, @demo_order_hugo, @demo_calabresa),
(1, 7.00, NULL, @demo_order_hugo, @demo_soda);

-- Apenas comandas PAID têm pagamentos; a soma coincide com os itens.
-- Eva: 2 x 49 + 2 x 7 = 112, dividido em PIX e crédito.
INSERT INTO payments (value, method, status, paid_at, command_id) VALUES
(56.00, 'PIX', 'PAID', @demo_now - INTERVAL 60 MINUTE, @demo_eva),
(56.00, 'CREDIT_CARD', 'PAID', @demo_now - INTERVAL 60 MINUTE, @demo_eva),
(63.00, 'DEBIT_CARD', 'PAID', @demo_now - INTERVAL 1 DAY - INTERVAL 60 MINUTE, @demo_fabio),
(102.00, 'CASH', 'PAID', @demo_now - INTERVAL 3 DAY - INTERVAL 60 MINUTE, @demo_gabi);

INSERT INTO audit_logs (user_id, action, entity, entity_id, description, metadata)
VALUES (@demo_manager, 'INSERT_DEMO_DATA', 'commands', @demo_ana,
        'Dados genéricos de desenvolvimento inseridos por database.sql.',
        JSON_OBJECT('users', 3, 'categories', 3, 'products', 6, 'tables', 6,
                    'qr_codes', 12, 'commands', 8, 'orders', 8, 'order_items', 16, 'payments', 4));

COMMIT;
