import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // happy-dom instead of the plan's jsdom: jsdom@27's dependency chain
    // (@asamuzakjp/css-color -> @csstools/css-calc, ESM-only, no CJS build)
    // throws ERR_REQUIRE_ESM under vitest's forks pool in this environment.
    // happy-dom provides the same window/localStorage surface our tests need.
    environment: 'happy-dom',
    globals: true,
  },
});
