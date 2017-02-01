#!groovy

node { // <1>
    checkout scm
    stage('Build') {
        withEnv(["STORES_COMPOSE_ARGS= -f env_STORES/docker-compose.yml -p stores "]) {
            sh './scripts/project; ./scripts/build-images;'
        }
    }
    stage('Test') {
        println 'HHHHHHHHEEEEEEEEEEEEEEEEE'
        sh './scripts/jenkins qa'
    }
    stage('Deploy') {
        echo 'Deploy stage'
    }
}