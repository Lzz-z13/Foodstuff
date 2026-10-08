# Guia da API Foodstuff

## 1. Visao geral

A API usa Node.js, Express e MySQL. A arquitetura esta organizada por responsabilidades:

- `routes`: define URLs e aplica middlewares.
- `controllers`: recebe a requisicao, valida dados de entrada e monta a resposta HTTP.
- `services`: concentra regras de negocio, consultas SQL e transacoes.
- `middlewares`: autentica, autoriza e trata erros.
- `database`: cria e testa a conexao com o MySQL.
- `validations`: valida os dados recebidos.
- `utils`: funcoes auxiliares, como criacao de logs.

O fluxo normal e:

```text
Frontend
  -> Route
  -> Middleware
  -> Controller
  -> Service
  -> MySQL
  -> Controller
  -> JSON para o Frontend
```

A URL-base e:

```text
http://localhost:5000/api/foodstuff
```

## 2. Inicializacao

O arquivo [api/src/server.js](api/src/server.js) inicia a aplicacao:

1. Importa o Express configurado em `src/index.js`.
2. Aguarda uma conexao bem-sucedida com o banco.
3. Inicia o servidor na porta `5000`.

O arquivo [api/src/index.js](api/src/index.js) executa esta ordem:

```js
this.express = express();
this.middlewares();
this.routes();
this.errorHandlers();
```

A ordem e importante: o JSON e o CORS sao configurados antes das rotas, e o tratamento de erros fica por ultimo.

## 3. Registro das rotas

O arquivo [api/src/routes/index.js](api/src/routes/index.js) agrega os modulos:

```js
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

router.use(verifyJWT);
router.use("/users", userRoutes);

router.use(verifyFirstLogin);
router.use("/tables", tableRoutes);
router.use("/logs", logRoutes);
```

Assim, atualmente:

| Grupo | Regra |
|---|---|
| `/health` | Publico |
| `/auth/login` | Publico |
| `/users` | JWT obrigatorio |
| `/tables` | JWT e primeiro acesso concluido |
| `/logs` | JWT e primeiro acesso concluido |

Um middleware registrado com `router.use()` vale para as rotas registradas depois dele.

## 4. Como controllers e services se conectam

Uma rota importa uma controller:

```js
const UserController = require("../controllers/userController");

router.post("/", UserController.createUser);
```

A controller importa o service:

```js
const UserService = require("../services/userService");

const result = await UserService.createUser(...);
```

O service acessa o banco:

```js
const [users] = await connect.execute(query, values);
```

A regra pratica e:

```text
Route       = URL e middlewares
Controller  = entrada e resposta HTTP
Service     = regra de negocio e banco
Validation  = formato dos dados
Middleware  = autenticacao e autorizacao
Database    = conexao
Utils       = funcoes reutilizaveis
```

A controller nao deve conter SQL. O service nao deve montar respostas HTTP diretamente.

## 5. Login e JWT

O fluxo do login e:

```text
POST /api/foodstuff/auth/login
  -> authRoutes.js
  -> UserController.loginUser
  -> UserService.loginUser
  -> SELECT em users
  -> bcrypt.compare()
  -> jwt.sign()
  -> resposta JSON
```

O login esta em:

- [api/src/routes/authRoutes.js](api/src/routes/authRoutes.js)
- [api/src/controllers/userController.js](api/src/controllers/userController.js)
- [api/src/services/userService.js](api/src/services/userService.js)

O token contem:

```js
{
  id: user.user_id,
  role: user.role,
  first_login: user.first_login
}
```

A resposta tem este formato:

```json
{
  "error": false,
  "message": "Login efetuado com sucesso.",
  "data": {
    "user": {},
    "token": "..."
  }
}
```

O middleware [api/src/middlewares/verifyJWT.js](api/src/middlewares/verifyJWT.js) coloca os dados do token em:

```js
req.user.id
req.user.role
req.user.first_login
```

Os frontends atualmente enviam o token diretamente no header `Authorization`. O padrao recomendado e:

```text
Authorization: Bearer TOKEN
```

Nesse caso, o middleware precisa remover o prefixo `Bearer` antes de chamar `jwt.verify()`.

## 6. Primeiro acesso

Usuarios criados pelo manager recebem uma senha temporaria por e-mail e ficam com:

```text
first_login = 1
```

A rota abaixo continua acessivel para permitir a troca da senha:

```text
PATCH /api/foodstuff/users/me/password
```

Depois da troca, o service atualiza:

```sql
SET password = ?, first_login = 0
```

O middleware [api/src/middlewares/verifyFirstLogin.js](api/src/middlewares/verifyFirstLogin.js) bloqueia o restante do sistema enquanto `first_login` for `1`.

## 7. Endpoints atuais

### Autenticacao

```text
POST /api/foodstuff/auth/login
```

### Usuarios

Implementados em [api/src/routes/userRoutes.js](api/src/routes/userRoutes.js):

```text
PATCH  /api/foodstuff/users/me/password
DELETE /api/foodstuff/users/me
PATCH  /api/foodstuff/users/me
POST   /api/foodstuff/users
GET    /api/foodstuff/users
DELETE /api/foodstuff/users/:user_id
```

O manager pode criar, listar e desativar outros usuarios. O proprio usuario pode alterar seus dados, trocar a senha e desativar a conta.

A exclusao e logica:

```sql
UPDATE users SET is_active = 0
```

### Mesas

Implementados em [api/src/routes/tableRoutes.js](api/src/routes/tableRoutes.js):

```text
POST /api/foodstuff/tables
GET  /api/foodstuff/tables
```

O service cria, lista e reativa mesas inativas. Operacoes de escrita tambem criam logs de auditoria.

