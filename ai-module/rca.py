import ollama
import json
import kg_manager
import detector
import re


def get_best_cause_with_solutions(causes, anomaly_type):
    """
    Pick the best cause from the list. Prefers causes that have solutions.
    For CPU anomalies, prefers memory/loop causes over database pool.
    """
    if not causes:
        return None, []

    best = None
    best_solutions = []

    for cause_info in causes:
        cause_name = cause_info['cause']
        sols = kg_manager.find_solutions(cause_name)

        # Relevance scoring
        score = cause_info.get('confidence', 0.5)

        # Boost causes that actually have solutions
        if sols:
            score += 0.1

        # Boost relevance for CPU anomalies
        if anomaly_type == 'CPU_HIGH_USAGE':
            if 'MEMORY' in cause_name.upper() or 'LOOP' in cause_name.upper() or 'CONCURRENT' in cause_name.upper():
                score += 0.05
            elif 'DATABASE_POOL' in cause_name.upper():
                score -= 0.1  # Less likely direct cause of CPU 100%

        # Boost relevance for MEMORY anomalies
        if anomaly_type == 'MEMORY_HIGH_USAGE':
            if 'MEMORY' in cause_name.upper() or 'CACHE' in cause_name.upper() or 'LEAK' in cause_name.upper():
                score += 0.05

        # Boost relevance for DISK anomalies
        if anomaly_type == 'DISK_HIGH_USAGE':
            if 'LOG' in cause_name.upper() or 'TEMP' in cause_name.upper() or 'ARTIFACT' in cause_name.upper():
                score += 0.05

        if not best or score > best_score:
            best = cause_info
            best_score = score
            best_solutions = sols

    return best, best_solutions


def build_fallback_response(anomaly_type, metric_value, host_name, cause_info, solutions):
    """
    Build a professional fallback response when LLM is unavailable.
    Uses the Knowledge Graph directly with clean, professional text.
    """
    cause_name = clean_root_cause(cause_info['cause'])
    confidence = cause_info.get('confidence', 0.7)

    # Build human-readable explanation based on anomaly type and cause
    explanations = {
        'CPU_HIGH_USAGE': {
            'MEMORY_LEAK': f"High CPU usage detected at {metric_value}%. A memory leak is causing the application to consume excessive processing resources as the garbage collector works overtime. This often occurs with long-running processes or unclosed connections.",
            'Infinite loop in code': f"CPU at {metric_value}% indicates an infinite loop or inefficient algorithm in the application code. The process is continuously executing without yielding control, causing processor saturation.",
            'Too many concurrent requests': f"CPU usage at {metric_value}% is caused by a surge in concurrent user requests. The server is overloaded and cannot process the incoming load efficiently.",
            'DATABASE_POOL_EXHAUSTED': f"High CPU at {metric_value}% may be related to database connection pool exhaustion. The application is repeatedly trying to establish new connections, consuming significant processing power.",
        },
        'MEMORY_HIGH_USAGE': {
            'MEMORY_LEAK': f"Memory usage at {metric_value}% indicates a memory leak. The application is allocating memory without properly releasing it, causing gradual consumption of available RAM.",
            'Large object caching': f"Memory at {metric_value}% is caused by large objects being cached without size limits. The cache is growing beyond its intended capacity.",
            'Too many objects in heap': f"High memory usage at {metric_value}% is due to excessive object creation in the JVM heap. This can occur during batch processing or large data imports.",
        },
        'DISK_HIGH_USAGE': {
            'Log files not rotated': f"Disk usage at {metric_value}% is caused by log files that have not been rotated. Old log files are accumulating and consuming available storage.",
            'Old artifacts not cleaned': f"Disk at {metric_value}% indicates build artifacts and temporary files have not been cleaned up. Deployment packages and old versions are filling the disk.",
            'Temp files accumulation': f"Disk usage at {metric_value}% is due to temporary files accumulating over time. The /tmp directory or application temp folder needs cleanup.",
            'Database growth without archiving': f"High disk usage at {metric_value}% is caused by database growth without proper archiving strategy. Historical data should be moved to cold storage.",
        },
    }

    explanation = explanations.get(anomaly_type, {}).get(cause_name,
        f"{anomaly_type} detected with value {metric_value}%. "
        f"Root cause identified: {cause_name}. "
        f"Immediate action is recommended to restore normal system operation."
    )

    return {
        'anomaly_type': anomaly_type,
        'root_cause': cause_name,
        'explanation': explanation,
        'solutions': [s['solution'] for s in solutions[:3]],
        'confidence': confidence
    }


