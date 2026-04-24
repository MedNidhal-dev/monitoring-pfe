import React from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Box, Chip } from '@mui/material';
import { LayoutDashboard, AlertTriangle, Database, Shield, LogOut, Activity, BarChart3 } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DRAWER_WIDTH = 260;

const Sidebar = () => {
  const { logout, user, isManager } = useAuth();
  const location = useLocation();

  const menuItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={22} />, path: '/' },
    { label: 'Incidents', icon: <AlertTriangle size={22} />, path: '/incidents' },
    // Only show Knowledge Base and Grafana for DevOps/Developer, NOT for Manager
    ...(!isManager() ? [
      { label: 'Knowledge Base', icon: <Database size={22} />, path: '/knowledge' },
      { label: 'Observabilité (Grafana)', icon: <Activity size={22} />, path: '/observability' }
    ] : []),
    { label: 'Rapports', icon: <BarChart3 size={22} />, path: '/reports' },
  ];

  return (
    <Drawer 
      variant="permanent" 
      sx={{ 
        width: DRAWER_WIDTH, 
        flexShrink: 0, 
        '& .MuiDrawer-paper': { 
          width: DRAWER_WIDTH, 
          borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)'
        } 
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ 
          width: 40, height: 40, bgcolor: 'primary.main', borderRadius: 2, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
        }}>
          <Shield size={24} color="white" />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>SOLIFE</Typography>
          <Typography variant="caption" color="text.secondary">MONITORING</Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 2, flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                component={NavLink} 
                to={item.path} 
                sx={{ 
                  borderRadius: '12px',
                  py: 1.2,
                  bgcolor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.label} 
                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive ? 700 : 500 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Logout */}
      <Box sx={{ p: 2 }}>
        <ListItemButton 
          onClick={logout} 
          sx={{ borderRadius: '12px', color: 'error.main' }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <LogOut size={22} />
          </ListItemIcon>
          <ListItemText primary="Déconnexion" />
        </ListItemButton>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
