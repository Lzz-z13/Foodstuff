# Caixa e pagamentos

O frontend usa o cliente Axios existente. O login de CASHIER direciona para
`/caixa`. A conta do usuário fica em `/minha-conta`, com o layout do caixa.
O gerente também pode acessar `/caixa`.

## Rotas autenticadas

As rotas abaixo são relativas a `/api/foodstuff` e exigem MANAGER ou CASHIER.

| Método | Rota | Resultado |
| --- | --- | --- |
| GET | `/commands` | Comandas OPEN/CLOSED, mesa, consumo, taxa, pago e saldo |
| GET | `/commands/:command_id/checkout` | Dados da comanda, itens e pagamentos |
| GET | `/cashier/summary` | Recebimentos PAID do dia do banco |
| POST | `/commands/:command_id/payments` | Registra pagamento e atualiza comanda |

Exemplo do corpo de pagamento em dinheiro:

```json
{ "method": "CASH", "value": 110, "expected_balance": 110, "received_amount": 150 }
```

Métodos: CASH, PIX, CREDIT_CARD, DEBIT_CARD e VOUCHER. Para os métodos sem
dinheiro, `received_amount` não é necessário. A aplicação registra o recebimento
confirmado pelo operador; não gera QR PIX, não debita cartões e não possui gateway.

Os valores são calculados no servidor em centavos, com base no preço histórico
dos itens. Pedidos CANCELLED são excluídos. A taxa de serviço é calculada uma vez
sobre o subtotal, arredondada ao centavo e somada ao consumo. Cada comanda guarda
`service_fee_percent`, cujo padrão para novas comandas é 10%.

Pagamentos parciais são aceitos e deixam a comanda CLOSED. O restante pode ser
registrado por outro método. A quitação muda o status para PAID. Novos pedidos
não são aceitos após o fechamento. Cancelamentos de pedidos são bloqueados após
o fechamento para preservar a conta. O troco é devolvido na resposta e registrado
na auditoria; somente o valor efetivamente aplicado à conta entra em payments.

O bloqueio de linha na comanda serializa registros concorrentes. `expected_balance`
é obrigatório e evita repetição de uma cobrança com saldo antigo. Cada pagamento,
fechamento e log de auditoria ocorre na mesma transação.

## Instalação e atualização

Bancos novos usam `mysql-database/database.sql`. Para um banco existente, execute
uma única vez `mysql-database/migrations/002_add_command_service_fee.sql` no banco
configurado pela API, antes de iniciar a versão nova. A migração adiciona taxa de
10% às comandas OPEN/CLOSED e preserva taxa zero nas PAID/CANCELLED históricas.
Não remova o volume para atualizar. O build do Docker não executa migrações em
volumes existentes. A migração já foi aplicada ao ambiente local desta tarefa.

## Verificação

`npm test -- --runInBand tests/payments/cashier.test.js` cobre totais, preços
históricos, taxa, troco, pagamentos parciais, concorrência, autorização,
cancelamentos e rollback. Use credenciais administrativas exclusivas para testes
em `TEST_DB_USER` e `TEST_DB_PASSWORD`; o banco recriado é `foodstuff_test`.
