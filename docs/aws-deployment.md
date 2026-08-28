# AWS deployment handoff (documentation only)

No AWS action was performed. Obtain explicit authorization before creating resources, logging in, spending money, or deploying.

## Target topology

```text
Browser (HTTPS) -> nginx on Ubuntu EC2 -> built React files
                                      -> /api/ -> Express on 127.0.0.1:4000 -> PostgreSQL
```

Create a VPC, public subnet, internet gateway, route table, and an EC2 security group using replaceable names/tags such as `todo-app-prod`. Allow HTTP (80) and HTTPS (443) publicly; allow SSH (22) only from the operator's current IP. Do not expose Express, PostgreSQL, or an RDS database publicly.

## Host setup and release order

1. Provision Ubuntu, update it, install Node 22, nginx, PM2, and PostgreSQL for lab mode (or use private RDS for production).
2. Store runtime secrets in AWS Systems Manager Parameter Store or Secrets Manager. A lab fallback is a root-owned `/etc/todo-app.env` with mode `600`; never place credentials in source, Dockerfiles, or nginx config.
3. Build `client` and `server`, copy the client build to `/var/www/todo-app/client/dist`, set `DATABASE_URL` only in the protected environment file, and run `npm run migrate` from `server`.
4. Start Express with `pm2 start deploy/pm2/ecosystem.config.cjs --env production`, then `pm2 save` and `pm2 startup` as instructed by PM2.
5. Install `deploy/nginx/todo-app.conf`, run `sudo nginx -t`, reload nginx, then configure DNS and TLS (for example Certbot) before enabling HTTPS redirects.

## Operate safely

Check `/api/health`, `pm2 logs todo-api`, nginx access/error logs, disk space, database backups, and CloudWatch/host alarms. Updates should be deployed to a release directory, tested, migrated, switched, then monitored; retain the prior release for rollback. Roll back code/config before reversing a destructive migration. Apply budgets, cost alerts, and use the smallest viable instance. Teardown means export needed data, stop PM2, remove the instance/security-group resources, release static IPs, and delete storage/backups only after confirming retention requirements.
