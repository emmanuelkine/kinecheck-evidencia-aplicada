import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const COURSE_SLUG='evidencia-aplicada';
const APPROVE=new Set(['PURCHASE_APPROVED','PURCHASE_COMPLETE','PURCHASE_COMPLETED']);
const REVOKE=new Set(['PURCHASE_REFUNDED','PURCHASE_CANCELED','PURCHASE_CHARGEBACK','SUBSCRIPTION_CANCELLATION']);

serve(async(req)=>{
  if(req.method!=='POST') return new Response('Method not allowed',{status:405});
  const expected=Deno.env.get('HOTMART_HOTTOK');
  const received=req.headers.get('x-hotmart-hottok')||req.headers.get('hottok');
  if(expected && received!==expected) return Response.json({error:'invalid_token'},{status:401});
  const body=await req.json().catch(()=>({}));
  const event=body.event||body.type||'';
  const buyer=body.data?.buyer||body.buyer||{};
  const product=body.data?.product||body.product||{};
  const purchase=body.data?.purchase||body.purchase||{};
  const email=String(buyer.email||'').trim().toLowerCase();
  if(!email) return Response.json({error:'email_missing'},{status:400});
  const active=APPROVE.has(event)?true:REVOKE.has(event)?false:null;
  if(active===null) return Response.json({ok:true,ignored:event});
  const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {error}=await supabase.from('course_access').upsert({email,course_slug:COURSE_SLUG,active,hotmart_product_id:String(product.id||product.ucode||''),transaction_id:String(purchase.transaction||purchase.order_id||''),last_event:event,updated_at:new Date().toISOString()},{onConflict:'email,course_slug'});
  if(error) return Response.json({error:error.message},{status:500});
  return Response.json({ok:true,email,active});
});