# Technomoney-SENAI
Protótipo da Technomoney destinada a avaliação do SENAI

## Configuração do `TOTP_ENC_KEY`

O serviço de autenticação exige que a variável de ambiente `TOTP_ENC_KEY` seja
definida com um segredo forte para criptografar os segredos de TOTP. Utilize uma
string com pelo menos 32 caracteres misturando letras maiúsculas, minúsculas,
números e símbolos. Um exemplo de configuração pode ser encontrado em
[`technomoney-auth/.env.example`](technomoney-auth/.env.example). Substitua esse
valor por outro gerado especificamente para o seu ambiente antes de ir para
produção.