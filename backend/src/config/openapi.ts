import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registerAuthOpenApi } from "#features/auth/auth.openapi.js";

const registry = new OpenAPIRegistry();
registerAuthOpenApi(registry);

export function createOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "LASU Party Tickets API",
      version: "0.1.0",
    },
    servers: [{ url: "/" }],
  });
}
