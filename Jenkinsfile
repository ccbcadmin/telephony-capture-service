#!groovy

node { // <1>
    checkout scm
    input message: 'TCS has been built, images saved to Docker Hub, and then tested.  Deploy?', ok: 'Yes', abort: 'No'
    stage('Build') {
        withEnv(["STORES_COMPOSE_ARGS= -f docker-compose.yml -f env_STORES/docker-compose.yml -p stores "]) {
            sh './scripts/project; ./scripts/build-images;'
        }
    }
    stage('Test') {
        sh './scripts/jenkins qa'
    }
    stage('Deploy') 
    input message: 'TCS has been built, images saved to Docker Hub, and then tested.  Deploy?', ok: 'Yes', abort: 'No'
        echo 'Deploy stage'
    }
}