# Abrir o fluxo do cliente pelo QR Code

Não há arquivo de ambiente para essa configuração. Nenhuma dependência foi adicionada. O React Navigation já instalado trata o link; o script de terminal reaproveita a função de QR Code do Expo. SecureStore, que o projeto já usa, guarda somente a sessão da comanda.

## Testar agora com Expo Go

O celular e o computador precisam alcançar a mesma rede. Mantenha a API na porta 5000 e o Expo na porta 8081.

No primeiro terminal:

```powershell
cd 'C:\Users\Usuario\OneDrive\Desktop\PROJETOS CODIGOS\Foodstuff\Foodstuff-Mobile'
npx expo start --lan --port 8081
```

No segundo terminal, na mesma pasta:

```powershell
npm run qr:cliente -- 40bc34cc-d6d6-11f1-a798-06e4134249ab
```

Esse é um token ativo da **mesa 1**, consultado no banco em 05/11/2026. O comando consulta a API para validar o token antes de imprimir o QR. Não cria um registro no banco. Se o ambiente for recriado e o token mudar, use o novo token.

Escaneie o QR gerado no segundo terminal. No Android, use o leitor do Expo Go; no iPhone, a câmera pode encaminhar o link ao Expo Go. Use uma versão do Expo Go compatível com o SDK do projeto. O QR genérico do primeiro terminal abre o projeto; o segundo inclui a mesa e abre o fluxo do cliente.

O link gerado será:

```text
exp://192.168.24.12:8081/--/mesa/40bc34cc-d6d6-11f1-a798-06e4134249ab
```

## Com o aplicativo Foodstuff instalado

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

Se o IP mudar, atualize o endereço direto no serviço da API, o prefixo Expo Go em `App.js` e os endereços no script `scripts/qr-cliente.cjs`.

Referências: [links no Expo](https://docs.expo.dev/linking/into-your-app/) e [configuração de links no React Navigation](https://reactnavigation.org/docs/configuring-links/).
