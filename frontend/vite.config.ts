/**
 * Configuração do Vite para o projeto React + TypeScript
 * Vite é um bundler rápido para desenvolvimento e build de produção
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração oficial do Vite: https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Plugin oficial do React para o Vite
    // Permite usar JSX/TSX e hot reload durante desenvolvimento
    react()
  ],
  // Configurações do servidor de desenvolvimento
  server: {
    port: 3000, // Porta padrão para o frontend
    open: true, // Abre automaticamente no navegador
  },
  // Configurações de build para produção
  build: {
    outDir: 'dist', // Diretório de saída dos arquivos compilados
    sourcemap: true, // Gera source maps para debug
  }
})
