import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  // 显式绑定 127.0.0.1，避免依赖 "localhost" 的 DNS 解析
  // （部分受限环境 hosts 解析失败会导致 EAI_FAIL 启动错误）
  server: {
    host: '127.0.0.1',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // run 模式无需 API 服务器，禁用可避免 localhost 探测并加快启动
    api: false,
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
