import React, { useEffect, useState } from 'react';
import { 
  Grid, Paper, Typography, Box, Card, CardContent, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, LinearProgress, IconButton
} from '@mui/material';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as ChartTooltip, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Clock, Target, FileText, Eye, Printer, Activity
} from 'lucide-react';
import { incidentsService } from '../services/api';

const ReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, incidentsRes] = await Promise.all([
        incidentsService.getStats(),
        incidentsService.getAll()
      ]);
      
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (incidentsRes.data.success) setIncidents(incidentsRes.data.incidents);
    } catch (error) {
      console.error('reports fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // parse solutions json from db
  const parseJSON = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      return [];
    }
  };

  const extractServerName = (incident) => {
    if (incident?.service_name && incident.service_name !== 'UNKNOWN') return incident.service_name;
    if (incident?.title && incident.title.includes(' sur ')) {
      return incident.title.split(' sur ').pop().trim();
    }
    return incident?.service_name || 'N/A';
  };

  const getSeverityColor = (severity) => {
    switch(severity?.toUpperCase()) {
      case 'CRITICAL': return { bg: '#ef444422', color: '#ef4444', label: 'Critical' };
      case 'HIGH':     return { bg: '#f97316aa', color: '#f97316', label: 'High' };
      case 'MEDIUM':   return { bg: '#3b82f622', color: '#3b82f6', label: 'Medium' };
      case 'LOW':      return { bg: '#10b98122', color: '#10b981', label: 'Low' };
      default:         return { bg: '#6b728022', color: '#6b7280', label: severity };
    }
  };

  // pie chart data
  const pieData = stats ? [
    { name: 'Résolu', value: parseInt(stats.resolved) || 0, color: '#10b981' },
    { name: 'Ouvert', value: parseInt(stats.open) || 0, color: '#f59e0b' },
  ] : [];

  // kpi cards
  const kpiCards = [
    { 
      title: 'MTTR', 
      value: `${stats?.mttr_minutes || 0} min`, 
      subtitle: 'Temps moyen de résolution',
      icon: <Clock size={22} />, 
      color: '#6366f1' 
    },
    { 
      title: 'SLA Uptime', 
      value: `${stats?.uptime_sla || 99.8}%`, 
      subtitle: 'Disponibilité services',
      icon: <Activity size={22} />, 
      color: '#3b82f6' 
    },
    { 
      title: 'Taux de Résolution', 
      value: `${stats?.resolution_rate || 0}%`, 
      subtitle: 'Incidents résolus / Total',
      icon: <Target size={22} />, 
      color: '#10b981' 
    },
    { 
      title: 'Rapports IA', 
      value: stats?.total || 0, 
      subtitle: 'Total généré',
      icon: <FileText size={22} />, 
      color: '#f59e0b' 
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Dashboard Rapports IA</Typography>
          <Typography color="text.secondary">
            Analyse automatisée des incidents et métriques de performance
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<Printer size={18} />}
          onClick={handlePrint}
          sx={{ borderRadius: '12px' }}
        >
          Imprimer
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <CardContent sx={{ p: 3 }}>
                <Box 
                  sx={{ 
                    position: 'absolute', top: -10, right: -10, 
                    width: 60, height: 60, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${kpi.color}11 0%, ${kpi.color}33 100%)`
                  }}
                />
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ 
                    p: 1.5, borderRadius: '12px', 
                    background: `linear-gradient(135deg, ${kpi.color}22 0%, ${kpi.color}44 100%)`,
                    color: kpi.color, display: 'flex'
                  }}>
                    {kpi.icon}
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      {kpi.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {loading ? '...' : kpi.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{kpi.subtitle}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }} alignItems="stretch">
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 3, borderRadius: '16px', height: 350 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Causes Racines</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={stats?.causes || []} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" />
                  <YAxis dataKey="root_cause" type="category" tick={{ fontSize: 12 }} interval={0} />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="occurrences" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: '16px', textAlign: 'center', height: 350, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Statut des Incidents</Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
              <Chip label={`Ouvert: ${stats?.open || 0}`} sx={{ bgcolor: '#f59e0b22', color: '#f59e0b' }} />
              <Chip label={`Résolu: ${stats?.resolved || 0}`} sx={{ bgcolor: '#10b98122', color: '#10b981' }} />
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Reports Table */}
      <Paper sx={{ borderRadius: '16px', overflow: 'hidden' }}>
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Rapports d'Incidents Générés par l'IA</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type d'Anomalie</TableCell>
                <TableCell>Serveur</TableCell>
                <TableCell>Sévérité</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="center">Rapport</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}><LinearProgress /></TableCell>
                </TableRow>
              ) : incidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>Aucun rapport disponible</TableCell>
                </TableRow>
              ) : (
                incidents.map((inc) => {
                  const sevStyle = getSeverityColor(inc.severity);
                  return (
                    <TableRow key={inc.id} hover sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(inc.timestamp || inc.created_at).toLocaleString('fr-FR')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{inc.anomaly_type}</Typography>
                      </TableCell>
                      <TableCell>{extractServerName(inc)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={sevStyle.label} 
                          size="small" 
                          sx={{ bgcolor: sevStyle.bg, color: sevStyle.color, fontWeight: 700 }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={inc.status} 
                          size="small" 
                          color={inc.status === 'OPEN' ? 'warning' : 'success'} 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          onClick={() => { setSelectedReport(inc); setReportOpen(true); }}
                        >
                          <Eye size={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Report Detail Modal */}
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="md" fullWidth>
        {selectedReport && (
          <>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Chip 
                    label={selectedReport.severity} 
                    sx={{ 
                      bgcolor: getSeverityColor(selectedReport.severity).bg, 
                      color: getSeverityColor(selectedReport.severity).color,
                      fontWeight: 700, mb: 1
                    }} 
                  />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedReport.title}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">ID #{selectedReport.id}</Typography>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Description</Typography>
                  <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
                    {selectedReport.description || 'Aucune description'}
                  </Typography>

                  {selectedReport.explanation && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Explication IA</Typography>
                      <Paper variant="outlined" sx={{ p: 2, mt: 0.5 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{selectedReport.explanation}</Typography>
                      </Paper>
                    </Box>
                  )}

                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Solutions Recommandées</Typography>
                  <Stack spacing={1}>
                    {parseJSON(selectedReport.solutions).length > 0 ? (
                      parseJSON(selectedReport.solutions).map((sol, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="body2">
                            <strong>{sol.title || sol.action || `Solution ${i+1}`}</strong>
                          </Typography>
                          {sol.description && (
                            <Typography variant="caption" color="text.secondary">{sol.description}</Typography>
                          )}
                        </Paper>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">Aucune solution disponible</Typography>
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Cause Racine</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedReport.root_cause || 'Inconnue'}</Typography>
                      {selectedReport.confidence && (
                        <Typography variant="caption">
                          Confiance: {(parseFloat(selectedReport.confidence) * 100).toFixed(0)}%
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Serveur</Typography>
                      <Typography variant="body2">{extractServerName(selectedReport)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Type d'Anomalie</Typography>
                      <Typography variant="body2">{selectedReport.anomaly_type}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Détecté le</Typography>
                      <Typography variant="body2">
                        {new Date(selectedReport.timestamp || selectedReport.created_at).toLocaleString('fr-FR')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Statut</Typography>
                      <Chip 
                        label={selectedReport.status} 
                        color={selectedReport.status === 'OPEN' ? 'warning' : 'success'} 
                        size="small"
                      />
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setReportOpen(false)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ReportsPage;
