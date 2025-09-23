const { spawn } = require("child_process");
const path = require("path");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...options.env },
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Command ${command} ${args.join(" ")} terminated by signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Command ${command} ${args.join(" ")} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

(async () => {
  const stubPath = path.resolve(__dirname, "../test-shims/node_modules");
  const existingNodePath = process.env.NODE_PATH || "";
  const nodePath = existingNodePath
    ? `${stubPath}${path.delimiter}${existingNodePath}`
    : stubPath;
  const env = {
    TS_NODE_TRANSPILE_ONLY: "1",
    TS_NODE_FILES: "1",
    NODE_PATH: nodePath,
    JOSE_STUB: "1",
  };
  await run(
    "node",
    [
      "--test",
      "-r",
      "ts-node/register",
      "src/controllers/__tests__/auth.controller.spec.ts",
      "src/controllers/__tests__/oidc.introspect.spec.ts",
      "src/middlewares/__tests__/dpop.middleware.spec.ts",
      "src/config/__tests__/config.bridge.spec.ts",
      "src/services/__tests__/auth.service.recovery.spec.ts",
    ],
    {
      env,
    }
  );
})();
