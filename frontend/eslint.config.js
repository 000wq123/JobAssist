import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "test-results/**"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}", "test/**/*.{js,jsx}", "e2e/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // The three rules below ship with eslint-plugin-react-hooks v7 and are
      // designed for code compiled by the React Compiler. This project is on
      // React 18.3 without the Compiler, so they fire on idiomatic patterns
      // (e.g. setState-in-effect on mount, react-hook-form `register`) and
      // would only generate noise. Re-enable if/when the Compiler is adopted.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/incompatible-library": "off",
      // Standard rules-of-hooks lints that catch real bugs are kept on.
      "react-hooks/exhaustive-deps": "warn",
      // Project convention is JSDoc instead of PropTypes.
      "react/prop-types": "off",
      // React 17+ JSX transform — no need for `import React`.
      "react/react-in-jsx-scope": "off",
      // German copy contains many apostrophes; entity-encoding everything is noisy.
      "react/no-unescaped-entities": "off",
      // Hard-fail on console statements outside of warn/error in production code.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // AGENTS.md guard — absolute positioning must not be used for layout blocks.
      "no-restricted-syntax": ["warn",
        {
          selector: "JSXAttribute[name.name='className'] > Literal[value=/\\babsolute\\b.*\\b(inset-0|inset-x-0|inset-y-0|left-0|right-0|top-0|bottom-0|w-full|h-full)\\b/]",
          message: "AGENTS.md: absolute positioning is not allowed for layout blocks.",
        },
        {
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property[key.name='position'] > Literal[value='absolute']",
          message: "AGENTS.md: inline absolute positioning is not allowed for layout blocks.",
        },
      ],
    },
  },
];
