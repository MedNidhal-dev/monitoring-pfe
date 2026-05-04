# api_server.py - Flask API for AI Monitoring
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
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
    return jsonify({'status': 'UP', 'service': 'AI Monitoring Service', 'timestamp': str(datetime.now())})

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
    print("AI Monitoring API Server")
    print("=" * 60)
    print("Endpoints:")
    print("  GET  /health     - Health check")
    print("  POST /api/learn  - Auto-Learning trigger")
    print("=" * 60)
    print("Starting on http://0.0.0.0:5001")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5001, debug=False)