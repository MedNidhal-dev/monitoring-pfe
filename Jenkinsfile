pipeline {
    agent any
    
    environment {
        NEXUS_REGISTRY = "192.168.75.1:8082"
        IMAGE_BACKEND = "monitoring-backend"
        IMAGE_AI = "monitoring-ai"
        IMAGE_FRONTEND = "monitoring-frontend" 
    }
    
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        
        stage('Build Docker') {
            steps {
                script {
                    echo "🏗️ Build Backend..."
                    sh "docker build -t ${NEXUS_REGISTRY}/${IMAGE_BACKEND}:latest ."
                    echo "🏗️ Build AI Module..."
                    sh "docker build -t ${NEXUS_REGISTRY}/${IMAGE_AI}:latest ./ai-module"
                    echo "🏗️ Build Frontend..."
                    sh "docker build --build-arg VITE_API_URL=http://192.168.75.129:3001/api -t ${NEXUS_REGISTRY}/${IMAGE_FRONTEND}:latest ./client"

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
                        sh "docker push ${NEXUS_REGISTRY}/${IMAGE_FRONTEND}:latest" // Nouveau
                    }
                }
            }
        }

        stage('Deploy with Ansible') {
            steps {
                sh "ansible-playbook -i ansible/inventory/hosts ansible/playbooks/deploy.yml"
            }
        }
    }
}
