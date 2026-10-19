export const VERIFIED_ON = '2026-10-19';
export const SOURCES = [
  { title: 'OpenAI · katalóg modelov', url: 'https://developers.openai.com/api/docs/models' },
  { title: 'OpenAI · GPT-5.6 Terra', url: 'https://developers.openai.com/api/docs/models/gpt-5.6-terra' },
  { title: 'Claude Code · modely a effort', url: 'https://code.claude.com/docs/en/model-config' },
  { title: 'Claude Code · CLI', url: 'https://code.claude.com/docs/en/cli-reference' },
  { title: 'Codex · príkazy', url: 'https://learn.chatgpt.com/docs/developer-commands' },
  { title: 'OpenAI · Responses API', url: 'https://developers.openai.com/api/docs/guides/migrate-to-responses' }
];
export const CATEGORIES = ['PDF', 'Schémy', 'Kontrola AI', 'Python', 'Harness'];
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
export const SESSIONS = [
  { id: 'search', name: 'Vyhľadávač', number: '01', text: 'Dokumentácia, PDF a presné odkazy', icon: 'search' },
  { id: 'schema', name: 'Analytik schém', number: '02', text: 'Signály, kontakty a zapojenia', icon: 'circuit' },
  { id: 'qa', name: 'Kontrolór', number: '03', text: 'Nezávislý QA a overovanie tvrdení', icon: 'shield' },
  { id: 'code', name: 'Automatizátor', number: '04', text: 'Python, indexy a opakované úlohy', icon: 'code' }
];
const model = (id, label, tool, tier, description, api = false, sourceIndex = 0) => ({ id, label, tool, tier, description, api, enabled: true, status: 'documented', efforts: [...EFFORTS], verifiedOn: VERIFIED_ON, source: SOURCES[sourceIndex].url });
export const MODELS = [
  model('gpt-5.6-terra', 'GPT-5.6 Terra', 'Codex', 1, 'Extrakcia, každodenné vyhľadávanie a menšie skripty.', true, 1),
  model('gpt-6-luna', 'GPT-6 Luna', 'Codex', 0, 'Rýchle, jasne ohraničené a opakované úlohy.', true),
  model('gpt-6.1-sol', 'GPT-6.1 Sol', 'Codex', 2, 'Skriptovanie, ladenie a viacstupňové workflow.', true),
  model('gpt-6-astra', 'GPT-6 Astra', 'Codex', 3, 'Najnáročnejšie úlohy a komplexné rozhodovanie.', true),
  model('haiku', 'Haiku 5.5 · alias haiku', 'Claude Code', 0, 'Triedenie, rýchla extrakcia a malé úlohy.', false, 2),
  model('sonnet', 'Sonnet 5.5 · alias sonnet', 'Claude Code', 1, 'Každodenná analýza a čítanie dokumentácie.', false, 2),
  model('opus', 'Opus 5.5 · alias opus', 'Claude Code', 2, 'Zložité vzťahy a dôkladná nezávislá kontrola.', false, 2),
  model('fable', 'Fable 5.1 · alias fable', 'Claude Code', 3, 'Dlhé autonómne úlohy; prístup a kredity podľa účtu.', false, 2)
];
const situation = (id, title, category, tool, modelId, effort, session, keywords, why, alternative, extra = {}) => ({ id, title, category, tool, modelId, effort, session, keywords, why, alternative, updatedAt: VERIFIED_ON, ...extra });
export const SITUATIONS = [
  situation('pdf-find', 'Nájsť správnu schému v 2 000-stranovom PDF', 'PDF', 'Codex', 'gpt-5.6-terra', 'medium', 'search', ['nájsť schému','2000','2000-stranovom','manuál','pdf','index'], 'Najprv textový index a metadata. Agent zvolí spôsob vyhľadávania a uvedie číslo strany i revíziu.', 'sonnet'),
  situation('component-find', 'Vyhľadávať komponenty K12, F7, M17', 'PDF', 'Codex', 'gpt-5.6-terra', 'low', 'search', ['k12','f7','m17','označenie','komponent','relé'], 'Doslovné vyhľadávanie v texte býva rýchlejšie a presnejšie než odhad modelu.', 'haiku', { deterministic: true }),
  situation('component-links', 'Nájsť odkazy na komponent naprieč dokumentáciou', 'PDF', 'Codex', 'gpt-5.6-terra', 'medium', 'search', ['odkazy','referencie','naprieč','cross reference'], 'Spoj výskyty do prehľadu s odkazmi na dokument a stranu; rozlišuj rovnaké označenia v rôznych revíziách.', 'sonnet'),
  situation('pdf-index', 'Rozdeliť PDF, extrahovať text a vytvoriť index', 'PDF', 'Codex', 'gpt-5.6-terra', 'medium', 'code', ['rozdeliť','extrakcia','pdftotext','index','ocr'], 'Priprav opakovateľný postup a skontroluj chýbajúce strany, OCR a mapovanie čísiel strán.', 'sonnet'),
  situation('python-pdf', 'Vytvoriť Python skript na spracovanie PDF', 'Python', 'Codex', 'gpt-6.1-sol', 'high', 'code', ['python','skript','automatické spracovanie','parser','traceback'], 'Viacstupňové spracovanie súborov potrebuje testy, ošetrenie chýb a kontrolu výstupov.', 'sonnet'),
  situation('schema-read', 'Vizuálne čítať elektrickú schému', 'Schémy', 'Claude Code', 'sonnet', 'high', 'schema', ['vizuálne','elektrická schéma','symbol','schéma','čítať'], 'Čítaj z dostatočného rozlíšenia a každý záver prepoj s konkrétnym symbolom alebo vodičom.', 'gpt-6.1-sol'),
  situation('schema-compare', 'Porovnať zapojenie dvoch elektrických schém', 'Schémy', 'Claude Code', 'opus', 'high', 'schema', ['porovnať','dve schémy','zapojenie','rozdiel'], 'Porovnávaj signál po signáli a uvádzaj dôkaz pre každú zmenu. Závery na dokumentoch nie sú benchmarkom modelov.', 'gpt-6-astra'),
  situation('schema-trace', 'Sledovať relé, kontakty a prepojenia medzi stránkami', 'Schémy', 'Claude Code', 'opus', 'high', 'schema', ['relé','kontakty','prepojenia','medzi stránkami','signál','vodič'], 'Veď explicitný zoznam uzlov a odkazov medzi stranami. Neviditeľnú prepojku nemožno doplniť domnienkou.', 'gpt-6-astra'),
  situation('ai-facts', 'Odhaľovať chybné tvrdenia AI', 'Kontrola AI', 'Claude Code', 'opus', 'high', 'qa', ['chybné tvrdenia','halucinácia','nepravda','ai chyba'], 'Oddeľ tvrdenie, dôkaz a neistotu. Nezávislá kontrola nesmie iba opakovať pôvodný záver.', 'gpt-6-astra'),
  situation('agent-review', 'Nezávisle kontrolovať výsledok iného agenta', 'Kontrola AI', 'Claude Code', 'opus', 'high', 'qa', ['kontrola','qa','agent','review','overiť','nezávisle'], 'Použi pôvodné podklady a over výsledok krok po kroku s vlastnou evidenciou.', 'gpt-6.1-sol'),
  situation('repeated-error', 'Zistiť, prečo AI opakuje rovnakú chybu', 'Kontrola AI', 'Codex + Claude', 'gpt-6.1-sol', 'high', 'qa', ['opakovane','rovnakú chybu','príčina','harness engineering','chyba'], 'Analyzuj zlyhanie kontextu, nástrojov a testov. Druhý model má nezávisle napadnúť vysvetlenie.', 'opus', { secondaryModelId: 'opus' }),
  situation('bom-compare', 'Porovnať tisíce položiek katalógu dielov a BOM', 'Python', 'Codex', 'gpt-5.6-terra', 'medium', 'code', ['bom','katalóg','diely','tisíce','csv','kusovník'], 'Presné párovanie rob skriptom; agent pripraví pravidlá normalizácie a kontrolu rozdielov.', 'sonnet'),
  situation('qa-report', 'Automaticky generovať QA report', 'Kontrola AI', 'Codex', 'gpt-5.6-terra', 'low', 'qa', ['report','protokol','generovať','qa report'], 'Použi existujúcu štruktúru a overené zistenia. Výstup nesmie dopĺňať nevykonané kontroly.', 'sonnet'),
  situation('harness-design', 'Navrhnúť Harness a spoluprácu agentov', 'Harness', 'Codex', 'gpt-6-astra', 'high', 'code', ['harness','spolupráca','orchestrácia','workflow','architektúra'], 'Definuj hranice rolí, odovzdávanie dôkazov a testy úspechu. Harness tu znamená aj prostredie a pravidlá pre agentov.', 'opus'),
  situation('safety-review', 'Kriticky preveriť bezpečnostne dôležité zapojenie', 'Schémy', 'Claude + človek', 'opus', 'xhigh', 'qa', ['bezpečnosť','bezpečnostné','safety','kritické','ochrana'], 'AI pripraví otázky a dôkazy. Zodpovedná kvalifikovaná osoba musí posúdiť a schváliť zapojenie.', 'gpt-6-astra', { humanRequired: true })
];
export function initialState() {
  return structuredClone({ version: 2, profile: { name: 'Martin', role: 'Junior AI technik', context: 'Pracujem s elektrickými schémami, PDF manuálmi, QA a Harness Engineeringom. Chcem presné odkazy na zdroje, vysvetlenie neistôt a opakovateľné postupy.' }, situations: SITUATIONS, models: MODELS, notes: [], skills: [], history: [], settings: { priority: 'balanced', apiBase: '', apiModel: 'gpt-6.1-sol', apiEffort: 'medium', includeNotes: true } });
}
