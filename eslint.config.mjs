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
  ]),
  {
    rules: {
      // The codebase intentionally loads data on mount via a `useCallback`
      // fetch invoked from an effect. This React 19 rule flags that standard
      // pattern as a false positive across ~14 components, so it's disabled.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
