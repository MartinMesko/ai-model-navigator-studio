# Navigator Studio

Osobná responzívna aplikácia v slovenčine. Retro sci-fi dark mode, editovateľný výber Codex vs Claude Code, poznatky z praxe a dielňa Skills. Nový samostatný projekt; pôvodný lokálny HTML Navigator ostáva k dispozícii.

## Vzhľad 2.1

Originálny červeno-čierny retro sci-fi layout s neonovým titulkom, jemne animovaným portálom a technickými nadpismi. Neobsahuje filmové logá ani prevzaté filmové fonty. Nadpisy používajú lokálne pribalený [Orbitron](https://github.com/google/fonts/tree/main/ofl/orbitron) pod licenciou SIL OFL 1.1 (`web/fonts/OFL.txt`); bežné texty zostávajú čitateľné systémovým písmom. Načítanie fontu nevolá externú službu. Animácia rešpektuje systémové nastavenie obmedzeného pohybu.

Pôvodné predvyplnené označenie roly sa pri načítaní starých dát a importe odstráni; vlastná rola, poznatky, skills a úpravy situácií zostávajú zachované. Rola je voliteľná.

## Nasadené adresy

- [Navigator Studio](https://martinmesko.github.io/ai-model-navigator-studio/) – web nasadzovaný cez GitHub Actions.
- API backend: `https://ai-model-navigator-api.martin-mesko.workers.dev` – nasadený do Cloudflare Workers. Bez `OPENAI_API_KEY` a `APP_ACCESS_TOKEN` zostávajú AI volania uzamknuté.
- [GitHub Actions](https://github.com/MartinMesko/ai-model-navigator-studio/actions).

Prvé nasadenie backendu bolo vykonané oficiálnym Wrangler CLI po schválenej Cloudflare autorizácii. GitHub premenná `API_BASE_URL` už smeruje na tento backend. Pre ďalšie nasadzovanie backendu cez pripravený Actions workflow doplň jeho vlastný Cloudflare API token a ostatné secrets podľa postupu nižšie. OAuth prihlásenie uložené v počítači sa nekopíruje do GitHubu.

## Čo funguje

- 15 pracovných situácií podľa dodaného zadania, plne editovateľných; vlastné situácie možno pridávať a odstraňovať.
- Viacslovné vyhľadávanie aj bez diakritiky, filtre a priority Rýchlosť / Vyvážený / Max. kvalita. Výber v playbooku je explicitne pravidlový.
- Odporúčanie modelu, effort, alternatíva, dôvod a kopírovanie bezpečne zostavených CLI príkazov.
- Štyri pracovné Sessions, katalóg modelov s vlastnou dostupnosťou a podporovaným effort.
- Poznámky, pravidlá, opravy a AI návrhy s voľbou, ktoré smie AI použiť.
- OpenAI Responses API cez chránený backend; otázka dostane pracovný profil, aktuálny playbook, katalóg a najviac 12 povolených poznámok. Výber poznámok je lokálne pravidlové zoradenie, nie sémantické vyhľadávanie. V aplikácii je náhľad kontextu.
- Lokálne šablóny SKILL.md aj AI návrhy, editácia, knižnica a stiahnutie. Žiadne automatické vykonávanie či inštalácia.
- JSON záloha a import. Heslo aplikácie sa drží iba v pamäti karty, nie v zálohe alebo localStorage.

## Ako sa aplikácia „učí“

Poznatky, opravy a zmeny playbooku sa uchovávajú v localStorage aktuálneho prehliadača. Pri AI požiadavke sa povolené poznámky priložia do kontextu. AI odpoveď môžeš uložiť ako neschválený AI návrh; na ďalšie použitie ju musíš sám povoliť. Model sa netrénuje ani neprepisuje svoje váhy. Aplikácia nepozná tvoj počítač alebo PDF, ktoré si neposkytol v textovom kontexte. Táto verzia nemá nahrávanie PDF, synchronizáciu medzi zariadeniami ani automatické pozorovanie práce. Medzi zariadeniami použi JSON export/import.

## Lokálne spustenie

Potrebuješ Node.js 22.9 alebo novší. Aplikácia nemá žiadne npm závislosti.

```sh
npm start
```

Otvoriť `http://127.0.0.1:8787`. Lokálne funkcie fungujú aj bez API. Web používa moduly, preto ho spúšťaj cez tento server, nie dvojklikom na index.html.

Pre živé AI volania:

1. **Zruš API kľúč vložený do chatu.** V [OpenAI Platform](https://platform.openai.com/api-keys) vytvor nový kľúč.
2. Vytvor lokálny ignorovaný `.env` podľa `.env.example`. Nový kľúč vlož iba do `OPENAI_API_KEY` na serveri. Neposielaj ho do chatu.
3. Do `APP_ACCESS_TOKEN` nastav iné náhodné heslo s aspoň 24 znakmi. Možno ho vygenerovať lokálne cez `openssl rand -hex 24`; kľúč OpenAI nepoužívaj ako heslo aplikácie.
4. Reštartuj server. V aplikácii otvor Nastavenia, API adresu nechaj prázdnu a zadaj heslo aplikácie. Overenie pripojenia kontroluje iba konfiguráciu servera; nevytvára platenú odpoveď a nepotvrdzuje kredit alebo modelový prístup OpenAI.
5. AI otázka a „Vytvoriť s AI“ už vykonajú platené API volanie podľa účtu OpenAI. Limit môžeš upraviť serverovým nastavením.

## GitHub Actions a GitHub Pages

GitHub Pages hostuje iba statické rozhranie. API kľúč sa nesmie vložiť do Pages súborov, runtime-config.js ani build premenných `VITE_*` / `NEXT_PUBLIC_*`. Backend beží osobitne.

Pripravené workflowy:

- `ci.yml`: kontrola zdrojov, testy a statické zostavenie pri push/PR.
- `pages.yml`: testy a nasadenie priečinka `dist/` do Pages pri push do main.
- `worker.yml`: manuálne nasadenie chráneného API backendu do Cloudflare Workers.

V repozitári zapni Settings → Pages → Source: GitHub Actions. Na GitHub Free je Pages spravidla potrebné hostovať z verejného repozitára; GitHub Pro umožňuje aj súkromný. Osobné poznámky a zálohy nikdy necommituj do repozitára. Zverejnenie webu nezverejní localStorage tvojho prehliadača.

## API backend pre web na Pages

Cloudflare Worker je pripravený v `worker/index.mjs` a `wrangler.toml`. Potrebuješ svoj Cloudflare účet a povolenia na Workers a Durable Objects. Prípadné poplatky sa riadia tvojím účtom a používaním; aplikácia nevytvára platené služby automaticky.

1. V GitHub Settings → Environments vytvor `ai-production` a vlož jeho secrets:
   - `OPENAI_API_KEY`: nový kľúč po zrušení zverejneného kľúča.
   - `APP_ACCESS_TOKEN`: osobné náhodné heslo pre web.
   - `CLOUDFLARE_API_TOKEN`: token s potrebným oprávnením nasadzovať Workers v tvojom účte.
   - `CLOUDFLARE_ACCOUNT_ID`: ID Cloudflare účtu.
2. V `wrangler.toml` skontroluj `ALLOWED_ORIGINS`. Pre Martinove GitHub Pages je to `https://martinmesko.github.io`, bez názvu repozitára a bez koncovej lomky.
3. Spusť workflow „Deploy protected AI backend“. Ulož si vrátenú HTTPS adresu Workeru.
4. V GitHub Settings → Secrets and variables → Actions → Variables nastav verejnú premennú `API_BASE_URL` na origin Workeru, napr. `https://ai-model-navigator-api.TVOJ-SUBDOMAIN.workers.dev`. Nepridávaj do nej kľúč ani heslo.
5. Spusť znova Pages workflow. Alternatívne vlož API adresu ručne do Nastavení webu.
6. V Nastaveniach aplikácie zadaj `APP_ACCESS_TOKEN`. Web posiela iba toto osobné heslo na tvoj backend; backend následne použije OpenAI kľúč.

Secrets treba pridať cez bezpečné polia GitHubu alebo správcu secrets. Nezadávaj ich do kódu, URL, issue, README ani command-line argumentov. UI a server odmietajú bežné tvary OpenAI kľúčov v poznámkach/otázkach.

## Limity a ochrana

Backend používa presný allowlist pôvodov webu, overenie osobného hesla, allowlist API modelov, obmedzenú veľkosť vstupu, timeout a strop výstupu. Predvolene povolí 3 AI pokusy za minútu a 30 za UTC deň. Vždy len jednu prebiehajúcu požiadavku. Do počtu sa započítavajú aj pokusy, ktoré skončia chybou OpenAI.

Hosted Worker ukladá počítadlo do jedného Durable Objectu; transakcie bránia prekročeniu pri paralelných požiadavkách. Lokálny Node server drží počítadlo v pamäti a reštart ho vynuluje. Toto je limit požiadaviek a tokenov, **nie garantovaný peňažný rozpočet**. Limity projektu si nastav aj v OpenAI Platform.

Používa sa `store: false` pre Responses. To nevypína všetky retenčné či abuse-monitoring mechanizmy OpenAI; riaď sa [oficiálnymi dátovými podmienkami](https://developers.openai.com/api/docs/guides/your-data). Server neloguje obsah poznámok ani tajomstvá. Chybové odpovede neposielajú surovú odpoveď poskytovateľa. AI obsah sa vykresľuje ako text, nie spustiteľné HTML. Poznámky sú pre prompt explicitne nedôveryhodné podklady a AI nemá žiadne akčné nástroje.

V rámci jednej Pages domény môžu rôzne projekty zdieľať origin pre localStorage. Používaj dôveryhodné projekty alebo vlastnú doménu pre súkromnejšie používanie. Osobné heslo sprístupňuje API limity tvojho backendu; s nikým ho nezdieľaj.

## Modely a CLI – overené 19. 10. 2026

- OpenAI dokumentuje `gpt-5.6-terra`, `gpt-6-luna`, `gpt-6.1-sol`, `gpt-6-astra`. API prístup a Codex CLI prístup sú rozdielne; over ich v konkrétnom účte.
- Claude Code oficiálne uvádza Opus 5.5, Sonnet 5.5, Haiku 5.5 aj Fable 5.1. Použité sú doložené CLI aliasy `opus`, `sonnet`, `haiku`, `fable`; poskytovateľ môže mapovať alias na iný konkrétny model.
- Claude CLI: `claude --model 'sonnet' --effort high`.
- Codex CLI: `codex --model 'gpt-6.1-sol'`; effort vyber interaktívne v `/reasoning`. Aplikácia nepridáva nedoložený Codex prepínač.
- Odporúčania podľa pracovných situácií sú osobný tréningový playbook, nie meranie presnosti modelov na dokumentácii Gotostocku.

Oficiálne zdroje:

- [OpenAI model catalog](https://developers.openai.com/api/docs/models)
- [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [Claude Code model configuration](https://code.claude.com/docs/en/model-config)
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference)
- [Codex commands](https://learn.chatgpt.com/docs/developer-commands)
- [OpenAI Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [OpenAI API authentication](https://developers.openai.com/api/reference/overview)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Cloudflare Wrangler Action](https://github.com/cloudflare/wrangler-action)

## Overenie

```sh
npm run check
npm test
npm run build
```

Testy používajú mock odpoveď OpenAI a nevykonávajú platené volania. Overujú autentifikáciu, CORS, API kontrakt, input/output validáciu, citácie poznatkov, limity, výber podľa slov, priority, generovanie skillu a zálohy. Živý model treba otestovať až po bezpečnom pripojení nového kľúča. UI sa testuje samostatne v prehliadači.
