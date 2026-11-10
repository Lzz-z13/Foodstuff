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
| POST | `/payments/pix` | Calcula o saldo e cria/reutiliza uma cobrança Pix |
| GET | `/payments/:payment_id` | Consulta a order no Mercado Pago e atualiza a cobrança local |

Exemplo do corpo de pagamento em dinheiro:

```json
{ "method": "CASH", "value": 110, "expected_balance": 110, "received_amount": 150 }
```

Métodos manuais: CASH, CREDIT_CARD, DEBIT_CARD e VOUCHER. Para os métodos sem
dinheiro, `received_amount` não é necessário. Cartões são registrados pelo operador;
a API não debita cartões. PIX deve usar `/payments/pix` e só é confirmado pelo
Mercado Pago. Registros históricos de Pix manual são preservados.

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

Bancos novos usam `mysql-database/database.sql`. Para um banco existente com o
schema atual (incluindo `commands.service_fee_percent`), execute **uma única vez**
`mysql-database/migrations/003_add_pix_payments.sql`, selecionando o banco correto
antes de executar o SQL. A migração adiciona campos e índices sem remover dados
ou modificar valores e estados existentes. Não importe `database.sql` sobre um
banco existente. Não remova volumes. O build Docker não atualiza volumes existentes.

O arquivo `002_add_command_service_fee.sql` mencionado em versões anteriores desta
documentação não está neste repositório. Esta entrega não afirma que uma migração
foi aplicada ao banco de desenvolvimento ou produção.

## Configuração Pix

Configure no ambiente da API, sem colocar valores reais no repositório:

```dotenv
MP_ACCESS_TOKEN=seu-access-token
MP_PAYER_EMAIL=email-real-controlado@exemplo.com
MP_WEBHOOK_SECRET=assinatura-secreta-da-aplicacao
```

As duas configurações novas estão comentadas em `.env.example` para não bloquear
o início da API antes de habilitar Pix. Copie/descomente no seu ambiente quando
for utilizá-las. A criação sem token ou e-mail válido retorna 503. O segredo do
webhook só é necessário para receber notificações; a consulta autenticada funciona
antes de configurá-lo. O `.env` real não é alterado pela implementação.

`MP_PAYER_EMAIL` é uma solução temporária para os testes do TCC, **não identifica
os consumidores reais**. Não se usa o e-mail do funcionário. A documentação do
Mercado Pago exige e-mail do comprador; a aceitação de um e-mail controlado para
todas as cobranças não é garantida em produção. Se o provedor recusar, a menor
evolução é coletar o e-mail verdadeiro do pagador na criação da cobrança e
persisti-lo no payload da tentativa. Não invente nomes/documentos/e-mails, nem
utilize `first_name: APRO` ou aprovação simulada.

## Fluxo e recuperação

`POST /payments/pix` recebe **somente** `{ "command_id": 15 }`. O backend reutiliza
o cálculo em centavos do caixa, aplica a taxa e desconta apenas pagamentos PAID.
Retorna 201 na criação e 200 ao reutilizar uma tentativa. A resposta segue
`{ "error": false, "data": { ... } }`, contendo `payment_id`, `command_id`, `value`,
`status`, `paid_at`, `mp_order_id`, `mp_payment_id`, `mp_status`, `mp_status_detail`,
`qr_code`, `qr_code_base64` e `ticket_url`. `payment_id` é o identificador **local**;
`mp_order_id` identifica a order externa. Não se retorna o payload com o e-mail,
a chave de idempotência ou credenciais.

Uma transação bloqueia a comanda, reserva todo o saldo restante em `payments`
com status PENDING/`paid_at = NULL`, persiste chave e payload imutáveis e fecha a
comanda em CLOSED. Depois do commit, chama Orders com `processing_mode: automatic`.
Nenhuma transação MySQL fica aberta esperando HTTP. Um índice UNIQUE sobre a
coluna gerada `active_pix_command_id` impede dois Pix PENDING na mesma comanda.

Enquanto houver Pix pendente, inclusive resultado desconhecido, recebimentos
manuais são rejeitados com 409. O fechamento bloqueia novos pedidos e cancelamentos
de consumo; a desativação de mesa também respeita o bloqueio das comandas antes de
cancelar pedidos. A desativação não altera consumo de uma comanda já fechada.

Um novo POST retorna a cobrança pendente já existente e seu QR salvo. Se a resposta
externa se perdeu antes de salvar o ID, POST ou GET de status recuperam a mesma
tentativa, enviando exatamente a mesma chave e payload, mesmo que o e-mail de
configuração tenha mudado. Há timeout HTTP de 8 segundos. Erros externos nunca
cancelam automaticamente a reserva nem autorizam uma chave nova.

