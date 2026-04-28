pipeline {
    agent any
    
    environment {
        NEXUS_REGISTRY = "192.168.75.1:8082"
        IMAGE_BACKEND = "monitoring-backend"
        IMAGE_AI = "monitoring-ai"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Docker') {
            steps {
                script {
                    sh "docker build -t ${NEXUS_REGISTRY}/${IMAGE_BACKEND}:latest ."
                    sh "docker build -t ${NEXUS_REGISTRY}/${IMAGE_AI}:latest ./ai-module"
                }
            }
        }
        
        stage('Push to Nexus') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'nexus-credentials', passwordVariable: 'NEXUS_PASSWORD', usernameVariable: 'NEXUS_USERNAME')]) {
                        sh "echo ${NEXUS_PASSWORD} | docker login ${NEXUS_REGISTRY} -u ${NEXUS_USERNAME} --password-stdin"
                        sh "docker push ${NEXUS_REGISTRY}/${IMAGE_BACKEND}:latest"
                        sh "docker push ${NEXUS_REGISTRY}/${IMAGE_AI}:latest"
                        sh "docker logout ${NEXUS_REGISTRY}"
                    }
                }
            }
        }
    }
}
