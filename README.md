# Rolex Bar POS

Point of Sale-app til pizzeriaet. Albansk UI, € + 18 % moms (Kosovo).

## Vis den lokalt på din PC (30 sekunder)

Du har to muligheder:

### Mulighed A — Bare dobbeltklik

1. Åbn mappen i Stifinder (Windows) / Finder (Mac)
2. Dobbeltklik på `index.html`
3. Den åbner i din browser og virker som den skal

Det er den hurtigste måde at se hvordan POS'en ser ud.

### Mulighed B — Med en lokal server (anbefalet hvis du udvikler videre)

I VS Code: installér "Live Server"-extension → højreklik på `index.html` → "Open with Live Server". Den genindlæser automatisk når du retter en fil.

Eller fra terminal i denne mappe:
```
npx serve
```

## Hvad ligger her

| Fil | Hvad |
|---|---|
| `index.html` | HTML-strukturen (skelet, modals, tabs) |
| `style.css` | Alt design |
| `app.js` | Al JavaScript-logik (data, render, betaling, ordrer) |
| `manifest.json` | PWA-config (gør at den kan installeres på tablet-hjemmeskærm) |
| `favicon.svg` | App-ikon (placeholder — udskift med rigtigt logo i Fase 5) |
| `pos.html` | **Original single-file version**. Beholdes som backup indtil du har verificeret at split-versionen virker |
| `PLAN.md` | Den fulde plan til at gøre det her til et drift-klart system |
| `.gitignore` | Hvad git skal ignorere |

## Hvad er det næste?

Læs [`PLAN.md`](PLAN.md). Den fører dig gennem 6 faser fra "online som den er" til "drift-klar med backend, auth, print og offline-mode".

For at få Claude til at hjælpe dig gennem faserne: følg afsnittet **"Sådan bruger du planen med Claude Code"** i toppen af `PLAN.md`.

## Hvis noget er galt

Hvis split-versionen ser anderledes ud end den oprindelige `pos.html`, åbn `pos.html` direkte i browseren og sammenlign. Sig til Claude hvad der mangler eller ser forkert ud — den kan rette det.
