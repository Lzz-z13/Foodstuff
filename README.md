<div align="center">

# Foodstuff

### Sistema de gerenciamento para restaurantes — Trabalho de Conclusão de Curso

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

**API REST · Painel Web · Aplicativo Mobile · MySQL**

</div>

---

## Sobre o projeto

O **Foodstuff** é um sistema desenvolvido para digitalizar e centralizar as operações de um restaurante. A solução integra o gerenciamento administrativo, o atendimento, a cozinha e o controle financeiro em uma aplicação composta por uma API REST, um painel Web e um aplicativo Mobile.

### Objetivos

- Centralizar as informações operacionais do restaurante.
- Organizar o fluxo de atendimento entre salão, caixa e cozinha.
- Gerenciar funcionários, mesas, comandas, pedidos e pagamentos.
- Controlar o acesso às funcionalidades conforme o cargo do funcionário.
- Permitir que clientes acessem suas comandas por QR Code, sem criar uma conta.
- Registrar ações relevantes para auditoria e rastreabilidade.

### Regra de negócio

A tabela `users` armazena exclusivamente os funcionários autenticados no sistema. Os cargos utilizados são `MANAGER`, `WAITER`, `KITCHEN` e `CASHIER`.

Os clientes não possuem login. Eles acessam suas comandas por meio de QR Codes associados às mesas, utilizando o mecanismo de sessão baseado em `session_token`.

---

## Estrutura do repositório

| Diretório | Responsabilidade | Tecnologias principais |
|---|---|---|
| [`api/`](./api) | Backend e API REST | Node.js, Express, MySQL2, JWT, bcrypt e Nodemailer |
| [`Foodstuff-FrontWeb/`](./Foodstuff-FrontWeb) | Painel Web de gerenciamento | React 19, Vite, Tailwind CSS 4 e Axios |
| [`Foodstuff-Mobile/`](./Foodstuff-Mobile) | Aplicativo Mobile para a operação | React Native e Expo |

```text
Foodstuff/
├── api/                    # API REST e configuração do banco
├── Foodstuff-FrontWeb/     # Painel Web
├── Foodstuff-Mobile/       # Aplicativo Mobile
└── README.md
```

## Arquitetura e tecnologias

O projeto utiliza uma arquitetura cliente-servidor. O painel Web e o aplicativo Mobile enviam requisições HTTP à API REST, que valida as requisições, aplica as regras de negócio e acessa o banco de dados MySQL.

### Backend

| Tecnologia | Finalidade |
|---|---|
| Node.js | Ambiente de execução JavaScript |
| Express | Organização das rotas e criação da API REST |
| MySQL2 | Comunicação com o banco MySQL |
| MySQL 8 | Persistência dos dados |
| JWT | Autenticação baseada em tokens |
| bcrypt | Hash de senhas |
| Nodemailer | Envio de e-mails do sistema |
| Jest e Supertest | Testes automatizados da API |

### Painel Web

| Tecnologia | Finalidade |
|---|---|
| React 19 | Construção da interface por componentes |
| Vite | Servidor de desenvolvimento e ferramenta de build |
| Tailwind CSS 4 | Estilização da interface |
| Axios | Comunicação HTTP com a API |

### Aplicativo Mobile

| Tecnologia | Finalidade |
|---|---|
| React Native | Desenvolvimento da interface mobile |
| Expo | Ferramentas e ambiente de desenvolvimento mobile |

### Infraestrutura

- Docker e Docker Compose para executar a API e o MySQL em containers.
- Git para controle de versão.
- Expo Go para testar o aplicativo em um dispositivo compatível.

---

## Funcionalidades

### Autenticação e controle de acesso

O sistema utiliza autenticação JWT e contempla os seguintes cargos:

| Cargo | Identificador |
|---|---|
| Gerente | `MANAGER` |
| Garçom | `WAITER` |
| Cozinha | `KITCHEN` |
| Caixa | `CASHIER` |

As permissões devem ser verificadas no backend; ocultar uma opção na interface não substitui a autorização das rotas da API.

### Primeiro acesso e troca de senha

O sistema contempla um fluxo de primeiro acesso com senha temporária enviada por e-mail. O campo `first_login = 1` indica que o funcionário precisa concluir a troca de senha antes de utilizar as demais funcionalidades protegidas, conforme as regras implementadas na API.

### Recuperação de senha por OTP

A recuperação de senha utiliza um código OTP (*One-Time Password*) de seis dígitos. As regras documentadas para esse fluxo incluem validade de cinco minutos e limite de cinco tentativas.

