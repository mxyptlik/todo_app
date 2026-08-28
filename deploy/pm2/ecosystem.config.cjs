module.exports = {
  apps: [{
    name: 'todo-api',
    cwd: '/srv/todo-app/server',
    script: 'dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env_production: { NODE_ENV: 'production', PORT: 4000 },
    autorestart: true,
    max_memory_restart: '300M'
  }]
};
