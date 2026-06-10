/** PM2 — rodar na VPS: pm2 start deploy/ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'geleads',
      cwd: '/var/www/geleads/backend',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/geleads/logs/pm2-error.log',
      out_file: '/var/www/geleads/logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
