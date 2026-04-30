import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Stack, Button } from '@mui/material';
import { ExternalLink, Activity, Layout, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ObservabilityPage = () => {
  const { isDevOps, isDeveloper, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // tous les dashboards grafana
    const allDashboards = [
    { 
      title: 'Infrastructure & Santé Système', 
      url: "http://192.168.75.129:3002/d/dfir1mtd9c4qob/system-health-e28094-solife?orgId=1&refresh=30s&kiosk",
      icon: <Activity size={20} />,
      desc: 'Métriques CPU, RAM, Disk.',
      roles: ['devops', 'manager'] 
    },
    { 
      title: 'Analyse des Logs', 
      url: "http://192.168.75.129:3002/d/cfiqyup6m4hkwa/logs-and-incidents-e28094-solife?orgId=1&refresh=10s&kiosk",
      icon: <Layout size={20} />,
      desc: 'Logs serveurs et corrélation.',
      roles: ['devops', 'developer']
    },
    { 
      title: 'Monitoring CI/CD (Jenkins)', 
      url: "http://192.168.75.129:3002/d/efiqw65lbqccgd/ci-cd-monitoring-e28094-jenkins?orgId=1&kiosk",
      icon: <Cpu size={20} />,
      desc: 'Pipelines et déploiements.',
      roles: ['devops', 'developer', 'manager']
    }
  ];

  // filtrage par role
  const authorizedDashboards = allDashboards.filter(db => {
    if (isDevOps() && db.roles.includes('devops')) return true;
    if (isDeveloper() && db.roles.includes('developer')) return true;
    if (isManager() && db.roles.includes('manager')) return true;
    return false;
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (authorizedDashboards.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <Typography variant="h6" color="text.secondary">
          Vous n'avez pas accès aux tableaux de bord d'observabilité.
        </Typography>
      </Box>
    );
  }

  const currentDashboard = authorizedDashboards[activeTab] || authorizedDashboards[0];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Observabilité Globale</Typography>
            <Typography color="text.secondary">
              Accès en temps réel adapté au profil <b>{isDevOps() ? 'DevOps' : isManager() ? 'Manager' : 'Developer'}</b>.
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            size="medium"
            startIcon={<ExternalLink size={18} />}
            onClick={() => window.open(currentDashboard.url, '_blank')}
            sx={{ borderRadius: '12px' }}
          >
            Plein écran
          </Button>
        </Stack>

        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: '48px', textTransform: 'none', fontSize: '1rem', fontWeight: 600 }
          }}
        >
          {authorizedDashboards.map((db, idx) => (
            <Tab 
              key={idx} 
              icon={db.icon} 
              iconPosition="start" 
              label={db.title} 
            />
          ))}
        </Tabs>
      </Box>

      {/* Grafana Iframe - maximized */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          bgcolor: 'rgba(0,0,0,0.6)', 
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
        }}
      >
        <iframe 
          src={currentDashboard.url}
          width="100%"
          height="100%"
          frameBorder="0"
          title={currentDashboard.title}
          style={{ display: 'block' }}
        />
      </Box>
    </Box>
  );
};

export default ObservabilityPage;
