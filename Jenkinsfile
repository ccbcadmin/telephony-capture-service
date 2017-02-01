#!groovy

node { // <1>
    checkout scm
    stage('Build') { // <2>
        echo 'Build stage'
        "echo hello".execute()  
    }
    stage('Test') {
        echo 'Test stage'
    }
    stage('Deploy') {
        echo 'Deploy stage'
    }
}