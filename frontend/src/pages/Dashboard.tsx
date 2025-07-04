import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  Alert,
  Snackbar,
  Chip,
  CircularProgress,
  Avatar,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Logout as LogoutIcon,
  Assignment as AllTasksIcon,
  Schedule as PendingIcon,
  CheckCircle as CompletedIcon,
  Warning as OverdueIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import TodoCard from '../components/TodoCard';
import TodoFormDialog from '../components/TodoFormDialog';
import type { Todo } from '../types';

type FilterType = 'all' | 'pending' | 'completed' | 'overdue';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      console.log('📋 Carregando tarefas...');
      const data = await apiService.getTodos();
      console.log('✅ Tarefas carregadas:', data);
      console.log('🔄 Atualizando estado com', data.length, 'tarefas');
      setTodos(data);
      // setRefreshKey(prev => prev + 1); // Force re-render (removed)
    } catch (error: any) {
      console.error('❌ Erro ao carregar tarefas:', error);
      showSnackbar('Erro ao carregar tarefas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateTodo = async (title: string, description?: string, _priority?: string, dueDate?: string) => {
    try {
      console.log('📝 Criando tarefa:', { title, description, dueDate });
      const newTodo = await apiService.createTodo({ title, description, due_date: dueDate });
      console.log('✅ Tarefa criada:', newTodo);
      
      // Recarregar todas as tarefas para garantir consistência
      await loadTodos();
      
      showSnackbar('Tarefa criada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao criar tarefa:', error);
      showSnackbar('Erro ao criar tarefa', 'error');
    }
  };

  const handleUpdateTodo = async (title: string, description?: string, _priority?: string, dueDate?: string) => {
    if (!editingTodo) return;

    try {
      console.log('✏️ Atualizando tarefa:', { id: editingTodo.id, title, description, dueDate });
      const response = await apiService.updateTodo(editingTodo.id, { title, description, due_date: dueDate });
      console.log('✅ Tarefa atualizada no backend:', response);
      
      // Primeiro limpar o estado de edição
      setEditingTodo(null);
      
      // Forçar re-renderização limpando e recarregando
      setTodos([]);
      
      // Aguardar um pouco e recarregar
      setTimeout(async () => {
        console.log('🔄 Recarregando tarefas...');
        await loadTodos();
        console.log('✅ Tarefas recarregadas com sucesso');
      }, 100);
      
      showSnackbar('Tarefa atualizada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar tarefa:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      showSnackbar('Erro ao atualizar tarefa', 'error');
    }
  };

  const handleToggleTodo = async (id: number) => {
    try {
      console.log('🔄 Toggling todo with ID:', id);
      const response = await apiService.toggleTodo(id);
      console.log('✅ Toggle response:', response);
      
      // Recarregar todas as tarefas para garantir consistência
      await loadTodos();
      
      showSnackbar('Tarefa atualizada com sucesso!');
    } catch (error: any) {
      console.error('❌ Error toggling todo:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = 'Erro ao atualizar tarefa';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDeleteTodo = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await apiService.deleteTodo(id);
        setTodos(todos.filter(todo => todo.id !== id));
        showSnackbar('Tarefa excluída com sucesso!');
      } catch (error: any) {
        showSnackbar('Erro ao excluir tarefa', 'error');
      }
    }
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTodo(null);
  };

  const isOverdue = (todo: Todo) => {
    if (!todo.due_date || todo.completed) return false;
    
    try {
      const dueDate = new Date(todo.due_date);
      if (isNaN(dueDate.getTime())) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    } catch {
      return false;
    }
  };

  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'pending':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      case 'overdue':
        return isOverdue(todo);
      default:
        return true;
    }
  });

  const todoStats = {
    total: todos.length,
    pending: todos.filter(todo => !todo.completed).length,
    completed: todos.filter(todo => todo.completed).length,
    overdue: todos.filter(todo => isOverdue(todo)).length,
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 1200,
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600, mr: 'auto' }}>
            TaskFlow
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.8 }}>
            Olá, {user?.name}!
          </Typography>
          <Button
            color="inherit"
            onClick={logout}
            startIcon={<LogoutIcon />}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          height: '100vh',
          background: 'linear-gradient(135deg, #7F5AF0 0%, #2CB67D 100%)',
          pt: 8,
          overflow: 'hidden',
        }}
      >
        {/* Sidebar */}
        <Box
          sx={{
            width: 280,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* User Info */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              p: 3,
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Avatar
              sx={{
                width: 60,
                height: 60,
                mx: 'auto',
                mb: 2,
                background: 'linear-gradient(135deg, #7F5AF0 0%, #2CB67D 100%)',
                fontSize: '1.5rem',
                fontWeight: 600,
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
              {user?.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {user?.email}
            </Typography>
          </Box>

          {/* Filters */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              p: 2,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2, px: 1 }}>
              Filtros
            </Typography>
            <List sx={{ p: 0 }}>
              <ListItemButton
                onClick={() => setFilter('all')}
                selected={filter === 'all'}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.25)',
                    }
                  },
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <AllTasksIcon sx={{ color: 'white' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Todas"
                  primaryTypographyProps={{
                    color: 'white',
                    fontWeight: filter === 'all' ? 600 : 400,
                  }}
                />
                <Chip
                  label={todoStats.total}
                  size="small"
                  sx={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontSize: '0.7rem',
                  }}
                />
              </ListItemButton>

              <ListItemButton
                onClick={() => setFilter('pending')}
                selected={filter === 'pending'}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.25)',
                    }
                  },
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <PendingIcon sx={{ color: '#ffc107' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Pendentes"
                  primaryTypographyProps={{
                    color: 'white',
                    fontWeight: filter === 'pending' ? 600 : 400,
                  }}
                />
                <Chip
                  label={todoStats.pending}
                  size="small"
                  sx={{
                    background: 'rgba(255, 193, 7, 0.3)',
                    color: '#ffc107',
                    fontSize: '0.7rem',
                  }}
                />
              </ListItemButton>

              <ListItemButton
                onClick={() => setFilter('completed')}
                selected={filter === 'completed'}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.25)',
                    }
                  },
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CompletedIcon sx={{ color: '#2CB67D' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Concluídas"
                  primaryTypographyProps={{
                    color: 'white',
                    fontWeight: filter === 'completed' ? 600 : 400,
                  }}
                />
                <Chip
                  label={todoStats.completed}
                  size="small"
                  sx={{
                    background: 'rgba(44, 182, 125, 0.3)',
                    color: '#2CB67D',
                    fontSize: '0.7rem',
                  }}
                />
              </ListItemButton>

              <ListItemButton
                onClick={() => setFilter('overdue')}
                selected={filter === 'overdue'}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.25)',
                    }
                  },
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <OverdueIcon sx={{ color: '#f44336' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Vencidas"
                  primaryTypographyProps={{
                    color: 'white',
                    fontWeight: filter === 'overdue' ? 600 : 400,
                  }}
                />
                <Chip
                  label={todoStats.overdue}
                  size="small"
                  sx={{
                    background: 'rgba(244, 67, 54, 0.3)',
                    color: '#f44336',
                    fontSize: '0.7rem',
                  }}
                />
              </ListItemButton>
            </List>
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1, p: 4, overflow: 'auto', minHeight: '100vh' }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              sx={{
                color: 'white',
                fontWeight: 700,
                mb: 1,
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              }}
            >
              {filter === 'all' && 'Todas as Tarefas'}
              {filter === 'pending' && 'Tarefas Pendentes'}
              {filter === 'completed' && 'Tarefas Concluídas'}
              {filter === 'overdue' && 'Tarefas Vencidas'}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                mb: 3,
              }}
            >
              {filteredTodos.length === 0
                ? 'Nenhuma tarefa encontrada'
                : `${filteredTodos.length} tarefa${filteredTodos.length !== 1 ? 's' : ''} encontrada${filteredTodos.length !== 1 ? 's' : ''}`
              }
            </Typography>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #7F5AF0 0%, #2CB67D 100%)',
                borderRadius: 3,
                px: 3,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #6B47D8 0%, #239B68 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Nova Tarefa
            </Button>
          </Box>

          {/* Todo List */}
          <Box sx={{ 
            display: 'grid', 
            gap: 3, 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            width: '100%'
          }}>
            {filteredTodos.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onToggle={handleToggleTodo}
                onEdit={handleEditTodo}
                onDelete={handleDeleteTodo}
              />
            ))}
          </Box>

          {filteredTodos.length === 0 && (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  mb: 2,
                  fontWeight: 500,
                }}
              >
                {filter === 'all' && 'Nenhuma tarefa criada ainda'}
                {filter === 'pending' && 'Nenhuma tarefa pendente'}
                {filter === 'completed' && 'Nenhuma tarefa concluída'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  mb: 3,
                }}
              >
                {filter === 'all' && 'Clique no botão "Nova Tarefa" para começar'}
                {filter === 'pending' && 'Todas as suas tarefas foram concluídas!'}
                {filter === 'completed' && 'Você ainda não concluiu nenhuma tarefa'}
              </Typography>
              {filter === 'all' && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setDialogOpen(true)}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: 3,
                    px: 3,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: 'white',
                      background: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  Criar minha primeira tarefa
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Dialog */}
      <TodoFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={editingTodo ? handleUpdateTodo : handleCreateTodo}
        title={editingTodo?.title}
        description={editingTodo?.description}
        dueDate={editingTodo?.due_date}
        isEditing={!!editingTodo}
      />

      {/* Snackbars */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ 
            background: snackbar.severity === 'error' 
              ? 'rgba(211, 47, 47, 0.9)' 
              : 'rgba(46, 125, 50, 0.9)',
            backdropFilter: 'blur(20px)',
            color: 'white',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Dashboard;
