import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Chip, Stack, List, ListItem, ListItemText, Paper, Grid } from '@mui/material';
import { Clock, CheckSquare, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const IncidentDetailModal = ({ open, onClose, incident, onResolve, canResolve }) => {
  const { isManager } = useAuth();
  if (!incident) return null;

  const getSeverityColor = (severity) => {
    if (severity === 'CRITICAL') return '#ef4444';
    if (severity === 'HIGH') return '#f59e0b';
    if (severity === 'MEDIUM') return '#3b82f6';
    return '#10b981';
  };

  // Parse solutions from incident (flexible parser like ReportsPage)
  const parseSolutions = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  };

  const solutions = parseSolutions(incident.solutions || incident.checklist);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Chip
              label={incident.severity}
              sx={{ bgcolor: getSeverityColor(incident.severity), color: 'white', mb: 1 }}
            />
            <Typography variant="h6">{incident.title}</Typography>
          </Box>
          <Typography variant="caption">ID: #{incident.id}</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Typography variant="subtitle2" color="text.secondary">Description</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {incident.description || "No detailed description available."}
            </Typography>

            {isManager() ? (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info size={16} />
                  Explication IA
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {incident.explanation || incident.description || incident.root_cause || "Aucune explication disponible."}
                  </Typography>
                </Paper>
              </>
            ) : (
              <>
                <Typography variant="subtitle2" color="text.secondary">Solutions Recommandées</Typography>
                <Stack spacing={1}>
                  {solutions.length > 0 ? solutions.map((sol, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {typeof sol === 'string' ? sol : (sol.title || sol.action || `Solution ${i+1}`)}
                      </Typography>
                      {sol.description && (
                        <Typography variant="caption" color="text.secondary">
                          {sol.description}
                        </Typography>
                      )}
                    </Paper>
                  )) : (
                    <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>
                      No specific actions recommended.
                    </Typography>
                  )}
                </Stack>
              </>
            )}
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Root Cause</Typography>
                <Typography variant="body1">{incident.root_cause || "Unknown"}</Typography>
                <Typography variant="caption">Confidence: {(incident.confidence * 100).toFixed(0)}%</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">Server</Typography>
                <Typography variant="body2">{incident.service_name}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">Detected</Typography>
                <Typography variant="body2">
                  {new Date(incident.timestamp || incident.created_at).toLocaleString()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Chip
                  label={incident.status}
                  icon={<Clock size={16} />}
                  color={incident.status === 'OPEN' ? 'warning' : 'success'}
                  size="small"
                />
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {incident.status === 'OPEN' && canResolve && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckSquare size={18} />}
            onClick={() => { onResolve(incident.id); onClose(); }}
          >
            Mark as Resolved
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default IncidentDetailModal;
