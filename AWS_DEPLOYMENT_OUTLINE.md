# AWS deployment outline - document and prepare only

## Scope boundary

This is a deployment **plan**, not an instruction to provision infrastructure now. Build, test, document, and prepare configuration locally first. Creating AWS resources, authenticating with AWS, deploying, opening firewall rules, or spending money needs a separate explicit approval.

The plan deliberately preserves the reference lab's simple architecture:

```text
Internet user
  -> HTTPS (443) / HTTP redirect (80)
  -> nginx on Ubuntu EC2
      -> React/Vite production build in /var/www/todo-app
      -> /api/ proxied to Express at 127.0.0.1:3001
          -> PostgreSQL, private to the server in lab mode
```

For a real production version, PostgreSQL should move to Amazon RDS in private subnets. That is an intentional later evolution, not a requirement to make the class/lab deployment work.

## 1. Pre-deployment release gate

Do not deploy until all of these are true:

- Docker Compose development environment starts from a clean clone.
- Database migration is re-runnable and tested.
- API tests, client tests, lint, typecheck, and production build pass.
- `.env` is ignored and `.env.example` contains placeholders only.
- `deploy/nginx/todo-app.conf` and `deploy/pm2/ecosystem.config.cjs` exist and were reviewed.
- A release commit or tag exists in the repository.
- A domain and certificate decision are made if the app will be publicly reachable beyond a lab IP address.

## 2. AWS resource plan

Use replaceable placeholders. Do not hard-code another course's class, pair number, AWS account, or region.

### Naming and tags

Suggested name pattern:

```text
<project>-<environment>-<owner>-<resource>-<region>
```

Required/recommended tags:

| Tag | Example value |
| --- | --- |
| `Owner` | `<your-name-or-team>` |
| `Project` | `todo-app` |
| `Environment` | `test` or `production` |
| `ManagedBy` | `manual-lab` or `iac` |
| `CostCenter` | `<if your organization uses one>` |

### Network

1. Create a VPC (for example `10.0.0.0/16`).
2. Create one public subnet (for example `10.0.1.0/24`) and enable public IPv4 assignment only if the EC2 instance requires direct public access.
3. Create and attach an internet gateway.
4. Create a public route table with `0.0.0.0/0` directed to the internet gateway and associate it with the public subnet.
5. Create a security group with the following inbound rules:

| Rule | Port | Source | Why |
| --- | ---: | --- | --- |
| SSH | 22 | **My IP only** | Administration only |
| HTTP | 80 | `0.0.0.0/0` | Public traffic/HTTPS challenge redirect |
| HTTPS | 443 | `0.0.0.0/0` | Public encrypted application traffic |

Never expose ports `3001` (Express) or `5432` (PostgreSQL) to the internet. Do not use `0.0.0.0/0` for SSH.

### Instance

- Launch a current supported Ubuntu LTS EC2 AMI. The original guide used Ubuntu 22.04; choose the current supported LTS approved by the account/course.
- Use a small instance suitable for a lab, such as `t3.micro`, but confirm current free-tier/cost eligibility first.
- Attach only the security group above and store the SSH key safely. Prefer EC2 Instance Connect or Systems Manager Session Manager if the account allows it.
- Add all tags at creation time.
- Use an Elastic IP only if a stable IP is required; it may incur charges if unused.

## 3. Server configuration order

After a user-authorized launch and a secure SSH/Session Manager connection:

1. Update the OS and install Git, PostgreSQL, nginx, Node matching `.nvmrc`, and PM2. Use the distribution's supported installation method and record exact versions in the deployment log.
2. Create a dedicated non-root application user and directory such as `/opt/todo-app`.
3. Create the PostgreSQL database role and database with a unique generated password. Do not reuse tutorial passwords such as `todopass`.
4. Store configuration securely:
   - Preferred: AWS Systems Manager Parameter Store (SecureString) or AWS Secrets Manager, with an EC2 IAM role that can read only the needed value.
   - Lab fallback: a root-owned `/opt/todo-app/server/.env`, permissions `600`, owned by the service user/root as appropriate.
