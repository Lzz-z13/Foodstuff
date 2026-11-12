# Abrir o fluxo do cliente pelo QR Code

O React Navigation trata o link. O mesmo app contém o fluxo do cliente e o login da equipe. SecureStore guarda a sessão de cada comanda no aparelho. A API usada pelo app e pelo Front deve ser a mesma.

## Testar agora com Expo Go

O celular e o computador precisam alcançar a mesma rede. Mantenha o Expo na porta 8081. Atualmente app e Front usam a API pública HTTPS do Railway; não é necessário iniciar uma API local.

No primeiro terminal:

```powershell
cd 'C:\Users\45108856873\Desktop\Foodstuff\Foodstuff-Mobile'
npx expo start --lan --port 8081
```

O QR gerado no Front sempre abre o APK instalado, inclusive em `npm run dev`.
Para testar especificamente no Expo Go, use um link `exp://` com o token atual
do mesmo banco do Railway. Se optar pelo script auxiliar com uma API local
disponível, use no segundo terminal:

```powershell
npm run qr:cliente -- 40bc34cc-d6d6-11f1-a798-06e4134249ab
```

O token de exemplo foi consultado em outro ambiente em 05/11/2026 e pode não existir no Railway. Use o token atual exibido pelo Front. O script `qr:cliente` ainda valida o token numa API local; para testar com a API pública, prefira o QR gerado pelo Front.

Escaneie o QR gerado no segundo terminal. No Android, use o leitor do Expo Go; no iPhone, a câmera pode encaminhar o link ao Expo Go. Use uma versão do Expo Go compatível com o SDK do projeto. O QR genérico do primeiro terminal abre o projeto; o segundo inclui a mesa e abre o fluxo do cliente.

O link gerado será:

```text
exp://10.89.240.3:8081/--/mesa/TOKEN_ATUAL
```

## Com o aplicativo Foodstuff instalado

Para gerar um APK independente do Expo Go e do computador, na pasta do mobile:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

O perfil `preview` em `eas.json` gera APK para instalação direta. Baixe o APK pelo
link retornado pelo EAS e instale no celular. O build inclui `scheme: foodstuff`
e usa a API HTTPS do Railway. Não precisa executar `npx expo start`.

No Front, tanto `npm run dev` quanto `npm run build` geram QRs
`foodstuff://mesa/TOKEN`, diretamente no código, sem `.env`.
Para servir o build localmente, execute no Front:

```powershell
npm run build
npm run preview -- --host
```

Reabra o QR no Front de produção e reimprima. O token da mesa não precisa mudar.
Use um leitor que reconheça o esquema do app.
Links `exp://` abrem Expo Go, enquanto links `foodstuff://` abrem o app instalado.

O cliente entra pelo QR sem login. A equipe usa o login normal (MANAGER para o
administrador, WAITER para o garçom); o app direciona pelo cargo retornado na API.
Dentro do cardápio, o botão “Acesso de funcionários” permite voltar ao login.
`foodstuff://equipe` também abre o acesso da equipe. O login continua exigindo a
autenticação do funcionário.

Para clientes sem app instalado, é necessário um cardápio web público e um QR
HTTPS; trocar o esquema por HTTPS sem publicar essa página não resolve.

Se você já gerou e instalou um build nativo com o esquema `foodstuff`:

```powershell
npm run qr:cliente -- 40bc34cc-d6d6-11f1-a798-06e4134249ab app
```

Isso gera `foodstuff://mesa/TOKEN`. O esquema precisa estar incluído no build instalado. Algumas câmeras não reconhecem esquemas próprios; para abertura universal por HTTPS será necessário configurar um domínio com Android App Links/iOS Universal Links.

## Fazer o pedido

1. O QR abre o cardápio da mesa, sem login.
2. Escolha produtos, quantidades e observações; adicione ao carrinho.
3. Revise o carrinho e informe o nome individual ou do grupo.
4. Confirme. O aplicativo abre a comanda, salva a sessão no aparelho e envia os itens juntos à API.
5. Outros pedidos naquele aparelho e mesa reutilizam a comanda. Em aparelhos diferentes, o mesmo QR pode abrir comandas distintas.

Os produtos vêm da API, e os preços e a disponibilidade são validados antes do envio. O carrinho ainda não enviado fica em memória. Ao abrir um QR diferente, esse carrinho é reiniciado; a comanda já aberta permanece salva por mesa. Uma comanda encerrada exige a ação “Nova comanda” para iniciar outro atendimento.

Se a resposta de um envio se perder, o aplicativo pede conferência com o garçom antes de repetir, porque a API atual não oferece idempotência. A integração das telas de pedido do garçom continua fora desta etapa.

## Outras mesas

Use `qr_codes.token`, e não o número da mesa ou o token privado da comanda. Os QR Codes existentes podem ser consultados na rota administrativa `GET /api/foodstuff/tables/:table_id/qr-codes` com a sessão de gerente, ou com uma consulta de leitura ao banco. O comando aceita qualquer token ativo:

```powershell
npm run qr:cliente -- TOKEN_DA_MESA
```

Se o IP mudar durante os testes no Expo Go, atualize o prefixo Expo em `App.js`
e no link usado para esses testes. A API pública HTTPS não muda
quando o IP local muda. O APK com `foodstuff://` não depende desse IP.

## Erro depois de abrir o QR

Se a tela “Não foi possível abrir esta mesa” aparece, o app já abriu pelo link.
A falha é ao consultar a API ou acessar a sessão salva. A tela distingue erro de
rede, demora do servidor e falha de armazenamento. QR inválido ou inativo exibe a
mensagem da API. Uma comanda salva que retorna 404 é descartada apenas quando
não há envio pendente; nesse caso, o cliente pode abrir uma nova comanda na mesa.
Falhas de rede ou envios com resultado desconhecido preservam a sessão.

Referências: [links no Expo](https://docs.expo.dev/linking/into-your-app/) e [configuração de links no React Navigation](https://reactnavigation.org/docs/configuring-links/).
