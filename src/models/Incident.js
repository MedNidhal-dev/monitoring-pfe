const db = require('../config/database');

class Incident {
  static async create(data) {
    const result = await db.query(
      `INSERT INTO incident_reports 
        (title, description, service_name, anomaly_type, root_cause, explanation, solutions, confidence, severity, status, timestamp, checklist, ai_raw_report)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.title,
        data.description,
        data.service_name,
        data.anomaly_type,
        data.root_cause,
        data.explanation,
        JSON.stringify(data.solutions || []),
        data.confidence,
        data.severity || 'MEDIUM',
        data.status || 'OPEN',
        data.timestamp || new Date(),
        JSON.stringify(data.checklist || []),
        data.ai_raw_report || ""
      ]
    );

    return result.rows[0];
  }

  static async getAll(limit = 50, status = null) {
    let query = status 
      ? 'SELECT * FROM incident_reports WHERE status = $2 ORDER BY created_at DESC LIMIT $1'
      : 'SELECT * FROM incident_reports ORDER BY created_at DESC LIMIT $1';
    const params = status ? [limit, status] : [limit];
    const result = await db.query(query, params);
    return result.rows;
  }

  static async getById(id) {
    const query = 'SELECT * FROM incident_reports WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async resolve(id) {
    const result = await db.query(
      "UPDATE incident_reports SET status = 'RESOLVED', resolved_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }

  static async getOpenCount() {
    const result = await db.query("SELECT COUNT(*) as count FROM incident_reports WHERE status = 'OPEN'");
    return parseInt(result.rows[0].count);
  }

  static async getTopRootCauses(limit = 5) {
    const result = await db.query(
      `SELECT root_cause, COUNT(*) AS occurrences
       FROM incident_reports
       GROUP BY root_cause
       ORDER BY occurrences DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

module.exports = Incident;
