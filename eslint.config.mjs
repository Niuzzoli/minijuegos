import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Session-local git worktrees (e.g. .claude/worktrees/<name>) live inside
    // the repo tree and carry their own .next build cache, which the pattern
    // above doesn't reach since it's not anchored to nested paths.
    "**/.claude/**",
  ]),
]);

export default eslintConfig;
