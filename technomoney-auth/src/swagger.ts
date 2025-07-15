import path from "path";
import YAML from "yamljs";

export const swaggerSpec = YAML.load(
  path.join(__dirname, "openapi.yaml"),
);
