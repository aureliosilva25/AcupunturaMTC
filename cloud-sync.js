/* Sincronização do MTC Pro. Local-first: grava localmente e envia à nuvem quando autenticado. */
(()=>{
  const $ = s => document.querySelector(s);
  const KEYS = ["clientes","anamneses","evolucoes","progressoCursos"];
  let client=null, session=null, busy=false, pending=Promise.resolve();
  const cfg=window.MTC_CLOUD_CONFIG||{};
  const configured=()=>cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes("COLE_AQUI") && !cfg.supabaseAnonKey.includes("COLE_AQUI");
  const status=(msg,kind="info")=>{const el=$("#cloudStatus");if(el){el.textContent=msg;el.dataset.kind=kind;}};
  const localGet=k=>{try{return JSON.parse(localStorage.getItem("mtc_"+k))??(k==="progressoCursos"?{}:[])}catch{return k==="progressoCursos"?{}:[]}};
  const localSet=(k,v)=>localStorage.setItem("mtc_"+k,JSON.stringify(v));
  const recordId=(x,i)=>String(x?.id??i);
  const merge=(local,remote,type)=>{
    if(type==="progressoCursos") return {...(remote||{}),...(local||{})};
    const map=new Map();
    (remote||[]).forEach((x,i)=>map.set(recordId(x,i),x));
    (local||[]).forEach((x,i)=>map.set(recordId(x,i),x));
    return [...map.values()];
  };
  async function pushAll(){
    if(!client||!session||busy)return; busy=true;
    try{
      for(const type of KEYS){
        const value=localGet(type);
        const rows=type==="progressoCursos"
          ? Object.entries(value).map(([id,payload])=>({user_id:session.user.id,record_type:type,record_id:id,payload,updated_at:new Date().toISOString()}))
          : value.map((payload,i)=>({user_id:session.user.id,record_type:type,record_id:recordId(payload,i),payload,updated_at:new Date().toISOString()}));
        if(rows.length){const {error}=await client.from("mtc_records").upsert(rows,{onConflict:"user_id,record_type,record_id"});if(error)throw error;}
        // Remove da nuvem somente IDs que já não existem localmente. A primeira
        // sincronização sempre faz pull+merge antes de chegar aqui.
        const {data:remoteIds,error:readError}=await client.from("mtc_records").select("record_id").eq("user_id",session.user.id).eq("record_type",type);
        if(readError)throw readError;
        const keep=new Set(rows.map(r=>r.record_id));
        const stale=(remoteIds||[]).map(r=>r.record_id).filter(id=>!keep.has(id));
        if(stale.length){const {error:deleteError}=await client.from("mtc_records").delete().eq("user_id",session.user.id).eq("record_type",type).in("record_id",stale);if(deleteError)throw deleteError;}
      }
      status("Sincronização concluída • "+new Date().toLocaleString("pt-BR"),"ok");
    }catch(e){console.error(e);status("Falha ao sincronizar: "+(e.message||"verifique a conexão e as políticas RLS"),"error");}
    finally{busy=false;}
  }
  async function pullAndMerge(){
    const {data,error}=await client.from("mtc_records").select("record_type,record_id,payload,updated_at").eq("user_id",session.user.id);
    if(error)throw error;
    const remote={clientes:[],anamneses:[],evolucoes:[],progressoCursos:{}};
    (data||[]).forEach(r=>{if(r.record_type==="progressoCursos")remote.progressoCursos[r.record_id]=r.payload;else remote[r.record_type].push(r.payload)});
    // Mescla por ID. Nenhum registro local é apagado durante a primeira sincronização.
    for(const type of KEYS){const merged=merge(localGet(type),remote[type],type);localSet(type,merged);}
    if(typeof window.refreshMTCUI==="function")window.refreshMTCUI();
    await pushAll();
  }
  function wrapLocalWrites(){
    if(typeof DB === "undefined" || DB.__cloudWrapped)return;
    const original=DB.set;
    DB.set=(k,v)=>{original(k,v);if(KEYS.includes(k)&&session){pending=pending.then(()=>pushAll());}};
    DB.__cloudWrapped=true;
  }
  async function init(){
    wrapLocalWrites();
    if(!configured()||!window.supabase){status("Modo local • configure Supabase para ativar a sincronização.","warn");return;}
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
    const {data:{session:s}}=await client.auth.getSession();session=s;
    updateAuthUI();
    client.auth.onAuthStateChange(async(_event,s)=>{session=s;updateAuthUI();if(session){try{await pullAndMerge()}catch(e){status("Erro ao carregar dados da nuvem: "+e.message,"error")}}else status("Sessão encerrada • dados locais preservados.","warn")});
    if(session){try{await pullAndMerge()}catch(e){status("Erro ao sincronizar: "+e.message,"error")}}
    else status("Supabase configurado • entre com seu e-mail para sincronizar.","info");
  }
  function updateAuthUI(){
    const form=$("#cloudLoginForm"), logout=$("#cloudSessionPanel"), email=$("#cloudEmail");
    if(form)form.classList.toggle("hidden",!!session);if(logout)logout.classList.toggle("hidden",!session);
    if(email)email.textContent=session?session.user.email:"";
    if(session)status("Conectado como "+session.user.email+" • sincronização ativa.","ok");
  }
  document.addEventListener("DOMContentLoaded",()=>{
    const form=$("#cloudLoginForm");
    if(form)form.addEventListener("submit",async e=>{e.preventDefault();if(!client)return status("Configure URL e Publishable Key primeiro.","error");const email=$("#cloudLoginEmail").value.trim(),password=$("#cloudLoginPassword").value;status("Entrando…");const {error}=await client.auth.signInWithPassword({email,password});if(error)status("Não foi possível entrar: "+error.message,"error");else{$("#cloudLoginPassword").value="";status("Login realizado. Carregando prontuários…","ok");}});
    const out=$("#cloudLogout");if(out)out.addEventListener("click",async()=>{if(client)await client.auth.signOut();});
    const sync=$("#cloudSyncNow");if(sync)sync.addEventListener("click",()=>session?pushAll():status("Entre na sua conta para sincronizar.","warn"));
    init();
    window.addEventListener("online",()=>{if(session)pushAll()});
  });
  window.MTCCloud={pushAll};
})();
