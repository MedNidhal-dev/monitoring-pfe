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
                // Récupère le code depuis GitHub
                checkout scm
            }
        }
        
        stage('Build Docker') {
            steps {
                script {
                    echo " Construction des images Docker..."
                    sh "docker build -t ${NEXUS_REGISTRY}/${IMAGE_BACKEND}:latest ."
                    sh "docker build -t ${NEXUS_REGISTRY}/${IMAGE_AI}:latest ./ai-module"
                }
            }
        }
        
        stage('Push to Nexus') {
            steps {
                script {
                    echo " Envoi des images vers le Nexus"
                    withCredentials([usernamePassword(credentialsId: 'nexus-credentials', passwordVariable: 'NEXUS_PASSWORD', usernameVariable: 'NEXUS_USERNAME')]) {
                        sh "echo ${NEXUS_PASSWORD} | docker login ${NEXUS_REGISTRY} -u ${NEXUS_USERNAME} --password-stdin"
                        sh "docker push ${NEXUS_REGISTRY}/${IMAGE_BACKEND}:latest"
                        sh "docker push ${NEXUS_REGISTRY}/${IMAGE_AI}:latest"
                        
                    }
                }
            }
        }

        stage('Deploy with Ansible') {
            steps {
                script {
                    echo " Déploiement automatique via Ansible"
                    sh "ansible-playbook -i ansible/inventory/hosts ansible/playbooks/deploy.yml"
                }
            }
        }
    }

    post {
        success {
            echo ' TOUT EST OK : Build, Push et Déploiement terminés !'
        }
        failure {
            echo ' Le pipeline a échoué. Vérifie les logs de la console.'
        }
    }
}