| Método | Endpoint | Finalidade |
|---|---|---|
| `POST` | `/auth/password-reset/request` | Solicita a recuperação e envia o código por e-mail |
| `POST` | `/auth/password-reset/verify` | Valida o código e determina a próxima etapa |
| `POST` | `/auth/password-reset/confirm` | Redefine a senha utilizando um token de uso único |

Os endpoints são relativos às rotas de autenticação. Consulte o [guia da API](./API-GUIDE.md) para verificar os caminhos completos e os contratos de cada operação.

### Gerenciamento de funcionários

O sistema contempla operações de cadastro e gerenciamento de funcionários. A desativação utiliza *soft delete* por meio do campo `is_active`, preservando o registro no banco de dados.

### Mesas, QR Codes e comandas

O projeto contempla o gerenciamento de mesas, a geração de até quatro QR Codes por mesa e o acesso dos clientes às comandas por meio de `session_token`, sem necessidade de cadastro ou login.

### Pedidos e pagamentos

O sistema contempla o gerenciamento de pedidos e comandas, além do registro de pagamentos divididos, conforme as regras de negócio implementadas.

### Auditoria

A tabela `audit_logs` é utilizada para registrar ações relevantes e apoiar a rastreabilidade das operações realizadas no sistema.

---

## Pré-requisitos

Antes de iniciar, instale as ferramentas abaixo:

| Ferramenta | Requisito | Finalidade |
|---|---|---|
| Node.js | Versão 20 ou superior | Executar a API e o ambiente Web |
| Docker | Versão recente | Executar os containers |
| Docker Compose | Versão compatível com o projeto | Orquestrar API e MySQL |
| Git | Versão compatível | Clonar o repositório |
| Expo Go | Versão compatível com o projeto | Testar o aplicativo em um celular |

O ambiente também precisa ter acesso às dependências do projeto e às configurações necessárias para a conexão com o banco de dados e o serviço de e-mail.

---

## Instalação e execução

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd Foodstuff
```

Substitua `<url-do-repositorio>` pela URL do repositório.

### 2. Configurar a API e o banco de dados

Entre na pasta da API:

```bash
cd api
```

Crie o arquivo `.env` a partir do modelo:

```bash
cp .env.example .env
```

No Windows, se o terminal não reconhecer `cp`, copie o arquivo `.env.example` manualmente e renomeie a cópia para `.env`.

Preencha o `.env` com valores próprios para seu ambiente. Exemplo de configuração:

```env
DB_HOST=db
DB_USER=foodstuff
DB_PASSWORD=defina-sua-senha
DB_NAME=foodstuff

EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
ALLOWED_EMAIL_DOMAINS=foodstuff.com,gmail.com
SKIP_VALIDATORS=false

SECRET=gere-um-segredo-jwt-forte
```

Os valores acima são exemplos de configuração e devem ser substituídos pelos valores apropriados para o ambiente local. Para integrações com Gmail, `EMAIL_PASS` deve receber uma senha de aplicativo. O valor de `SECRET` deve ser forte, exclusivo e mantido fora do controle de versão.

### 3. Iniciar os containers

Ainda na pasta `api/`, execute:

```bash
docker compose up -d --build
```

O Docker Compose inicia os serviços configurados no projeto. O banco é inicializado conforme os arquivos de `api/mysql-database/` e a configuração do Compose.

| Serviço | Porta | Descrição |
|---|---|---|
| API (`app`) | `5000` | Disponibiliza os endpoints REST |
| MySQL (`db`) | `3307` no host → `3306` no container | Armazena os dados da aplicação |

A API se conecta ao MySQL pela rede Docker usando o nome do serviço `db` e a porta interna `3306`. A porta `3307` é destinada ao acesso pelo host, conforme a configuração documentada.

### 4. Verificar os serviços

Confira o estado dos containers:

```bash
docker compose ps
```

Verifique o endpoint de saúde da API:

```bash
curl http://localhost:5000/api/foodstuff/health
```

Para acompanhar os logs da API:

```bash
docker compose logs -f app
```

Para acompanhar os logs do banco:

```bash
docker compose logs -f db
```

### 5. Usuário inicial

O ambiente pode criar um usuário inicial por meio do mecanismo de seed configurado no projeto. Consulte a configuração correspondente para entender como o usuário é criado e como definir suas credenciais. Utilize uma senha exclusiva para o ambiente e altere qualquer senha temporária no primeiro acesso.

### 6. Executar o painel Web

Em outro terminal, na raiz do repositório, execute:

```bash
cd Foodstuff-FrontWeb
npm install
npm run dev
```

O painel ficará disponível, por padrão, em `http://localhost:5173`.

