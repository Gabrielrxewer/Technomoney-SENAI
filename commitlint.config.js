module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
      'type-enum': [
        2,
        'always',
        ['FIX', 'FEAT', 'MERGE', 'DOCS', 'STYLE', 'REFACTOR', 'TEST', 'CHORE']
      ],
      'type-case': [2, 'always', 'upper-case'],
      'header-max-length': [2, 'always', 72],
    },
  };
  