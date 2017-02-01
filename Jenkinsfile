#!groovy

node { // <1>
    checkout scm
    stage('Build') { // <2>
        bash 'jenkins qa'
    }
    stage('Test') {
        echo 'Test stage'
    }
    stage('Deploy') {
        echo 'Deploy stage'
    }
}