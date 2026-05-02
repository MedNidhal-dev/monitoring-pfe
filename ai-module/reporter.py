
import psycopg2
import json
from datetime import datetime
import os
import requests


# Config base de données
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'monitoring'),
    'user': os.getenv('DB_USER', 'logstash_user'),
    'password': os.getenv('DB_PASSWORD', 'Nidhal123'),
    'port': int(os.getenv('DB_PORT', 5432))
}


# Dossier pour sauvegarder les rapports (chemin relatif au script)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_FOLDER = os.path.join(BASE_DIR, "data", "reports")
os.makedirs(REPORTS_FOLDER, exist_ok=True)


def generate_report(anomaly_info, rca_analysis, entities=None):
    
    
    print("\n" + "*" * 70)
    print("GÉNÉRATION RAPPORT D'INCIDENT")
    print("*" * 70)
    
    # Extraire les informations
    anomaly_type = rca_analysis.get('anomaly_type', 'UNKNOWN')
    root_cause = rca_analysis.get('root_cause', 'UNKNOWN')
    explanation = rca_analysis.get('explanation', '')
    solutions = rca_analysis.get('solutions', [])
    confidence = rca_analysis.get('confidence', 0.0)
    
    host_name = anomaly_info.get('host', 'unknown')
    metric_value = anomaly_info.get('value', 'N/A')
    incident_time = anomaly_info.get('timestamp', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    
    service_name = anomaly_info.get('host', 'unknown')
    
    severity = calculate_severity(anomaly_type, confidence)
    report_title = f"{anomaly_type} sur {host_name}"
    description = f"""Anomalie détectée: {anomaly_type}
Valeur mesurée: {metric_value}
Serveur affecté: {host_name}
Heure de détection: {incident_time}

Analyse de cause racine:
{explanation}

Niveau de confiance: {confidence}
"""
    
    print(f"Titre: {report_title}")
    print(f"Sévérité: {severity}")
    print(f"Cause: {root_cause}")
    print("-" * 70)
    
    
    # Enregistrer en base de données
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    existing_id = find_recent_open_incident(anomaly_type, host_name, minutes=20)
    if existing_id:
        print(f"Incident déjà ouvert récemment: #{existing_id} (skip création)")
        return existing_id
    
    
    insert_query = """
        INSERT INTO incident_reports (
            title,
            description,
            severity,
            status,
            service_name,
            anomaly_type,
            root_cause,
            solutions,
            confidence,
            created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    
    cursor.execute(insert_query, (
        report_title,
        description,
        severity,
        'OPEN',
        service_name,
        anomaly_type,
        root_cause,
        json.dumps(solutions),
        confidence,
        incident_time
    ))
    
    report_id = cursor.fetchone()[0]
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"Rapport enregistré - ID: {report_id}")
    notify_backend({
    'title': report_title,
    'description': description,
    'service_name': service_name,
    'anomaly_type': anomaly_type,
    'root_cause': root_cause,
    'explanation': explanation,
    'solutions': solutions,
    'confidence': confidence,
    'severity': severity,
    'timestamp': incident_time
})
    
    
    # Sauvegarder en fichier texte
    save_report_file(report_id, report_title, description, root_cause, solutions, severity, incident_time)
    
    print("=" * 70)
    
    return report_id
# After saving to DB, also notify backend


def calculate_severity(anomaly_type, confidence):
    """
    Calcule la sévérité selon le type d'anomalie
    """
    
    # Anomalies critiques
    critical_types = [
        'SERVICE_DOWN',
        'DATABASE_DOWN',
        'OUT_OF_MEMORY',
        'DISK_FULL'
    ]
    
    # Anomalies importantes
    high_types = [
        'CPU_HIGH_USAGE',
        'MEMORY_HIGH_USAGE',
        'SERVICE_SLOW',
        'DATABASE_TIMEOUT',
        'ERROR_RATE_HIGH'
    ]
    
    if anomaly_type in critical_types:
        return 'CRITICAL'
    elif anomaly_type in high_types:
        return 'HIGH'
    elif confidence >= 0.8:
        return 'MEDIUM'
    else:
        return 'LOW'


def save_report_file(report_id, title, description, cause, solutions, severity, timestamp):
    """
    Sauvegarde le rapport dans un fichier texte
    """
    
    # Nom du fichier
    time_str = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"incident_{report_id}_{time_str}.txt"
    filepath = os.path.join(REPORTS_FOLDER, filename)
    
    # Contenu du rapport
    content = f"""
{'=' * 70}
RAPPORT D'INCIDENT
{'=' * 70}

ID INCIDENT: {report_id}
DATE: {timestamp}
SÉVÉRITÉ: {severity}

{'─' * 70}
TITRE
{'─' * 70}
{title}

{'─' * 70}
DESCRIPTION
{'─' * 70}
{description}

{'─' * 70}
CAUSE RACINE
{'─' * 70}
{cause}

{'─' * 70}
SOLUTIONS RECOMMANDÉES
{'─' * 70}
"""
    
    for idx, solution in enumerate(solutions, 1):
        content += f"{idx}. {solution}\n"
    
    content += f"""
{'─' * 70}
ACTIONS REQUISES
{'─' * 70}
[ ] Vérifier les métriques système
[ ] Appliquer les solutions recommandées
[ ] Tester et valider
[ ] Marquer comme résolu

{'─' * 70}
Rapport généré automatiquement - Système monitoring VERMEG
Développé par: Nidhal - PFE 2026
{'─' * 70}
"""
    
    # Écrire le fichier
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fichier rapport: {filepath}")


def get_report(report_id):
    """
    Récupère un rapport depuis la DB
    """
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    query = """
        SELECT 
            id, title, description, severity, status,
            service_name, anomaly_type, root_cause, solutions,
            confidence, created_at, resolved_at
        FROM incident_reports
        WHERE id = %s
    """
    
    cursor.execute(query, (report_id,))
    row = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if row:
        return {
            'id': row[0],
            'title': row[1],
            'description': row[2],
            'severity': row[3],
            'status': row[4],
            'service_name': row[5],
            'anomaly_type': row[6],
            'root_cause': row[7],
            'solutions': row[8],
            'confidence': float(row[9]) if row[9] else 0.0,
            'created_at': row[10],
            'resolved_at': row[11]
        }
    
    return None


    return None


def notify_backend(incident_data):
    backend_url = os.getenv('BACKEND_URL', 'http://192.168.75.1:3000')
    try:
        response = requests.post(
            f"{backend_url}/api/alerts",
            json=incident_data,
            timeout=5
        )
        print(f"Backend notified: {response.status_code}")
    except Exception as e:
        print(f"Failed to notify backend: {e}")


def find_recent_open_incident(anomaly_type, host_name, minutes=20):
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    title = f"{anomaly_type} sur {host_name}"
    query = """
        SELECT id
        FROM incident_reports
        WHERE status = 'OPEN'
          AND anomaly_type = %s
          AND title = %s
          AND created_at > NOW() - (%s || ' minutes')::interval
        ORDER BY created_at DESC
        LIMIT 1
    """
    cursor.execute(query, (anomaly_type, title, str(minutes)))
    row = cursor.fetchone()

    cursor.close()
    conn.close()
    return row[0] if row else None

