---

description: Planeja uma funcionalidade da Foodstuff API sem editar arquivos
agent: plan
-----------

Analise a funcionalidade solicitada em:

$ARGUMENTS

Antes de analisar:

1. Leia `AGENTS.md`.
2. Leia `mysql-database/database.sql`.
3. Leia `docs/foodstuff-context.md`.
4. Leia `docs/api-conventions.md`.
5. Inspecione as implementações existentes relacionadas à funcionalidade.
6. Verifique se já existem validators, utilities ou middlewares reutilizáveis.

Não altere arquivos.

Produza um plano objetivo contendo:

1. Endpoint(s) envolvidos.
2. Middleware(s) necessários.
3. Controller(s) envolvidos.
4. Service(s) envolvidos.
5. Validation/utility necessária.
6. Queries SQL necessárias.
7. Regras de negócio aplicáveis.
8. Logs que devem ser registrados.
9. Tratamento de erros esperado.
10. Arquivos que precisarão ser criados ou alterados.

Não invente entidades, colunas, relacionamentos ou regras que não existam no contexto do projeto.

Ao final, destaque qualquer ambiguidade que precise ser resolvida antes da implementação.
