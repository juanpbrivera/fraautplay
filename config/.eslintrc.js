/**
 * 🔍 Configuración de ESLint
 * 
 * Reglas de linting para mantener calidad y consistencia del código.
 * Optimizado para TypeScript y mejores prácticas de desarrollo.
 */

module.exports = {
  // Parser para TypeScript
  parser: '@typescript-eslint/parser',
  
  // Configuración del parser
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true
  },
  
  // Plugins
  plugins: [
    '@typescript-eslint',
    'prettier',
    'import',
    'jsdoc',
    'promise',
    'security'
  ],
  
  // Extends - Configuraciones base
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:promise/recommended',
    'plugin:security/recommended'
  ],
  
  // Ambiente
  env: {
    browser: true,
    node: true,
    es2022: true,
    jest: true
  },
  
  // Reglas personalizadas
  rules: {
    // 🎯 TypeScript
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-use-before-define': ['error', {
      functions: false,
      classes: true,
      variables: true,
      typedefs: true
    }],
    '@typescript-eslint/member-ordering': ['warn', {
      default: [
        // Estáticos
        'public-static-field',
        'protected-static-field',
        'private-static-field',
        'public-static-method',
        'protected-static-method',
        'private-static-method',
        
        // Campos
        'public-field',
        'protected-field',
        'private-field',
        
        // Constructor
        'constructor',
        
        // Métodos públicos
        'public-method',
        
        // Métodos protegidos
        'protected-method',
        
        // Métodos privados
        'private-method'
      ]
    }],
    '@typescript-eslint/naming-convention': [
      'error',
      // Interfaces con I prefix (opcional)
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^[A-Z]',
          match: true
        }
      },
      // Types en PascalCase
      {
        selector: 'typeAlias',
        format: ['PascalCase']
      },
      // Enums en PascalCase
      {
        selector: 'enum',
        format: ['PascalCase']
      },
      // Variables constantes en UPPER_CASE o camelCase
      {
        selector: 'variable',
        modifiers: ['const'],
        format: ['camelCase', 'UPPER_CASE', 'PascalCase']
      },
      // Clases en PascalCase
      {
        selector: 'class',
        format: ['PascalCase']
      }
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    
    // 🎯 JavaScript/General
    'no-console': ['warn', {
      allow: ['warn', 'error', 'info']
    }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-await-in-loop': 'warn',
    'no-return-await': 'error',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in loops iterate over the entire prototype chain. Use Object.{keys,values,entries} instead.'
      }
    ],
    'prefer-const': 'error',
    'prefer-destructuring': ['warn', {
      object: true,
      array: false
    }],
    'prefer-template': 'warn',
    'require-await': 'error',
    'no-useless-constructor': 'off', // Usar el de TypeScript
    
    // 🎯 Imports
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        ['parent', 'sibling'],
        'index',
        'object',
        'type'
      ],
      pathGroups: [
        {
          pattern: '@core/**',
          group: 'internal',
          position: 'before'
        },
        {
          pattern: '@elements/**',
          group: 'internal',
          position: 'before'
        },
        {
          pattern: '@interactions/**',
          group: 'internal',
          position: 'before'
        },
        {
          pattern: '@validations/**',
          group: 'internal',
          position: 'before'
        },
        {
          pattern: '@utilities/**',
          group: 'internal',
          position: 'before'
        },
        {
          pattern: '@types/**',
          group: 'internal',
          position: 'before'
        }
      ],
      'newlines-between': 'never',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }],
    'import/no-duplicates': 'error',
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-useless-path-segments': 'error',
    
    // 🎯 JSDoc
    'jsdoc/check-alignment': 'warn',
    'jsdoc/check-param-names': 'warn',
    'jsdoc/check-tag-names': 'warn',
    'jsdoc/check-types': 'off', // TypeScript se encarga
    'jsdoc/require-description': ['warn', {
      exemptTags: ['param', 'returns']
    }],
    'jsdoc/require-param-description': 'warn',
    'jsdoc/require-returns-description': 'warn',
    
    // 🎯 Promises
    'promise/always-return': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-nesting': 'warn',
    'promise/no-promise-in-callback': 'warn',
    'promise/no-return-in-finally': 'error',
    
    // 🎯 Seguridad
    'security/detect-object-injection': 'off', // Muchos falsos positivos
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    
    // 🎯 Prettier (debe ser el último)
    'prettier/prettier': ['error', {
      endOfLine: 'auto'
    }]
  },
  
  // Overrides para archivos específicos
  overrides: [
    // Archivos de test
    {
      files: ['**/*.spec.ts', '**/*.test.ts'],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'security/detect-object-injection': 'off'
      }
    },
    
    // Archivos de configuración
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off'
      }
    },
    
    // Archivos de ejemplo
    {
      files: ['**/examples/**/*'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
      }
    }
  ],
  
  // Configuración de import resolver
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx']
    }
  },
  
  // Ignorar archivos
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '*.min.js',
    '*.d.ts',
    'rollup.config.js',
    'jest.config.js',
    '.eslintrc.js'
  ]
};