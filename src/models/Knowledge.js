const db = require('../config/database');

class Knowledge {
  static async getAll() {
    const result = await db.query(
      'SELECT id, head_entity as head, relation, tail_entity as tail, confidence, source, created_at FROM knowledge_graph ORDER BY id ASC'
    );
    return result.rows;
  }

  static async findSolutions(anomalyType) {
    // Professional Graph Query: Find solutions linked to this anomaly type
    // Anomaly --[has_cause]--> Cause --[has_solution]--> Solution
    const result = await db.query(
      `SELECT DISTINCT k2.tail_entity as solution, k2.confidence 
       FROM knowledge_graph k1
       JOIN knowledge_graph k2 ON k1.tail_entity = k2.head_entity
       WHERE k1.head_entity = $1 
         AND k1.relation = 'has_cause' 
         AND k2.relation = 'has_solution'
       ORDER BY k2.confidence DESC`,
      [anomalyType]
    );
    
    // Fallback: Look for direct 'has_solution' relation
    if (result.rows.length === 0) {
      const fallback = await db.query(
        "SELECT tail_entity as solution, confidence FROM knowledge_graph WHERE head_entity = $1 AND (relation = 'has_solution' OR relation = 'SOLVED_BY') ORDER BY confidence DESC",
        [anomalyType]
      );
      return fallback.rows;
    }
    
    return result.rows;
  }

  static async addTriple(head, relation, tail, confidence = 1.0, source = 'manual') {
    const result = await db.query(
      'INSERT INTO knowledge_graph (head_entity, relation, tail_entity, confidence, source) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [head, relation, tail, confidence, source]
    );
    return result.rows[0];
  }

  static async update(id, head, relation, tail, confidence = 1.0) {
    const result = await db.query(
      'UPDATE knowledge_graph SET head_entity = $2, relation = $3, tail_entity = $4, confidence = $5, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id, head, relation, tail, confidence]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await db.query('DELETE FROM knowledge_graph WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
}

module.exports = Knowledge;