Como proteção conservadora contra retenção limitada de idempotência no provedor,
depois de uma hora sem ID externo a API deixa de repetir POST e retorna 409
solicitando verificação no Mercado Pago. A reserva permanece. Não apague/marque
essa tentativa como cancelada sem verificar o resultado externo. Um webhook
válido ainda pode recuperá-la pela referência externa, mesmo sem ID local salvo.
Uma recusa de configuração também conserva a tentativa para verificação; trocar
o ambiente não altera o payload de uma tentativa já reservada.
Se o POST falhar antes de devolver `payment_id`, consulte o checkout da comanda:
o array `payments` contém a tentativa PENDING e seu identificador local.

GET consulta a order com o Access Token e valida referência da tentativa,
identificadores, total, quantidade de transações e método Pix. Só a combinação
`processed/accredited` na order e na transação, com valor total recebido correto,
gera PAID, preenche `paid_at`, atualiza a comanda e registra auditoria na mesma
transação. Gerar/exibir QR nunca confirma recebimento. O índice de ID externo e
o bloqueio da comanda evitam dupla contabilização. Respostas antigas em voo não
revertem pagamentos já confirmados.

Cancelamento/expiração só libera nova tentativa quando GET confirma estado final
`canceled`/`failed` também na transação e total recebido zero. A comanda continua
CLOSED, podendo receber outro método. Não há rota de cancelamento, reabertura,
reembolso ou tratamento automático de estorno nesta versão. Dados divergentes
permanecem bloqueados para verificação.

## Postman: testar inicialmente sem webhook

Crie variáveis `base_url=http://localhost:5000/api/foodstuff`, `token` (JWT de caixa
ou gerente), `command_id=15` e `payment_id` (retornado ao criar o Pix). Nas rotas
internas use Authorization → Bearer Token → `{{token}}`.

1. Consultar a conta:
   `GET {{base_url}}/commands/{{command_id}}/checkout`.
2. Gerar Pix: `POST {{base_url}}/payments/pix`, Body → raw → JSON:

   ```json
   { "command_id": 15 }
   ```

   Salve `data.payment_id` em `payment_id`. Exiba a imagem com o prefixo
   `data:image/png;base64,` seguido de `data.qr_code_base64`, ou utilize
   `data.qr_code` no aplicativo bancário. Repetir o POST reutiliza a tentativa.
3. Consultar: `GET {{base_url}}/payments/{{payment_id}}`. Antes do pagamento,
   retorna PENDING. Depois do recebimento real, a consulta confirma PAID.
4. Repetir `GET {{base_url}}/commands/{{command_id}}/checkout` e conferir `paid`,
   `balance: 0` e `status: PAID`. O resumo do caixa passa a incluir o recebimento.

Um Pix com credenciais de produção é uma cobrança real. Os testes automatizados
utilizam Axios mockado e nunca criam cobranças no Mercado Pago.

## Webhook HTTPS

Exponha a API por um domínio/túnel HTTPS público. Em Integrações → aplicação →
Configuração de Webhooks, selecione o ambiente correto e o evento **Order
(Mercado Pago)**. Configure:

```text
https://seu-dominio/api/foodstuff/payments/webhook
```

Copie a assinatura secreta para `MP_WEBHOOK_SECRET` no ambiente da API e reinicie.
A rota é pública somente em relação ao JWT: exige HMAC-SHA256 válido em
`x-signature`, `x-request-id` e `data.id` na query. Timestamp deve estar dentro
de cinco minutos; mantenha o relógio do servidor sincronizado. O manifest segue
a implementação oficial atual do SDK Node (`id:<data.id>;request-id:<id>;ts:<ts>;`).
O body não é utilizado como comprovação de pagamento.

O webhook consulta a API e confirma a transação local **antes** de responder 200.
Em falha transitória, retorna erro para permitir reenvio do provedor. Não utiliza
fila em memória nem responde sucesso antes de persistir. Notificações repetidas
não duplicam recebimentos/auditoria. Cobranças de outra origem na mesma conta são
ignoradas quando não correspondem a uma tentativa local.

Documentação oficial:
- [Pix com Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/websites/pix)
- [Notificações de orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications)
- [Consulta da order](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/get-order/get)
- [Validação oficial de assinatura no SDK Node](https://github.com/mercadopago/sdk-nodejs/blob/master/src/utils/webhook/index.ts)

## Verificação

Execute `npm test -- --runInBand tests/payments tests/tables/deleteTable.test.js`.
Os testes cobrem totais, preço histórico, taxa, parcial, troco, geração e recuperação
do Pix, confirmação, assinatura, concorrência, autorização e rollback. Axios é
mockado; as configurações Pix dos testes são fictícias.

O setup **recria somente `foodstuff_test`** e exige credenciais exclusivas em
`TEST_DB_USER`/`TEST_DB_PASSWORD`. Confira `TEST_DB_HOST`/`TEST_DB_PORT` e o destino
antes de executar. Nunca use credenciais ou servidor de produção. O setup recusa
iniciar sem credenciais explícitas de teste.
