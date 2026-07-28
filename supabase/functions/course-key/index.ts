import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}});
  const cors={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  try{
    const auth=req.headers.get('Authorization')||'';
    const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient=createClient(Deno.env.get('SUPABASE_URL')!,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user}}=await userClient.auth.getUser();
    if(!user?.email) return new Response(JSON.stringify({message:'Sesión inválida.'}),{status:401,headers:cors});
    const {courseSlug}=await req.json();
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const {data}=await admin.from('course_access').select('active').eq('email',user.email.toLowerCase()).eq('course_slug',courseSlug).maybeSingle();
    if(!data?.active) return new Response(JSON.stringify({message:'No encontramos una compra activa asociada a este correo.'}),{status:403,headers:cors});
    return new Response(JSON.stringify({active:true,courseSlug}),{status:200,headers:cors});
  }catch(error){return new Response(JSON.stringify({message:error.message||'Error de validación.'}),{status:500,headers:cors})}
});