pipeline {
    agent any
    
    environment {
        // L'IP de ton Windows vue depuis la VM RedHat
        NEXUS_REGISTRY = "192.168.75.1:8082"
        IMAGE_BACKEND = "monitoring-backend"
        IMAGE_AI = "monitoring-ai"
    }
    
    stages {
        stage('Checkout') {
            steps {
                // Jenkins récupère automatiquement le code depuis GitHub
                checkout scm
            }
        }
        
        stage('Build Docker Images') {
            steps {
                script {
                    echo "🏗️ Building Backend Image..."
                    sh "docker build -t ${NEXUS_REGISTRY}/${IMAGE_BACKEND}:latest ."
                    
                    echo "🏗️ Building AI Module Image..."
                    sh "docker build -t ${NEXUS_REGISTRY}/${IMAGE_AI}:latest ./ai-module"
                }
            }
        }
        
        stage('Push to Nexus') {
            steps {
                script {
                    // Utilisation des identifiants 'nexus-credentials' que tu as créés dans Jenkins
                    withCredentials([usernamePassword(credentialsId: 'nexus-credentials', passwordVariable: 'NEXUS_PASSWORD', usernameVariable: 'NEXUS_USERNAME')]) {
                        
                        echo "🔑 Logging into Nexus Registry..."
                        sh "echo ${NEXUS_PASSWORD} | docker login ${NEXUS_REGISTRY} -u ${NEXUS_USERNAME} --password-stdin"
                        
                        echo "🚀 Pushing Backend to Nexus..."
                        sh "docker push ${NEXUS_REGISTRY}/${IMAGE_BACKEND}:latest"
                        
                        echo "🚀 Pushing AI Module to Nexus..."
                        sh "docker push ${NEXUS_REGISTRY}/${IMAGE_AI}:latest"
                        
                        echo "🚪 Logging out..."
                        sh "docker logout ${NEXUS_REGISTRY}"
                    }
                }
            }
        }
    }
}
