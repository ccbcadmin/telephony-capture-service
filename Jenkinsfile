#!groovy

node { // <1>
    checkout scm
    stage('Build') {
        echo 'Here 1'
        echo "${BRANCH_NAME}"
        withEnv(["STORES_COMPOSE_ARGS= -f docker-compose.yml -f env_STORES/docker-compose.yml -p stores "]) {
            sh './scripts/project; ./scripts/build-images;'
        }
    }
    stage('Test') {
        sh './scripts/jenkins qa'
    }
    stage('Deploy') {
        input message: 'TCS has been successfully built, Docker images saved to Docker Hub, and then tested.  Deploy?'
       // Ensure everything is shutdown and then restart the tcs
        sh './scripts/tcs down prod;\
            ./scripts/tcs down qa;\
            ./scripts/tcs down dev;\
            ./.tcs.version;\
            TCSENV=prod;\
            export TCS_VERSION=:v0.31;\
            ./scripts/tcs;'    
    }
}