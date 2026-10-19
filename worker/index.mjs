import { handleApi, HttpError } from '../server/api.mjs';
import { reserve } from '../server/limiter.mjs';

export default {
  async fetch(request,env) {
    const gate=env.USAGE_GATE.get(env.USAGE_GATE.idFromName('personal-workspace'));
    return handleApi(request,env,{
      acquire:async()=>{
        const response=await gate.fetch('https://internal/acquire',{method:'POST'});const json=await response.json();
        if(!response.ok)throw new HttpError(response.status,json.error);return json.lease;
      },
      release:async lease=>{await gate.fetch('https://internal/release',{method:'POST',body:JSON.stringify({lease})});}
    });
  }
};

// One Durable Object serializes quota updates and persists the daily request count.
export class UsageGate {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async fetch(request){
    try{
      const path=new URL(request.url).pathname;
      if(path==='/acquire'){
        const next=await this.ctx.storage.transaction(async tx=>{const next=reserve(await tx.get('quota')||{},this.env);await tx.put('quota',next);return next;});
        return Response.json({lease:next.lease});
      }
      if(path==='/release'){
        const {lease}=await request.json();
        await this.ctx.storage.transaction(async tx=>{const s=await tx.get('quota');if(s?.lease===lease){s.until=0;await tx.put('quota',s);}});return Response.json({ok:true});
      }
      return Response.json({error:'Not found'},{status:404});
    }catch(error){return Response.json({error:error instanceof HttpError?error.message:'Chyba počítadla požiadaviek.'},{status:error instanceof HttpError?error.status:500});}
  }
}
