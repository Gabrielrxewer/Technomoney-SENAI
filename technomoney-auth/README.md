# Technomoney Auth Service

Serviço responsável por autenticação, emissão de tokens e suporte a fluxos OIDC.

## Variáveis de ambiente relevantes

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `TOTP_ENC_KEY` | Sim | Chave forte (>= 32 caracteres) para criptografar segredos TOTP. |
| `INTROSPECTION_CLIENTS` | Sim | Lista separada por vírgula no formato `clientId:clientSecret` autorizada a consultar `/oauth2/introspect`. |
| `INTROSPECTION_MTLS_ALLOWED_CNS` | Não | Lista opcional de valores `CN` aceitos para clientes autenticados via mTLS. |

> Gere segredos exclusivos por cliente e mantenha-os em um cofre seguro. Tokens
> de acesso só são considerados ativos se a sessão (`sid`) correspondente estiver
> marcada como não revogada na tabela `sessions`.

## Boas práticas de segurança

* Rejeitamos clientes não autenticados na introspecção com respostas sanitizadas e status HTTP adequado, evitando vazamento de detalhes de implementação e reduzindo vetores de enumeração.
