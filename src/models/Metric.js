const db = require('../config/database');

class Metric {
  static async create(data) {
    const result = await db.query(
      "INSERT INTO metrics (host_name, agent_type, module_type, metric_set, data, timestamp) VALUES ($1, 'metricbeat', $2, $3, $4, $5) RETURNING *",
      [
        data.host_name,
        data.module_type,
        data.metric_set,
        typeof data.data === 'string' ? data.data : JSON.stringify(data.data),
        data.timestamp
      ]
    );
    return result.rows[0];
  }

  static async getAll(limit = 50) {
    const result = await db.query('SELECT * FROM metrics ORDER BY timestamp DESC LIMIT $1', [limit]);
    return result.rows;
  }

  static async getByModule(module, limit = 100) {
    const result = await db.query(
      'SELECT * FROM metrics WHERE module_type = $1 ORDER BY timestamp DESC LIMIT $2',
      [module, limit]
    );
    return result.rows;
  }

  static async getByServer(host, limit = 100) {
    const result = await db.query(
      'SELECT * FROM metrics WHERE host_name = $1 ORDER BY timestamp DESC LIMIT $2',
      [host, limit]
    );
    return result.rows;
  }
}

module.exports = Metric;