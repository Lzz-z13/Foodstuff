# Foodstuff — Contexto do Sistema

## Objetivo

Foodstuff é um sistema para digitalizar e organizar o funcionamento de uma pizzaria.

O sistema possui usuários internos e clientes.

Clientes e usuários internos são entidades diferentes.

## Usuários

A tabela `users` representa somente usuários internos:

```text
MANAGER
WAITER
KITCHEN
CASHIER
```

Clientes não possuem login e não são armazenados em `users`.

## Permissões

### MANAGER

O gerente possui acesso às funções administrativas e pode assumir as funções operacionais dos demais cargos.

### WAITER

O garçom pode visualizar e atender qualquer mesa.

Não existe atribuição de mesas individual por garçom.

Não existe `table_waiters`.

O acesso às mesas é controlado por autorização baseada em `role`.

### KITCHEN

A cozinha visualiza os pedidos e altera seus status.

### CASHIER

O caixa controla os pagamentos das comandas.

## Mesas

`tables` representa as mesas físicas do restaurante.

Cada mesa possui um número único.

O gerente pode criar mesas.

O sistema utiliza soft delete através de `is_active`.

Mesas inativas podem ser reativadas quando uma tentativa de criação utiliza um número existente, porém inativo.

## QR Codes

O QR Code não representa uma comanda.

Ele representa um ponto físico de acesso de uma mesa.

Cada mesa pode possuir até quatro QR Codes:

```text
Mesa 1
├── posição 1
├── posição 2
├── posição 3
└── posição 4
```

Cada QR possui um `token` único.

O QR pode ser utilizado por várias comandas ao longo do tempo.

A comanda pode ter:

```text
qr_code_id
```

ou pode ser criada diretamente pelo garçom.

## Comandas

`commands` representa uma comanda de cliente.

O cliente não faz login.

Quando acessa através do QR Code, fornece seu nome e recebe uma comanda identificada, por exemplo:

```text
José - #1234
```

`command_id` é o identificador da comanda.

A comanda possui `session_token` próprio para identificar o acesso do cliente à sua própria comanda.

Apenas uma pessoa acessa sua própria comanda.

O garçom pode criar uma comanda para um cliente que não possui celular.

O garçom também pode acessar uma comanda existente através da mesa.

Uma comanda possui uma mesa através de `table_id`.

Quando aberta por QR Code, também possui `qr_code_id`.

O banco mantém `table_id` e `qr_code_id` propositalmente.

## Fluxo de atendimento

O fluxo operacional principal é:

```text
USER
 ↓
TABLE
 ↓
COMMAND
 ↓
ORDER
```

Um pedido somente pode ser realizado através de uma comanda.

Exemplo:

```text
Garçom
 ↓
Mesa 1
 ↓
José - #1234
 ↓
Pedido
```

## Orders

`orders` representa cada pedido realizado dentro de uma comanda.

Uma comanda pode possuir vários pedidos ao longo do tempo.

A origem do pedido é:

```text
CUSTOMER
WAITER
```

`origin` indica quem originou o pedido.

`created_by` identifica qual usuário interno criou o pedido quando aplicável.

Exemplo:

```text
origin = WAITER
created_by = UUID do garçom
```

Pedidos criados diretamente pelo cliente podem possuir:

```text
created_by = NULL
```

Os status atuais são:

```text
PENDING
PREPARING
READY
DELIVERED
CANCELLED
```

## Order Items

`order_items` é a entidade associativa entre `orders` e `products`.

Conceitualmente:

```text
Orders N:N Products
```

implementado como:

```text
Orders 1:N Order_items
Products 1:N Order_items
```

`Order_item` representa a ocorrência de um produto dentro de um pedido.

Ele armazena:

```text
quantity
unit_price
observation
```

`unit_price` deve representar o preço no momento da compra e não depender do preço atual em `products`.

## Products

Produtos pertencem a uma categoria.

```text
Categories 1:N Products
```

Um produto possui:

```text
price
cost
image
requires_preparation
is_available
is_active
```

`requires_preparation` indica se o produto precisa passar pelo fluxo da cozinha.

## Payments

Uma comanda pode receber vários pagamentos.

```text
Commands 1:N Payments
```

Isso permite pagamentos divididos.

Exemplo:

```text
Comanda = R$100

R$50 PIX
R$50 CREDIT_CARD
```

Também pode existir:

```text
R$50 DEBIT_CARD
R$50 VOUCHER
```

O sistema deve considerar a soma dos pagamentos para determinar quanto da comanda já foi pago.

## Audit Logs

`audit_logs` registra ações importantes do sistema.

A relação física é:

```text
Users 1:N Audit_logs
```

A ação pode se referir logicamente a outras entidades através de:

```text
entity
entity_id
```

Exemplo:

```text
user_id = gerente
action = DELETE
entity = users
entity_id = UUID do usuário afetado
```

O log responde:

```text
QUEM
FEZ O QUÊ
EM QUAL REGISTRO
QUANDO
```

`audit_logs` não é utilizado como substituto dos logs técnicos da aplicação.

## Soft Delete

Usuários e mesas utilizam `is_active`.

Desativar um registro não significa removê-lo fisicamente do banco.

Quando apropriado, registros inativos podem ser reativados.

## Regras importantes

* Não assumir que cliente possui conta em `users`.
* Não criar `table_waiters`.
* Não criar uma tabela `dashboard`.
* Não transformar QR Code em comanda.
* Não criar `command_sessions`; a sessão do cliente está em `commands.session_token`.
* Não criar relacionamento N:N entre usuários e mesas.
* Não criar pedidos diretamente em `tables`; pedidos pertencem a `commands`.
* Não substituir `created_by` de `orders` por `origin`.
* Não transformar pagamentos divididos em um único campo.
