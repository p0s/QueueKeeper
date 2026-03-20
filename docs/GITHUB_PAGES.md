# GitHub Pages setup

QueueKeeper uses the static `WEBSITE/` folder for GitHub Pages hosting.

## Why
The repo contains two frontend surfaces:
- `apps/web` — the real buyer/runner app code
- `WEBSITE/` — a static marketing/demo landing page

For hackathon submission, GitHub Pages is the simplest reliable public URL for the landing page.

## Expected setup in GitHub
Repository → Settings → Pages
- Source: **GitHub Actions**

The workflow file:
- `.github/workflows/github-pages.yml`

will deploy the contents of `WEBSITE/` on pushes to `main`.

## Suggested public URL
If the repo is `p0s/QueueKeeper`, Pages will normally publish at:
- `https://p0s.github.io/QueueKeeper/`

## What to link in submission
- GitHub repo: source code + contracts + app
- GitHub Pages URL: public landing page
- contract explorer links from `README.md`
