// User-requested exclusions, shared by the browser, local server and Worker.
export const POLICY_VERSION = 1;
export const DEFAULT_API_MODEL = 'gpt-6.1-sol';
export const DEFAULT_API_MODELS = ['gpt-6-luna', 'gpt-5.6-terra', DEFAULT_API_MODEL];
export const MODEL_POLICY_MESSAGE = 'Astra a Fable sú podľa tvojho nastavenia vyradené z odporúčaní aj API.';
export function hasExcludedModel(value) {
  const text = typeof value === 'string' ? value : `${value?.id || ''} ${value?.label || ''}`;
  return /(?:^|[^a-z0-9])(?:astra|fable)(?=$|[^a-z])/i.test(text);
}
export const hasExcludedRecommendation = data => hasExcludedModel([data?.answer, ...(data?.steps || []), ...(data?.uncertainties || []), data?.skillMarkdown].join('\n'));
export function modelTool(model) {
  if (!model) return null;
  const inferred = /^gpt-/i.test(model.id) ? 'Codex' : /^(?:claude[-:]|opus(?:$|[-:])|sonnet(?:$|[-:])|haiku(?:$|[-:]))/i.test(model.id) ? 'Claude Code' : model.tool;
  return ['Codex', 'Claude Code'].includes(inferred) && inferred === model.tool ? inferred : null;
}
export const usableModel = model => !!model?.enabled && !hasExcludedModel(model) && !!modelTool(model);
export const replacementModel = (id, model) => (model?.tool === 'Claude Code' || /(?:claude|fable)/i.test(id)) ? 'opus' : DEFAULT_API_MODEL;

export function applyModelPolicy(state) {
  const originalModels = state.models || [];
  const excludedId = id => hasExcludedModel(id) || hasExcludedModel(originalModels.find(m => m.id === id));
  const replaceId = id => excludedId(id) ? replacementModel(id, originalModels.find(m => m.id === id)) : id;
  const models = originalModels.map(m => hasExcludedModel(m) ? {...m, enabled: false, api: false} : {...m});
  const situations = state.situations.map(s => {
    const next = {...s};
    for (const key of ['modelId', 'alternative', 'secondaryModelId']) if (next[key]) next[key] = replaceId(next[key]);
    return next;
  });
  const settings = {...state.settings};
  if (excludedId(settings.apiModel)) settings.apiModel = DEFAULT_API_MODEL;
  if (!['fast', 'balanced', 'quality'].includes(settings.priority)) settings.priority = 'balanced';
  return {...state, policyVersion: POLICY_VERSION, models, situations, settings};
}
