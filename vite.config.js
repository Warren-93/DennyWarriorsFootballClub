import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: 'build',
      sourcemap: false,
    },
    // Treat .js files in src/ as JSX so we don't rename every component.
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test-setup.js',
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
    // Bridge CRA-style process.env.REACT_APP_* references so existing source code keeps working.
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
      'process.env.PUBLIC_URL': JSON.stringify(''),
      'process.env.REACT_APP_API_URL': JSON.stringify(env.VITE_API_URL || env.REACT_APP_API_URL || ''),
      'process.env.REACT_APP_ADMIN_LOGIN_PATH': JSON.stringify(env.VITE_ADMIN_LOGIN_PATH || env.REACT_APP_ADMIN_LOGIN_PATH || ''),
    },
  };
});