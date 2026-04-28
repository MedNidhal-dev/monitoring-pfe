import ollama
import json
import re

def clean_log_message(message):
  
    # Enlever les timestamps au début 
    message = re.sub(r'^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}', '', message)
    
    # Enlever les niveaux de log (ERROR, FATAL, WARNING, etc.)
    message = re.sub(r'^(ERROR|FATAL|WARN|INFO|DEBUG)\s*[-:]*\s*', '', message, flags=re.IGNORECASE)
    
    # Enlever espaces multiples
    message = re.sub(r'\s+', ' ', message)
    
    # Enlever espaces début/fin
    message = message.strip()
    
    return message


def extract_entities_with_llama(log_message):
    
    cleaned_message = clean_log_message(log_message)
    prompt = f"""You are an expert at analyzing system logs.

Extract these entities from the log message:

LOG MESSAGE:
{cleaned_message}

Extract ONLY:
1. SERVICE_NAME: The name of the service or application
   Examples: "Currency-Service", "Payment-Service", "Database", "Frontend"
   If not found, use "unknown"

2. ERROR_TYPE: The type of error or problem
   Examples: "timeout", "connection refused", "out of memory", "crash"
   If not found, use "unknown"

Respond with ONLY a JSON object, no other text:
{{
  "service_name": "...",
  "error_type": "..."
}}
"""
    
    try:
        # Envoyer le prompt à Llama via Ollama
        print(f" Envoi à Llama pour analyse...")
        
        response = ollama.chat(
            model='llama3.2:1b',
            messages=[
                {
                    'role': 'user',
                    'content': prompt
                }
            ]
        )
        
        # Extraire la réponse de Llama
        llama_response = response['message']['content']
        
        print(f" Réponse de Llama reçue")

        llama_response = llama_response.strip()
        
        # Enlever les balises markdown si présentes
        if llama_response.startswith('```json'):
            llama_response = llama_response.replace('```json', '', 1)
        if llama_response.startswith('```'):
            llama_response = llama_response.replace('```', '', 1)
        if llama_response.endswith('```'):
            llama_response = llama_response[:-3]
        
        llama_response = llama_response.strip()
        if not llama_response.endswith('}'):
            llama_response += '\n}'
        
        # Parser le JSON
        entities = json.loads(llama_response)
        
        # Vérifier que les clés existent
        if 'service_name' not in entities:
            entities['service_name'] = 'unknown'
        if 'error_type' not in entities:
            entities['error_type'] = 'unknown'
        
        return entities
        
    except json.JSONDecodeError as e:
        # Si le JSON est invalide, retourner des valeurs par défaut
        print(f" Erreur parsing JSON: {e}")
        print(f"Réponse Llama: {llama_response}")
        
        return {
            'service_name': 'unknown',
            'error_type': 'unknown'
        }
        
    except Exception as e:
        print(f" Erreur lors de l'extraction: {e}")
        
        return {
            'service_name': 'unknown',
            'error_type': 'unknown'
        }


def extract_entities_simple(log_message):
    
    entities = {
        'service_name': 'unknown',
        'error_type': 'unknown'
    }
    
    cleaned = clean_log_message(log_message)
   
    service_patterns = [
        r'([A-Z][a-zA-Z]+-Service)',  # Currency-Service, Payment-Service
        r'([A-Z][a-zA-Z]+Service)',   
        r'(Database|PostgreSQL|Redis|Nginx)',  
        r'(Frontend|Backend|API)',   
    ]
    
    for pattern in service_patterns:
        match = re.search(pattern, cleaned, re.IGNORECASE)
        if match:
            entities['service_name'] = match.group(1)
            break
    
    # Pattern pour détecter le type d'erreur
    error_keywords = {
        'timeout': ['timeout', 'timed out'],
        'connection refused': ['connection refused', 'refused'],
        'connection failed': ['connection failed', 'cannot connect'],
        'out of memory': ['out of memory', 'oom', 'memory error'],
        'crash': ['crashed', 'crash', 'fatal error'],
        'not found': ['not found', '404'],
        'unauthorized': ['unauthorized', '401', 'access denied'],
        'database error': ['database error', 'db error', 'sql error'],
    }
    
    for error_type, keywords in error_keywords.items():
        for keyword in keywords:
            if keyword in cleaned.lower():
                entities['error_type'] = error_type
                return entities
    
    return entities


def extract_entities(log_message, use_llm=True):
    
    print("=" * 70)
    print("NER - EXTRACTION D'ENTITÉS")
    print("=" * 70)
    print(f"Message: {log_message[:80]}...")
    print("-" * 70)
    
    if use_llm:
        # Essayer avec Llama d'abord
        try:
            entities = extract_entities_with_llama(log_message)
            print(f" Extraction via Llama réussie")
            print(f"   Service: {entities['service_name']}")
            print(f"   Type erreur: {entities['error_type']}")
            print("=" * 70)
            return entities
            
        except Exception as e:
            # Si Llama échoue, utiliser la méthode simple
            print(f" Llama indisponible, utilisation méthode regex")
            entities = extract_entities_simple(log_message)
            print(f" Extraction via regex")
            print(f"   Service: {entities['service_name']}")
            print(f"   Type erreur: {entities['error_type']}")
            print("=" * 70)
            return entities
    else:
        entities = extract_entities_simple(log_message)
        print(f"✅ Extraction via regex (mode simple)")
        print(f"   Service: {entities['service_name']}")
        print(f"   Type erreur: {entities['error_type']}")
        print("=" * 70)
        return entities


if __name__ == "__main__":
    test_log = "2025-12-30 16:37:11,857 WARN  @ (Thread-3 (ActiveMQ-remoting-threads-ActiveMQServerImpl::serverUUID=66001aad-be4c-11f0-afb6-0050569c4c48-626445699)) [org.apache.activemq.artemis.core.server ServerSessionImpl.java 1879] AMQ222107: Cleared up resources for session 3cc631e0-dc33-11f0-b9e8-0050569cb4d4"
    result = extract_entities(test_log, use_llm=True)
    print("FINAL RESULT:", result)
