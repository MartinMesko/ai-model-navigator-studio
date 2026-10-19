import { EFFORTS, initialState } from './data.mjs?v=2.2';
import { applyModelPolicy, hasExcludedModel, modelTool, replacementModel, usableModel } from './policy.mjs?v=2.2';
export { applyModelPolicy, hasExcludedModel, modelTool, usableModel };

export const normal = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export const id = () => globalThis.crypto.randomUUID();
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const hasSecret = value => /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}\b/.test(String(value));
export function rankSituations(situations, query = '', category = 'Všetko') {
  const words = normal(query).split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 1);
  return situations.filter(s => category === 'Všetko' || s.category === category).map((s, index) => {
    const title = normal(s.title); const keywords = (s.keywords || []).map(normal);
    const score = words.reduce((n, word) => n + (title.includes(word) ? 4 : 0) + (keywords.some(k => k.includes(word)) ? 2 : 0) + (normal(s.category).includes(word) ? 1 : 0), 0);
    return { ...s, score, order: index };
  }).filter(s => !words.length || s.score > 0).sort((a, b) => b.score - a.score || a.order - b.order);
}
function choice(modelId, models, priority, situation, baseEffort = situation.effort, omit = []) {
  let base = models.find(m => m.id === modelId);
  if (hasExcludedModel(modelId) || hasExcludedModel(base)) base = models.find(m => m.id === replacementModel(modelId, base));
  const tool = modelTool(base);
  const required = situation.humanRequired ? EFFORTS[Math.max(EFFORTS.indexOf(baseEffort), EFFORTS.indexOf(situation.effort))] : baseEffort;
  const wanted = priority === 'quality' ? EFFORTS[Math.max(EFFORTS.indexOf(required), 2)]
    : priority === 'fast' && !situation.humanRequired ? (situation.session === 'qa' || situation.category === 'Schémy' ? 'medium' : 'low') : required;
  const pool = models.filter(m => usableModel(m) && !omit.includes(m.id) && modelTool(m) === tool && (!situation.humanRequired || m.efforts?.includes(wanted)));
  let model = usableModel(base) && !omit.includes(base.id) ? base : null;
  if(priority==='balanced'&&omit.includes(base?.id))model=pool.toSorted((a,b)=>Math.abs(a.tier-base.tier)-Math.abs(b.tier-base.tier))[0]||null;
  if (priority === 'quality') model = pool.toSorted((a,b) => b.tier-a.tier || Number(b.id === base?.id)-Number(a.id === base?.id))[0] || null;
  if (priority === 'fast' && !situation.humanRequired) {
    const floor = situation.session === 'qa' || situation.category === 'Schémy' ? 1 : 0;
    model = pool.filter(m => m.tier >= Math.min(floor, base?.tier ?? floor) && m.tier <= (base?.tier ?? 3)).toSorted((a,b) => a.tier-b.tier)[0] || null;
  }
  let effort = wanted;
  if (model && !model.efforts?.includes(effort)) effort = EFFORTS.find(e => EFFORTS.indexOf(e) >= EFFORTS.indexOf(wanted) && model.efforts.includes(e)) || EFFORTS.filter(e=>model.efforts.includes(e)).at(-1);
  if (situation.humanRequired && !model?.efforts?.includes(wanted)) model = null;
  const adjusted = model?.id !== modelId || effort !== baseEffort;
  const reason = !model ? 'Nie je dostupný odlišný povolený model s potrebným effort. Skontroluj katalóg; príkaz sa nevygeneruje.'
    : situation.humanRequired ? 'Zachovaný požadovaný effort a povinná kontrola človekom; priorita bezpečnostné posúdenie neznižuje.'
    : omit.length ? 'Odlišný model v rovnakom nástroji podľa rovnakej priority; hlavný model sa ako alternatíva neopakuje.'
    : priority === 'quality' ? `Max. kvalita: najvyššia dostupná povolená trieda pre ${tool}. Ide o pravidlo aplikácie, nie porovnávací benchmark.`
    : priority === 'fast' ? 'Rýchlosť: nižšia povolená trieda a primeraný effort; pri QA a schémach aspoň stredná úroveň.'
    : 'Vyvážený režim: základné nastavenie tejto pracovnej situácie.';
  return {model, tool, effort, adjusted, unavailable: !model, reason};
}
export function recommend(situation, models, priority = 'balanced') {
  const main = choice(situation.modelId, models, priority, situation);
  let alternative = choice(situation.alternative, models, priority, situation, situation.alternativeEffort || situation.effort);
  if(main.model&&alternative.model?.id===main.model.id)alternative=choice(situation.alternative,models,priority,situation,situation.alternativeEffort||situation.effort,[main.model.id]);
  const secondary = situation.secondaryModelId ? choice(situation.secondaryModelId, models, priority, situation) : null;
  const workflowTool = main.model ? main.tool + (situation.humanRequired ? ' + človek' : secondary?.model ? ' + ' + secondary.tool : '') : 'Nedostupné';
  return {...situation, ...main, workflowTool, alternative, secondary};
}
export function cliCommand(model, effort) {
  if (!usableModel(model) || !model.efforts?.includes(effort) || !/^[a-zA-Z0-9][a-zA-Z0-9._:[\]-]{0,100}$/.test(model.id) || !EFFORTS.includes(effort)) return null;
  if (model.tool === 'Claude Code') return { launch: `claude --model '${model.id}' --effort ${effort}`, interactive: `/effort ${effort}`, note: 'Spusť v pracovnom priečinku. Alias sa môže zmeniť podľa účtu a poskytovateľa.' };
  return { launch: `codex --model '${model.id}'`, interactive: '/reasoning', note: `Po štarte otvor /reasoning a vyber ${effort}. Model a effort potvrď v nainštalovanom CLI.` };
}
export function selectNotes(notes, query, limit = 12) {
  const words = normal(query).split(/\s+/).filter(w => w.length > 2);
  return notes.filter(n => n.useInAI).map((n, i) => ({ n, i, score: words.reduce((score, w) => score + (normal(`${n.title} ${n.tags} ${n.content}`).includes(w) ? 1 : 0), 0) + (n.kind === 'Pravidlo' ? 2 : 0) })).sort((a, b) => b.score - a.score || b.i - a.i).slice(0, limit).map(x => ({ id: x.n.id, title: x.n.title, content: x.n.content, kind: x.n.kind, tags: x.n.tags }));
}
export function localSkill({ name, goal, notes, situation, profile }) {
  if (hasExcludedModel(name) || hasExcludedModel(goal)) throw new Error('Zadanie skillu obsahuje vyradený model.');
  const slug = normal(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'moj-skill';
  const description = `${(goal || name).replace(/[.!?]+$/,'')}. Použi pri práci s ${situation?.category || 'technickou dokumentáciou'}.`.replace(/[\r\n]+/g, ' ');
  const rules = notes.filter(n => !hasExcludedModel(`${n.title} ${n.content}`)).map(n => `- ${n.title}: ${n.content}`).join('\n');
  if (hasExcludedModel(`${profile.role} ${profile.context}`)) profile = {...profile, role: '', context: 'Pracovný profil obsahuje vyradený model; pred použitím doplň aktuálny povolený kontext.'};
  return `---\nname: ${slug}\ndescription: ${JSON.stringify(description)}\n---\n\n# ${name}\n\n## Cieľ\n${goal}\n\n## Pracovný kontext\n${profile.role ? profile.role + ': ' : ''}${profile.context}\n\n## Postup\n1. Identifikuj zdrojové dokumenty, revízie a potrebné vstupy.\n2. Over presné označenia doslovným vyhľadávaním alebo vhodným lokálnym nástrojom.\n3. Pri technickom závere uveď stranu, označenie a dôkaz. Ak dôkaz chýba, zaznamenaj neistotu.\n4. Výsledok skontroluj proti pôvodným podkladom a vypíš nevyriešené body.\n\n## Schválené poznatky\n${rules || '- Zatiaľ bez pridaných poznatkov. Pred použitím doplň pravidlá z praxe.'}\n\n## Očakávaný výstup\n- Stručný výsledok, odkazy na dôkazy, neistoty a ďalší overiteľný krok.\n\n## Overenie\n- Porovnaj aspoň jeden známy príklad a jeden prípad s chýbajúcim dôkazom.\n- Nevydávaj nevykonaný test alebo kontrolu za hotovú.\n`;
}
export function validateBackup(value) {
  if (!value || value.version !== 2 || !Array.isArray(value.situations) || !Array.isArray(value.models) || !Array.isArray(value.notes) || !Array.isArray(value.skills)) throw new Error('Súbor nie je záloha Navigator Studio verzie 2.');
  if (hasSecret(JSON.stringify(value))) throw new Error('Záloha obsahuje API kľúč. Odstráň ho pred importom.');
  if (value.situations.length > 300 || value.models.length > 100 || value.notes.length > 500 || value.skills.length > 100) throw new Error('Záloha prekračuje povolený počet položiek.');
  const validText = (v, max, empty = false) => typeof v === 'string' && v.length <= max && (empty || v.trim().length > 0);
  const unique = arr => new Set(arr.map(x => x.id)).size === arr.length;
  for (const arr of [value.situations, value.models, value.notes, value.skills]) if (!unique(arr)) throw new Error('Záloha obsahuje duplicitné identifikátory.');
  if (value.models.some(m => !validText(m.id, 100) || !validText(m.label, 150) || !['Codex', 'Claude Code'].includes(m.tool) || !Array.isArray(m.efforts) || !m.efforts.length || m.efforts.some(e => !EFFORTS.includes(e)) || !Number.isInteger(m.tier) || m.tier < 0 || m.tier > 3)) throw new Error('Katalóg modelov nie je platný.');
  if (value.situations.some(s => !validText(s.id, 100) || !validText(s.title, 300) || !validText(s.category, 100) || !validText(s.modelId, 100) || !validText(s.why, 3000, true) || !EFFORTS.includes(s.effort) || (s.alternativeEffort && !EFFORTS.includes(s.alternativeEffort)) || !Array.isArray(s.keywords) || s.keywords.some(k => !validText(k, 100, true)))) throw new Error('Niektorá situácia nie je platná.');
  if (value.notes.some(n => !validText(n.id, 100) || !validText(n.title, 200) || !validText(n.content, 12000) || !validText(n.tags, 500, true) || !validText(n.kind, 100))) throw new Error('Niektorá poznámka nie je platná.');
  if (value.skills.some(s => !validText(s.id, 100) || !validText(s.name, 200) || !validText(s.content, 60000))) throw new Error('Niektorý skill nie je platný.');
  const fresh = initialState();
  const settings = { ...fresh.settings, ...value.settings };
  const apiBase = settings.apiBase || '';
  if (apiBase) { const url = new URL(apiBase); if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('API adresa musí používať HTTPS alebo lokálny server.'); }
  const savedRole = String(value.profile?.role || '').slice(0, 200);
  // Remove the retired default from existing browser data and imported backups only.
  const role = /^junior\s+ai\s+technik$/.test(normal(savedRole).trim()) ? '' : savedRole;
  return applyModelPolicy({ ...fresh, profile: { name: String(value.profile?.name || 'Martin').slice(0, 100), role, context: String(value.profile?.context || '').slice(0, 6000) }, situations: value.situations, models: value.models, notes: value.notes, skills: value.skills, history: Array.isArray(value.history) ? value.history.slice(-30) : [], settings });
}
