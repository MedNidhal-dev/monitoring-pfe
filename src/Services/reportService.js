const db = require('../config/database');
const Incident = require('../models/Incident');

async function calculerStatsDashboard() {
  const statsQuery = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'OPEN') as open,
      COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved,
      COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical,
      COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - COALESCE(timestamp, created_at))) / 60) FILTER (WHERE status = 'RESOLVED'), 0) as mttr_minutes,
      (COUNT(*) FILTER (WHERE status = 'RESOLVED')::float / NULLIF(COUNT(*), 0) * 100) as resolution_rate
    FROM incident_reports
  `;
  
  const statsResult = await db.query(statsQuery);
  const counts = statsResult.rows[0];
  
  const topCauses = await Incident.getTopRootCauses(5);

  const trendQuery = `
    SELECT 
      CASE EXTRACT(ISODOW FROM COALESCE(timestamp, created_at))
        WHEN 1 THEN 'Mon'
        WHEN 2 THEN 'Tue'
        WHEN 3 THEN 'Wed'
        WHEN 4 THEN 'Thu'
        WHEN 5 THEN 'Fri' 
        WHEN 6 THEN 'Sat' 
        WHEN 7 THEN 'Sun'
      END as name,
      COUNT(*) as count
    FROM incident_reports
    GROUP BY EXTRACT(ISODOW FROM COALESCE(timestamp, created_at))
    ORDER BY EXTRACT(ISODOW FROM COALESCE(timestamp, created_at));
  `;
  const trendResult = await db.query(trendQuery);

  return {
    total: parseInt(counts.total),
    open: parseInt(counts.open),
    resolved: parseInt(counts.resolved),
    critical: parseInt(counts.critical),
    mttr_minutes: Math.round(parseFloat(counts.mttr_minutes || 0)),
    resolution_rate: Math.round(parseFloat(counts.resolution_rate || 0)),
    uptime_sla: 99.85,
    causes: topCauses,
    trend: trendResult.rows,
    generated_at: new Date()
  };
}

module.exports = {
  calculerStatsDashboard
};