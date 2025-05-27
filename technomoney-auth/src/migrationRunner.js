const { exec } = require("child_process");

console.log("Rodando migrations...");

exec("npx sequelize-cli db:migrate", (error, stdout, stderr) => {
  if (error) {
    console.error(`Erro ao rodar migrations: ${error.message}`);
    process.exit(1);
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(stdout);

  console.log("Migrations concluídas. Iniciando servidor com nodemon...");

  const nodemon = exec("nodemon");

  nodemon.stdout.on("data", (data) => {
    process.stdout.write(data);
  });

  nodemon.stderr.on("data", (data) => {
    process.stderr.write(data);
  });

  nodemon.on("close", (code) => {
    console.log(`Servidor finalizado com código ${code}`);
  });
});
