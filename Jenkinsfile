#!groovy

node {
    checkout scm
    stage('Build') {
        withEnv(["STORES_COMPOSE_ARGS= -f docker-compose.yml -f env_STORES/docker-compose.yml -p stores "]) {
            sh './scripts/project; ./scripts/build-images;'
        }
    }
    stage('Test') {
        // Execute all the QA tests
        sh './scripts/jenkins qa'
    }
    stage('Deploy') {
        // Then optionally deploy
        input message: '\
            TCS Docker images have been built, saved to Docker Hub, and all tests passed.  \
            Deploy to Production?'
       // Ensure everything is shutdown and then restart the tcs
        sh './scripts/tcs down prod;\
            ./scripts/tcs down qa;\
            ./scripts/tcs down dev;\
            TCSENV=prod;\
            ./scripts/tcs;'    
    }
}