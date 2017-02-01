#!groovy

node { // <1>
    checkout scm
    stage('Build') { // <2>
        echo 'Build stage'
        def exitValue = "echo hello".execute().exitValue()  
    }
    stage('Test') {
        echo 'Test stage'
    }
    stage('Deploy') {
        echo 'Deploy stage'
    }
}