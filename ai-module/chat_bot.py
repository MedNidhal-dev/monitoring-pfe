#!/usr/bin/env python3
# chatbot.py - Main chatbot logic

import psycopg2
import ollama
from chatbot_intents import detect_intent
import json
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database config from environment
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'monitoring'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port': int(os.getenv('DB_PORT', 5432))
}

def get_db_connection():
    """Connect to PostgreSQL"""
    try:
        return psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise e


# ═══════════════════════════════════════════════════════════
# DATA HANDLERS FOR EACH INTENT
# ═══════════════════════════════════════════════════════════

def handle_incident_details(incident_id):
    """Get details of a specific incident"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            id,
            title,
            severity,
            status,
            root_cause,
            solutions,
            created_at,
            resolved_at,
            COALESCE(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60, 0) as resolution_minutes
        FROM incident_reports
        WHERE id = %s
    """, (incident_id,))
    
    result = cur.fetchone()
    cur.close()
    conn.close()
    
    if result:
        return {
            'id': result[0],
            'title': result[1],
            'severity': result[2],
            'status': result[3],
            'root_cause': result[4],
            'solutions': result[5],
            'created_at': str(result[6]),
            'resolved_at': str(result[7]) if result[7] else None,
            'resolution_minutes': round(result[8]) if result[8] else None
        }
    return None


def handle_explain_incident_duration(incident_id):
    """Explain why an incident took time to resolve"""
    incident = handle_incident_details(incident_id)
    
    if not incident:
        return {'error': f'Incident #{incident_id} not found'}
    
    # Get average MTTR for this severity
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)) as avg_mttr
        FROM incident_reports
        WHERE severity = %s
          AND status = 'RESOLVED'
          AND created_at > NOW() - INTERVAL '30 days'
    """, (incident['severity'],))
    
    avg_mttr = cur.fetchone()[0]
    cur.close()
    conn.close()
    
    return {
        'incident': incident,
        'avg_mttr_for_severity': avg_mttr or 30,
        'comparison': 'slower' if (incident['resolution_minutes'] or 0) > (avg_mttr or 30) else 'faster'
    }


def handle_get_mttr(period):
    """Get MTTR for a period"""
    interval = period.replace('d', ' days')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(f"""
        SELECT 
            ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)) as mttr,
            COUNT(*) as incidents_count
        FROM incident_reports
        WHERE status = 'RESOLVED'
          AND resolved_at > NOW() - INTERVAL '{interval}'
    """)
    
    result = cur.fetchone()
    cur.close()
    conn.close()
    
    return {
        'mttr_minutes': result[0] or 0,
        'incidents_resolved': result[1] or 0,
        'period': period
    }


def handle_explain_mttr_change(period):
    """Explain MTTR change (compare current vs previous period)"""
    interval = period.replace('d', ' days')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Current period MTTR
    cur.execute(f"""
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60))
        FROM incident_reports
        WHERE status = 'RESOLVED'
          AND resolved_at > NOW() - INTERVAL '{interval}'
    """)
    current_mttr = cur.fetchone()[0] or 0
    
    # Previous period MTTR
    cur.execute(f"""
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60))
        FROM incident_reports
        WHERE status = 'RESOLVED'
          AND resolved_at BETWEEN NOW() - INTERVAL '{interval}' * 2 
                              AND NOW() - INTERVAL '{interval}'
    """)
    previous_mttr = cur.fetchone()[0] or 1  # Avoid division by zero
    
    # Top causes this period
    cur.execute(f"""
        SELECT root_cause, COUNT(*) as count
        FROM incident_reports
        WHERE resolved_at > NOW() - INTERVAL '{interval}'
          AND root_cause IS NOT NULL
        GROUP BY root_cause
        ORDER BY count DESC
        LIMIT 3
    """)
    top_causes = cur.fetchall()
    
    cur.close()
    conn.close()
    
    change_pct = round(((current_mttr - previous_mttr) / previous_mttr * 100), 1) if previous_mttr else 0
    
    return {
        'current_mttr': current_mttr,
        'previous_mttr': previous_mttr,
        'change_percentage': change_pct,
        'top_causes': [{'cause': c[0], 'count': c[1]} for c in top_causes] if top_causes else []
    }


def handle_most_problematic_service(period):
    """Find service with most incidents"""
    interval = period.replace('d', ' days')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(f"""
        SELECT 
            COALESCE(service_name, 'Unknown') as service_name,
            COUNT(*) as incidents,
            COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_count
        FROM incident_reports
        WHERE created_at > NOW() - INTERVAL '{interval}'
          AND service_name IS NOT NULL
        GROUP BY service_name
        ORDER BY incidents DESC
        LIMIT 3
    """)
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    return {
        'period': period,
        'services': [
            {
                'name': r[0],
                'incidents': r[1],
                'critical': r[2]
            } for r in results
        ] if results else []
    }


def handle_ai_effectiveness():
    """Calculate AI effectiveness / ROI"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # MTTR with AI (recent)
    cur.execute("""
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60))
        FROM incident_reports
        WHERE status = 'RESOLVED'
          AND created_at > NOW() - INTERVAL '30 days'
    """)
    mttr_with_ai = cur.fetchone()[0] or 30
    
    # Baseline without AI (estimated 45 minutes)
    mttr_without_ai = 45
    
    # Resolved incidents count
    cur.execute("""
        SELECT COUNT(*)
        FROM incident_reports
        WHERE status = 'RESOLVED'
          AND created_at > NOW() - INTERVAL '30 days'
    """)
    incidents_count = cur.fetchone()[0] or 0
    
    cur.close()
    conn.close()
    
    time_saved_per_incident = max(0, mttr_without_ai - mttr_with_ai)
    total_time_saved = time_saved_per_incident * incidents_count
    
    # Cost estimation: 50€/hour for DevOps engineer
    cost_saved = (total_time_saved / 60) * 50
    
    improvement_pct = round((time_saved_per_incident / mttr_without_ai * 100), 1) if mttr_without_ai else 0
    
    return {
        'mttr_with_ai': mttr_with_ai,
        'mttr_without_ai': mttr_without_ai,
        'improvement_percentage': improvement_pct,
        'incidents_resolved': incidents_count,
        'time_saved_minutes': round(total_time_saved),
        'cost_saved_euros': round(cost_saved, 2)
    }


