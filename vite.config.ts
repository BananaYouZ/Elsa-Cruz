import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente da Vercel ou do sistema .env
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    define: {
      // Isto substitui "process.env.API_KEY" pelo valor real da chave durante a construção do site
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});