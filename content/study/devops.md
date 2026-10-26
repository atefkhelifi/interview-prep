# Docker & Git

## Git basics & branching

**Key ideas**

- Three areas: **working tree** → `git add` → **staging area (index)** → `git commit` → **repository**.
- A commit is a snapshot with a parent pointer; a **branch** is just a movable pointer to a commit; `HEAD` points to your current branch.
- Remotes: `fetch` downloads, `pull` = fetch + merge (or rebase), `push` uploads.
- Workflows: **trunk-based** (short-lived branches, merge to main often) vs **Git Flow** (develop/release/hotfix branches). Feature branches + pull requests are common in both.

```bash
git switch -c feature/login     # new branch
git add -p                      # stage hunks interactively
git commit -m "Add login form"
git push -u origin feature/login
```

**Common questions**

- **`git fetch` vs `git pull`?** Fetch only updates remote-tracking branches; pull also integrates them into your branch.
- **How do you undo the last commit?** Not pushed: `git reset --soft HEAD~1` (keep changes staged). Pushed: `git revert <sha>` to add an inverse commit.
- **What does `git stash` do?** Saves uncommitted changes and cleans the working tree; `git stash pop` restores them.

**Traps**

- `git reset --hard` discards uncommitted work permanently.
- Committing secrets: removing them in a later commit doesn't remove them from history — rotate the secret.

## Merge, rebase & history

**Key ideas**

- **Merge** joins histories with a merge commit (or fast-forwards when possible). History stays true to what happened.
- **Rebase** replays your commits on top of another branch, giving a linear history but new commit IDs.
- **Golden rule:** don't rebase commits others already pulled. If you must update a pushed branch, use `git push --force-with-lease`, not `--force`.
- Interactive rebase (`git rebase -i HEAD~3`) squashes, reorders, edits or drops commits.
- `cherry-pick` copies one commit; `reflog` records where `HEAD` has been — your safety net.
- `git bisect` binary-searches history to find the commit that introduced a bug.

```bash
git fetch origin
git rebase origin/main          # replay my work on latest main
# fix conflicts, then:
git add <files> && git rebase --continue
git push --force-with-lease
```

**Common questions**

- **Merge vs rebase — when?** Rebase local/private branches to keep history clean; merge shared branches. Squash-merge PRs for one commit per feature.
- **How do you recover a "lost" commit?** `git reflog` to find its SHA, then `git branch rescue <sha>` or `git reset`.
- **How do you resolve a merge conflict?** Edit the conflicted files (remove markers), test, `git add`, then continue the merge/rebase.

**Traps**

- `--force` can overwrite teammates' pushed work; `--force-with-lease` refuses if the remote moved.
- Long-lived branches create painful conflicts — integrate often.

## Docker images

**Key ideas**

- An **image** is a read-only stack of layers built from a `Dockerfile`; a **container** is a running instance with a thin writable layer.
- Each instruction (`FROM`, `RUN`, `COPY`) creates a cached layer. Order from least to most frequently changing: copy dependency manifests and install **before** copying source code.
- **Multi-stage builds** compile in a full image and copy only the output into a small runtime image.
- Use small, pinned base images (`node:22-alpine`, `-slim`, distroless), a `.dockerignore`, and a non-root `USER`.
- `CMD` = default command (overridable); `ENTRYPOINT` = fixed executable. Use the exec (JSON array) form so signals reach your process.

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Common questions**

- **Image vs container?** Image = template; container = running (or stopped) instance of it.
- **How do you make images smaller?** Multi-stage builds, slim bases, fewer layers, clean package caches in the same `RUN`, `.dockerignore`.
- **`COPY` vs `ADD`?** Prefer `COPY`; `ADD` also extracts archives and fetches URLs, which is surprising.

**Traps**

- `COPY . .` before `npm ci` busts the cache on every code change.
- Baking secrets into layers — they stay in the image history. Use build secrets or runtime env vars.

## Containers, volumes & networks

**Key ideas**

