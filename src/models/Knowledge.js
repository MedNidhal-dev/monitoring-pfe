const db = require('../config/database');

class Knowledge {
  static async getAll() {
    const result = await db.query(
      'SELECT id, head_entity as head, relation, tail_entity as tail, confidence, source, created_at FROM knowledge_graph ORDER BY id ASC'
    );
    return result.rows;
  }

  static async findSolutions(anomalyType) {
    const result = await db.query(
      "SELECT tail_entity as solution, confidence FROM knowledge_graph WHERE head_entity = $1 AND relation = 'SOLVED_BY' ORDER BY confidence DESC",
      [anomalyType]
    );
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