def clean_root_cause(value):
    if not value:
        return "UNKNOWN"
    value = re.sub(r"^CAUSE:\s*", "", value, flags=re.IGNORECASE)
    value = re.sub(r"\s*\(confidence:.*?\)\s*$", "", value, flags=re.IGNORECASE)
    return value.strip()

def analyze_anomaly(anomaly_data):

    # Affichage pour suivre l'analyse
    print("\n" + "*" * 70)
    print("ANALYSE DE CAUSE RACINE")
    print("=" * 70)
    
    # Extraction des données de l'anomalie
    anomaly_type = anomaly_data.get('type', 'UNKNOWN')
    metric_value = anomaly_data.get('value', 'N/A')
    host_name = anomaly_data.get('host', 'unknown')
    timestamp = anomaly_data.get('timestamp', 'unknown')
    
    # Afficher les infos
    print(f"Type anomalie: {anomaly_type}")
    print(f"Valeur: {metric_value}")
    print(f"Serveur: {host_name}")
    print(f"Horodatage: {timestamp}")
    print("-" * 70)
    
    
    # Étape 1: Chercher les connaissances dans le Knowledge Graph
    print("Consultation du Knowledge Graph...")
    
    kg_context = kg_manager.build_kg_context(anomaly_type)
    
    # Si aucune connaissance trouvée
    if "No knowledge found" in kg_context:
        print(f"Aucune info disponible pour {anomaly_type}")
        return {
            'anomaly_type': anomaly_type,
            'root_cause': 'UNKNOWN',
            'explanation': 'Pas de connaissance disponible dans le système',
            'solutions': ['Investigation manuelle nécessaire'],
            'confidence': 0.0
        }
    
    print("Connaissances récupérées")
    
    
    prompt_text = f"""Tu es un expert DevOps. Analyse cette anomalie système.

RÈGLES STRICTES:
1. Réponds UNIQUEMENT avec un objet JSON valide
2. PAS de texte avant ou après le JSON
3. PAS de markdown ```json``` autour
4. PAS de phrases génériques comme "Solution 1"
5. Solutions DOIVENT être des actions spécifiques et réalisables

DONNÉES DE L'ANOMALIE:
- Type: {anomaly_type}
- Valeur: {metric_value}
- Serveur: {host_name}
- Heure: {timestamp}

CONTEXTE DE LA BASE DE CONNAISSANCES:
{kg_context}

TACHE:
1. Identifie la cause technique exacte (ne dis pas juste le type d'anomalie)
2. Explique en 2-3 phrases pourquoi ça arrive (langage métier, pas trop technique)
3. Donne 2-3 solutions CONCRÈTES (pas de placeholders)

FORMAT JSON EXIGÉ:
{{
  "root_cause": "cause spécifique comme 'Fuite mémoire dans le pool de connexions JDBC'",
  "explanation": "explication métier de 2-3 phrases",
  "solutions": [
    "Action spécifique 1: redémarrer le service X avec commande Y",
    "Action spécifique 2: augmenter la limite Z à 500MB"
  ],
  "confidence": 0.95
}}

IMPORTANT:
- confidence: nombre entre 0.0 et 1.0 (1.0 = très certain)
- root_cause: sois précis, ne répète pas "{anomaly_type}"
- explanation: langage compréhensible par un manager
- solutions: pas "Solution 1", donne la vraie commande ou action"""
    
    
    # Étape 3: Analyser avec Llama
    try:
        print("Analyse en cours avec Llama...")
        
        response = ollama.chat(
            model='llama3.2:1b',
            messages=[
                {
                    'role': 'user',
                    'content': prompt_text
                }
            ]
        )
        
        llama_result = response['message']['content']
        print("Réponse Llama obtenue")
        
        
        # Étape 4: Nettoyer et parser la réponse
        llama_result = llama_result.strip()
        
        # Supprimer les balises markdown si présentes
        if llama_result.startswith('```json'):
            llama_result = llama_result.replace('```json', '', 1)
        if llama_result.startswith('```'):
            llama_result = llama_result.replace('```', '', 1)
        if llama_result.endswith('```'):
            llama_result = llama_result[:-3]
        
        llama_result = llama_result.strip()
        
        # Convertir JSON en dictionnaire Python
        analysis = json.loads(llama_result)
        
        # Vérifier que toutes les clés sont présentes
        if 'root_cause' not in analysis:
            analysis['root_cause'] = 'UNKNOWN'
        if 'explanation' not in analysis:
            analysis['explanation'] = 'Pas d\'explication fournie'
        if 'solutions' not in analysis:
            analysis['solutions'] = []
        if 'confidence' not in analysis:
            analysis['confidence'] = 0.5
        
        analysis['root_cause'] = clean_root_cause(analysis.get('root_cause'))

        
        # Ajouter le type d'anomalie au résultat
        analysis['anomaly_type'] = anomaly_type
        
        print("-" * 70)
        print("Analyse terminée")
        print(f"Cause identifiée: {analysis['root_cause']}")
        print(f"Niveau de confiance: {analysis['confidence']}")
        print("=" * 70)
        
        return analysis
        
        
    except json.JSONDecodeError as e:
        # Si le JSON n'est pas valide, utiliser le KG directement avec une explication professionnelle
        print(f"Erreur parsing JSON: {e}")

        causes = kg_manager.find_causes(anomaly_type)

        if causes:
            best_cause, best_solutions = get_best_cause_with_solutions(causes, anomaly_type)
            return build_fallback_response(anomaly_type, metric_value, host_name, best_cause, best_solutions)
        else:
            return {
                'anomaly_type': anomaly_type,
                'root_cause': 'UNKNOWN',
                'explanation': f'{anomaly_type} detected at {metric_value}% on {host_name}. The Knowledge Graph has no entries for this anomaly type. Manual investigation is required.',
                'solutions': ['Investigation manuelle requise'],
                'confidence': 0.0
            }
    
    except Exception as e:
        # Autres erreurs (Ollama down, etc.)
        print(f"Erreur durant l'analyse: {e}")

        causes = kg_manager.find_causes(anomaly_type)

        if causes:
            best_cause, best_solutions = get_best_cause_with_solutions(causes, anomaly_type)
            return build_fallback_response(anomaly_type, metric_value, host_name, best_cause, best_solutions)
        else:
            return {
                'anomaly_type': anomaly_type,
                'root_cause': 'UNKNOWN',
                'explanation': f'{anomaly_type} detected at {metric_value}% on {host_name}. The Knowledge Graph has no entries for this anomaly type. Manual investigation is required.',
                'solutions': ['Vérifier Ollama et Knowledge Graph'],
                'confidence': 0.0
            }


if __name__ == "__main__":
    dummy_anomaly = {
        'type': 'CPU_HIGH_USAGE',
        'value': 95.5,
        'host': 'DESKTOP-T3I98MP',
        'timestamp': '2026-04-10 10:00:00'
    }
    result = analyze_anomaly(dummy_anomaly)
    print("\nRESULTAT COMPLET:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