- `docker run -d -p 8080:3000 --name api image` — detached, host port 8080 → container port 3000.
- Containers are ephemeral; persist data in **volumes** (managed by Docker) or **bind mounts** (host folder).
- Containers on the same user-defined **network** reach each other by container/service name.
- Useful commands: `docker ps`, `logs -f`, `exec -it <c> sh`, `inspect`, `stop`, `rm`, `image prune`.
- Limit resources with `--memory` and `--cpus`; add a `HEALTHCHECK`.

**Common questions**

- **Volume vs bind mount?** Volumes are portable and managed by Docker (databases); bind mounts map a host path (live code reload in development).
- **Container vs virtual machine?** Containers share the host kernel (lightweight, fast start); VMs virtualize hardware with their own kernel (stronger isolation).
- **Why does my container exit immediately?** The main process finished or crashed — check `docker logs`.

**Traps**

- Writing data inside the container filesystem loses it when the container is removed.
- Running as root inside the container widens the blast radius of a compromise.

## Compose & CI

**Key ideas**

- **Docker Compose** defines multi-container apps in `compose.yaml`: services, networks, volumes, environment, `depends_on` (with `condition: service_healthy`).
- `docker compose up -d`, `down`, `logs -f`, `exec`.
- CI pipelines (GitHub Actions, GitLab CI): lint → test → build image → scan → push to a registry → deploy.
- Tag images immutably (git SHA), not only `latest`.

```yaml
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/app
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
volumes:
  pgdata:
```

**Common questions**

- **`depends_on` — does it wait for the database to be ready?** Only with a healthcheck + `condition: service_healthy`; otherwise it only orders startup.
- **How do you pass secrets in CI?** The CI system's secret store, injected as env vars or build secrets — never committed.

**Traps**

- Using `latest` in production makes deployments non-reproducible.
- Hard-coded passwords in `compose.yaml` checked into Git.

## Kubernetes basics

**Key ideas**

- Kubernetes runs containers across many machines (nodes) and keeps the **desired state** you declare in YAML.
- **Pod:** smallest unit, one or more containers sharing network and storage. Pods are disposable.
- **Deployment:** keeps N replicas of a pod running and does rolling updates / rollbacks.
- **Service:** stable name and IP in front of changing pods (`ClusterIP`, `NodePort`, `LoadBalancer`). **Ingress** routes external HTTP to services.
- **ConfigMap** (config) and **Secret** (sensitive values) are injected as env vars or files.
- **Probes:** `readinessProbe` (ready for traffic?) and `livenessProbe` (restart if stuck). Set CPU/memory **requests and limits**.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: api }
spec:
  replicas: 3
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      containers:
        - name: api
          image: registry.example.com/api:1.4.2
          ports: [{ containerPort: 8080 }]
          readinessProbe: { httpGet: { path: /health, port: 8080 } }
          resources: { requests: { cpu: 100m, memory: 128Mi }, limits: { memory: 256Mi } }
```

**Common questions**

- **Docker Compose vs Kubernetes?** Compose runs containers on one host, great for dev. Kubernetes schedules them on a cluster with self-healing, scaling and rolling updates.
- **Readiness vs liveness probe?** Readiness removes a pod from the Service while it isn't ready; liveness restarts it when it is broken.
- **How do you roll back a bad release?** `kubectl rollout undo deployment/api`.
- **Useful debug commands?** `kubectl get pods`, `describe pod`, `logs -f`, `exec -it ... -- sh`.

**Traps**

- Using the `latest` tag — you don't know what is running and rollbacks don't work.
- No memory limit — one pod can starve the node; too low a limit → `OOMKilled`.
- Secrets are only base64-encoded by default, not encrypted.

## Linux & shell basics

**Key ideas**

- Navigation & files: `ls -la`, `cd`, `cp`, `mv`, `rm -r`, `find . -name "*.log"`, `du -sh`, `df -h`.
- Text: `cat`, `less`, `head`, `tail -f`, `grep -r`, `wc -l`, `sort | uniq -c`, `awk`, `sed`.
- **Pipes and redirection:** `|` sends output to the next command; `>` overwrites, `>>` appends, `2>&1` merges errors into output.
- **Permissions:** `rwx` for user/group/others; `chmod 755 script.sh`, `chown user:group file`.
- **Processes:** `ps aux`, `top`/`htop`, `kill <pid>` (SIGTERM), `kill -9` (SIGKILL, last resort).
- Network: `curl -v`, `ss -tlnp` (listening ports), `ping`, `dig`. Services: `systemctl status`, `journalctl -u`.

```bash
# Top 5 IPs hitting the server
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -5

