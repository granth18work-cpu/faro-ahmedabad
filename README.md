# Faro Ahmedabad

Walkable 3D versions of Ahmedabad's famous market streets. Visitors make an avatar, stroll the street and step inside its shops. A project by The Dry Text Co.

**Live:** https://faro-ahmedabad.thedrytextco.online

## Projects

| # | Street | Status |
|---|---|---|
| 01 | Gurukul Street, Memnagar | Prototype with 12 sample shops. Shop names and details are placeholders. |

## What's in this repository

| Path | What it is |
|---|---|
| `site/` | The website. Everything in this folder is published. |
| `site/index.html` | Gurukul Street. One file holds the full source; three.js and fonts load from CDNs. |
| `site/og-image.jpg` | The preview image shown when the link is shared |
| `01 Gurukul Street/` | Project notes: what the prototype includes, controls, next steps |
| `.github/workflows/deploy.yml` | Publishes `site/` to GitHub Pages on every push to `main` |

## Run it locally

Open `site/index.html` in Chrome, Safari or Firefox (it needs an internet connection), or serve the folder:

```bash
python3 -m http.server 8000 --directory site
```

## Publish a change

Commit and push to `main`. GitHub Actions publishes `site/` within a minute or two.
