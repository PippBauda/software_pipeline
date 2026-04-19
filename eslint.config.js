import js from "@eslint/js"
import globals from "globals"

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    ignores: [
      "**/node_modules/",
      "**/*.md",
      "**/*.json",
      "**/*.txt",
      "copilot/",
      "opencode/agents/",
      "opencode/skills/",
      "opencode/compaction-prompt.txt",
    ],
  },
]
