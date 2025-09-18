const { spawn } = require("child_process");

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
  const env = {
    TS_NODE_TRANSPILE_ONLY: "1",
    TS_NODE_FILES: "1",
  };
  await run("node", ["--test", "-r", "ts-node/register", "src/controllers/__tests__/auth.controller.spec.ts"], {
    env,
  });
})();
