-- Dados exclusivamente para testes em banco isolado. Nunca importar em produção.
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
(@demo_waiter, 'Garcom Demo', 'garcom@foodstuff.test', '11900009002', @demo_password, 'WAITER', 0, 1),
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
(01, 1), (02, 1), (03, 1), (04, 1), (05, 1), (06, 1);
SET @demo_table_1 = (SELECT table_id FROM tables WHERE number = 01);
SET @demo_table_2 = (SELECT table_id FROM tables WHERE number = 02);
SET @demo_table_3 = (SELECT table_id FROM tables WHERE number = 03);
SET @demo_table_4 = (SELECT table_id FROM tables WHERE number = 04);
SET @demo_table_5 = (SELECT table_id FROM tables WHERE number = 05);
SET @demo_table_6 = (SELECT table_id FROM tables WHERE number = 06);

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
-- Os exemplos históricos pagos foram quitados sem taxa de serviço.
UPDATE commands SET service_fee_percent = 0 WHERE status IN ('PAID', 'CANCELLED');
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