#### Configuração da API no Web

O endereço-base do Axios está configurado em `Foodstuff-FrontWeb/src/services/axios.js`. Confira a propriedade `baseURL` e ajuste-a conforme o ambiente utilizado.

Ao acessar o painel por outro dispositivo, `localhost` aponta para o próprio dispositivo. Nesse caso, utilize o endereço IP do computador que executa a API e uma porta acessível pela rede.

### 7. Executar o aplicativo Mobile

Em outro terminal, na raiz do repositório, execute:

```bash
cd Foodstuff-Mobile
npm install
npx expo start
```

Siga as instruções exibidas pelo Expo para abrir o aplicativo. Para testar em um celular físico, conecte o celular e o computador à mesma rede Wi-Fi e utilize uma versão do Expo Go compatível com o projeto.

#### Configuração da API no Mobile

O endereço-base está configurado em `Foodstuff-Mobile/src/services/api.js`. Ajuste-o para um endereço acessível pelo dispositivo. Em um celular físico, `localhost` normalmente não aponta para o computador que executa a API.

---

## Banco de dados

O projeto utiliza MySQL 8 para persistir os dados. O arquivo de referência do esquema é `api/mysql-database/database.sql`.

Antes de modificar a estrutura, verifique as tabelas, os relacionamentos, as restrições e o mecanismo de inicialização definido no Docker Compose. Mantenha a definição do banco consistente com a implementação da API e atualize os testes e a documentação quando necessário.

O ambiente Docker utiliza um volume chamado `db_data` para persistência, conforme a configuração do Compose. O comando `docker compose down -v` pode remover os volumes associados ao projeto e apagar dados persistidos. Para reiniciar apenas a API, utilize:

```bash
docker compose restart app
```

---

## Testes automatizados

A API utiliza Jest e Supertest para testes automatizados. Na pasta `api/`, execute:

```bash
npm test
```

Os testes utilizam um banco isolado chamado `foodstuff_test`. É necessário que o MySQL esteja acessível e que as variáveis `TEST_DB_*` estejam configuradas conforme a implementação do projeto. Mantenha o banco de testes separado do banco de desenvolvimento.

---

## Scripts disponíveis

| Diretório | Comando | Finalidade |
|---|---|---|
| `api/` | `npm start` | Inicia a API sem Docker, com MySQL local configurado |
| `api/` | `npm test` | Executa os testes automatizados |
| `api/` | `docker compose up -d --build` | Constrói e inicia os serviços em containers |
| `api/` | `docker compose restart app` | Reinicia o container da API |
| `api/` | `docker compose logs -f app` | Acompanha os logs da API |
| `Foodstuff-FrontWeb/` | `npm run dev` | Inicia o servidor de desenvolvimento Web |
| `Foodstuff-FrontWeb/` | `npm run build` | Gera o build de produção |
| `Foodstuff-FrontWeb/` | `npm run lint` | Executa o ESLint |
| `Foodstuff-Mobile/` | `npx expo start` | Inicia o ambiente de desenvolvimento Mobile |

---

## Segurança

O Foodstuff utiliza autenticação e processa informações operacionais. O backend deve validar as permissões de cada cargo, as entradas recebidas e os tokens de acesso. Senhas devem ser armazenadas como hashes, e os fluxos de recuperação devem respeitar prazos de expiração e limites de tentativas.

As credenciais e os segredos de cada ambiente devem ser configurados localmente por meio de variáveis de ambiente, sem serem incluídos no repositório. Dados reais de funcionários, clientes ou estabelecimentos não devem ser utilizados em exemplos públicos ou arquivos de demonstração.

---

## Documentação complementar

| Recurso | Descrição |
|---|---|
| [`API-GUIDE.md`](./API-GUIDE.md) | Guia da arquitetura, das rotas e das regras da API |
| [`api/docs/`](./api/docs) | Documentação complementar, contexto do sistema e convenções de implementação |
| [`api/mysql-database/database.sql`](./api/mysql-database/database.sql) | Arquivo de referência do esquema do banco de dados |

---

## Desenvolvimento e contribuição

Ao implementar funcionalidades ou corrigir problemas, considere as regras de negócio e as permissões dos cargos envolvidos. Mantenha a consistência entre API, Web, Mobile e banco de dados, execute os testes aplicáveis e atualize a documentação quando houver mudanças relevantes.

---

<div align="center">

Desenvolvido como Trabalho de Conclusão de Curso.

**Foodstuff — Sistema de gerenciamento para restaurantes**

</div>
