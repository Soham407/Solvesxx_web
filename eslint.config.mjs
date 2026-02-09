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
    // Supabase Edge Functions use Deno runtime
    "supabase/functions/**",
    // Generated types
    "src/types/supabase.ts",
  ]),
  // Custom rule overrides
  {
    rules: {
      // Disable false positives for hydration patterns (setMounted in useEffect)
      "react-hooks/set-state-in-effect": "off",
      // Disable impure function warnings (Date.now, Math.random are fine in controlled contexts)
      "react-hooks/purity": "off",
      // Disable incompatible library warnings (TanStack Table is widely used)
      "react-hooks/immutability": "off", 
      "react-hooks/incompatible-library": "off",
      // Allow any in catch blocks and specific use cases (warn instead of error)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars prefixed with underscore
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      // Allow empty interfaces for component props extending native elements
      "@typescript-eslint/no-empty-object-type": "off",
      // Allow require imports in config files
      "@typescript-eslint/no-require-imports": "off",
      // img elements are sometimes necessary
      "@next/next/no-img-element": "warn",
      // Unescaped entities warning instead of error
      "react/no-unescaped-entities": "warn",
    }
  }
]);

export default eslintConfig;
