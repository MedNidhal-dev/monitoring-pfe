import psycopg2
import json
import os

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'monitoring'),
    'user': os.getenv('DB_USER', 'logstash_user'),
    'password': os.getenv('DB_PASSWORD', 'Nidhal123'),
    'port': int(os.getenv('DB_PORT', 5432))
}



def get_connection():
    """
    Connexion à PostgreSQL
    """
    return psycopg2.connect(**DB_CONFIG)


def find_causes(anomaly_type):
  
    conn = get_connection()
    cursor = conn.cursor()
    
    # Chercher dans le KG:
    query = """
        SELECT 
            tail_entity as cause,
            confidence,
            source
        FROM knowledge_graph
        WHERE head_entity = %s
          AND relation = 'has_cause'
        ORDER BY confidence DESC
    """
    
    cursor.execute(query, (anomaly_type,))
    results = cursor.fetchall()
    
    causes = []
    for row in results:
        causes.append({
            'cause': row[0],
            'confidence': float(row[1]) if row[1] else 0.8,
            'source': row[2]
        })
    
    cursor.close()
    conn.close()
    
    print(f" Trouvé {len(causes)} causes pour '{anomaly_type}'")
    
    return causes


def find_solutions(cause):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            tail_entity as solution,
            confidence,
            source
        FROM knowledge_graph
        WHERE head_entity = %s
          AND relation = 'has_solution'
        ORDER BY confidence DESC
    """
    
    cursor.execute(query, (cause,))
    results = cursor.fetchall()
    
    solutions = []
    for row in results:
        solutions.append({
            'solution': row[0],
            'confidence': float(row[1]) if row[1] else 0.8,
            'source': row[2]
        })
    
    cursor.close()
    conn.close()
    
    print(f" Trouvé {len(solutions)} solutions pour '{cause}'")
    
    return solutions


def build_kg_context(anomaly_type):
   
    causes = find_causes(anomaly_type)
    
    if not causes:
        return f"No knowledge found for anomaly type: {anomaly_type}"
    
    context_lines = []
    context_lines.append(f"Knowledge about {anomaly_type}:")
    context_lines.append("")
    
    for idx, cause_info in enumerate(causes, 1):
        cause = cause_info['cause']
        confidence = cause_info['confidence']
        
        context_lines.append(f"{idx}. CAUSE: {cause} (confidence: {confidence})")
        
        # Chercher les solutions pour cette cause
        solutions = find_solutions(cause)
        
        if solutions:
            context_lines.append("   SOLUTIONS:")
            for sol_info in solutions:
                solution = sol_info['solution']
                context_lines.append(f"   - {solution}")
        
        context_lines.append("")
    
    return "\n".join(context_lines)


def check_triplet_exists(head, relation, tail):
    """
    Vérifie si un triplet existe déjà dans le KG
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT COUNT(*) FROM knowledge_graph
        WHERE head_entity = %s
          AND relation = %s
          AND tail_entity = %s
    """
    
    cursor.execute(query, (head, relation, tail))
    count = cursor.fetchone()[0]
    
    cursor.close()
    conn.close()
    
    return count > 0


def add_triplet(head, relation, tail, source='auto_learned', confidence=0.7):
    """
    Ajoute un nouveau triplet au KG
    """
    # Vérifier s'il existe déjà
    if check_triplet_exists(head, relation, tail):
        print(f"  Triplet déjà existant: ({head}) --[{relation}]--> ({tail})")
        return False
    
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
        INSERT INTO knowledge_graph 
        (head_entity, relation, tail_entity, source, confidence)
        VALUES (%s, %s, %s, %s, %s)
    """
    
    cursor.execute(query, (head, relation, tail, source, confidence))
    conn.commit()
    
    cursor.close()
    conn.close()
    
    print(f" Nouveau triplet ajouté: ({head}) --[{relation}]--> ({tail})")
    return True


def learn_from_resolved_incident(incident_id):
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Récupérer l'incident
    query = """
        SELECT 
            service_name,
            anomaly_type,
            root_cause,
            solutions
        FROM incident_reports
        WHERE id = %s
          AND status = 'RESOLVED'
    """
    
    cursor.execute(query, (incident_id,))
    incident = cursor.fetchone()
    
    if not incident:
        print(f" Incident {incident_id} non trouvé ou pas résolu")
        cursor.close()
        conn.close()
        return 0
    
    service = incident[0]
    anomaly = incident[1]
    cause = incident[2]
    solutions = incident[3]  
    
    cursor.close()
    conn.close()
    
    triplets_added = 0
    
    # Triplet 1: Service => has_anomaly => Anomaly
    if service and anomaly:
        if add_triplet(service, 'has_anomaly', anomaly, 'auto_learned', 0.7):
            triplets_added += 1
    
    # Triplet 2: Anomaly => has_cause => Cause
    if anomaly and cause:
        if add_triplet(anomaly, 'has_cause', cause, 'auto_learned', 0.7):
            triplets_added += 1
    
    # Triplet 3: Cause => has_solution => Solutions
    if cause and solutions:
        if isinstance(solutions, str):
            solutions = json.loads(solutions)
        
        if isinstance(solutions, list):
            for solution in solutions:
                if add_triplet(cause, 'has_solution', solution, 'auto_learned', 0.7):
                    triplets_added += 1
    
    print(f" Auto-learning: {triplets_added} nouveaux triplets ajoutés depuis incident #{incident_id}")
    
    return triplets_added

if __name__ == "__main__":
    print(build_kg_context("CPU_HIGH_USAGE"))
