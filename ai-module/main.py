import time
from datetime import datetime
import detector
import ner
import kg_manager
import rca
import reporter


CHECK_INTERVAL = 300  # 5 minutes


def process_log_error(log_error):
    """
    Traite une erreur de log détectée
    """
    print("\n" + "=" * 70)
    print("TRAITEMENT ERREUR LOG")
    print("=" * 70)
    
    log_msg = log_error.get('message', '')
    log_level = log_error.get('level', 'ERROR')
    server = log_error.get('server', 'unknown')
    timestamp = log_error.get('timestamp', datetime.now())
    
    print(f"Message: {log_msg[:60]}...")
    print(f"Niveau: {log_level}")
    print(f"Serveur: {server}")
    
    # Extraction d'entités
    entities = ner.extract_entities(log_msg, use_llm=True)

    service = entities.get('service_name', 'UNKNOWN')
    error_type = entities.get('error_type', 'UNKNOWN')

    print(f"Service: {service}")
    print(f"Type: {error_type}")

    # Mapper le type d'erreur NER vers un type d'anomalie connu du KG
    error_to_anomaly = {
        'timeout': 'DATABASE_TIMEOUT',
        'connection refused': 'SERVICE_DOWN',
        'connection failed': 'SERVICE_DOWN',
        'out of memory': 'OUT_OF_MEMORY',
        'crash': 'SERVICE_DOWN',
        'not found': 'SERVICE_SLOW',
        'unauthorized': 'SERVICE_SLOW',
        'database error': 'DATABASE_TIMEOUT',
    }

    anomaly_type = error_to_anomaly.get(error_type.lower(), 'ERROR_RATE_HIGH')
    print(f"Anomaly type mapped: {anomaly_type}")

    # Analyse RCA
    anomaly_info = {
        'type': anomaly_type,
        'value': log_level,
        'host': server,
        'timestamp': timestamp,
        'message': log_msg
    }
    
    analysis = rca.analyze_anomaly(anomaly_info)
    
    # Génération rapport
    report_id = reporter.generate_report(anomaly_info, analysis, entities)
    
    # Email si sévérité importante
    report_data = reporter.get_report(report_id)
    
    if report_data and report_data['severity'] in ['CRITICAL', 'HIGH', 'MEDIUM']:
        print(f"\nEnvoi email pour incident #{report_id}...")
        # email_sender.send_alert(report_data)
        print("(Email désactivé pour l'instant)")
    
    print("=" * 70)
    
    return report_id


def process_metric_anomaly(metric_anomaly):
    """
    Traite une anomalie de métrique détectée
    """
    print("\n" + "=" * 70)
    print("TRAITEMENT ANOMALIE MÉTRIQUE")
    print("=" * 70)
    
    anomaly_type = metric_anomaly.get('type', 'UNKNOWN')
    value = metric_anomaly.get('value', 'N/A')
    host = metric_anomaly.get('host', 'unknown')
    timestamp = metric_anomaly.get('timestamp', datetime.now())
    
    print(f"Type: {anomaly_type}")
    print(f"Valeur: {value}")
    print(f"Serveur: {host}")
    
    # Analyse RCA
    anomaly_info = {
        'type': anomaly_type,
        'value': value,
        'host': host,
        'timestamp': timestamp
    }
    
    analysis = rca.analyze_anomaly(anomaly_info)
    
    # Génération rapport
    report_id = reporter.generate_report(anomaly_info, analysis)
    
    # Email si sévérité importante
    report_data = reporter.get_report(report_id)
    
    if report_data and report_data['severity'] in ['CRITICAL', 'HIGH', 'MEDIUM']:
        print(f"\nEnvoi email pour incident #{report_id}...")
        # email_sender.send_alert(report_data)
        print("(Email désactivé pour l'instant)")
    
    print("=" * 70)
    
    return report_id


def main_loop():
    """
    Boucle principale
    """
    print("\n" + "=" * 70)
    print("SYSTÈME DE MONITORING INTELLIGENT - VERMEG")
    print("Développé par: Nidhal - PFE 2026")
    print("=" * 70)
    
    print(f"\nIntervalle: {CHECK_INTERVAL} secondes ({CHECK_INTERVAL // 60} minutes)")
    print("Appuyez sur Ctrl+C pour arrêter\n")
    
    iteration = 0
    
    try:
        while True:
            iteration += 1
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            print("\n" + "=" * 70)
            print(f"ITÉRATION #{iteration} - {current_time}")
            print("=" * 70)
            
            # Détection d'anomalies
            print("\nDétection anomalies...")
            results = detector.run_detection()
            
            log_errors = results.get('log_errors', [])
            metric_anomalies = results.get('metric_anomalies', [])
            total = results.get('total_count', 0)
            
            print(f"Détection terminée: {total} anomalies")
            
            
            # Traiter les erreurs de logs
            if log_errors:
                print(f"\n{len(log_errors)} erreurs de logs à traiter")
                
                for log_error in log_errors:
                    try:
                        process_log_error(log_error)
                    except Exception as e:
                        print(f"Erreur traitement log: {e}")
            
            
            # Traiter les anomalies de métriques
            if metric_anomalies:
                print(f"\n{len(metric_anomalies)} anomalies métriques à traiter")
                
                for metric_anomaly in metric_anomalies:
                    try:
                        process_metric_anomaly(metric_anomaly)
                    except Exception as e:
                        print(f"Erreur traitement métrique: {e}")
            
            
            if total == 0:
                print("\nAucune anomalie - Système sain")
            
            print(f"\nAttente de {CHECK_INTERVAL} secondes...")
            print("-" * 70)
            
            time.sleep(CHECK_INTERVAL)
    
    except KeyboardInterrupt:
        print("\n\nArrêt du système")
        print("Au revoir !")


if __name__ == "__main__":
    main_loop()