/**
 * Arquivo principal de entrada da aplicação React
 * Este é o ponto de inicialização do frontend
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Estilos globais da aplicação
import App from './App.tsx' // Componente principal da aplicação

// Busca o elemento HTML com id 'root' no index.html
// O operador '!' indica que temos certeza que o elemento existe
const rootElement = document.getElementById('root')!

// Cria a raiz da aplicação React usando a nova API do React 18
createRoot(rootElement).render(
  // StrictMode ajuda a identificar problemas durante desenvolvimento
  <StrictMode>
    {/* Renderiza o componente principal da aplicação */}
    <App />
  </StrictMode>,
)
