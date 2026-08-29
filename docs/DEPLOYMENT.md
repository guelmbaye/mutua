# Deployment

MUTUA is a fully static Next.js application. No backend, no database, no
environment variables, no secrets. Both routes prerender at build time.

```
Route                    Size      First load JS
/                        4.8 kB    123 kB     landing page
/workspace              39.5 kB    157 kB     the product
/opengraph-image           —         —        social card, generated at build
```

## Before you deploy

Nothing. No environment variables, no secrets, no external service to provision.
The repository is already wired to <https://github.com/guelmbaye/mutua>, which
is what the landing page links to as "View source".

## Deploy with the CLI

```bash
npm i -g vercel
vercel login
vercel            # preview deployment
vercel --prod     # production
```

Vercel detects Next.js from `vercel.json` and needs no further configuration.

## Deploy from the dashboard

1. Push the repository to GitHub.
2. **vercel.com → Add New → Project → Import** the repository.
3. Accept every default. Framework preset resolves to Next.js; the build and
   install commands come from `vercel.json`.
4. **Deploy**. First build takes two to three minutes.

Leave the Environment Variables section empty. If the form asks for one,
something is wrong — MUTUA reads none.

## What `vercel.json` does

**`buildCommand`** runs `typecheck && test && build`. A deployment that would
break the golden flow fails at the build step instead of reaching the judges.
Thirty-one tests add roughly two seconds.

**`installCommand`** is `npm ci`, so the lockfile is authoritative and builds are
reproducible.

**`headers`** set `X-Content-Type-Options`, `Referrer-Policy` and a restrictive
`Permissions-Policy`, and pin the brand assets to a one-year immutable cache.

**`github.silent`** stops the bot from commenting on every push.

Node 20 is requested through `engines` in `package.json` and `.nvmrc`.

## Which URL to submit

The two routes serve different readers.

`/` is the story: what the problem is, why WebMCP matters, and an interactive
miniature of the capability unlock. Use it as the **project URL** on Devpost, in
the README, and anywhere someone might arrive without context.

`/workspace` is the product, loading the baseline immediately with no landing
page in the way. Use it as the **"Try it" / demo URL**, and open it directly when
recording the video — the submission guidance is explicit that the application
should appear within the first five seconds.

A judge who lands on `/` reaches the workspace in one click, from a button that
is above the fold in both the header and the hero.

## After deploying

Run through this once on the production URL, in a fresh browser profile:

- [ ] `/` renders, and **Launch demo** reaches `/workspace`
- [ ] `/workspace` loads the baseline with no console errors
- [ ] The Capability Inspector populates — the registry synced
- [ ] The golden path in [`TESTING.md`](TESTING.md) runs end to end
- [ ] **Reset demo** restores the baseline
- [ ] `?debug=1` shows the tool call log
- [ ] The social card resolves at `/opengraph-image`

Then hard-refresh and run the sequence a second time. LocalStorage persists
between visits under `mutua.workspace.v1`, and a judge should never inherit your
rehearsal state — **Reset demo** clears it, but it is worth confirming that the
first load of a clean profile shows the healthy baseline.

## Custom domain

**Project → Settings → Domains → Add.** Vercel issues the certificate. Nothing
in the application hardcodes a hostname.

## Self-hosting instead

```bash
npm ci && npm run build && npm run start   # http://localhost:3000
```

Any Node 20 host works. The application never calls out, so an air-gapped
environment is fine — which also means a judging environment can run it offline.
