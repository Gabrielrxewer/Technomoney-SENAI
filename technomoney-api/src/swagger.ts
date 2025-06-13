import swaggerJsdoc from "swagger-jsdoc";

export const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Assets",
      version: "1.0.0",
      description: "Documentação das operações sobre Assets e AssetRecords",
    },
    servers: [
      {
        url: "http://localhost:4002/api",
        description: "Servidor de desenvolvimento",
      },
    ],
    components: {
      schemas: {
        AssetInput: {
          type: "object",
          required: ["tag", "name"],
          properties: {
            tag: { type: "string", example: "PETR4" },
            name: { type: "string", example: "Petróleo Brasileiro S.A. – Petrobras" }
          },
        },
        Asset: {
          allOf: [
            { $ref: "#/components/schemas/AssetInput" },
            {
              type: "object",
              required: ["id"],
              properties: {
                id: { type: "integer", example: 1 }
              }
            }
          ]
        },
        Acao: {
          type: "object",
          properties: {
            id:        { type: "integer", example: 1 },
            tag:       { type: "string",  example: "PETR4" },
            nome:      { type: "string",  example: "Petróleo Brasileiro S.A. – Petrobras" },
            preco:     { type: "number",  example: 28.34 },
            variacao:  { type: "number",  example: 0.42 },
            volume:    { type: "integer", example: 10000 }
          }
        }
      }
    }
  },
  apis: ["src/controllers/*.ts", "src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
