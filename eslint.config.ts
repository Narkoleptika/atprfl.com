import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import narkoleptika from 'eslint-config-narkoleptika'

export default tseslint.config(
    eslint.configs.recommended,
    narkoleptika,
    tseslint.configs.recommended,
    eslintConfigPrettier,
    {
        name: 'app/files-to-lint',
        files: ['**/*.{ts,mts}'],
    },

    {
        name: 'app/files-to-ignore',
        ignores: ['**/dist/**'],
    },
    {
        rules: {
            'spaced-comment': ['error', 'always', { markers: ['/'] }],
        },
    },
)
