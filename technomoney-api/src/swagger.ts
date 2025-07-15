import path from "path";
import YAML from "yamljs";

const swaggerSpec = YAML.load(
  path.join(__dirname, "openapi.yaml")
);

export { swaggerSpec };
