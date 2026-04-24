const db = require('../config/database');

class Log {
  static async create(data) {
    const result = await db.query(
      'INSERT INTO logs (server_name, server_ip, log_level, message, timestamp) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.server_name, data.server_ip, data.log_level, data.message, data.timestamp]
    );
    return result.rows[0];
  }

  static async getAll(limit = 50) {
    const result = await db.query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT $1', [limit]);
    return result.rows;
  }

  static async getByServer(server, limit = 100) {
    const result = await db.query(
      'SELECT * FROM logs WHERE server_name = $1 ORDER BY timestamp DESC LIMIT $2',
      [server, limit]
    );
    return result.rows;
  }
}

module.exports = Log;