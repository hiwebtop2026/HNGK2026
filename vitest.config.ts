import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      exclude: [
        'node_modules/',
        'src/data/',
        'src/components/',
        'src/hooks/',
        'src/lib/',
        'src/store/',
        'src/pages/',
      ],
    },
  },
});
