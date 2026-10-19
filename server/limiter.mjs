import { HttpError, bounded } from './api.mjs';
export function reserve(previous={}, env={}, now=Date.now()) {
  const day=new Date(now).toISOString().slice(0,10);
  const s={day,count:previous.day===day?previous.count||0:0,recent:(previous.recent||[]).filter(t=>now-t<60000),lease:previous.lease,until:previous.until||0};
  if(s.until>now)throw new HttpError(429,'Jedna AI požiadavka už prebieha. Počkaj na dokončenie.');
  if(s.count>=bounded(env.DAILY_REQUEST_LIMIT,30,1,100))throw new HttpError(429,'Denný počet AI požiadaviek je vyčerpaný. Limit sa obnoví o polnoci UTC.');
  if(s.recent.length>=3)throw new HttpError(429,'Najviac 3 AI požiadavky za minútu. Skús to o chvíľu.');
  const lease=crypto.randomUUID();return {day,count:s.count+1,recent:[...s.recent,now],lease,until:now+110000};
}
export function memoryLimiter(env) {
  let state={};return {acquire:async()=>{state=reserve(state,env);return state.lease;},release:async lease=>{if(state.lease===lease)state.until=0;}};
}
