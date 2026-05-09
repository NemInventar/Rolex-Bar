# Artizano POS — Plan til produktion

_Gør `pos.html` til et drift-klart system man kan stole på i daglig pizzeria-drift._

Det her er en **kør-selv-guide**. Hver fase har konkrete trin du kan følge på din egen PC. Du kan stoppe efter hver enkelt fase og stadig stå med noget brugbart. Steder hvor du skal tage en beslutning eller spørge fætteren er markeret ⚠️.

---

## Udgangspunktet

`pos.html` er en single-file POS-app, 2174 linjer:
- Albansk UI, € + 18 % moms → Kosovo
- Alt persisteres i `localStorage` (kun i den ene browser hvor den er åbnet)
- 8-cifret PIN gemt lokalt = "auth"
- ~80 produkter, 8 kategorier, 10 borde som default
- Funktioner: kurv, ordrer (åbne/ventende/historik), omsætnings-dashboard (Chart.js), produktstyring, kontant/kort, undo, celebration, toasts

**Hvad er galt til daglig drift:**
- Data lever kun i én browsers cache → en cache-clear = alt væk (menu + ordrehistorik)
- Kan ikke deles mellem enheder (køkken kan ikke se nye ordrer)
- Ingen backup
- Ingen rigtig kvitterings-print
- Ingen Kosovo fiscal-compliance (ATK)

---

## Sådan bruger du planen med Claude Code

Det meste af arbejdet i planen kan Claude Code lave for dig — den læser/skriver filer og kører kommandoer på din egen PC. Du behøver ikke kunne kode.

**Sådan kommer du i gang:**

