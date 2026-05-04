import React, { useEffect, useState } from 'react';
import { 
  Grid, Paper, Typography, Box, Card, CardContent, Stack, Skeleton, Button, Chip
} from '@mui/material';
import { 
  AlertCircle, Clock, CheckCircle2, Activity, ArrowUpRight, ExternalLink, BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { incidentsService } from '../services/api';
import { ManagerChatbot } from '../components/chat';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer 
} from 'recharts';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isManager, user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await incidentsService.getStats();
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  
  const kpiData = isManager() ? [
    { label: 'Taux de Résolution', value: `${stats?.resolution_rate || 0}%`, icon: <CheckCircle2 size={24} />, color: '#10b981' },
    { label: 'MTTR Moyen', value: `${stats?.mttr_minutes || 0} min`, icon: <Clock size={24} />, color: '#6366f1' },
    { label: 'Incidents Critiques', value: stats?.critical || 0, icon: <AlertCircle size={24} />, color: '#ef4444' },
    { label: 'Status SLA', value: `${stats?.uptime_sla || 99.8}%`, icon: <Activity size={24} />, color: '#3b82f6' },
  ] : [
    { label: 'Total Incidents', value: stats?.total || 0, icon: <Activity size={24} />, color: '#6366f1' },
    { label: 'Résolu', value: stats?.resolved || 0, icon: <CheckCircle2 size={24} />, color: '#10b981' },
    { label: 'En cours', value: stats?.open || 0, icon: <Clock size={24} />, color: '#f59e0b' },
    { label: 'Critique', value: stats?.critical || 0, icon: <AlertCircle size={24} />, color: '#ef4444' },
  ];

  
  const allDays = [
    { name: 'Lun', count: 0 },
    { name: 'Mar', count: 0 },
    { name: 'Mer', count: 0 },
    { name: 'Jeu', count: 0 },
    { name: 'Ven', count: 0 },
    { name: 'Sam', count: 0 },
    { name: 'Dim', count: 0 },
  ];
  
 
  const dayMapping = {
    'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mer', 'Thu': 'Jeu',
    'Fri': 'Ven', 'Sat': 'Sam', 'Sun': 'Dim'
  };
  
 
  const trendData = allDays.map(day => {
  
    const backendDay = stats?.trend?.find(t => dayMapping[t.name] === day.name);
    return {
      name: day.name,
      count: backendDay ? backendDay.count : 0
    };
  });

  const displayName = user?.prenom || user?.name || user?.username || user?.email?.split('@')[0] || 'Utilisateur';

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Bonjour, {displayName}</Typography>
        <Typography variant="body1" color="text.secondary">
          {isManager() 
            ? "Synthèse de la santé opérationnelle et des performances de l'équipe."
            : "Voici l'état actuel de votre infrastructure de monitoring en temps réel."}
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiData.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box 
                  sx={{ 
                    position: 'absolute', top: -10, right: -10, 
                    width: 70, height: 70, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${kpi.color}11 0%, ${kpi.color}33 100%)`,
                    zIndex: 0
                  }}
                />
                <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                  <Box 
                    sx={{ 
                      p: 1.5, borderRadius: '14px', 
                      background: `linear-gradient(135deg, ${kpi.color}22 0%, ${kpi.color}44 100%)`,
                      color: kpi.color, display: 'flex'
                    }}
                  >
                    {kpi.icon}
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {kpi.label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                      {loading ? <Skeleton width={60} /> : kpi.value}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: '16px' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Tendance Par Semaine</Typography>
              <Chip label="7 derniers jours" size="small" />
            </Stack>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" />
                  <YAxis stroke="rgba(255,255,255,0.4)" />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Area 
                    type="monotone" dataKey="count" 
                    stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2.5}
                    name="Incidents"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: '16px', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Vue d'ensemble</Typography>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">Taux de résolution</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                  {stats?.resolution_rate || 0}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">MTTR moyen</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#6366f1' }}>
                  {stats?.mttr_minutes || 0} min
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">SLA Uptime</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                  {stats?.uptime_sla || 99.8}%
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
      
      {/* AI Chatbot for Manager - Hidden for presentation */}
      {/* {isManager() && <ManagerChatbot />} */}
    </Box>
  );
};

export default DashboardPage;
