import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, Chip, IconButton, Button, 
  TextField, Stack, Tabs, Tab, CircularProgress, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { Search, Eye, CheckCircle, Clock, RefreshCcw, Server, Filter } from 'lucide-react';
import { incidentsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import IncidentDetailModal from '../components/incidents/IncidentDetailModal';

const IncidentsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [serverFilter, setServerFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { isDevOps } = useAuth();

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await incidentsService.getAll();
      if (res.data.success) setIncidents(res.data.incidents);
    } catch (err) {
      console.error('fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleResolve = async (id) => {
    try {
      const res = await incidentsService.resolve(id);
      if (res.data.success) fetchIncidents();
    } catch (err) {
      console.error('resolve error:', err);
    }
  };

  const getSeverityColor = (s) => {
    if (s === 'CRITICAL') return 'error';
    if (s === 'HIGH') return 'warning';
    if (s === 'MEDIUM') return 'info';
    return 'success';
  };

  // extract server name from title if service_name is UNKNOWN
  const getServerName = (inc) => {
    if (inc?.service_name && inc.service_name !== 'UNKNOWN') return inc.service_name;
    if (inc?.title && inc.title.includes(' sur ')) {
      return inc.title.split(' sur ').pop().trim();
    }
    return inc?.service_name || 'N/A';
  };

  // build unique server list for filter
  const serverList = [...new Set(incidents.map(inc => getServerName(inc)))].filter(Boolean);

  const filtered = incidents.filter(inc => {
    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
    const matchesServer = serverFilter === 'ALL' || getServerName(inc) === serverFilter;
    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
    const matchesSearch = inc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (inc.anomaly_type || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesServer && matchesSeverity && matchesSearch;
  });

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Incidents</Typography>
          <Typography color="text.secondary">
            {filtered.length} incident(s) trouvé(s)
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<RefreshCcw size={18} />} 
          onClick={fetchIncidents}
          sx={{ borderRadius: '12px' }}
        >
          Rafraîchir
        </Button>
      </Box>

      {/* Filtres */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: '12px' }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Tabs 
            value={statusFilter} 
            onChange={(e, v) => { setStatusFilter(v); setPage(0); }}
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
          >
            <Tab label="Ouvert" value="OPEN" />
            <Tab label="Résolu" value="RESOLVED" />
            <Tab label="Tous" value="ALL" />
          </Tabs>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Serveur</InputLabel>
            <Select 
              value={serverFilter} 
              label="Serveur"
              onChange={(e) => { setServerFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="ALL">Tous les serveurs</MenuItem>
              {serverList.map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sévérité</InputLabel>
            <Select 
              value={severityFilter} 
              label="Sévérité"
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="ALL">Toutes</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="LOW">Low</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <Search size={18} style={{ marginRight: 8 }} /> }}
            sx={{ minWidth: 200 }}
          />
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '12px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Incident</TableCell>
              <TableCell>Sévérité</TableCell>
              <TableCell>Serveur</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  Aucun incident trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((inc) => (
                <TableRow key={inc.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{inc.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{inc.anomaly_type}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={inc.severity} color={getSeverityColor(inc.severity)} size="small" />
                  </TableCell>
                  <TableCell>{getServerName(inc)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(inc.timestamp || inc.created_at).toLocaleString('fr-FR')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {inc.status === 'OPEN' ? <Clock size={16} color="#f59e0b" /> : <CheckCircle size={16} color="#10b981" />}
                      <Typography variant="body2">{inc.status}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton size="small" onClick={() => { setSelected(inc); setDetailOpen(true); }}>
                        <Eye size={18} />
                      </IconButton>
                      {inc.status === 'OPEN' && isDevOps() && (
                        <IconButton size="small" color="success" onClick={() => handleResolve(inc.id)}>
                          <CheckCircle size={18} />
                        </IconButton>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value))}
        />
      </TableContainer>

      <IncidentDetailModal 
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        incident={selected}
        onResolve={handleResolve}
        canResolve={isDevOps()}
      />
    </Box>
  );
};

export default IncidentsPage;
