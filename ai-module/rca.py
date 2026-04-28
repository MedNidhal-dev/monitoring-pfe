import ollama
import json
import kg_manager
import detector
import re


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
        # Si le JSON n'est pas valide, utiliser le KG directement
        print(f"Erreur parsing JSON: {e}")
        
        causes = kg_manager.find_causes(anomaly_type)
        
        if causes:
            premiere_cause = causes[0]
            solutions_trouvees = kg_manager.find_solutions(premiere_cause['cause'])
            
            return {
                'anomaly_type': anomaly_type,
                'root_cause': clean_root_cause(premiere_cause['cause']),
                'explanation': f"Cause la plus probable (confiance {premiere_cause['confidence']})",
                'solutions': [s['solution'] for s in solutions_trouvees[:3]],
                'confidence': premiere_cause['confidence']
            }
        else:
            return {
                'anomaly_type': anomaly_type,
                'root_cause': 'UNKNOWN',
                'explanation': 'Impossible de déterminer la cause',
                'solutions': ['Investigation manuelle requise'],
                'confidence': 0.0
            }
    
    except Exception as e:
        # Autres erreurs (Ollama down, etc.)
        print(f"Erreur durant l'analyse: {e}")
        
        causes = kg_manager.find_causes(anomaly_type)
        
        if causes:
            premiere_cause = causes[0]
            solutions_trouvees = kg_manager.find_solutions(premiere_cause['cause'])
            
            return {
                'anomaly_type': anomaly_type,
                'root_cause': clean_root_cause(premiere_cause['cause']),
                'explanation': f"Cause probable (Llama indisponible, KG utilisé)",
                'solutions': [s['solution'] for s in solutions_trouvees[:3]],
                'confidence': premiere_cause['confidence']
            }
        else:
            return {
                'anomaly_type': anomaly_type,
                'root_cause': 'UNKNOWN',
                'explanation': 'Analyse impossible',
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
