import { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    const newNotification = { id, message, type, open: true };
    
    setNotifications(prev => {
      const updated = [...prev, newNotification];
      if (updated.length > 5) {
        return updated.slice(updated.length - 5); // Keep only last 5
      }
      return updated;
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, [removeNotification]);

  const handleClose = (id) => {
    removeNotification(id);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={notification.open}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ 
            position: 'fixed', 
            top: `${20 + notifications.indexOf(notification) * 70}px`,
            right: '20px',
            zIndex: 9999 + notification.id
          }}
        >
          <Alert
            severity={notification.type}
            sx={{ 
              width: '350px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              '& .MuiAlert-message': {
                fontSize: '14px',
                fontWeight: 500
              }
            }}
            action={
              <IconButton
                size="small"
                onClick={() => handleClose(notification.id)}
                sx={{ color: 'inherit' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
};
