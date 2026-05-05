const db = require('../src/config/database');

async function check() {
  try {
    const res = await db.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'incident_reports'
    `);
    console.log('Column Nullability:');
    res.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.is_nullable}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
