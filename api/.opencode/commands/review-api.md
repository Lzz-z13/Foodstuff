---

description: Revisa as alterações atuais da Foodstuff API
agent: plan
-----------

Faça uma revisão somente das alterações atuais da API do Foodstuff.

Primeiro leia:

* `AGENTS.md`
* `mysql-database/database.sql`
* `docs/foodstuff-context.md`
* `docs/api-conventions.md`

Analise as alterações Git da API.

Considere:

* arquivos modificados;
* arquivos staged;
* arquivos unstaged;
* novos arquivos da API que ainda não estejam rastreados pelo Git.

Não modifique arquivos.

Verifique especificamente:

* erros de lógica;
* parâmetros invertidos;
* nomes de campos incorretos;
* tabelas ou colunas inexistentes;
* FKs e relacionamentos utilizados incorretamente;
* SQL incorreto;
* placeholders incorretos;
* falta de tratamento de erros;
* status HTTP incorretos;
* autenticação;
* autorização por cargo;
* transações incompletas;
* rollback;
* release da conexão;
* logs incorretos;
* `entity_id` apontando para o registro errado;
* violações das regras de negócio do Foodstuff;
* código duplicado desnecessário;
* alterações fora do escopo.

Para cada problema encontrado, informe:

* gravidade;
* arquivo;
* linha, quando possível;
* problema;
* correção sugerida.

Se não encontrar problemas, diga explicitamente que não foram encontrados problemas relevantes.
