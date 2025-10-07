
# Technomoney Fake Market API

Serviço auxiliar em Node.js/Express que simula uma API de dados de mercado para alimentar o dashboard e a carteira. Os preços e métricas são atualizados a cada 30 segundos, preservando campos fundamentais necessários para a experiência do front-end.

## Endpoints
- `GET /acoes/all`: devolve a lista completa de ativos com métricas diárias, fundamentos e metadados (texto analítico, notícias e série histórica).
- `POST /acoes/byname`: recebe `{ "name": "PETR4" }` ou parte do nome/segmento e retorna um array com os ativos encontrados. O endpoint aplica *lookup* por ticker, nome e setor.
- `GET /healthz`: verificação simples de saúde do serviço.

## Formato do payload
Cada ativo segue o contrato abaixo:
```json
{
  "ticker": "PETR4",
  "nome": "Petrobras PN",
  "setor": "Energia",
  "preco": 42.5,
  "variacao": 1.7,
  "volume": 12500000,
  "dy": 15.1,
  "roe": 22.4,
  "pl": 3.5,
  "margem": 35.7,
  "ev_ebit": 2.8,
  "liquidez": 12500000,
  "score": 84,
  "marketCap": 320000000000,
  "dividendYield": 0.151,
  "recomendacao": "Comprar",
  "analise": "Fluxo de caixa forte e política de dividendos agressiva.",
  "bio": "Companhia integrada de energia.",
  "noticias": ["…"],
  "grafico": [40, 41, 42, 43],
  "sede": "Rio de Janeiro, RJ",
  "industria": "Energia",
  "fundacao": 1953,
  "empregados": 45000
}
```

Valores numéricos são flutuantes ou inteiros em formato bruto para permitir que o front formate de acordo com o locale. O histórico (`grafico`) é limitado a 120 pontos para evitar crescimento infinito na memória.

## Variáveis de ambiente
Crie um arquivo `prod.env` ou `.env` com:
```
PORT=4001
CORS_ALLOWED_ORIGINS=*
```
- Ajuste `PORT` se quiser rodar múltiplas instâncias.
- Defina `CORS_ALLOWED_ORIGINS` com uma lista separada por vírgulas em produção para limitar domínios confiáveis.

## Execução local
```bash
npm install
npm run build # opcional para gerar dist
npm run dev   # inicia com ts-node / nodemon
```
O serviço não exige autenticação e deve permanecer acessível apenas em ambientes de desenvolvimento. Em produção use uma fonte real de mercado com TLS e autenticação.
