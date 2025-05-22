const { readFileSync } = require('fs');
const { resolve } = require('path');

async function run() {
  try {
    const msgFile = process.argv[2];
    if (!msgFile) {
      console.error('Mensagem de commit não encontrada.');
      process.exit(1);
    }

    const msg = readFileSync(resolve(msgFile), 'utf8').trim();

    const commitlintModule = await import('@commitlint/lint');
    const lint = commitlintModule.default || commitlintModule.lint;

    const loadModule = await import('@commitlint/load');
    const load = loadModule.default || loadModule.load;

    const config = await load();

    const report = await lint(msg, config.rules, config.parserPreset);

    if (report.errors.length === 0) {
      process.exit(0);
    }

    let hasTypeEmpty = false;
    let hasSubjectEmpty = false;

    for (const e of report.errors) {
      if (e.name === 'type-empty') hasTypeEmpty = true;
      if (e.name === 'subject-empty') hasSubjectEmpty = true;
    }

    if (hasTypeEmpty) {
      console.error('\n🚫 Você está esquecendo de adicionar o prefixo ao commit (ex: FIX, FEAT, MERGE).');
    }
    if (hasSubjectEmpty) {
      console.error('\n🚫 Você está esquecendo de adicionar uma descrição clara ao commit após a tag (ex: FIX : Descrição clara).');
    }

    for (const e of report.errors) {
      if (e.name !== 'type-empty' && e.name !== 'subject-empty') {
        console.error(`\n${e.name}: ${e.message}`);
      }
    }

    process.exit(1);
  } catch (err) {
    console.error('Erro ao validar mensagem de commit:', err);
    process.exit(1);
  }
}

run();
