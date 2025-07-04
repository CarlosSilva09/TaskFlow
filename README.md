# 📝 TaskFlow - Sistema de Lista de Tarefas

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

## 🎯 **Sobre o Projeto**

TaskFlow é um sistema completo de gerenciamento de tarefas desenvolvido em **TypeScript puro**, implementando autenticação segura com JWT e CRUD completo para tarefas. O projeto foi arquitetado com foco em segurança, performance e manutenibilidade.

## ✨ **Funcionalidades**

### 🔐 **Autenticação**
- ✅ Registro de usuários com validação
- ✅ Login seguro com JWT
- ✅ Proteção de rotas
- ✅ Gerenciamento de perfil
- ✅ Alteração de senha

### 📋 **Gestão de Tarefas**
- ✅ Criar, editar e excluir tarefas
- ✅ Marcar como concluída/pendente
- ✅ Filtros por status
- ✅ Busca por texto
- ✅ Estatísticas de produtividade

### 🛡️ **Segurança**
- ✅ Rate limiting
- ✅ Helmet para headers de segurança
- ✅ Validação de dados
- ✅ Sanitização de inputs
- ✅ Logs de segurança

## 🏗️ **Arquitetura**

```
TaskFlow/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── context/        # Context API (AuthContext)
│   │   ├── services/       # Serviços de API
│   │   └── types/          # Definições TypeScript
│   └── dist/               # Build de produção
│
├── backend/                 # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/    # Controladores MVC
│   │   ├── middleware/     # Middlewares customizados
│   │   ├── models/         # Modelos de dados
│   │   ├── routes/         # Definição de rotas
│   │   ├── config/         # Configurações (DB, etc)
│   │   └── types/          # Interfaces TypeScript
│   └── dist/               # JavaScript compilado
│
└── database/               # SQLite database
```

## 🚀 **Tecnologias Utilizadas**

### **Frontend**
- **React 18** - Biblioteca para interfaces
- **TypeScript** - Superset tipado do JavaScript
- **Vite** - Build tool e dev server
- **React Router** - Roteamento SPA
- **Context API** - Gerenciamento de estado
- **CSS Modules** - Estilização componentizada

### **Backend**
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipagem estática
- **SQLite** - Banco de dados
- **JWT** - Autenticação stateless
- **bcrypt** - Hash de senhas
- **Helmet** - Segurança HTTP
- **Morgan** - Logging de requisições

## ⚙️ **Instalação e Execução**

### **Pré-requisitos**
- Node.js 16+ 
- npm ou yarn
- Git

### **1. Clonar o repositório**
```bash
git clone https://github.com/CarlosSilva09/TaskFlow.git
cd TaskFlow
```

### **2. Instalar dependências**

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### **3. Configurar variáveis de ambiente**

Criar arquivo `.env` no diretório `backend/`:
```env
NODE_ENV=development
PORT=3003
JWT_SECRET=seu-jwt-secret-super-seguro-aqui
FRONTEND_URL=http://localhost:5173
```

### **4. Executar em desenvolvimento**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### **5. Acessar aplicação**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3003
- Health Check: http://localhost:3003/health

## 📚 **API Endpoints**

### **Autenticação**
```
POST   /api/auth/register     # Registrar usuário
POST   /api/auth/login        # Login
GET    /api/auth/profile      # Perfil do usuário
PUT    /api/auth/profile      # Atualizar perfil
PUT    /api/auth/change-password # Alterar senha
```

### **Tarefas**
```
GET    /api/todos             # Listar tarefas
POST   /api/todos             # Criar tarefa
GET    /api/todos/:id         # Buscar tarefa
PUT    /api/todos/:id         # Atualizar tarefa
DELETE /api/todos/:id         # Excluir tarefa
PATCH  /api/todos/:id/toggle  # Toggle status
GET    /api/todos/stats       # Estatísticas
```

## 🏭 **Build para Produção**

### **Backend**
```bash
cd backend
npm run build    # Compila TypeScript para JavaScript
npm start        # Executa versão de produção
```

### **Frontend**
```bash
cd frontend
npm run build    # Gera build otimizado
npm run preview  # Preview da build
```

## 🧪 **Testes**

```bash
# Backend
cd backend
npm test

# Frontend  
cd frontend
npm test
```

## 📝 **Estrutura do Banco de Dados**

### **Tabela: users**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Tabela: todos**
```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 **Autor**

**Carlos Silva**
- GitHub: [@CarlosSilva09](https://github.com/CarlosSilva09)
- LinkedIn: [Carlos Silva](https://www.linkedin.com/in/carlos-eduardo-borba-silva/)

## 🎯 **Próximas Funcionalidades**

- [ ] Notificações push
- [ ] Compartilhamento de listas
- [ ] Categorias de tarefas
- [ ] Anexos em tarefas
- [ ] Modo escuro
- [ ] PWA (Progressive Web App)
- [ ] API REST completa
- [ ] Dashboard analytics

---

⭐ **Se este projeto te ajudou, deixe uma estrela!**