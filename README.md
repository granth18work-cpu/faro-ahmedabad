# Faro Ahmedabad

Walkable 3D versions of Ahmedabad's famous market streets. Visitors make an avatar, stroll the street and step inside its shops. A project by The Dry Text Co.

**Live:** https://faro-ahmedabad.thedrytextco.online

## Projects

| # | Street | Status |
|---|---|---|
| 01 | Gurukul Street, Memnagar | Realistic 3D street you can walk or ride, 12 sample boutiques (placeholders) and everyday businesses, shop-together with friends |

## What's in this repository

| Path | What it is |
|---|---|
| `src/` | The source, split into parts: page and styles, engine and shop data, world, avatars, vehicles, app, shop-together, boot |
| `build.py` | Joins the parts in `src/` into `site/index.html` |
| `site/` | The website. Everything in this folder is published. |
| `site/index.html` | The built page (do not edit by hand; edit `src/` and rebuild) |
| `site/assets/` | Photo textures and sky lighting from Poly Haven (CC0), people and animations from Microsoft Rocketbox (MIT); see `site/assets/CREDITS.md` |
| `site/og-image.jpg` | The preview image shown when the link is shared |
| `01 Gurukul Street/` | Project notes: what the prototype includes, controls, next steps |
| `.github/workflows/deploy.yml` | Publishes `site/` to GitHub Pages on every push to `main` |

## Change something

Edit the files in `src/`, then rebuild:

```bash
python3 build.py
```

## Run it locally

The textures load from files, so serve the folder rather than double-clicking it:

```bash
python3 -m http.server 8000 --directory site
```

Add `?debug` to the address to expose `window.faroDebug` (render timing and a ride simulator).

## Publish a change

Commit and push to `main`. GitHub Actions publishes `site/` within a minute or two.
