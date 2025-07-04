/**
 * Componente principal da aplicação React
 * Gerencia roteamento, tema e contexto de autenticação
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import './App.css';

/**
 * Configuração do tema Material-UI personalizado
 * Define cores, tipografia e componentes customizados
 */
const theme = createTheme({
  palette: {
    mode: 'dark', // Tema escuro por padrão
    primary: {
      main: '#6366f1', // Cor principal - azul índigo
      light: '#818cf8', // Variação clara
      dark: '#4f46e5', // Variação escura
    },
    secondary: {
      main: '#f59e0b', // Cor secundária - amarelo/laranja
      light: '#fbbf24',
      dark: '#d97706',
    },
    background: {
      default: '#0f172a', // Fundo principal - azul muito escuro
      paper: '#1e293b', // Fundo de componentes - azul escuro
    },
    text: {
      primary: '#f8fafc', // Texto principal - branco
      secondary: '#cbd5e1', // Texto secundário - cinza claro
    },
    error: {
      main: '#ef4444', // Vermelho para erros
    },
    success: {
      main: '#10b981', // Verde para sucesso
    },
    warning: {
      main: '#f59e0b', // Amarelo para avisos
    },
    info: {
      main: '#3b82f6', // Azul para informações
    },
  },
  typography: {
    // Fonte personalizada para melhor legibilidade
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700, // Título principal mais pesado
    },
    h2: {
      fontWeight: 600, // Subtítulos com peso médio
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12, // Bordas arredondadas por padrão
  },
  components: {
    // Customização dos componentes Material-UI
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Remove capitalização automática
          fontWeight: 500,
          borderRadius: 8,
          padding: '10px 24px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: 'rgba(15, 23, 42, 0.5)', // Fundo semi-transparente
            '&:hover': {
              backgroundColor: 'rgba(15, 23, 42, 0.7)', // Hover mais escuro
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(15, 23, 42, 0.8)', // Focus ainda mais escuro
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove gradiente padrão
          border: '1px solid rgba(51, 65, 85, 0.3)', // Borda sutil
        },
      },
    },
  },
});

/**
 * Componente principal da aplicação
 * Integra todas as funcionalidades: tema, autenticação e roteamento
 */
function App() {
  return (
    // Provedor de tema Material-UI
    <ThemeProvider theme={theme}>
      {/* Reset CSS e configurações base do Material-UI */}
      <CssBaseline />
      
      {/* Provedor de contexto de autenticação */}
      <AuthProvider>
        {/* Roteador principal da aplicação */}
        <Router>
          <Routes>
            {/* Rota de login - pública */}
            <Route path="/login" element={<Login />} />
            
            {/* Rota de registro - pública */}
            <Route path="/register" element={<Register />} />
            
            {/* Rota do dashboard - protegida */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Rota raiz - redireciona para dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
