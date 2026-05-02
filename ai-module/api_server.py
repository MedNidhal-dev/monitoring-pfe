#!/usr/bin/env python3
# api_server.py - Flask API for chatbot

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from chat_bot import process_question
from kg_manager import learn_from_resolved_incident
import logging

# Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'UP', 'service': 'AI Chatbot', 'timestamp': str(datetime.now())})

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Chat endpoint for manager assistant
    
    POST /api/chat
    {
        "question": "Why did MTTR increase?",
        "user_role": "manager"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'question' not in data:
            return jsonify({'error': 'Missing question parameter'}), 400
        
        question = data.get('question')
        user_role = data.get('user_role', 'manager')
        
        logger.info(f"[API] Chat request: {question[:50]}...")
        
        # Process with chatbot
        result = process_question(question, user_role)
        
        return jsonify({
            **result,
            'timestamp': str(datetime.now())
        })
        
    except Exception as e:
        logger.error(f"[API ERROR] {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'fallback': 'Chatbot temporarily unavailable. Check Grafana dashboards for details.'
        }), 500

@app.route('/api/learn/<int:incident_id>', methods=['POST'])
def learn(incident_id):
    """
    Endpoint to trigger auto-learning from a resolved incident
    Called by Node.js backend when an incident is marked as RESOLVED
    """
    try:
        logger.info(f"[API] Learning request for incident #{incident_id}")
        count = learn_from_resolved_incident(incident_id)
        
        return jsonify({
            'success': True,
            'incident_id': incident_id,
            'triplets_added': count,
            'message': f'AI successfully learned {count} new facts from this incident.'
        })
    except Exception as e:
        logger.error(f"[API ERROR] Learning failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("AI Chatbot API Server")
    print("=" * 60)
    print("Endpoints:")
    print("  GET  /health     - Health check")
    print("  POST /api/chat   - Chat with AI")
    print("=" * 60)
    print("Starting on http://0.0.0.0:5001")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5001, debug=False)