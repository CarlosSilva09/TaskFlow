import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';

interface TodoFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, description?: string, priority?: string, dueDate?: string) => void;
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  isEditing?: boolean;
}

const TodoFormDialog: React.FC<TodoFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  title: initialTitle = '',
  description: initialDescription = '',
  priority: initialPriority = 'media',
  dueDate: initialDueDate = '',
  isEditing = false,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [priority, setPriority] = useState(initialPriority);
  const [dueDate, setDueDate] = useState(initialDueDate);

  React.useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setPriority(initialPriority);
      
      // Formatar a data corretamente para o input date
      if (initialDueDate) {
        try {
          const date = new Date(initialDueDate);
          if (!isNaN(date.getTime())) {
            // Converter para formato YYYY-MM-DD (formato esperado pelo input date)
            const formattedDate = date.toISOString().split('T')[0];
            setDueDate(formattedDate);
          } else {
            setDueDate('');
          }
        } catch {
          setDueDate('');
        }
      } else {
        setDueDate('');
      }
    }
  }, [open, initialTitle, initialDescription, initialPriority, initialDueDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(
        title.trim(), 
        description.trim() || undefined,
        priority,
        dueDate || undefined
      );
      onClose();
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority('media');
    setDueDate('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título"
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Descrição (opcional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Data de Vencimento"
            type="date"
            fullWidth
            variant="outlined"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              min: new Date().toISOString().split('T')[0], // Não permite datas no passado
            }}
            helperText="Opcional - data limite para conclusão da tarefa"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button 
            type="submit" 
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #7F5AF0, #2CB67D)',
              '&:hover': {
                background: 'linear-gradient(45deg, #6B47D8, #239B68)',
              },
            }}
          >
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default TodoFormDialog;
