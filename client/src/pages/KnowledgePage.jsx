import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Button, TextField, Stack, IconButton, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { knowledgeService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const KnowledgePage = () => {
  const [knowledge, setKnowledge] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openAdd, setOpenAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newTriplet, setNewTriplet] = useState({ head: '', relation: '', tail: '', confidence: 0.9 });

  const { isDevOps } = useAuth();

  const fetchKnowledge = useCallback(async () => {
    setLoading(true);
    try {
      const res = await knowledgeService.getAll();
      if (res.data.success) setKnowledge(res.data.graph);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setNewTriplet({ head: '', relation: '', tail: '', confidence: 0.9 });
    setOpenAdd(true);
  };

  const handleOpenEdit = (triplet) => {
    setIsEditing(true);
    setEditingId(triplet.id);
    setNewTriplet({ head: triplet.head, relation: triplet.relation, tail: triplet.tail, confidence: triplet.confidence });
    setOpenAdd(true);
  };

  const handleSave = async () => {
    try {
      const res = isEditing 
        ? await knowledgeService.update(editingId, newTriplet)
        : await knowledgeService.add(newTriplet);

      if (res.data.success) {
        setOpenAdd(false);
        fetchKnowledge();
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      const res = await knowledgeService.remove(id);
      if (res.data.success) fetchKnowledge();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filtered = knowledge.filter(t => {
    const s = searchTerm.toLowerCase();
    return (t.head || '').toLowerCase().includes(s) ||
           (t.relation || '').toLowerCase().includes(s) ||
           (t.tail || '').toLowerCase().includes(s);
  });

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Knowledge Base</Typography>
        {isDevOps() && (
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleOpenAdd}>
            Add Triplet
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Head (Anomaly)</TableCell>
              <TableCell>Relation</TableCell>
              <TableCell>Tail (Cause/Solution)</TableCell>
              <TableCell>Confidence</TableCell>
              {isDevOps() && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No data found</TableCell></TableRow>
            ) : (
              filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.head || 'Unknown'}</TableCell>
                  <TableCell><Chip label={t.relation || 'linked to'} size="small" variant="outlined" /></TableCell>
                  <TableCell>{t.tail || 'None'}</TableCell>
                  <TableCell>{(t.confidence * 100).toFixed(0)}%</TableCell>
                  {isDevOps() && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => handleOpenEdit(t)}><Edit2 size={16} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}><Trash2 size={16} /></IconButton>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value))}
        />
      </TableContainer>

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)}>
        <DialogTitle>{isEditing ? 'Edit' : 'New'} Knowledge Triplet</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 350 }}>
            <TextField label="Head (Anomaly)" fullWidth value={newTriplet.head} onChange={(e) => setNewTriplet({...newTriplet, head: e.target.value})} />
            <TextField label="Relation" fullWidth value={newTriplet.relation} onChange={(e) => setNewTriplet({...newTriplet, relation: e.target.value})} />
            <TextField label="Tail (Cause/Solution)" fullWidth multiline rows={2} value={newTriplet.tail} onChange={(e) => setNewTriplet({...newTriplet, tail: e.target.value})} />
            <TextField label="Confidence (0.0 - 1.0)" fullWidth type="number" value={newTriplet.confidence} onChange={(e) => setNewTriplet({...newTriplet, confidence: parseFloat(e.target.value)})} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">{isEditing ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KnowledgePage;
