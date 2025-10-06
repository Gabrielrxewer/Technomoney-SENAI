const { spawn } = require("child_process");

const DEFAULT_TOTP_KEY =
  "p9ZAq7xM4sN1vT8yR3bC6wH2kJ5fL0GdQzXeUiPoSrYtVh8L_c2BnEmWjRs9F!";

if (!process.env.TOTP_ENC_KEY) {
  process.env.TOTP_ENC_KEY = DEFAULT_TOTP_KEY;
}

const [, , ...cmdArgs] = process.argv;

if (cmdArgs.length === 0) {
  console.error("No command provided to with-totp-key wrapper.");
  process.exit(1);
}

const child = spawn(cmdArgs[0], cmdArgs.slice(1), {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

child.on("error", (error) => {
  console.error(`Failed to start child process: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
