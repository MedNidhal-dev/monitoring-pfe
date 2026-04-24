const pool = require('../src/config/database');
const { parseTextReport } = require('../src/Services/alertService');

async function migrate() {
  console.log('--- Reparsing incident checklists ---');
  
  try {
    const { rows: incidents } = await pool.query(
      "SELECT id, ai_raw_report FROM incident_reports WHERE checklist = '[]' OR checklist IS NULL"
    );

    console.log(`Found ${incidents.length} incidents to process`);

    for (const incident of incidents) {
      if (!incident.ai_raw_report) continue;

      const parsed = parseTextReport(incident.ai_raw_report);
      
      if (parsed.checklist?.length > 0) {
        await pool.query(
          "UPDATE incident_reports SET checklist = $1 WHERE id = $2",
          [JSON.stringify(parsed.checklist), incident.id]
        );
        console.log(`Updated incident #${incident.id} with ${parsed.checklist.length} actions`);
      }
    }

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit();
  }
}

migrate();
