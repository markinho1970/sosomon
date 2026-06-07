module.exports = {
  apps: [{
    name: 'alphagrid-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/opt/alphagrid/frontend',
    kill_timeout: 5000,
    wait_ready: false,
    autorestart: true,
  }]
}
