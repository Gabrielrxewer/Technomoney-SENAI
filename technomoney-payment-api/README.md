# Technomoney Payment API

Serviço responsável por criar preferências de pagamento no Mercado Pago e
processar notificações de pagamento.

## Requisitos

- Node.js 20 (mesma versão utilizada na imagem `node:20-alpine`)
- Banco de dados compatível com o Sequelize (PostgreSQL recomendado)
- Credenciais válidas do Mercado Pago

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `PORT` | Não (padrão `3001`) | Porta onde a API será exposta. |
| `APP_URL` | Sim | URL pública do serviço usada como `notification_url` no Mercado Pago. Deve ser HTTPS em produção. |
| `MP_ACCESS_TOKEN` | Sim | Access token da conta Mercado Pago utilizada para criar preferências. |
| `MP_WEBHOOK_SECRET` | Condicional | Chave secreta usada para validar a assinatura (`X-Signature`) enviada pelo Mercado Pago. Requer também o cabeçalho `X-Request-Id`. |
| `MP_WEBHOOK_TOKEN` | Condicional | Token estático aceito no cabeçalho `X-Token` do webhook. Utilizado apenas se a assinatura não estiver configurada. |
| `DB_USERNAME` | Sim | Usuário do banco de dados. |
| `DB_PASSWORD` | Sim | Senha do banco de dados. |
| `DB_DATABASE` | Sim | Nome do banco de dados. |
| `DB_HOST` | Sim | Host do banco de dados. |
| `DB_DRIVER` | Sim | Dialeto suportado pelo Sequelize (ex.: `postgres`). |
| `NODE_ENV` | Não | Ambiente de execução (`development`, `production`, etc.). |
| `AUTH_INTROSPECTION_URL` | Sim | Endpoint do serviço de autenticação utilizado para validar tokens de acesso. |
| `AUTH_INTROSPECTION_CLIENT_ID` | Sim | Identificador do cliente autorizado a consultar o endpoint de introspecção. |
| `AUTH_INTROSPECTION_CLIENT_SECRET` | Sim | Segredo usado na autenticação HTTP Basic ao consultar o endpoint de introspecção. |

> Pelo menos uma das variáveis `MP_WEBHOOK_SECRET` ou `MP_WEBHOOK_TOKEN` deve
> estar definida para que o webhook seja aceito.

## Segurança do webhook

- Quando `MP_WEBHOOK_SECRET` estiver configurada, o serviço exigirá os cabeçalhos
  `X-Signature` e `X-Request-Id` e validará a assinatura seguindo a
  recomendação do Mercado Pago (`id:topic:requestId:ts`).
- Caso a assinatura não esteja habilitada, o serviço poderá aceitar o cabeçalho
  `X-Token` com o valor definido em `MP_WEBHOOK_TOKEN`.
- Requisições que não atenderem a nenhum desses mecanismos serão rejeitadas
  com `401 Unauthorized`.
- Para garantir o princípio de privilégio mínimo, armazene as credenciais de
  introspecção (`AUTH_INTROSPECTION_CLIENT_*`) em um cofre de segredos e
  rotacione-as com frequência.

## Execução local

```bash
npm install
npm run dev
```

O servidor expõe as rotas sob `/api` e aplica automaticamente redirecionamento
para HTTPS, HSTS e cabeçalhos de segurança via Helmet quando não estiver em
ambientes de desenvolvimento.
