#!groovy

node { // <1>
    checkout scm
    stage('Build') { // <2>
        /* .. snip .. */
        echo 'Build stage'
    }
    stage('Test') {
        echo 'Test stage'
    }
    stage('Deploy') {
        echo 'Deploy stage'
    }
}