export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/.git/**']
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(_|React)'
        }
      ],
      'no-console': 'off',
      'prefer-const': 'warn'
    }
  }
];