1. Installér **VS Code** (https://code.visualstudio.com/) — gratis editor
2. Installér **Claude Code-extension** i VS Code:
   - Åbn VS Code → klik på extensions-ikonet i venstre side (firkanter)
   - Søg efter "Claude Code"
   - Klik "Install" på den fra Anthropic
   - Log ind med din Anthropic-konto
3. Åbn pizzeria-mappen i VS Code: **File → Open Folder** → vælg mappen `Milots fætters pizzashop`
4. Åbn Claude Code-panelet i VS Code (ikon i venstre side eller `Ctrl+Shift+P` → "Claude Code")
5. Skriv din første prompt:

> Læs PLAN.md. Du skal hjælpe mig gennem Fase 0. Filerne er allerede splittet og PWA-manifest tilføjet. Vi skal i gang med at oprette GitHub-repo og deploye til Vercel. Spørg mig før du gør noget der kræver et klik på en hjemmeside.

Claude Code læser planen, tjekker hvad der er gjort, og guider dig trin-for-trin. Den pauser når der skal klikkes manuelt (fx oprette GitHub-konto, klikke "Deploy" i Vercel) og fortsætter når du er færdig.

**Hvad Claude Code kan:**
- Læse og redigere kode-filer
- Køre git-kommandoer i terminalen
- Hjælpe dig debugge når noget fejler
- Skrive den nye Supabase-kode i Fase 1
- Lave Service Worker i Fase 4

**Hvad Claude Code IKKE kan** (det skal du selv klikke):
- Oprette konti (GitHub, Vercel, Supabase, domæne)
- Trykke "Deploy" eller andre knapper på en hjemmeside
- Købe et domæne
- Konfigurere hardware (Bluetooth-printer)

For hver fase: åbn dokumentet, læs hvad fasen handler om, og bed Claude Code om at hjælpe dig. Den bruger PLAN.md som opslagsværk undervejs.

---

## Forudsætninger — installer dette først

**Programmer (alle gratis, almindelige "Next, Next, Finish"-installere):**

| Hvad | Hvor |
|---|---|
| Git for Windows | https://git-scm.com/download/win |
| Node.js LTS | https://nodejs.org/ (tag den der står "LTS") |
| VS Code | https://code.visualstudio.com/ |
| GitHub Desktop _(valgfri, lettere end Git-kommandoer)_ | https://desktop.github.com/ |

**Konti (alle gratis at starte):**

| Hvad | Hvor | Tip |
|---|---|---|
| GitHub | https://github.com/signup | — |
| Vercel | https://vercel.com/signup | Log ind med GitHub-kontoen |
| Supabase | https://supabase.com/dashboard/sign-up | Log ind med GitHub-kontoen |
| Domæne-registrar _(først i Fase 5)_ | namecheap.com / domains.google | — |

**Test at det virker.** Åbn en terminal (Windows: `Win + R`, skriv `cmd`, Enter):
```
git --version
node --version
```
Begge skal give et versionsnummer. Hvis ikke — genstart PC'en efter installation.

---

## Spørgsmål til fætteren før Fase 3 og 6

Du kan starte Fase 0–2 uden svar. Men før du går i gang med print og fiscal-compliance, skal disse afklares:

1. ⚠️ **Bruger han allerede en fiscal-printer (ATK-godkendt) i pizzeriaet?** Hvis ja: hvilken model?
2. ⚠️ **Har han en termo-printer i forvejen til kvitteringer?** Bluetooth eller netværk?
3. ⚠️ **Hvad hedder pizzeriaet?** "Artizano" er bare hvad der står i koden. Har han logo, farver, åbningstider, adresse?

---

## Fase 0 — Få den online som den er

**Mål:** En fast URL på nettet du kan åbne på en tablet, i stedet for en HTML-fil i browser-cachen.

**Tid:** ~30–60 minutter.

### Hvad er allerede gjort

✅ **Fil-split** — `pos.html` er splittet op i `index.html`, `style.css` og `app.js` (originalen ligger som `pos.html` som backup)
✅ **PWA-manifest** — `manifest.json` + `favicon.svg` tilføjet, så appen kan installeres på tablet-hjemmeskærmen
✅ **README.md** — beskriver hvordan du viser appen lokalt
✅ **.gitignore** — klar til git

**Test lokalt nu:** Dobbeltklik på `index.html`. Den skal se ud præcis som `pos.html` gjorde. Hvis ikke — sig til Claude Code: _"split-versionen ser anderledes ud end pos.html, kan du sammenligne og rette?"_

### Trin der mangler

**1. Opret et privat GitHub-repo.**
- Log ind på https://github.com/
- Klik "+" øverst til højre → "New repository"
- Navn: `artizano-pos`
- Sæt **Private**
- Klik "Create repository"

**2. Push alle filerne til repo'et.** Åbn terminal i denne mappe:

```
git init
git add .
git commit -m "initial commit: split POS app + PWA manifest"
git branch -M main
git remote add origin https://github.com/<DIT-USERNAVN>/artizano-pos.git
git push -u origin main
```

Erstat `<DIT-USERNAVN>` med dit GitHub-brugernavn. (Bruger du GitHub Desktop i stedet: åbn programmet → "Add Local Repository" → vælg mappen → "Publish repository" → privat ✓.)

**3. Deploy på Vercel.**
- Log ind på https://vercel.com/
- "Add New..." → "Project"
- Vælg `artizano-pos`-repo'et
- Klik "Deploy" — alle defaults er fine for et statisk site
- Efter ~30 sek får du en URL: `artizano-pos-xxxx.vercel.app`

**Test:** Åbn URL'en på din PC og en tablet. Begge skal vise POS'en. Læg den til hjemmeskærmen på tabletten via browserens menu → "Add to Home Screen".

### Hvad er IKKE med endnu

Stadig localStorage. Hver enhed har sit eget data-sæt. Cache-clear = data væk. Det fikser vi i Fase 1.

---

## Fase 1 — Rigtig backend (Supabase)

**Mål:** Data lever centralt i en database. Flere enheder synker live. Backup automatisk.

**Tid:** 2–3 dage hvis du gør det selv første gang. Hurtigere hvis nogen hjælper med JavaScript-delen.

### Trin

**1. Opret nyt Supabase-projekt.**
- Log ind på https://supabase.com/dashboard
- "New Project"
- Navn: `artizano-pos`
- Region: **Frankfurt (eu-central-1)** — tættest på Kosovo
- Database password: generér et stærkt og **gem det et sikkert sted** (LastPass / 1Password)
- Klik "Create new project"

**2. Opret skemaet.** Gå til "SQL Editor" i venstre sidebar → "New query" → indsæt:

```sql
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  navn text not null,
  adresse text,
  valuta text default '€',
  moms_pct numeric default 18,
  oprettet timestamptz default now()
);

create table kategorier (
  id text primary key,
  restaurant_id uuid references restaurants on delete cascade,
  navn text not null,
  ikon text,
  sort int default 0
);

create table produkter (
  id text primary key,
  restaurant_id uuid references restaurants on delete cascade,
  kategori_id text references kategorier on delete cascade,
  navn text not null,
  beskrivelse text,
  pris numeric not null,
  ikon text,
  udsolgt bool default false
);

create table tavolina (
  id text primary key,
  restaurant_id uuid references restaurants on delete cascade,
  nr text not null,
  emri text not null
);

create table ordrer (
  id text primary key,
  restaurant_id uuid references restaurants on delete cascade,
  ordre_nummer int not null,
  status text not null,            -- 'aaben' | 'ventende' | 'paguar'
  bord text,
  note text,
  subtotal numeric not null,
  moms numeric not null,
  total numeric not null,
  betaling text,                   -- 'kontant' | 'kort' | null
  oprettet timestamptz not null default now(),
  betalt timestamptz,
  kasserer_id uuid                 -- kobles på når Auth aktiveres (Fase 2)
);

create table ordre_linjer (
  id uuid primary key default gen_random_uuid(),
  ordre_id text references ordrer on delete cascade,
  produkt_id text,
  navn text not null,
  pris numeric not null,
  antal int not null
);

create table ordre_log (
  id uuid primary key default gen_random_uuid(),
  ordre_id text references ordrer on delete cascade,
  handling text not null,
  hvem text,
  hvornaar timestamptz default now()
);

-- Realtime: gør at flere enheder ser ordre-ændringer live
alter publication supabase_realtime add table ordrer;
alter publication supabase_realtime add table ordre_linjer;
```

Klik "Run". Du skal se "Success".

**3. Opret det første restaurant.** Stadig i SQL Editor:
```sql
insert into restaurants (navn) values ('Artizano') returning id;
```
**Kopiér det `id` der returneres** — du skal bruge det i koden lige om lidt.

**4. Hent dine API-nøgler.** Settings → API. Kopiér:
- **Project URL** (fx `https://abc123.supabase.co`)
- **anon public key** (lang streng)

**5. Tilføj Supabase-klient i koden.** I `index.html`, før `<script src="app.js">`:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Øverst i `app.js`:
```js
const SUPABASE_URL = 'https://abc123.supabase.co';        // erstat
const SUPABASE_KEY = 'din-anon-key-her';                  // erstat
const RESTAURANT_ID = 'uuid-fra-trin-3';                  // erstat
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
```

**6. Erstat `gemData()` / `loadData()` med Supabase-kald.**

Det her er hovedarbejdet. I app.js skal disse 4 funktioner skrives om:
- `loadData()` → hent kategorier, produkter, ordrer, tavolina fra Supabase
- `gemData()` → upsert ordrer + ordre_linjer til Supabase (ikke til localStorage)
- `gemTavolina()` → upsert tavolina
- `initMenuData()` → kør kun første gang for et nyt restaurant; insert defaults til Supabase

**Tip:** Bed Claude om at lave omskrivningen for dig — kopiér dette dokument ind sammen med `app.js` og sig _"omskriv loadData/gemData/gemTavolina/initMenuData så de bruger sb-klienten i stedet for localStorage. Behold samme funktion-signaturer."_ Det er en mekanisk transformation Claude er god til.

**7. Tilføj realtime-sync.** I bunden af `loadData()` tilføj:
```js
sb.channel('ordrer-live')
  .on('postgres_changes',
      {event:'*', schema:'public', table:'ordrer', filter:`restaurant_id=eq.${RESTAURANT_ID}`},
      () => loadData().then(() => { renderAabneBorde(); genindlaesVentende(); }))
  .subscribe();
```

**8. Migrér eksisterende data.** Hvis pizzeriaet allerede har brugt POS'en med rigtige ordrer, vil de stå i deres browser. Kør én gang i browser-konsollen på den maskine:

```js
// Print eksisterende localStorage-data så du kan kopiere det
console.log(JSON.stringify({
  kat: JSON.parse(localStorage.getItem('artizano_kat') || '[]'),
  prod: JSON.parse(localStorage.getItem('artizano_prod') || '[]'),
  ord: JSON.parse(localStorage.getItem('artizano_ordrer') || '[]'),
  tav: JSON.parse(localStorage.getItem('artizano_tavolina') || '[]')
}));
```

Brug output'et til SQL-inserts i Supabase. (Hvis der ikke er rigtige ordrer endnu, skip dette trin — kør bare `initMenuData()` så defaults pushes til Supabase.)

**9. Aktivér Row-Level Security.** Kritisk for sikkerhed:
```sql
alter table restaurants enable row level security;
alter table kategorier enable row level security;
alter table produkter enable row level security;
alter table tavolina enable row level security;
alter table ordrer enable row level security;
alter table ordre_linjer enable row level security;
alter table ordre_log enable row level security;
```

Foreløbig (mens vi ikke har auth endnu) lav simple "allow-all"-policies. Stram dem i Fase 2:
```sql
create policy "open" on restaurants for all using (true) with check (true);
create policy "open" on kategorier for all using (true) with check (true);
create policy "open" on produkter for all using (true) with check (true);
create policy "open" on tavolina for all using (true) with check (true);
create policy "open" on ordrer for all using (true) with check (true);
create policy "open" on ordre_linjer for all using (true) with check (true);
create policy "open" on ordre_log for all using (true) with check (true);
```

**10. Push og test:**
```
git add .
git commit -m "switch to Supabase backend with realtime sync"
git push
```

Vercel deployer automatisk efter ~30 sek. Test: åbn URL'en på to enheder samtidig — opret en ordre på den ene, den skal dukke op på den anden inden for 1-2 sekunder.

### Hvad er IKKE med endnu

Stadig kun PIN-i-localStorage som "auth". Alle der har URL'en kan tilgå alt. Det fikser Fase 2.

---

## Fase 2 — Rigtig auth & roller

**Mål:** Hvem-gjorde-hvad-log. Mulighed for at deaktivere medarbejdere. Adgangskontrol pr. rolle.

**Tid:** 1 dag.

### Trin

**1. Aktivér Email/Password auth i Supabase.** Authentication → Providers → Email → "Enable".

**2. Opret roller-tabel:**
```sql
create table profiler (
  id uuid primary key references auth.users on delete cascade,
  restaurant_id uuid references restaurants on delete cascade,
  navn text not null,
  rolle text not null,                -- 'admin' | 'kasserer'
  pin_hash text,                      -- bcrypt-hash af 4-cifret PIN
  aktiv bool default true
);
alter table profiler enable row level security;
```

**3. Opret den første admin** (fætteren): Authentication → Users → "Add user" → indtast email + password. Tag user-id'et og kør:
```sql
insert into profiler (id, restaurant_id, navn, rolle, aktiv)
values ('<user-id>', '<restaurant-uuid>', 'Fætter', 'admin', true);
```

**4. Stram RLS-policies** (fjern de "open"-policies fra Fase 1):
```sql
drop policy "open" on ordrer;
create policy "egen restaurant" on ordrer for all
  using (restaurant_id = (select restaurant_id from profiler where id = auth.uid()))
  with check (restaurant_id = (select restaurant_id from profiler where id = auth.uid()));
-- gentag for kategorier, produkter, tavolina, ordre_linjer, ordre_log
```

**5. Login-flow i koden.** Tilføj et login-skærm før POS'en vises:
- Admin: email + password (sjælden, kun fætteren)
- Kasserer: 4-cifret PIN matchet via Supabase RPC mod `profiler.pin_hash`
- Gem session i `sb.auth` (Supabase håndterer det automatisk)

**6. Audit-log.** I `opretBestilling()`, `betalOrdre()`, `fshiNjeOrdre()` osv. tilføj insert i `ordre_log` med `auth.uid()` som "hvem".

### Hvad er IKKE med endnu

Print, offline. Næste fase.

---

## Fase 3 — Kvitterings-print ⚠️

**⚠️ Beslutning blokeret af spørgsmål til fætteren** (se top af dokument). Afhængigt af hvad han svarer, vælger du et af tre niveauer:

| Niveau | Hvordan | Cost | Anbefaling |
|---|---|---|---|
| **A** | Browser-print via `window.print()` med en pænt formateret kvittering-side | 0 kr | Hurtig start, ikke pænt på termo-printer |
| **B** | **Bluetooth termo-printer** via Web Bluetooth API → ESC/POS-kommandoer | ~400 kr printer | **Anbefalet** hvis han ikke har én i forvejen |
| **C** | Netværks-printer via en lille Node.js-bridge på en Raspberry Pi | ~600 kr | Mest robust, mest setup |

### Hvis niveau B (Bluetooth)

**Køb:** En "Bluetooth thermal receipt printer 58mm" eller "80mm" — fx fra eBay eller AliExpress, søg "ESC/POS Bluetooth thermal printer".

**Bibliotek:** Brug https://github.com/receipt-print-hq/escpos-buffer eller skriv direkte mod printeren via Web Bluetooth.

**Kode-skitse** (læg i `app.js`):
```js
async function printKvittering(ordre) {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
  });
  const server = await device.gatt.connect();
  // ... ESC/POS-kommandoer for header, items, total, cut
}
```

**Test:** Print en testordre. Justér layout (font, bredde, logo) til printeren passer.

---

## Fase 4 — Offline-first / PWA

**Mål:** Pizzeria-WiFi ryger ikke = POS går ikke død. Ordrer kan tages imod offline og synker når nettet er tilbage.

**Tid:** 1 dag.

### Trin

**1. Tilføj Service Worker.** Opret `sw.js` ved siden af `index.html`:

```js
const CACHE = 'artizano-v1';
const ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
```

I `app.js`, øverst:
```js
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
```

**2. Skriv-kø.** Erstat direkte Supabase-skriv med en kø der lægger i IndexedDB hvis offline:
- Brug `idb-keyval` (https://github.com/jakearchibald/idb-keyval) — tilføj som `<script src="https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js">`
- Når ordre oprettes: forsøg Supabase-insert. Fejler den (offline), gem i IndexedDB-kø
- Lyt på `window.online` event — flush kø til Supabase når nettet er tilbage

**3. Konflikt-håndtering.** Ordrenumre må ikke kollidere når flere enheder har været offline. To muligheder:
- Server-side autoincrement: lad Supabase generere `ordre_nummer` (skift kolonne til `serial`)
- Klient-prefiks: `T1-127`, `T2-43` hvor T1/T2 er enhed-id

**4. Test:** Sluk WiFi. Opret en ordre. Tænd WiFi. Ordren skal dukke op i Supabase inden for ~5 sek.

---

## Fase 5 — Domæne, logo, brand

**Mål:** Det ser ud som hans, ikke som en demo.

**Tid:** ½ dag.

### Trin

**1. Køb domæne.** Spørg fætteren hvad han vil have:
- `artizano.xyz` / `artizano.menu` (~80 kr/år)
- `.com` hvis det er ledigt (~120 kr/år)
- `.ks` (Kosovo) — kræver registrering via en Kosovo-registrar
- Køb hos namecheap.com eller domains.google

**2. Pek domænet på Vercel.**
- Vercel Dashboard → dit projekt → Settings → Domains
- "Add Domain" → indtast domænet
- Vercel viser dig hvilke DNS-records der skal sættes (A-record + CNAME)
- Sæt dem hos din registrar (Namecheap: Domain List → Manage → Advanced DNS)
- Vent 5-30 min på DNS-propagering. Vercel udsteder SSL automatisk.

**3. Logo og farver.** Tilføj de filer fætteren leverer:
- `icon-192.png`, `icon-512.png` til PWA-manifest (kan laves gratis fra hans logo via https://realfavicongenerator.net/)
- I `style.css` skift CSS-variablerne hvis han vil have andre farver:
  ```
  --brun:#3B1F0E;     /* primær */
  --guld:#C9963B;     /* accent */
  ```
- I `index.html` skift `<title>` og header-tekst til hans rigtige restaurantnavn

**4. Push:**
```
git add .
git commit -m "branding: logo, farver, domæne"
git push
```

---

## Fase 6 — Kosovo fiscal-compliance ⚠️

**⚠️ Det her er den største ukendte i hele projektet.**

Kosovo har ATK (Administrata Tatimore e Kosovës) fiscal-device-krav. Restauranter skal udstede fiscal-kvitteringer via en certificeret fiscal-printer der rapporterer til ATK i realtid.

**Vores POS er IKKE fiscal-konform p.t.** Det skal afklares før den må bruges som primær kasse-løsning:

**Mulige veje:**
1. **Parallel-drift:** Fætteren kører fortsat sin nuværende ATK-printer parallelt; vores POS er kun ordre-management. Kvittering printes på den fiscale, ordre tracking sker hos os. Lavest risiko.
2. **Integration:** Vi integrerer mod en certificeret ATK-fiscal-device. Kræver dialog med en lokal Kosovo-leverandør og typisk en SDK.
3. **Cert ny POS:** Vi får hele systemet ATK-certificeret. Stort projekt — månedsvis af arbejde, juridisk proces. Ikke realistisk for en pizzeria.

**Næste skridt:** Find ud af hvilken løsning fætteren har i dag. Spørg ham:
- Hvad bruger han til fiscale kvitteringer nu?
- Hvilket mærke/model fiscal-device?
- Har han en revisor / regnskabsperson der ved noget om ATK-kravene?

Indtil dette er afklaret, brug systemet kun som ordre-/lager-/omsætnings-værktøj internt — IKKE til at udskrive de officielle fiscal-kvitteringer der gives til kunderne.

---

## Tidsplan og budget

| Fase | Tid | Løbende cost |
|---|---|---|
| 0 — Online | ½ dag | 0 kr |
| 1 — Backend | 2-3 dage | 0 kr op til 500 MB DB, derefter $25/mnd |
| 2 — Auth | 1 dag | (samme Supabase) |
| 3 — Print | ½-2 dage | engangs ~400 kr hardware |
| 4 — Offline | 1 dag | 0 kr |
| 5 — Brand | ½ dag | ~100 kr/år domæne |
| 6 — Fiscal | ? | ? — kræver afklaring først |

**Til ægte daglig brug:** Fase 0–4 = ~5 arbejdsdage, < 300 kr/år + engangs hardware.

---

## Hvis du sidder fast

- **Code-spørgsmål:** Spørg Claude (https://claude.ai). Kopiér det relevante stykke kode + dokumentet her ind, og spørg konkret.
- **Supabase-spørgsmål:** Deres docs er gode — https://supabase.com/docs
- **Vercel-spørgsmål:** https://vercel.com/docs
- **Generelle Git-fejl:** https://ohshitgit.com/

---

_Sidst opdateret: 2026-05-09._
