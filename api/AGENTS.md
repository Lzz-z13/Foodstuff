# Foodstuff API — Project Instructions

## Projeto

Foodstuff é uma API REST para o sistema de gerenciamento de uma pizzaria, desenvolvida como TCC.

Este `AGENTS.md` pertence ao diretório `api/` do repositório Foodstuff.

O repositório também contém:
- `Foodstuff-FrontWeb/`
- `Foodstuff-Mobile/`

Esses diretórios estão fora do escopo das tarefas desta API.

Não modificar Web ou Mobile durante tarefas da API, salvo solicitação explícita.

Stack atual:

* Node.js
* Express
* JavaScript
* MySQL
* bcrypt
* jsonwebtoken
* Nodemailer

Arquitetura principal:

```text
Routes
  ↓
Controller
  ↓
Validation / Utils
  ↓
Service
  ↓
Database
```

## Fonte de verdade

Ao tomar decisões sobre implementação, respeite esta prioridade:

1. Código existente e funcional do projeto
2. `mysql-database/database.sql`
3. `docs/foodstuff-context.md`
4. `docs/api-conventions.md`
5. Convenções gerais do ecossistema

Não invente entidades, campos, rotas, dependências ou regras de negócio que não estejam presentes no projeto ou explicitamente solicitadas.

Não altere o banco de dados ou suas regras sem que a tarefa solicite isso explicitamente.

## Regras gerais de implementação

* Preserve a arquitetura atual.
* Não faça refatorações não relacionadas à tarefa.
* Não troque bibliotecas ou padrões já utilizados sem necessidade.
* Reutilize utilities, validators, middlewares e padrões existentes.
* Mantenha CommonJS (`require` / `module.exports`).
* Use queries parametrizadas com `?`.
* Nunca concatene valores recebidos do usuário diretamente em SQL.
* Não exponha senhas, hashes ou outros dados sensíveis nas respostas.
* Não coloque lógica de negócio complexa nos Controllers.
* Controllers devem lidar principalmente com HTTP, entrada, validação e resposta.
* Services devem concentrar regra de negócio e acesso ao banco.
* Validações existentes devem ser reutilizadas antes de acessar o banco.

## Autenticação e autorização

O JWT identifica o usuário através de:

```js
req.user.id
```

O cargo é obtido através de:

```js
req.user.role
```

Os cargos existentes são:

```text
MANAGER
WAITER
KITCHEN
CASHIER
```

Use `verifyJWT` para autenticação e `verifyRole(...)` para autorização.

Não substitua autorização por verificações manuais espalhadas nos Controllers quando um middleware existente puder ser utilizado.

## Banco de dados

`mysql-database/database.sql` é a fonte de verdade do schema atual.

Não invente colunas ou relações.

Particularmente:

* `Users` representa funcionários/usuários internos.
* Clientes não possuem registro em `Users`.
* `Commands` representa comandas.
* `Orders` representa pedidos.
* `Order_items` relaciona pedidos e produtos.
* `Payments` possui relação 1:N com `Commands`.
* `Audit_logs` registra ações do sistema.
* `audit_logs.user_id` é FK para `users.user_id`.
* `audit_logs.entity` + `audit_logs.entity_id` são referências lógicas à entidade afetada.

## Tratamento de erros

O projeto usa erros no formato:

```js
throw {
  status: 400,
  message: "Mensagem."
};
```

Quando apropriado, mantenha esse padrão.

Controllers devem encaminhar erros para:

```js
next(error);
```

Não crie respostas de erro incompatíveis com o padrão existente.

## Transactions

Quando uma operação alterar múltiplos dados que precisam permanecer consistentes:

```text
beginTransaction()
↓
queries
↓
createLog()
↓
commit()
```

Em caso de erro:

```text
rollback()
```

Sempre liberar a conexão no `finally`.

## Logs

Utilize a utility existente:

```js
createLog(...)
```

Quando uma ação importante alterar dados do sistema, registre o evento dentro da mesma transação.

O log deve distinguir:

* quem realizou a ação;
* qual ação ocorreu;
* qual entidade foi afetada;
* qual registro foi afetado.

Não use `audit_logs` como log técnico de exceções da aplicação.

## Estilo

Antes de criar uma implementação nova, procure uma implementação existente equivalente.

Por exemplo:

* usuário é referência para CRUD de entidades administrativas;
* login é referência para autenticação;
* criação de mesa é referência para operações transacionais simples.

Preserve nomenclatura e estrutura já utilizadas no projeto.

## Escopo da tarefa

Implemente somente o que foi solicitado.

Se a tarefa for:

```text
Criar GET /tables/:table_id
```

não refatore:

* usuários;
* autenticação;
* logs;
* outras rotas;
* schema do banco.

A menos que uma alteração seja necessária para a tarefa funcionar.

## Antes de editar

Antes de modificar arquivos:

1. Leia `mysql-database/database.sql`.
2. Leia `docs/foodstuff-context.md`.
3. Leia `docs/api-conventions.md`.
4. Inspecione as implementações existentes relacionadas à tarefa.
5. Identifique os arquivos que realmente precisam ser alterados.

## Depois de editar

Depois da implementação:

1. Verifique imports e nomes.
2. Verifique parâmetros das funções.
3. Verifique queries e placeholders.
4. Verifique tratamento de erros.
5. Execute as verificações disponíveis no projeto.
6. Revise o diff.
7. Não faça commit ou push automaticamente.

## Regra importante

Não assuma uma regra de negócio apenas porque ela parece comum em sistemas de restaurante.

O comportamento do Foodstuff deve seguir o contexto documentado no projeto.
