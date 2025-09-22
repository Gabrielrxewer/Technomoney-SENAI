# Technomoney Auth Service

Serviço responsável por autenticação, emissão de tokens e suporte a fluxos OIDC.

## Variáveis de ambiente relevantes

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `TOTP_ENC_KEY` | Sim | Chave forte (>= 32 caracteres) para criptografar segredos TOTP. |
| `INTROSPECTION_CLIENTS` | Sim | Lista separada por vírgula no formato `clientId:clientSecret` autorizada a consultar `/oauth2/introspect`. |
| `INTROSPECTION_MTLS_ALLOWED_CNS` | Não | Lista opcional de valores `CN` aceitos para clientes autenticados via mTLS. |
| `DB_USERNAME` | Sim | Usuário dedicado do banco de dados. Garanta privilégios mínimos para reduzir impacto em caso de comprometimento. |
| `DB_PASSWORD` | Sim | Senha forte do banco de dados, armazenada em cofre seguro. |
| `DB_DATABASE` | Sim | Nome do banco utilizado pelo serviço de autenticação. |
| `DB_HOST` | Sim | Host do servidor de banco de dados acessível somente pela rede interna confiável. |
| `DB_PORT` | Sim | Porta do banco (ex.: `5432` para PostgreSQL). |
| `DB_DRIVER` | Sim | Dialeto suportado pelo Sequelize (ex.: `postgres`). |

> Gere segredos exclusivos por cliente e mantenha-os em um cofre seguro. Tokens
> de acesso só são considerados ativos se a sessão (`sid`) correspondente estiver
> marcada como não revogada na tabela `sessions`.

## Migrações do banco de dados

1. Configure as variáveis de ambiente acima (idealmente via `prod.env` ou um gerenciador seguro de segredos).
2. Certifique-se de que o arquivo `.sequelizerc` aponte para `src/config/config.js`, que expõe as credenciais TypeScript para o `sequelize-cli` com suporte a `ts-node`.
3. Execute `npx sequelize-cli db:migrate` para aplicar as migrações existentes, incluindo a criação da tabela `sessions`, antes de liberar o login em produção.

> Restrinja o acesso a esse comando a pipelines autenticadas e monitore a execução para evitar execuções indevidas que possam alterar o esquema sem autorização.

## Boas práticas de segurança

* Rejeitamos clientes não autenticados na introspecção com respostas sanitizadas e status HTTP adequado, evitando vazamento de detalhes de implementação e reduzindo vetores de enumeração.
