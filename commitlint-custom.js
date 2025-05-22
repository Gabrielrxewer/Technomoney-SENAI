const { readFileSync } = require('fs');
const { resolve } = require('path');

async function run() {
  try {
    const msgFile = process.argv[2];
    if (!msgFile) {
      console.error('❌ Mensagem de commit não encontrada. Por favor, forneça uma mensagem para o commit.');
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
    let hasSubjectCaseError = false;

    for (const e of report.errors) {
      if (e.name === 'type-empty') hasTypeEmpty = true;
      if (e.name === 'subject-empty') hasSubjectEmpty = true;
      if (e.name === 'subject-case') hasSubjectCaseError = true;
    }

    if (hasTypeEmpty) {
      console.error('\n🚫 ERRO: Parece que você esqueceu de adicionar o prefixo no commit.');
      console.error('Por favor, comece sua mensagem com um dos seguintes tipos: FIX, FEAT, MERGE, DOCS, STYLE, REFACTOR, TEST, CHORE.');
      console.error('Exemplo correto: "FEAT: adiciona nova funcionalidade"\n');
    }

    if (hasSubjectEmpty) {
      console.error('\n🚫 ERRO: Sua mensagem de commit está sem descrição clara.');
      console.error('Depois do prefixo, inclua uma descrição breve e objetiva do que foi alterado.');
      console.error('Exemplo correto: "FIX: corrige bug no formulário de login"\n');
    }

    if (hasSubjectCaseError) {
      console.error('\n🚫 ERRO: A descrição do commit deve estar em letras minúsculas.');
      console.error('Por favor, escreva a mensagem após o prefixo usando letras minúsculas.');
      console.error('Exemplo correto: "FEAT: adiciona suporte a login via google"\n');
    }

    for (const e of report.errors) {
      if (!['type-empty', 'subject-empty', 'subject-case'].includes(e.name)) {
        console.error(`\n⚠️ Erro na mensagem: ${e.message}`);
      }
    }

    process.exit(1);
  } catch (err) {
    console.error('❌ Erro ao validar a mensagem de commit:', err);
    process.exit(1);
  }
}

run();
