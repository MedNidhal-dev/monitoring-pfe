const Knowledge = require('../models/Knowledge');

exports.getAllKnowledge = async (req, res) => {
  try {
    const data = await Knowledge.getAll();
    res.json({ 
      success: true, 
      count: data.length, 
      graph: data 
    });
  } catch (err) {
    console.error('Knowledge graph error:', err.message);
    res.json({ success: false, message: 'Database error' });
  }
};

exports.getSolutions = async (req, res) => {
  try {
    const anomaly = req.params.anomalyType;
    const solutions = await Knowledge.findSolutions(anomaly);
    
    res.json({ 
      success: true, 
      search: anomaly, 
      solutions 
    });
  } catch (err) {
    console.error('getSolutions error:', err.message);
    res.json({ success: false, message: 'Search failed' });
  }
};

exports.addKnowledge = async (req, res) => {
  try {
    const body = req.body;

    if (!body.head || !body.relation || !body.tail) {
      return res.json({ success: false, message: 'All fields required' });
    }

    const triplet = await Knowledge.addTriple(
      body.head, 
      body.relation, 
      body.tail, 
      body.confidence, 
      body.source
    );
    
    res.json({ 
      success: true, 
      message: 'Knowledge added', 
      data: triplet 
    });
    
  } catch (err) {
    console.error('addKnowledge error:', err.message);
    res.json({ success: false, message: 'Insert failed' });
  }
};

exports.updateKnowledge = async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;

    if (!body.head || !body.relation || !body.tail) {
      return res.json({ success: false, message: 'All fields required' });
    }

    const updated = await Knowledge.update(
      id,
      body.head,
      body.relation,
      body.tail,
      body.confidence
    );

    res.json({
      success: true,
      message: 'Updated successfully',
      data: updated
    });
  } catch (err) {
    console.error('updateKnowledge error:', err.message);
    res.json({ success: false, message: 'Update failed' });
  }
};

exports.deleteKnowledge = async (req, res) => {
  try {
    await Knowledge.delete(req.params.id);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error('deleteKnowledge error:', err.message);
    res.json({ success: false, message: 'Delete failed' });
  }
};
