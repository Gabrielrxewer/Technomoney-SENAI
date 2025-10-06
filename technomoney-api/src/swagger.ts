import fs from "fs";
import path from "path";
import YAML from "yamljs";

const candidates = [
  process.env.SWAGGER_FILE,
  path.resolve(__dirname, "openapi.yaml"),
  path.resolve(__dirname, "..", "openapi.yaml"), 
  path.resolve(process.cwd(), "openapi.yaml"), 
].filter(Boolean) as string[];

const swaggerPath =
  candidates.find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  }) || null;

if (!swaggerPath) {
  throw new Error(
    `openapi.yaml não encontrado. Defina SWAGGER_FILE ou coloque o arquivo em dist/ ou na raiz.\n` +
      `Procurado em:\n- ${candidates.join("\n- ")}`
  );
}

export const swaggerSpec = YAML.load(swaggerPath);