# ═══════════════════════════════════════════════════════════
# MAIN CHATBOT FUNCTION
# ═══════════════════════════════════════════════════════════

def process_question(question, user_role="manager"):
    """
    Main entry point for chatbot
    
    Args:
        question (str): Manager's question
        user_role (str): User role (for future filtering)
    
    Returns:
        dict: {
            'question': str,
            'answer': str,
            'data': dict,
            'intent': str
        }
    """
    
    # 1. Detect intent
    intent_data = detect_intent(question)
    intent = intent_data['intent']
    params = intent_data['params']
    
    logger.info(f"[CHATBOT] Intent detected: {intent}")
    logger.info(f"[CHATBOT] Params: {params}")
    
    # 2. Get data based on intent
    data = {}
    
    try:
        if intent == 'incident_details':
            data = handle_incident_details(params['incident_id'])
        
        elif intent == 'explain_incident_duration':
            data = handle_explain_incident_duration(params['incident_id'])
        
        elif intent == 'get_mttr':
            data = handle_get_mttr(params['period'])
        
        elif intent == 'explain_mttr_change':
            data = handle_explain_mttr_change(params['period'])
        
        elif intent == 'most_problematic_service':
            data = handle_most_problematic_service(params['period'])
        
        elif intent == 'ai_effectiveness':
            data = handle_ai_effectiveness()
        
        elif intent == 'greeting':
            data = {'message': 'Salutation amicale'}
            
        elif intent == 'general_stats':
            data = {
                'mttr': handle_get_mttr('7d'),
                'services': handle_most_problematic_service('30d')
            }
        
        else:
            data = {'message': 'Intent not handled'}
    
    except Exception as e:
        logger.error(f"[CHATBOT ERROR] Data retrieval failed: {e}")
        data = {'error': str(e)}
    
    # 3. Generate answer with Llama
    answer = generate_answer_with_llm(question, intent, data)
    
    return {
        'question': question,
        'answer': answer,
        'data': data,
        'intent': intent
    }


def generate_answer_with_llm(question, intent, data):
    """Use Llama to generate natural language business response"""
    
    # Simple prompt for 1b model
    prompt = f"""[CONTEXTE]
Tu es l'assistant IA de SOLIFE Monitoring.
Intention: {intent}
Données: {json.dumps(data, ensure_ascii=False)}

[QUESTION]
{question}

[RÈGLES]
- Réponds en Français
- Style business et professionnel
- Max 3 phrases
- Si c'est un bonjour, salue poliment.
- Si ID non trouvé, propose de vérifier le numéro.

RÉPONSE:"""
    
    try:
        # Check if Ollama host is configured
        ollama_client = ollama.Client(host=os.getenv('OLLAMA_HOST', 'http://localhost:11434'))
        response = ollama_client.chat(
            model='llama3.2:1b',
            messages=[{'role': 'user', 'content': prompt}]
        )
        
        answer = response['message']['content'].strip()
        logger.info(f"[CHATBOT] Generated answer: {answer[:100]}...")
        return answer
    
    except Exception as e:
        logger.error(f"[CHATBOT ERROR] Llama failed: {e}")
        return generate_fallback_answer(intent, data)


def generate_fallback_answer(intent, data):
    """Fallback template answer if Llama is unavailable"""
    if intent == 'greeting':
        return "Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd'hui ?"
        
    elif intent == 'get_mttr':
        return f"Le MTTR actuel est de {data.get('mttr_minutes', 'N/A')} minutes basé sur {data.get('incidents_resolved', 0)} incidents résolus."
    
    elif intent == 'ai_effectiveness':
        return f"L'IA a amélioré le temps de résolution de {data.get('improvement_percentage', 0)}%, économisant environ {data.get('cost_saved_euros', 0)}€ ce mois."
    
    elif intent == 'incident_details':
        if 'error' in data:
            return f"Désolé, {data['error']}."
        return f"Incident {data.get('title')}: sévérité {data.get('severity')}, statut {data.get('status')}."
    
    elif intent == 'most_problematic_service':
        services = data.get('services', [])
        if services:
            return f"Le service le plus problématique est {services[0]['name']} avec {services[0]['incidents']} incidents."
        return "Aucun service problématique identifié."
    
    else:
        return "Données disponibles. Consultez les dashboards pour plus de détails."


# Test
if __name__ == '__main__':
    test_questions = [
        "Explique-moi l'incident #1",
        "Quel est le MTTR actuel ?",
        "Le service le plus problématique ?",
        "L'IA est-elle efficace ?"
    ]
    
    for q in test_questions:
        print(f"\n{'='*60}")
        print(f"Q: {q}")
        result = process_question(q)
        print(f"Intent: {result['intent']}")
        print(f"Data: {json.dumps(result['data'], indent=2, ensure_ascii=False)[:200]}...")
        print(f"A: {result['answer'][:150]}...")