### Logs

Implementados em [api/src/routes/logRoutes.js](api/src/routes/logRoutes.js):

```text
GET /api/foodstuff/logs
GET /api/foodstuff/logs/:entity
```

Apenas managers podem consultar os logs.

### Health check

```text
GET /api/foodstuff/health
GET /api/foodstuff/health/db
```

## 8. Banco de dados

O schema esta em [api/mysql-database/database.sql](api/mysql-database/database.sql) e possui:

- `users`
- `tables`
- `qr_codes`
- `commands`
- `categories`
- `products`
- `orders`
- `order_items`
- `payments`
- `audit_logs`

A API implementa atualmente apenas parte desse modelo: usuarios, mesas, logs, login e health check.

Ainda faltam rotas, controllers e services para:

- QR Codes.
- Categorias.
- Produtos.
- Comandas.
- Pedidos.
- Itens de pedidos.
- Pagamentos.
- Fechamento de comandas.

## 9. Transacoes e logs

Operacoes que alteram mais de uma tabela devem usar transacao:

```text
beginTransaction()
  alteracao principal
  criacao do audit_log
commit()
```

Em caso de erro:

```js
await connection.rollback();
```

A funcao [api/src/utils/createLog.js](api/src/utils/createLog.js) grava os logs na mesma conexao da operacao principal. Dessa forma, uma alteracao sem log pode ser desfeita junto com a operacao.

## 10. Problema atual nas permissoes de mesas

Em [api/src/routes/tableRoutes.js](api/src/routes/tableRoutes.js), este middleware continua ativo para as rotas seguintes:

```js
router.use(verifyRole("MANAGER"));
```

Por isso, o `GET /tables` tambem exige manager, mesmo existindo depois uma regra para manager e waiter.

Uma forma mais clara e segura e aplicar a permissao na propria rota:

```js
router.post(
  "/",
  verifyRole("MANAGER"),
  TableController.createTable
);

router.get(
  "/",
  verifyRole("MANAGER", "WAITER"),
  TableController.readAllTables
);
```

## 11. Ordem recomendada para continuar

### Etapa 1: estabilizar autenticacao

- Padronizar `Bearer token`.
- Corrigir as permissoes por rota.
- Criar endpoint do usuario atual.
- Criar recuperacao e redefinicao de senha.
- Adicionar testes de login, token expirado e permissoes.

### Etapa 2: finalizar usuarios

- Atualizar usuario por ID.
- Reenviar credenciais.
- Adicionar paginacao.
- Definir regras para manager desativar outros managers.

### Etapa 3: mesas e QR Codes

- Criar QR Code para mesa.
- Listar e desativar QR Codes.
- Validar token publico do QR Code.
- Garantir no maximo quatro posicoes por mesa.

### Etapa 4: cardapio

- CRUD de categorias.
- CRUD de produtos.
- Disponibilidade do produto.
- Preco, custo e imagem.
- Relacionamento obrigatorio com categoria.

### Etapa 5: comandas

- Abrir comanda.
- Consultar por `session_token`.
- Associar comanda a mesa e QR Code.
- Fechar ou cancelar comanda.

### Etapa 6: pedidos

- Criar pedido.
- Inserir varios itens dentro de uma transacao.
- Copiar o preco do produto para `unit_price` no momento da compra.
- Controlar os estados:

```text
PENDING -> PREPARING -> READY -> DELIVERED
PENDING -> CANCELLED
```

### Etapa 7: pagamentos

- Registrar pagamento.
- Calcular total da comanda.
- Impedir pagamento acima do saldo.
- Permitir varios meios de pagamento.
- Fechar a comanda quando o total for quitado.

## 12. Pontos que devem ser corrigidos antes de crescer

### Credenciais expostas

O arquivo `.env` possui senha de banco, senha de e-mail e segredo JWT. Essas credenciais devem ser trocadas e nunca devem ser commitadas.

Crie um `.env.example` sem valores reais, pois `dotenv-safe` pode depender desse arquivo.

### CORS

A configuracao atual combina:

```js
origin: "*"
credentials: true
```

Essa combinacao nao funciona corretamente para credenciais em navegadores. Use origens especificas, como as portas dos frontends.

### Falta de rota 404

O `errorHandler` trata erros, mas uma URL inexistente pode retornar o formato padrao do Express. Adicione um middleware final que responda JSON para rotas nao encontradas.

### Validacao do numero da mesa

`isNaN()` e uma validacao fraca. Prefira converter para numero e verificar se e um inteiro positivo.

### Testes inexistentes

O `package.json` ainda possui um script de teste placeholder. Antes de implementar pedidos e pagamentos, crie testes para:

- Login valido e invalido.
- Usuario sem permissao.
- Bloqueio no primeiro acesso.
- Cadastro duplicado.
- Rollback de transacao.
- Pedido com produto indisponivel.
- Pagamento parcial e fechamento de comanda.

## 13. Checklist para um novo modulo

1. Criar ou alterar a tabela no SQL.
2. Criar validacoes de entrada.
3. Criar o service com regras e SQL.
4. Criar a controller.
5. Criar o arquivo de rotas.
6. Registrar as rotas em `src/routes/index.js`.
7. Aplicar `verifyJWT`, `verifyFirstLogin` e `verifyRole` conforme necessario.
8. Criar logs para operacoes importantes.
9. Usar transacao quando houver mais de uma alteracao.
10. Testar com Postman ou Insomnia.
11. Conectar o frontend somente depois de validar a API.

A principal regra para continuar sem problemas e manter cada responsabilidade na camada correta e implementar comandas, pedidos e pagamentos com transacoes, estados bem definidos, controle de permissoes e testes.