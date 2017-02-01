#!groovy

node { // <1>
    checkout scm
    stage('Build') { // <2>
        sh 'docker ps'
    }
    stage('Test') {
        echo 'Test stage'
    }
    stage('Deploy') {
        echo 'Deploy stage'
    }
}