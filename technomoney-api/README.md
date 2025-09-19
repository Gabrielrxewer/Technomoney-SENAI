# Technomoney API

## Visão geral do serviço
A Technomoney API expõe endpoints responsáveis por orquestrar dados de mercado e operações da plataforma, servindo como um backend de domínio para os canais web e mobile. O serviço foi construído em Node.js/Express, persiste dados via Sequelize e mantém logs estruturados com Pino, sempre com foco em validações rígidas de autenticação e autorização.

## Fluxo de autenticação e introspecção
1. **Recepção do token** – As requisições devem enviar um `Authorization` header com portador Bearer clássico ou tokens DPoP (`DPoP <token>`). O middleware trata ambos os formatos.
2. **Introspecção obrigatória** – Todo token é encaminhado ao serviço de introspecção configurado (`AUTH_INTROSPECTION_URL`). A chamada é realizada via `POST`, com `Basic Auth` composto por `AUTH_INTROSPECTION_CLIENT_ID` e `AUTH_INTROSPECTION_CLIENT_SECRET`. O retorno precisa conter `active: true`; respostas diferentes resultam em `401 Unauthorized` com cabeçalho `WWW-Authenticate`.
3. **Tratamento de DPoP** – Mesmo para tokens DPoP, a API exige introspecção bem sucedida. O provedor de identidade deve validar a prova criptográfica DPoP e sinalizar o token como ativo antes que a Technomoney API aceite a requisição.
4. **Níveis de garantia (AAL)** – Tokens emitidos para step-up/MFA (por exemplo, com `acr: "step-up"` ou escopo `auth:stepup`) são recusados com erro `insufficient_aal`. A API espera que flows de alto nível de autenticação sejam tratados em canais próprios, evitando que credenciais de maior privilégio sejam reutilizadas inadvertidamente.
5. **Dados anexados à requisição** – Após introspecção válida, informações como `sub`, `username`, `jti`, escopos e validade (`exp`) são anexadas a `req.user` para uso das rotas protegidas.

### Expectativas de segurança
- **Sempre usar HTTPS/TLS** tanto para consumidores quanto para o endpoint de introspecção e fontes externas (ex.: JWKS, APIs de mercado).
- **Rotação periódica das credenciais** (`AUTH_INTROSPECTION_CLIENT_SECRET`, chaves JWKS) e armazená-las em cofre seguro.
- **Aplicar políticas de escopo** em cada rota e monitorar tentativas de acesso negado via logs estruturados.
- **Habilitar DPoP apenas quando o provedor suportar prova criptográfica completa**, garantindo binding ao cliente.
- **Configurar limites e auditoria no banco de dados** (apenas tráfego via TLS, contas de serviço com least privilege).

## Configuração e execução local
1. **Pré-requisitos**
   - Node.js 20+
   - Banco PostgreSQL (ou outro dialeto compatível com Sequelize indicado por `DB_DRIVER`).
2. **Instalação de dependências**
   ```bash
   npm install
   ```
3. **Configuração de variáveis**
   - Copie `prod.env` para `.env` e ajuste valores conforme ambiente.
4. **Migrações de banco**
   ```bash
   npm run migrate
   ```
5. **Execução em desenvolvimento**
   ```bash
   npm run dev
   ```
6. **Build e execução em produção**
   ```bash
   npm run build
   npm start
   ```

## Variáveis de ambiente
| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `PORT` | Não (default `4002`) | Porta HTTP exposta pelo serviço. Sempre publicar atrás de um proxy com TLS. |
| `NODE_ENV` | Sim | Ambiente de execução (`development`, `test`, `production`). Controla logs e otimizações. |
| `LOG_LEVEL` | Não | Nivel de log (`debug`, `info`, `warn`, `error`). Defina `info` em produção. |
| `DB_HOST` | Sim | Host do banco de dados. Use endpoints internos com TLS. |
| `DB_PORT` | Não (default `5432`) | Porta do banco. |
| `DB_USERNAME` | Sim | Usuário com privilégios mínimos no banco. |
| `DB_PASSWORD` | Sim | Senha do usuário do banco; armazene em cofre seguro. |
| `DB_DATABASE` | Sim | Nome do schema/banco utilizado pela aplicação. |
| `DB_DRIVER` | Sim | Dialeto suportado pelo Sequelize (`postgres`, `mssql`, etc.). |
| `MARKET_API_BASE_URL` | Não | Base URL para a API de dados de mercado. Utilize HTTPS. |
| `SWAGGER_FILE` | Não | Caminho para arquivo OpenAPI a ser servido pela documentação. |
| `AUTH_INTROSPECTION_URL` | Sim | Endpoint OAuth2 de introspecção de tokens. Deve estar protegido por TLS. |
| `AUTH_INTROSPECTION_CLIENT_ID` | Sim (se introspecção requer cliente) | Identificador do cliente registrado no provedor de identidade. |
| `AUTH_INTROSPECTION_CLIENT_SECRET` | Sim (se cliente usa segredo) | Segredo do cliente para introspecção; rotacione frequentemente. |
| `AUTH_JWKS_URL` | Sim | URL pública das chaves JWKS do emissor. Mantém compatibilidade com validações futuras. |
| `AUTH_ISSUER` | Sim | Identificador (`iss`) esperado dos tokens. |
| `AUTH_AUDIENCE` | Sim | Audiência (`aud`) esperada. |
| `AUTH_CLOCK_TOLERANCE` | Não | Folga (em segundos) para validação de exp/nbf. |
| `AUTH_ALLOWED_ALGS` | Não | Lista separada por vírgulas dos algoritmos aceitos (ex.: `RS256,ES256`). |
| `AUTH_STATIC_JWKS` | Não | JWKS estático (JSON) para contingência. Proteja e rotacione com rigor. |

> **Importante:** Não armazene segredos diretamente no repositório. Utilize `.env` apenas em desenvolvimento local e carregue valores em produção via variáveis de ambiente ou serviços de segredo.

## Testes
- Executar a suíte de testes automatizados:
  ```bash
  npm test
  ```
- Garanta que os testes sejam executados em ambiente isolado, com `NODE_ENV=test`, evitando interferência em bancos produtivos.

## Operação segura e manutenção
- **Monitoramento contínuo**: acompanhe falhas de introspecção e bloqueios de AAL via dashboards de observabilidade.
- **Rotina de rotação**: defina cronogramas para troca de segredos do cliente, certificados TLS e chaves privadas DPoP.
- **Revisão de dependências**: mantenha `npm audit` parte do pipeline e aplique patches rapidamente.
- **Backups criptografados**: armazene backups do banco com criptografia e testes de restauração periódicos.
