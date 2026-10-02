# Foodstuff API — Convenções de Implementação

## Arquitetura

A API utiliza:

```text
Route
 ↓
Controller
 ↓
Validation
 ↓
Service
 ↓
Database
```

## Routes

Routes definem:

* método HTTP;
* caminho;
* middlewares;
* Controller responsável.

Exemplo:

```js
router.post(
  "/",
  verifyRole("MANAGER"),
  TableController.createTable
);
```

Quando cargos diferentes possuem permissões diferentes, aplicar `verifyRole` na própria rota.

Não colocar uma autorização mais restritiva em `router.use()` se isso também afetar rotas que deveriam possuir permissões diferentes.

## Controllers

Controllers devem:

1. obter dados de `req`;
2. normalizar dados quando apropriado;
3. chamar validação;
4. chamar o Service;
5. retornar resposta HTTP;
6. passar erros para `next(error)`.

Exemplo:

```js
try {
  validateUser(req.body, false);

  const result = await UserService.createUser(
    name,
    email,
    phone,
    role,
    jwt_user_id
  );

  return res.status(201).json({
    error: false,
    message: result.message,
  });
} catch (error) {
  next(error);
}
```

## Services

Services concentram:

* regras de negócio;
* queries;
* transactions;
* integração com banco;
* chamadas de `createLog`.

Não colocar SQL nos Controllers.

## Validation

Validators validam dados.

Normalização acontece antes da validação quando o projeto já segue esse padrão.

Exemplo:

```text
"(11) 99999-9999"
        ↓
normalizePhone()
        ↓
"11999999999"
        ↓
isValidPhone()
```

Validators não devem alterar o objeto original sem necessidade.

## Database

Usar:

```js
connection.execute(query, values)
```

com placeholders:

```sql
WHERE user_id = ?
```

Nunca concatenar dados externos diretamente no SQL.

## Transactions

Para operações que envolvem mais de uma alteração:

```js
const connection = await connect.getConnection();

try {
  await connection.beginTransaction();

  // queries
  // createLog()

  await connection.commit();
} catch (error) {
  await connection.rollback();

  // tratamento
} finally {
  connection.release();
}
```

## Logs

Sempre que uma ação importante modificar dados, utilizar:

```js
createLog(
  connection,
  responsibleId,
  action,
  entity,
  entityId,
  description
);
```

A ordem conceitual dos argumentos é:

```text
connection
quem realizou
ação
entidade
registro afetado
descrição
```

Exemplo:

```js
await createLog(
  connection,
  jwt_user_id,
  "DELETE",
  "users",
  target_user_id,
  "Usuário desativado."
);
```

Não confundir:

```text
responsibleId
```

com:

```text
targetId
```

## Tratamento de duplicidade

O banco possui constraints `UNIQUE`.

A aplicação pode realizar uma verificação prévia quando a regra de negócio exigir comportamento especial, como reativação de registros inativos.

O banco continua sendo a última proteção contra duplicidade.

## Soft Delete

Quando uma entidade utiliza `is_active`, não apagar fisicamente sem solicitação explícita.

Para desativação:

```sql
UPDATE ...
SET is_active = 0
```

Para reativação:

```sql
UPDATE ...
SET is_active = 1
```

## Reutilização

Antes de criar uma nova utility ou middleware:

1. procure se já existe;
2. verifique se ela pode ser reutilizada;
3. mantenha o padrão existente.

Não criar uma segunda versão de uma utility que já existe.

## Mudanças

Não alterar arquivos não relacionados à tarefa.

Não fazer refatorações cosméticas enquanto implementa uma feature.

Preferir pequenas mudanças verificáveis.

## Verificação

Depois de implementar:

```text
1. verificar código
2. verificar imports
3. verificar queries
4. verificar nomes de campos
5. verificar parâmetros
6. executar testes/verificações disponíveis
7. revisar diff
```

Relatar claramente o que foi alterado e quais verificações foram executadas.
