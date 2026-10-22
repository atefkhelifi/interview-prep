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
