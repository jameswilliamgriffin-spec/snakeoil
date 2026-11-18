# Snakeoil

Single-page site for Snakeoil, a cocktail and dive bar in Kings Heath, Birmingham.
Vite + vanilla JS, GSAP (ScrollTrigger, SplitText, CustomEase) and Lenis. Plain CSS with custom properties.

## Run it

Use Node.js 24.

```bash
npm ci
npm run dev        # http://localhost:5173
npm run build      # static site in ./dist
npm run preview    # serve ./dist on http://localhost:4173
```

## Deploy to Vercel

Import the GitHub repository in Vercel and use the repository root. `vercel.json` selects Vite, installs with `npm ci`, and publishes `dist/` after `npm run build`. No environment variables are required.

Add `snakeoilbhx.co.uk` as the production domain in Vercel, then apply the DNS records Vercel supplies in Cloudflare. If the production address changes, update the canonical URL, share metadata and business details in `index.html`, plus `public/sitemap.xml` and `public/robots.txt`.

## Media pipeline

The optimised media is included in `public/`, so you only need these commands if you change the source files.

| Command | What it does |
| --- | --- |
| `npm run assets:og` | Rebuilds only the link-preview image `public/og.jpg`: the hero glass centred on black with the So mark over it. |
| `npm run assets:images` | `images/` → AVIF + WebP at 480/800/1200/1440w, the green duotone for the B&W booth shot, preloader frames, grain tile, favicons, `og.jpg` (via `scripts/build-og.mjs`), and `src/media-manifest.json` (sizes and placeholder colours). |
| `npm run assets:video` | Real photos → three looping clips (`hero-glass`, `room-haze`, `lineup-haze`). Procedural motion only: breathing zoom, Perlin haze, liquid shimmer, lamp flicker. **Not AI.** |
| `npm run assets:ai-video` | AI originals in `assets-src/ai/` → seamless loops (`ai-smoke`, `ai-smoke-tall`, `ai-condensation`, `ai-ruby`, `ai-beer`, `ai-hover-slick`, `ai-hover-redflag`). |

In `index.html`, `<pic name="slug" alt="…" sizes="…"></pic>` is expanded at build time (see `vite.config.js`) into a `<picture>` with AVIF/WebP `srcset`, intrinsic size and lazy loading.

## AI-generated assets

None of the AI output shows the bar or a person. The atmosphere loops and textures are abstract; the beer clip is an invented pour; the two hover clips are your own drink photos set in motion. Every AI asset in the site is marked with an `AI-GENERATED` HTML comment.

| File | Where it's used | Source |
| --- | --- | --- |
| `public/media/video/ai-smoke.*` | Visit section background | ElevenLabs / Seedance 2.5, text-to-video |
| `public/media/video/ai-ruby.*` | Atmosphere gallery (the video's `aria-label` says it is AI-generated) | ElevenLabs / Seedance 2.5, text-to-video |
| `public/media/video/ai-beer.*` | The "Cold One" card in The Drinks | Runway / Seedance 2.5, text-to-video, styled from one of the real photos |
| `public/media/video/ai-hover-slick.*` | First cocktail card. Hover playback on desktop and a photo-to-video loop on touch devices. | Runway / Seedance 2.5, image-to-video from the real Slick photo |
| `public/media/video/ai-hover-redflag.*` | Second cocktail card. Video by default, still photo on hover or tap. | Runway / Seedance 2.5, image-to-video from the real Red Flag photo |
| `public/media/img/tex-concrete.webp` | Faint texture behind the About copy | ChatGPT image generation |
| `public/media/img/tex-paper.webp` | Faint texture behind "The Drinks" heading | ChatGPT image generation |
| `public/media/img/tex-snakeskin.webp` | Faint texture behind the footer wordmark | ChatGPT image generation |

Everything else is either your photography or built from it in code.

## Opening hours

Keep the Visit table and structured data in `index.html` in sync with `src/js/hours.js`, which drives the menu’s open and closed status.

## Where things live

- `src/styles/main.css`: tokens, type system, every section, reduced-motion overrides
- `src/js/scroll.js`: Lenis, all reveals and parallax, the horizontal Atmosphere track, the Pours → Night Shift swap, the hero intro
- `src/js/preloader.js`: film-leader flicker and clip-path wipe
- `src/js/distort.js`: the disjointed letter reveal (`data-reveal="jitter"`) and the occasional letter glitch (`data-glitch`)
- `src/js/kerning.js` and `src/kerning.config.js`: per-pair kerning for the display type
- `src/js/tilt.js`: drink-card tilt, image shift, sheen, and hover/tap/focus swap
- `src/js/menu.js`: mobile menu, with focus trap and Escape to close
- `src/js/text.js`: line and character splitting, and the letter-roll hover
- `src/js/hours.js`: opening hours and the live open/closed status (Europe/London)
- `src/js/media.js`: lazy video, which attaches sources near the viewport and pauses off-screen

## Accessibility notes

- Split headings keep their text on an `aria-label` (headings, buttons) or in visually-hidden copy (paragraphs). The animated glyphs are `aria-hidden`.
- The menu is a keyboard-trapped dialog. Escape closes it and focus returns to the toggle.
- The cocktail cards have keyboard controls for switching between still and video. On touch devices, tap the first card to pause or resume the automatic loop.
- With `prefers-reduced-motion`, there's no grain animation, tilt, parallax, smooth scroll or horizontal scroll-jacking; simple fades only.
