import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Badge, Avatar, Menu, MenuItem, Chip, Stack } from '@mui/material';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user } = useAuth();
  const { unreadCount, notifications, clearNotifications } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);
  const location = useLocation();

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
    clearNotifications();
  };

  // titre dynamique selon la page
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Vue d\'ensemble';
      case '/incidents': return 'Gestion des Incidents';
      case '/knowledge': return 'Knowledge Base';
      case '/reports': return 'Rapports IA';
      case '/observability': return 'Observabilité';
      default: return 'Dashboard';
    }
  };

  const getRoleBadge = () => {
    const role = user?.role?.toUpperCase() || 'USER';
    const colorMap = {
      'DEVOPS': '#6366f1',
      'MANAGER': '#10b981',
      'DEVELOPER': '#f59e0b'
    };
    return { label: role, color: colorMap[role] || '#6b7280' };
  };

  const roleBadge = getRoleBadge();

  return (
    <AppBar 
      position="sticky" 
      elevation={0} 
      sx={{ 
        bgcolor: 'background.paper', 
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{getPageTitle()}</Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Notifications */}
          <IconButton onClick={handleOpen}>
            <Badge badgeContent={unreadCount} color="error">
              <Bell size={22} />
            </Badge>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { minWidth: 300, maxHeight: 350, borderRadius: '12px' } }}
          >
            {notifications.length === 0 ? (
              <MenuItem disabled>Aucune alerte récente</MenuItem>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <MenuItem key={n.id} sx={{ whiteSpace: 'normal' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{n.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{n.service}</Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Menu>

          {/* User info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {user?.name || user?.username}
              </Typography>
              <Chip 
                label={roleBadge.label}
                size="small" 
                sx={{ 
                  height: 20, fontSize: '0.65rem', fontWeight: 700,
                  bgcolor: `${roleBadge.color}22`, color: roleBadge.color,
                  border: `1px solid ${roleBadge.color}44`
                }}
              />
            </Box>
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontWeight: 700 }}>
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