# Stop the script on errors, unset variables and failed pipes
set -euo pipefail
```

**Common questions**

- **What does `chmod 644` mean?** Owner read/write (6), group read (4), others read (4).
- **SIGTERM vs SIGKILL?** SIGTERM asks the process to stop cleanly; SIGKILL kills it immediately, no cleanup.
- **How do you find what uses a port?** `ss -tlnp | grep 8080` or `lsof -i :8080`.
- **Disk is full — what do you check?** `df -h` for the filesystem, `du -sh /* | sort -h` to find big directories (often logs or Docker images).

**Traps**

- `rm -rf $DIR/` with an empty variable deletes from `/`. Use `set -u` and quote variables.
- `chmod 777` to "fix" permissions opens the file to everyone.
- Without `pipefail`, a failed command in the middle of a pipe is ignored.

## Troubleshooting & monitoring

**Key ideas**

- Container debugging: `docker ps -a` (exited containers), `docker logs -f`, `docker inspect` (config, exit code, health), `docker exec -it <c> sh`, `docker stats`.
- Common exit codes: `0` normal, `1` app error, `137` killed (often out of memory), `143` SIGTERM.
- **Three pillars of observability:** **logs** (events), **metrics** (numbers over time — Prometheus + Grafana), **traces** (one request across services — OpenTelemetry).
- Apps in containers log to **stdout/stderr**; the platform collects the logs.
- Alert on symptoms users feel (error rate, latency, saturation), not on every CPU spike.
- **Health checks** (`HEALTHCHECK` in Docker, probes in Kubernetes) let the platform restart or stop routing to bad instances.

```bash
docker ps -a --filter "status=exited"
docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' api
docker logs --since 10m api | grep -i error
docker exec -it api sh -c 'wget -qO- localhost:8080/health'
```

**Common questions**

- **A container keeps restarting — how do you debug it?** Check `docker logs` (or `kubectl logs --previous`), the exit code, OOM status, env vars and config, then run the image with a shell to reproduce.
- **It works on my machine but not in the container — why?** Different env vars, missing files (`.dockerignore`), listening on `127.0.0.1` instead of `0.0.0.0`, wrong architecture, file permissions.
- **What are the "golden signals"?** Latency, traffic, errors, saturation.

**Traps**

- App binding to `localhost` inside the container — unreachable from outside.
- Writing logs to files inside the container — they disappear with it and fill the disk.
- Too many noisy alerts — people start ignoring real ones.

## Git internals

**Key ideas**

- Git stores **snapshots**, not diffs. Objects: **blob** (file content), **tree** (folder), **commit** (tree + parents + message), **tag**.
- Every object is named by a hash of its content — identical content is stored once.
- A **branch** is just a file containing a commit hash; `HEAD` points to the current branch (or a commit: "detached HEAD").
- Three areas: **working directory** → `git add` → **staging area (index)** → `git commit` → **repository**.
- Remote-tracking branches (`origin/main`) remember where the remote was at the last fetch.

```bash
git cat-file -p HEAD          # show the commit object
git cat-file -p HEAD^{tree}   # show its tree
git rev-parse main            # the hash a branch points to
git log --oneline --graph --all
```

**Common questions**

- **Why are Git branches cheap?** A branch is a 41-byte pointer to a commit; creating one copies nothing.
- **What is detached HEAD?** `HEAD` points directly to a commit, not a branch; new commits are lost unless you create a branch.
- **`git fetch` vs `git pull`?** `fetch` downloads and updates `origin/*`; `pull` = fetch + merge (or rebase) into your branch.

**Traps**

- Committing in detached HEAD and switching away — commits become unreachable (recover with `reflog`).
- Committing large binaries bloats history forever — use Git LFS.
- Thinking `git add` stages a file "forever" — it stages the current content only.

## Conflicts & undoing changes

**Key ideas**

- A **conflict** happens when both sides changed the same lines; Git marks them with `<<<<<<<`, `=======`, `>>>>>>>`.
- Resolve: edit the file, `git add`, then `git merge --continue` / `git rebase --continue`; or abort with `--abort`.
- Undo tools:
  - `git restore file` — discard working changes. `git restore --staged file` — unstage.
  - `git commit --amend` — fix the last commit (not yet pushed).
  - `git revert <sha>` — new commit that undoes one (safe on shared branches).
  - `git reset --soft|--mixed|--hard <sha>` — move the branch back (rewrites history).
- `git stash` saves work in progress.

```bash
git merge feature/login
# CONFLICT in src/auth.ts → edit, keep the right lines
git add src/auth.ts
git merge --continue

git revert a1b2c3d            # undo a pushed commit safely
git reset --soft HEAD~1        # undo last local commit, keep changes staged
```

**Common questions**

- **`reset` vs `revert`?** `reset` moves the branch pointer (rewrites history — local only); `revert` adds a new inverse commit (safe for shared branches).
- **`reset --soft` vs `--mixed` vs `--hard`?** Soft keeps changes staged; mixed (default) keeps them unstaged; hard deletes them.
- **How do you reduce conflicts?** Small, short-lived branches, pull/rebase often, clear code ownership, formatters to avoid noise.

**Traps**

- `git reset --hard` deletes uncommitted work permanently.
- Committing conflict markers — CI linters can catch them.
- Amending or resetting commits others already pulled.

## Git hooks & conventions

**Key ideas**

- **Hooks** are scripts Git runs on events: `pre-commit` (lint, format), `commit-msg` (check message), `pre-push` (tests).
- Shared via tools like **Husky** + lint-staged (JS), **pre-commit** framework (Python), lefthook.
- Local hooks can be skipped (`--no-verify`) — CI must enforce the same checks.
- **Conventional Commits**: `feat: add login`, `fix(api): handle 404`, `feat!:` for breaking changes — enables automatic changelogs and semver releases.
- `.gitignore`, `.gitattributes` (line endings, LFS), `CODEOWNERS` for reviews.

```bash
# .husky/pre-commit
npx lint-staged

# package.json
# "lint-staged": { "*.{ts,tsx}": ["eslint --fix", "prettier --write"] }

git commit -m "feat(cart): allow coupon codes"
git commit -m "fix: round totals to 2 decimals"
```

**Common questions**

- **Why not rely only on hooks?** They're local and optional; CI is the real gate.
- **What makes a good commit message?** Short imperative summary (≤ 50–72 chars), a blank line, then why the change was made.
- **What is semantic versioning?** `MAJOR.MINOR.PATCH`: breaking change, new feature, bug fix.

**Traps**

- Slow pre-commit hooks — people bypass them.
- Line-ending chaos between Windows and Linux without `.gitattributes`.
- Huge "misc fixes" commits that are impossible to review or revert.

## CI/CD pipelines

**Key ideas**

- **CI**: every push builds and tests automatically. **Continuous delivery**: always deployable; **continuous deployment**: every green build goes to production.
- Typical stages: install → lint → test → build → security scan → build image → deploy to staging → deploy to production.
- **GitHub Actions**: workflows in `.github/workflows/*.yml`, jobs, steps, runners, matrices, caches, secrets, environments with approvals.
- **Build once, deploy many**: the same artifact/image is promoted through environments.
- Fast feedback: cache dependencies, run jobs in parallel, fail early.

```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix: { node: [20, 22] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ matrix.node }}", cache: npm }
      - run: npm ci
      - run: npm run lint && npm test
```

**Common questions**

- **Continuous delivery vs continuous deployment?** Delivery: deploy to production is one manual click. Deployment: fully automatic.
- **How do you keep secrets safe in CI?** The platform's secret store, least-privilege tokens, OIDC to the cloud instead of long-lived keys, never echo secrets.
- **How do you speed up a slow pipeline?** Cache dependencies and Docker layers, parallelize, run only affected tests, use faster runners.

**Traps**

- Flaky tests that everyone re-runs until green.
- Building a different artifact per environment.
- Third-party actions pinned to a moving tag (`@main`) — pin to a version or commit SHA.

## Deployment strategies

**Key ideas**

- **Recreate**: stop old, start new — downtime.
- **Rolling update**: replace instances gradually (Kubernetes default).
- **Blue-green**: two identical environments; switch traffic at once; instant rollback by switching back.
- **Canary**: send a small % of traffic to the new version, watch metrics, then increase.
- **Feature flags**: deploy code dark, release features separately from deploys.
- Database changes must be **backward compatible** during rollout (old and new code run at the same time).

```yaml
# Kubernetes rolling update settings
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0   # never go below desired capacity
      maxSurge: 1         # add one new pod at a time
```

**Common questions**

- **Blue-green vs canary?** Blue-green switches all traffic at once (needs double capacity); canary shifts gradually and limits the blast radius.
- **How do you roll back quickly?** Keep the previous version deployable (image tag, blue environment), automate the rollback, avoid irreversible DB migrations.
- **What are feature flags good for?** Trunk-based development, gradual rollouts, A/B tests, kill switches.

**Traps**

- A migration that drops a column the old version still uses.
- No health checks — broken pods receive traffic during rollout.
- Feature flags never removed — growing dead code.

## Container registries & image security

**Key ideas**

- **Registries**: Docker Hub, GitHub Container Registry, ECR, ACR, GCR, Harbor. Push with `docker push`, authenticate with `docker login`.
- **Tags** are mutable labels; **digests** (`@sha256:...`) are immutable. Tag images with versions or Git SHAs.
- Use small, trusted base images (`-slim`, `alpine`, distroless); fewer packages = fewer vulnerabilities.
- **Scan** images (Trivy, Grype, Docker Scout) in CI; rebuild regularly for security patches.
- Sign images (cosign) and generate SBOMs to know what's inside.

```bash
docker build -t ghcr.io/acme/api:1.4.2 -t ghcr.io/acme/api:sha-$(git rev-parse --short HEAD) .
trivy image --severity HIGH,CRITICAL --exit-code 1 ghcr.io/acme/api:1.4.2
docker push ghcr.io/acme/api:1.4.2
```

**Common questions**

- **Tag vs digest?** A tag can be moved to another image; a digest always identifies the exact same content.
- **How do you reduce vulnerabilities in images?** Minimal base image, multi-stage builds, no build tools in the final stage, regular rebuilds, scanning.
- **Public vs private registry?** Private for internal code; control who can pull and push.

**Traps**

- Secrets baked into a layer stay in the image history even if deleted later.
- `latest` in production — unknown and unrepeatable deploys.
- Pulling random community images without checking the source.

## Helm & Kubernetes scaling

**Key ideas**

- **Helm** packages Kubernetes manifests as **charts** with templates and `values.yaml`; `helm install/upgrade/rollback`.
- **Kustomize**: patches over base YAML, no templating (built into `kubectl`).
- **HorizontalPodAutoscaler (HPA)** adds/removes pods based on CPU, memory or custom metrics; **cluster autoscaler** adds nodes.
- **Namespaces** separate teams/environments; **ResourceQuotas** limit them.
- Stateful apps use **StatefulSets** + PersistentVolumeClaims; one-off work uses **Jobs** / **CronJobs**.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

**Common questions**

- **Helm vs Kustomize?** Helm: templating, versioned packages, releases with rollback. Kustomize: plain YAML with overlays, simpler.
- **Why does HPA need resource requests?** CPU utilization is measured as a percentage of the requested CPU.
- **Deployment vs StatefulSet?** Deployment pods are interchangeable; StatefulSet pods keep stable names and their own storage (databases).

**Traps**

- HPA without requests set — it can't compute utilization.
- `minReplicas: 1` — no availability during node failures or rollouts.
- Running databases in Kubernetes without a solid backup and storage plan.

## Infrastructure as Code

**Key ideas**

- Define infrastructure (networks, servers, databases, DNS) in code, review it in pull requests, apply automatically.
- **Terraform / OpenTofu**: declarative HCL, providers for every cloud, **state** file tracks real resources, `plan` shows changes before `apply`.
- Others: Pulumi (real languages), CloudFormation / Bicep (AWS / Azure native), Ansible (configuration management).
- Store state remotely with locking (S3 + DynamoDB, Terraform Cloud); never edit resources by hand ("drift").
- **Modules** reuse patterns; separate environments with workspaces or folders.

```hcl
resource "aws_s3_bucket" "uploads" {
  bucket = "acme-${var.env}-uploads"
  tags   = { env = var.env }
}

resource "aws_db_instance" "main" {
  engine              = "postgres"
  instance_class      = var.env == "prod" ? "db.m6g.large" : "db.t4g.micro"
  allocated_storage   = 50
  deletion_protection = var.env == "prod"
}
```

**Common questions**

- **Declarative vs imperative?** Declarative describes the end state (Terraform); imperative lists steps (shell scripts).
- **What is Terraform state?** A mapping between code and real resources; it's needed to compute changes and can contain secrets — protect it.
- **What is drift?** Real infrastructure differs from code because of manual changes; `plan` reveals it.

**Traps**

- Local state files lost or edited by two people at once.
- Applying without reviewing `plan` — accidental destroy of a database.
- Secrets in plain text in `.tf` files or variables.

## Cloud basics

**Key ideas**

- Models: **IaaS** (VMs), **PaaS** (App Service, Elastic Beanstalk, Cloud Run), **SaaS**; plus **serverless** functions (Lambda, Azure Functions).
- Building blocks: compute (VMs, containers), storage (object storage S3/Blob, block disks), databases (managed SQL/NoSQL), networking (VPC, subnets, load balancers), IAM.
- **Regions** and **availability zones**: deploy across zones for high availability.
- **IAM**: least privilege, roles instead of long-lived keys.
- **Shared responsibility**: the provider secures the cloud; you secure what you put in it.
- Cost: pay per use — right-size, autoscale, turn off idle resources, set budgets and alerts.

```bash
# AWS CLI examples
aws s3 cp report.pdf s3://acme-reports/2026/
aws ecs update-service --cluster prod --service api --force-new-deployment
aws logs tail /ecs/api --follow
```

**Common questions**

- **Containers on a VM vs managed container service vs serverless?** More control ↔ less operations work. Serverless scales to zero but has cold starts and time limits.
- **How do you make an app highly available in the cloud?** Multiple instances across availability zones behind a load balancer, managed DB with failover, health checks, backups.
- **What is a VPC?** Your private network in the cloud, with subnets (public/private), route tables and security groups.

**Traps**

- Public S3 buckets / storage containers with private data.
- Root account or admin keys used by applications.
- Forgotten resources running up the bill.

## Nginx & reverse proxies

**Key ideas**

- A **reverse proxy** sits in front of app servers: routes requests, terminates **TLS**, load balances, compresses, caches, serves static files.
- Nginx config: `server` blocks per domain, `location` blocks per path, `proxy_pass` to upstreams.
- Forward client info with headers: `X-Forwarded-For`, `X-Forwarded-Proto`, `Host`.
- WebSockets need `Upgrade` and `Connection` headers forwarded.
- Alternatives: Traefik, Caddy (automatic HTTPS), HAProxy, cloud load balancers, Kubernetes Ingress controllers.

```nginx
upstream api { server api1:3000; server api2:3000; }

server {
  listen 443 ssl;
  server_name app.example.com;
  ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

  location /static/ { root /var/www; expires 30d; }

  location / {
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Common questions**

- **Forward vs reverse proxy?** A forward proxy acts for clients (company web proxy); a reverse proxy acts for servers.
- **Why terminate TLS at the proxy?** Central certificate management and less work for app servers.
- **What load-balancing methods exist?** Round robin, least connections, IP hash (sticky), weighted.

**Traps**

- App trusting `X-Forwarded-For` from anyone — configure trusted proxies.
- Missing `X-Forwarded-Proto` — the app builds `http://` redirect URLs.
- Default timeouts too short for long requests or streaming responses.

## Networking basics

**Key ideas**

- **DNS** turns names into IPs: `A`/`AAAA` (IP), `CNAME` (alias), `MX` (mail), `TXT` (verification); TTL controls caching.
- **TCP** (reliable, ordered) vs **UDP** (fast, no guarantees). **Ports** identify services (22 SSH, 80 HTTP, 443 HTTPS, 5432 Postgres).
- **HTTP**: methods, status codes, headers; HTTP/2 multiplexes streams; HTTP/3 runs over QUIC (UDP).
- **TLS**: encrypts traffic; certificates prove identity (Let's Encrypt for free certs).
- Private IP ranges (`10.x`, `172.16–31.x`, `192.168.x`), **NAT**, **CIDR** (`10.0.0.0/16`), firewalls / security groups.

```bash
dig +short api.example.com           # DNS lookup
curl -v https://api.example.com/health # see TLS handshake, headers, status
openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null | openssl x509 -noout -dates
nc -zv db.internal 5432              # is the port reachable?
```

**Common questions**

- **What happens when you type a URL in the browser?** DNS lookup → TCP connection → TLS handshake → HTTP request → server processing → response → rendering.
- **Why do DNS changes take time?** Resolvers cache records until the TTL expires.
- **TCP vs UDP — examples?** TCP for web, APIs, databases; UDP for video calls, gaming, DNS queries, QUIC.

**Traps**

- Lowering the DNS TTL only right before a migration — old high TTLs are still cached.
- Expired TLS certificates — automate renewal and monitor expiry.
- "Works locally" but the security group / firewall blocks the port.

## Secrets management

**Key ideas**

- Secrets: API keys, DB passwords, tokens, certificates. Never in Git, images, logs or front-end code.
- Stores: **HashiCorp Vault**, AWS Secrets Manager / SSM, Azure Key Vault, GCP Secret Manager, Kubernetes Secrets (+ encryption at rest, External Secrets Operator, Sealed Secrets).
- Inject at runtime as env vars or mounted files; apps read them at startup.
- **Rotate** regularly; prefer short-lived, automatically issued credentials (OIDC from CI to cloud, dynamic DB credentials).
- Detect leaks: secret scanning (gitleaks, GitHub secret scanning) in pre-commit and CI.

```bash
# Docker build secret: available during the build step, not stored in the image
docker build --secret id=npmrc,src=$HOME/.npmrc .
# Dockerfile:
# RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci

# Kubernetes: create a secret from a file
kubectl create secret generic api-secrets --from-env-file=prod.env
```

**Common questions**

- **A secret was pushed to GitHub — what do you do?** Revoke/rotate it immediately (assume it's compromised), then remove it from history and add scanning to prevent repeats.
- **Env vars vs mounted files for secrets?** Both are common; files can be rotated without restart and don't leak into process listings or crash dumps as easily.
- **Why OIDC from CI to the cloud?** No long-lived keys stored in CI; short-lived tokens per job.

**Traps**

- `ARG`/`ENV` with secrets in Dockerfiles — visible in image history.
- Printing env vars in CI logs or error pages.
- Kubernetes Secrets assumed encrypted — they're base64 unless encryption at rest is configured.
