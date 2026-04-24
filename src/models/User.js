const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async findByUsername(username) {
    const result = await db.query('SELECT * FROM utilisateur WHERE username = $1', [username]);
    return result.rows[0];
  }

  static async create(data) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await db.query(
      'INSERT INTO utilisateur (username, password_hash, role, name) VALUES ($1, $2, $3, $4) RETURNING id, username, role, name',
      [data.username, passwordHash, data.role || 'viewer', data.name]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query('SELECT id, username, role, name FROM utilisateur WHERE id = $1', [id]);
    return result.rows[0];
  }
}

module.exports = User;