5. Clone the pinned release commit, install server dependencies with the lockfile, and run the migration command.
6. Build the client on CI or a sufficiently sized build machine, then copy only the generated static files to `/var/www/todo-app`. Avoid relying on a tiny instance to build a large frontend. If a lab requires on-instance build, ensure sufficient memory first.
7. Start the Express API with PM2 using `deploy/pm2/ecosystem.config.cjs`. Configure PM2 startup persistence and verify it survives a reboot.
8. Install and enable the nginx configuration from `deploy/nginx/todo-app.conf`. Validate with `sudo nginx -t` before reloading nginx.
9. Confirm nginx serves the SPA and forwards `/api/` to `127.0.0.1:3001`. Confirm the API and database cannot be contacted from the public network directly.

## 4. nginx and PM2 requirements

The checked-in nginx configuration should:

- Serve the client build from `/var/www/todo-app`.
- Use `try_files $uri $uri/ /index.html` so client-side routes do not return 404.
- Proxy `/api/` to `http://127.0.0.1:3001`.
- Pass `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers.
- Set sensible static asset cache behavior without making `index.html` stale indefinitely.
- Add basic security headers at the nginx layer where compatible with the app.
- Support a future TLS server block, with HTTP redirecting to HTTPS once a certificate/domain exists.

The PM2 ecosystem file should:

- Run the compiled Express entry point as a named application.
- Set `NODE_ENV=production`.
- Load environment only from a protected server-side file/secret provider.
- Restart safely on crashes without entering a rapid loop.
- Write logs to a known, restricted location.

## 5. HTTPS and domain

For any public or real-user deployment:

1. Point the chosen DNS record at the EC2 public/Elastic IP.
2. Obtain and renew a certificate using a trusted mechanism such as Certbot with nginx, or terminate TLS at an AWS load balancer/CloudFront in a more advanced architecture.
3. Enable the port 80 to 443 redirect only after certificate validation succeeds.
4. Test `https://<domain>/api/health`, normal browser loading, refresh behavior, and mixed-content absence.

For a lab accessed only by public IP, HTTP may be accepted by the coursework brief, but it should not be represented as production-grade security.

## 6. Deployment checks

Run these in order after deployment:

```text
1. systemctl status nginx
2. pm2 list
3. curl http://127.0.0.1:3001/api/health
4. curl http://<server-ip-or-domain>/api/health
5. open the browser, create/toggle/delete a task, refresh, and check persistence
6. check nginx access/error logs and PM2 logs
7. reboot during a maintenance window and verify nginx + PM2/API return
```

Do not declare success from a single welcome page. The browser must reach the React interface, the interface must reach the API through nginx, and the database mutation must persist.

## 7. Safe updates and rollback

### Update

1. Confirm the new version passed the local release gate.
2. Back up the PostgreSQL database before any schema-changing migration.
3. Fetch a tagged/known commit, install locked dependencies, apply migration, build the client, update static files, and reload/restart only the necessary services.
4. Run the deployment checks immediately.

### Rollback

1. Retain the previous release directory or tagged commit.
2. Restore previous static files and restart PM2 with the previous server build.
3. Database migration rollback must be planned separately; never assume code rollback reverses data changes automatically.
4. Record what changed and why.

## 8. Cost controls and teardown

- Set an AWS Budget alert before launch.
- Stop or terminate the instance when the lab is done. A stopped instance can still incur storage costs.
- Release any unused Elastic IP address.
- Delete security groups only after detaching them from the instance.
- Delete the internet gateway only after detaching it from the VPC.
- Delete route tables, subnet, VPC, key pair, snapshots, and other project-only resources when they are no longer required.
- Keep the Git repository and local documentation; do not delete source code during infrastructure cleanup.

## Explicit non-actions for development phase

During local development and design work, the agent must not:

- create or alter AWS infrastructure;
- read or request AWS access keys;
- open public firewall rules;
- deploy to an IP/domain;
- spend account funds;
- run destructive cleanup commands against cloud resources.
