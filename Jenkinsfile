// CI/CD for TalentLens: test → build → containerise → health-check.
// Railway redeploys automatically when this branch is pushed to GitHub.
pipeline {
  agent any
  environment {
    IMAGE = "talentlens:${env.BUILD_NUMBER}"
    CONTAINER = "talentlens-ci-${env.BUILD_NUMBER}"
    CI_PORT = "8090"
  }
  options { timestamps(); timeout(time: 30, unit: 'MINUTES') }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Backend tests') {
      steps {
        dir('backend') {
          sh '''
            python3 -m venv .venv
            . .venv/bin/activate
            pip install -q -r requirements-dev.txt
            python -m pytest -q --junitxml=test-results.xml
          '''
        }
      }
      post { always { junit 'backend/test-results.xml' } }
    }

    stage('Frontend build') {
      steps {
        dir('frontend') { sh 'npm ci --no-audit --no-fund && npm run build' }
      }
    }

    stage('Docker build') {
      steps { sh 'docker build -t $IMAGE .' }
    }

    stage('Smoke test container') {
      steps {
        sh '''
          docker run -d --name $CONTAINER -p $CI_PORT:8000 -e JWT_SECRET=ci-secret-ci-secret-ci-secret-123 $IMAGE
          for i in $(seq 1 30); do
            if curl -fs http://localhost:$CI_PORT/api/health; then echo " healthy"; exit 0; fi
            sleep 2
          done
          docker logs $CONTAINER
          exit 1
        '''
        sh 'curl -fs http://localhost:$CI_PORT/login | grep -q "<div id=\\"root\\">"'
      }
    }
  }

  post {
    always {
      sh 'docker rm -f $CONTAINER || true'
    }
    success { echo 'Build passed. Push to main to deploy on Railway.' }
  }
}
