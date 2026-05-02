import psycopg2
from datetime import datetime, timedelta
import json
import os

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_NAME = os.getenv('DB_NAME', 'monitoring')
DB_USER = os.getenv('DB_USER', 'logstash_user')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'Nidhal123')
DB_PORT = int(os.getenv('DB_PORT', 5432))

def get_database_connection():
    try:    
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        return conn
    except Exception as e:
        print(f"Erreur de connexion à la base de données: {e}")
        return None
def check_error_logs(minutes_ago=6):
 
    # Connexion à la base de données
    conn = get_database_connection()
    if not conn:
        return []
    
    cursor = conn.cursor()
    start_time = datetime.now() - timedelta(minutes=minutes_ago)
    
    # Requête SQL pour trouver les erreurs et avertissements
    sql_query = """
        SELECT 
            id,
            timestamp,
            server_name,
            log_level,
            message
        FROM logs
        WHERE log_level IN ('WARN', 'INFO', 'ERROR', 'CRITICAL', 'FATAL')

          AND timestamp > %s
        ORDER BY timestamp DESC
    """
    
    # Exécuter la requête
    cursor.execute(sql_query, (start_time,))
    rows = cursor.fetchall()
    
    # Préparer la liste des erreurs trouvées
    error_list = []
    
    for row in rows:
        error_info = {
            'log_id': row[0],
            'timestamp': row[1].strftime('%Y-%m-%d %H:%M:%S') if row[1] else None,
            'server': row[2],
            'level': row[3],
            'message': row[4],
            'type': 'LOG_ERROR'
        }
        error_list.append(error_info)
    
    # Fermer la connexion
    cursor.close()
    conn.close()
    
    # Afficher le résultat
    print(f"Analyse des logs: {len(error_list)} erreurs trouvées")
    
    return error_list

def check_system_metrics(minutes_ago=6):
    conn = get_database_connection()
    if not conn:
        return []
    
    cursor = conn.cursor()
    
    start_time = datetime.now() - timedelta(minutes=minutes_ago)
    
    # Requête pour récupérer les métriques système récentes
    sql_query = """
    SELECT DISTINCT ON (host_name, metric_set)
        id,
        timestamp,
        host_name,
        module_type,
        metric_set,
        data
    FROM metrics
    WHERE timestamp > %s
      AND module_type = 'system'
      AND host_name = 'srv-monitoring.lab'
    ORDER BY host_name, metric_set, timestamp DESC
"""
    
    cursor.execute(sql_query, (start_time,))
    rows = cursor.fetchall()
    
    metric_anomalies = []
    
    # Analyser chaque métrique
    for row in rows:
        metric_id = row[0]
        timestamp = row[1]
        host_name = row[2]
        module_type = row[3]
        metric_set = row[4]
        data_json = row[5]
        
        # Convertir le JSONB en dictionnaire Python
        if isinstance(data_json, str):
            data = json.loads(data_json)
        else:
            data = data_json
        
        if 'system' in data:
            if 'cpu' in data['system']:
                cpu_info = data['system']['cpu']
                
                if 'total' in cpu_info:
                    if 'pct' in cpu_info['total']:
                        cpu_percent = cpu_info['total']['pct'] * 100
                        cpu_percent = min(cpu_percent, 100.0)  # cap display/report value
                        
                        if cpu_percent > 90:
                            anomaly = {
                                'metric_id': metric_id,
                                'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                                'host': host_name,
                                'type': 'CPU_HIGH_USAGE',
                                'value': round(cpu_percent, 1),
                                'threshold': 90,
                                'description': f'CPU à {round(cpu_percent, 1)}% (seuil: 90%)'
                            }
                            metric_anomalies.append(anomaly)
            
          
            if 'memory' in data['system']:
                mem_info = data['system']['memory']
                if 'actual' in mem_info and 'total' in mem_info:
                    if 'used' in mem_info['actual']:
                        if 'bytes' in mem_info['actual']['used']:
                            mem_used_bytes = mem_info['actual']['used']['bytes']
                            mem_total_bytes = mem_info['total']
                            
                            if mem_total_bytes > 0:
                                mem_percent = (mem_used_bytes / mem_total_bytes) * 100
                                
                                if mem_percent > 85:
                                    anomaly = {
                                        'metric_id': metric_id,
                                        'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                                        'host': host_name,
                                        'type': 'MEMORY_HIGH_USAGE',
                                        'value': round(mem_percent, 1),
                                        'threshold': 85,
                                        'description': f'Mémoire à {round(mem_percent, 1)}% (seuil: 85%)'
                                    }
                                    metric_anomalies.append(anomaly)
            
            
            if 'filesystem' in data['system']:
                disk_info = data['system']['filesystem']
                
                if 'used' in disk_info:
                    if 'pct' in disk_info['used']:
                        disk_percent = disk_info['used']['pct'] * 100
                        
                        if disk_percent > 80:
                            anomaly = {
                                'metric_id': metric_id,
                                'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                                'host': host_name,
                                'type': 'DISK_HIGH_USAGE',
                                'value': round(disk_percent, 1),
                                'threshold': 80,
                                'description': f'Disque à {round(disk_percent, 1)}% (seuil: 80%)'
                            }
                            metric_anomalies.append(anomaly)

    
    
    cursor.close()
    conn.close()
    
    print(f"Analyse des métriques: {len(metric_anomalies)} anomalies trouvées")
        # Deduplicate anomalies by (host, type) keeping the newest/highest value
    dedup = {}
    for a in metric_anomalies:
        key = (a.get('host'), a.get('type'))
        if key not in dedup:
            dedup[key] = a
        else:
            prev = dedup[key]
            # Keep higher value anomaly
            if float(a.get('value', 0)) > float(prev.get('value', 0)):
                dedup[key] = a

    metric_anomalies = list(dedup.values())
    
    return metric_anomalies


def run_detection(minutes_ago=6):
    print("*" * 70)
    print("DÉMARRAGE DE LA DÉTECTION D'ANOMALIES")
    print("*" * 70)
    print(f"Date/Heure: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 70)
    
    # Détecter les erreurs dans les logs
    log_errors = check_error_logs(minutes_ago=minutes_ago)
    
    # Détecter les anomalies dans les métriques
    metric_issues = check_system_metrics(minutes_ago=minutes_ago)
    
    # Préparer le résultat final
    all_anomalies = {
        'detection_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'log_errors': log_errors,
        'metric_anomalies': metric_issues,
        'total_count': len(log_errors) + len(metric_issues)
    }
    
    # Afficher le résumé
    print("-" * 70)
    print("RÉSUMÉ DE LA DÉTECTION:")
    print(f"  * Erreurs de logs: {len(log_errors)}")
    print(f"  * Anomalies métriques: {len(metric_issues)}")
    print(f"  * TOTAL: {all_anomalies['total_count']} anomalies")
    print("-" * 70)
    
    return all_anomalies


if __name__ == "__main__":
    results = run_detection()
    
    # Afficher les détails en format JSON pour vérification
    print("\nDÉTAILS DES ANOMALIES:")
    print(json.dumps(results, indent=2, ensure_ascii=False))