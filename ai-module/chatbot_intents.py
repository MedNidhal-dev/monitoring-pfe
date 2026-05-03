#!/usr/bin/env python3
# chatbot_intents.py - Detect what the manager is asking

import re

def detect_intent(question):
    """
    Detects the intention of the manager's question
    
    Returns:
        dict: {
            'intent': str,  # Type of question
            'params': dict   # Extracted parameters
        }
    """
    question_lower = question.lower()
    
    # INTENT 0: Greetings
    if any(word in question_lower for word in ['hello', 'hi', 'bonjour', 'salut', 'hey', 'yo', 'assistant']):
        return {
            'intent': 'greeting',
            'params': {}
        }

    # INTENT 1: Question about specific incident
    if 'incident' in question_lower or '#' in question:
        # Match #123 or just 123 after 'incident'
        match = re.search(r'(?:#|incident\s*)(\d+)', question_lower)
        if match:
            incident_id = match.group(1)
            
            # Sub-intent: why slow resolution?
            if any(word in question_lower for word in ['long', 'lent', 'pourquoi', 'temps', 'durée', 'heure', 'pourquoi si long']):
                return {
                    'intent': 'explain_incident_duration',
                    'params': {'incident_id': incident_id}
                }
            
            # Sub-intent: incident details
            else:
                return {
                    'intent': 'incident_details',
                    'params': {'incident_id': incident_id}
                }
    
    # INTENT 2: MTTR questions
    if 'mttr' in question_lower or 'temps de résolution' in question_lower:
        if any(word in question_lower for word in ['augment', 'hausse', 'pourquoi', 'évolué', 'change']):
            return {
                'intent': 'explain_mttr_change',
                'params': {'period': '7d'}
            }
        else:
            return {
                'intent': 'get_mttr',
                'params': {'period': '7d'}
            }
    
    # INTENT 3: Most problematic service
    if any(word in question_lower for word in ['service', 'système', 'composant', 'application']):
        if any(word in question_lower for word in ['problématique', 'problème', 'incidents', 'pire', 'plus de problèmes']):
            return {
                'intent': 'most_problematic_service',
                'params': {'period': '30d'}
            }
    
    # INTENT 4: AI effectiveness/ROI
    if any(word in question_lower for word in ['ia', 'intelligence', 'efficace', 'efficacité', 'roi', 'économie', 'utile']):
        return {
            'intent': 'ai_effectiveness',
            'params': {}
        }
    
    # INTENT 5: General stats (default)
    return {
        'intent': 'general_stats',
        'params': {'period': '7d'}
    }


def extract_period(question):
    """
    Extract time period from question
    
    Examples:
        "cette semaine" → 7d
        "ce mois" → 30d
        "aujourd'hui" → 1d
    """
    question_lower = question.lower()
    
    if any(word in question_lower for word in ['aujourd\'hui', 'today', 'ce jour']):
        return '1d'
    elif any(word in question_lower for word in ['semaine', 'week', '7 jours', 'cette semaine']):
        return '7d'
    elif any(word in question_lower for word in ['mois', 'month', '30 jours', 'ce mois']):
        return '30d'
    else:
        return '7d'  # Default