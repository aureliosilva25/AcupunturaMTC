const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DB={
 get:(k,d=[])=>{try{return JSON.parse(localStorage.getItem("mtc_"+k))??d}catch{return d}},
 set:(k,v)=>localStorage.setItem("mtc_"+k,JSON.stringify(v))
};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
// Snapshot único e não destrutivo dos prontuários antes da atualização da anamnese.
try{
 const backupKey='mtc_backup_pre_anamnese_v2';
 if(!localStorage.getItem(backupKey)){
  const snapshot={criadoEm:new Date().toISOString(),clientes:DB.get('clientes'),anamneses:DB.get('anamneses'),evolucoes:DB.get('evolucoes')};
  localStorage.setItem(backupKey,JSON.stringify(snapshot));
 }
}catch(err){console.warn('Não foi possível criar cópia local preventiva:',err)}
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)};
function go(page){$$(".page").forEach(x=>x.classList.toggle("active",x.id===page));$$("#nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===page));$("#sidebar").classList.remove("open");$("#overlay").classList.remove("show");window.scrollTo(0,0);if(page==="dashboard")stats();if(page==="clientes")renderClientes();if(page==="evolucao")renderEvolucoes()}
$$("#nav button").forEach(b=>b.onclick=()=>go(b.dataset.page));$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
$("#menuBtn").onclick=()=>{$("#sidebar").classList.toggle("open");$("#overlay").classList.toggle("show")};$("#overlay").onclick=()=>{$("#sidebar").classList.remove("open");$("#overlay").classList.remove("show")};

const ANAMNESE=[
{sec:"Queixa principal e história",qs:[
["queixa","Qual é a queixa principal e o que mais incomoda hoje?","Peça ao cliente para descrever com as próprias palavras. Investigue início, duração, frequência, intensidade, fatores de melhora/piora e tratamentos prévios. Evite interpretar antes de ouvir a história completa."],
["inicio","Como começou e como evoluiu?","Diferencie início súbito ou gradual, agudo ou crônico, contínuo ou recorrente. Na MTC, temporalidade ajuda a organizar excesso/deficiência e fatores externos/internos, mas não fecha padrão isoladamente."],
["dor","Há dor? Como ela é?","Pergunte localização, intensidade 0–10, fixa ou móvel, pontada, peso, queimação, distensão, melhora/piora com pressão, movimento, repouso, frio ou calor. Observe também limitação funcional. Características contribuem para diferenciar Frio, Calor, estagnação de Qi/Xue e deficiência."]
]},
{sec:"Frio, calor e transpiração",qs:[
["temperatura","Você sente mais frio ou mais calor? Onde e em quais horários?","Investigue corpo todo versus região, mãos/pés frios, ondas de calor, calafrios, rubor, preferência ambiental e se calor/frio aliviam sintomas. Frio pode participar de padrões de Frio ou deficiência de Yang; calor pode participar de Calor ou calor vazio. Cruze com língua, pulso e demais sinais."],
["suor","Como é sua transpiração?","Pergunte se sua espontaneamente, à noite, pouco/muito, localização, odor e relação com esforço. Suor espontâneo pode contribuir para padrões de deficiência de Qi; noturno pode contribuir para deficiência de Yin, mas outras causas precisam ser consideradas."]
]},
{sec:"Sede, líquidos e alimentação",qs:[
["sede","Sente sede? Prefere bebidas frias, mornas ou quentes?","Observe intensidade, quantidade, pequenos goles versus grandes volumes, boca seca sem desejo de beber e preferência de temperatura. Sede intensa por frio pode acompanhar Calor; preferência por quente pode acompanhar Frio. Não use esse dado isoladamente."],
["apetite","Como está o apetite e como se sente depois de comer?","Investigue fome, falta de apetite, empachamento, distensão, refluxo, náusea, horários, desejos alimentares e piora com determinados alimentos. Observe sinais relacionados ao eixo Baço/Estômago na diferenciação tradicional."],
["digestao","Há gases, refluxo, náusea ou distensão abdominal?","Pergunte horário, relação com alimentação, localização, melhora com pressão/calor e frequência. Isso ajuda a avaliar dinâmica do Qi do aquecedor médio e presença de Umidade/Fleuma segundo a MTC."]
]},
{sec:"Eliminações",qs:[
["fezes","Como funcionam as fezes e o intestino?","Pergunte frequência, consistência, ressecamento, fezes amolecidas, alternância, esforço, urgência, odor, muco/sangue e sensação de evacuação incompleta. Sangue, alteração persistente ou sinais importantes exigem investigação apropriada."],
["urina","Como está a urina?","Investigue frequência, volume, cor, odor, urgência, noctúria, dificuldade, dor e sensação de esvaziamento. Dor, sangue, retenção ou sintomas sistêmicos precisam de avaliação médica."]
]},
{sec:"Sono e energia",qs:[
["sono","Como você dorme e como acorda?","Pergunte horário, demora para dormir, despertares, sonhos, agitação, sudorese noturna, ronco e descanso ao acordar. Na MTC, sono é analisado junto ao Shen, Xue, Yin/Yang e padrões dos Zang-Fu."],
["energia","Como está sua energia durante o dia?","Pergunte em qual horário cai, se esforço piora, se repouso recupera e se há falta de ar, peso corporal ou sonolência. Cansaço não deve ser automaticamente classificado como deficiência de Qi; investigue causas clínicas e hábitos."]
]},
{sec:"Emoções e Shen",qs:[
["emocao","Como tem estado emocionalmente?","Permita resposta aberta. Depois investigue irritabilidade, preocupação, tristeza, medo, ruminação, agitação e acontecimentos recentes. Na MTC, emoções podem ser parte do contexto dos Zang-Fu, mas não devem ser usadas para rotular o cliente nem substituir avaliação de saúde mental."],
["mente","Como estão concentração, memória e sensação de tranquilidade?","Observe fala, atenção e coerência, sem fazer inferências diagnósticas indevidas. Mudanças súbitas de consciência, confusão ou comportamento podem exigir avaliação médica."]
]},
{sec:"Cabeça, sentidos e respiração",qs:[
["cabeca","Há cefaleia, tontura, zumbido ou alterações nos olhos?","Detalhe localização, lateralidade, qualidade, duração e gatilhos. Para cefaleia, sinais neurológicos ou início súbito e intenso são alertas."],
["resp","Como está a respiração, nariz e garganta?","Pergunte tosse, secreção, falta de ar, voz, garganta, alergias e relação com esforço. Falta de ar importante, dor torácica ou cianose requer avaliação urgente."]
]},
{sec:"Músculos e articulações",qs:[
["musculo","Há rigidez, fraqueza ou dor muscular/articular?","Mapeie localização, movimento, edema, calor local, trauma, amplitude e fatores de melhora/piora. Diferencie achados locais de sintomas sistêmicos antes de selecionar técnicas manuais, ventosa ou moxa."]
]},
{sec:"Saúde ginecológica/reprodutiva (quando aplicável)",qs:[
["ciclo","Quando pertinente, como é o ciclo menstrual e os sintomas associados?","Com consentimento, investigue regularidade, duração, volume, cor, coágulos, dor, sintomas antes/depois, gestação possível, menopausa e acompanhamento médico. Sangramento anormal exige avaliação adequada."]
]},
{sec:"Antecedentes e segurança",qs:[
["historico","Quais doenças, cirurgias, lesões ou internações já teve?","Registre diagnósticos conhecidos, eventos cardiovasculares/neurológicos, diabetes, epilepsia, câncer, cirurgias, próteses e alergias. Isso influencia segurança e encaminhamento."],
["medicamentos","Usa medicamentos, anticoagulantes ou outros tratamentos?","Registre nome quando conhecido, finalidade e mudanças recentes. Anticoagulação e condições que alteram coagulação/sensibilidade exigem cautela com técnicas invasivas e ventosa."],
["gestacao","Há gestação confirmada ou possibilidade de gestação?","Quando aplicável e com privacidade. A informação modifica seleção de pontos, regiões e técnicas. Não presuma ausência de risco apenas pela idade ou aparência."],
["dispositivos","Usa marcapasso ou dispositivo eletrônico implantado?","Importante antes de considerar eletroacupuntura. Confirme recomendações de segurança e escopo profissional."]
]},
{sec:"Língua e pulso",qs:[
["lingua","O que você observa na língua?","Registre corpo (pálido, vermelho, arroxeado etc.), formato, edema, marcas dentárias, fissuras, mobilidade, umidade e saburra (cor, espessura, distribuição). Alimentação, bebidas, higiene e medicamentos podem alterar aparência; não interprete um achado isolado."],
["pulso","Como está o pulso nas posições Cun, Guan e Chi?","Compare lados, profundidade, força, velocidade, largura, tensão e regularidade. A leitura depende de técnica e experiência; registre o que percebeu antes de atribuir um padrão."]
]}
];

let etapaAnamnese=0;
const CAMPOS_INTELIGENTES={
 dor:{label:'Aprofundamento da dor',fields:[['dor_presente','Existe dor atualmente?','select',['Sim','Não']],['dor_intensidade','Intensidade da dor (0 a 10)','number'],['dor_local','Localização / irradiação','text'],['dor_tipo','Característica predominante','select',['Pontada','Peso','Queimação','Choque','Latejante','Distensão','Cólica','Outra']],['dor_fatores','O que melhora ou piora?','text']],showWhen:{key:'dor_presente',value:'Sim'}},
 temperatura:{label:'Padrão térmico',fields:[['temp_predominio','Predomínio percebido','select',['Sente mais frio','Sente mais calor','Alterna frio e calor','Sem alteração relevante']],['temp_regiao','Região e horário em que ocorre','text']]},
 suor:{label:'Caracterização do suor',fields:[['suor_tipo','Como ocorre?','select',['Espontâneo durante o dia','Durante esforço','Noturno','Excessivo','Ausente ou muito reduzido','Não percebe alteração']],['suor_local','Localização e horário','text']],showWhen:{key:'suor_tipo',value:'Espontâneo durante o dia|Durante esforço|Noturno|Excessivo|Ausente ou muito reduzido'}},
 sede:{label:'Padrão de sede e líquidos',fields:[['sede_intensidade','Intensidade da sede','select',['Sem sede','Pouca','Moderada','Intensa']],['sede_preferencia','Preferência de temperatura','select',['Gelada','Natural','Morna/quente','Indiferente']]]},
 sono:{label:'Detalhamento do sono',fields:[['sono_padrao','Qual a principal dificuldade?','select',['Demora para dormir','Desperta durante a noite','Acorda muito cedo','Sono excessivo','Sono não reparador','Dorme bem']],['sono_horas','Quantas horas costuma dormir?','number'],['sono_horario','Horário habitual de dormir e acordar','text']]},
 fezes:{label:'Caracterização intestinal',fields:[['fezes_padrao','Padrão predominante','select',['Regular/formada','Ressecada','Amolecida','Diarreia','Alternância entre constipação e diarreia','Muco ou sangue','Outro']],['fezes_frequencia','Frequência / esforço / urgência','text']]},
 urina:{label:'Caracterização urinária',fields:[['urina_padrao','O que percebe?','select',['Sem alteração','Urina escura','Urina muito clara','Aumento da frequência','Noctúria','Dor ou ardor','Sangue','Dificuldade para urinar']],['urina_detalhe','Frequência, volume e outros detalhes','text']]},
 ciclo:{label:'Detalhamento ginecológico (com consentimento)',fields:[['ciclo_status','Situação atual','select',['Ciclo regular','Ciclo irregular','Menopausa','Gestação','Pós-parto','Não se aplica / prefere não informar']],['ciclo_dor','Há cólicas ou dor?','select',['Sim','Não']],['ciclo_fluxo','Fluxo e duração','text']],showWhen:{key:'ciclo_status',value:'Ciclo regular|Ciclo irregular'}},
 medicamentos:{label:'Segurança medicamentosa',fields:[['med_usa','Faz uso de medicamentos?','select',['Sim','Não','Não sabe informar']],['med_lista','Nome, dose se conhecida e finalidade','text']],showWhen:{key:'med_usa',value:'Sim|Não sabe informar'}},
 gestacao:{label:'Segurança reprodutiva',fields:[['gestacao_status','Existe gestação ou possibilidade?','select',['Sim','Possibilidade','Não','Não se aplica / prefere não informar']],['gestacao_semana','Semanas de gestação (se aplicável)','number']],showWhen:{key:'gestacao_status',value:'Sim|Possibilidade'}},
 dispositivos:{label:'Dispositivos implantados',fields:[['disp_status','Possui marcapasso ou dispositivo eletrônico implantado?','select',['Sim','Não','Não sabe informar']],['disp_detalhe','Qual dispositivo?','text']],showWhen:{key:'disp_status',value:'Sim|Não sabe informar'}},
 lingua:{label:'Inspeção estruturada da língua',fields:[['lingua_cor','Cor do corpo da língua','select',['Pálida','Rosada','Vermelha','Vermelho-escura','Arroxeada/violácea','Outra / não avaliada']],['lingua_forma','Formato','select',['Normal','Edemaciada/inchada','Fina','Denteada','Fissurada','Outra / não avaliada']],['lingua_saburra','Saburra','select',['Ausente','Branca fina','Branca espessa','Amarela','Pegajosa','Irregular','Outra / não avaliada']],['lingua_umidade','Umidade','select',['Normal','Seca','Úmida','Muito úmida','Não avaliada']]]},
 pulso:{label:'Pulsologia estruturada',fields:[['pulso_lado','Lado avaliado','select',['Direito','Esquerdo','Ambos','Não avaliado']],['pulso_profundidade','Profundidade','select',['Superficial','Profundo','Intermediário','Não avaliado']],['pulso_forca','Força','select',['Forte','Fraco','Moderado','Não avaliado']],['pulso_qualidade','Qualidade percebida','select',['Lento','Rápido','Tenso','Deslizante','Fino','Irregular','Outra / não avaliado']]]}
};
function smartFieldHTML(f){
 const [key,label,type,opts]=f;const id='smart_'+key;
 if(type==='select')return `<label class="smart-field">${label}<select id="${id}" data-q="${key}"><option value="">Selecione...</option>${opts.map(o=>`<option>${o}</option>`).join('')}</select></label>`;
 return `<label class="smart-field">${label}<input id="${id}" data-q="${key}" type="${type}" ${type==='number'?'min="0"':''}></label>`;
}
function renderSmartFollowup(key){
 const cfg=CAMPOS_INTELIGENTES[key];if(!cfg)return '';
 return `<div class="smart-box"><b>＋ ${cfg.label}</b><div class="smart-grid">${cfg.fields.map(smartFieldHTML).join('')}</div></div>`;
}
function bindConditionalFields(){
 Object.values(CAMPOS_INTELIGENTES).forEach(cfg=>{if(!cfg.showWhen)return;const trigger=$(`[data-q="${cfg.showWhen.key}"]`);const box=trigger?.closest('.question')?.querySelector('.smart-box');if(!trigger||!box)return;const update=()=>{const allowed=cfg.showWhen.value.split('|');box.classList.toggle('hidden',!allowed.includes(trigger.value))};trigger.addEventListener('change',update);update()});
}
function buildAnamnese(){
 const total=ANAMNESE.length;
 const nav=`<div class="ana-progress"><div class="ana-progress-top"><b id="anaEtapaNome">Etapa 1 de ${total}</b><span id="anaPercent">0% preenchido</span></div><div class="ana-track"><span id="anaBar"></span></div><div class="ana-step-nav">${ANAMNESE.map((s,i)=>`<button type="button" data-step="${i}" class="ana-step ${i===0?'active':''}">${i+1}. ${s.sec}</button>`).join('')}</div></div>`;
 const sections=ANAMNESE.map((s,i)=>`<div class="question-section ana-stage ${i===0?'active':''}" data-stage="${i}"><h2>${s.sec}</h2>${s.qs.map(q=>`<div class="question"><div class="q-head"><b>${q[1]}</b><button class="help-btn" type="button" aria-label="Como avaliar">i</button></div><div class="help"><b>Como investigar:</b> ${q[2]}</div>${renderSmartFollowup(q[0])}<textarea data-q="${q[0]}" placeholder="Registre a resposta livre, contexto e observações clínicas..."></textarea></div>`).join('')}<div class="ana-stage-actions"><button type="button" class="secondary ana-prev" ${i===0?'disabled':''}>← Etapa anterior</button><button type="button" class="primary ana-next">${i===total-1?'Revisar preenchimento':'Próxima etapa →'}</button></div></div>`).join('');
 $('#anamneseForm').innerHTML=nav+sections;
 $$('.help-btn').forEach(b=>b.onclick=()=>b.closest('.question').querySelector('.help').classList.toggle('show'));
 $$('[data-step]').forEach(b=>b.onclick=()=>showAnaStage(Number(b.dataset.step)));
 $$('.ana-next').forEach(b=>b.onclick=()=>{if(etapaAnamnese<total-1)showAnaStage(etapaAnamnese+1);else{toast('Etapas concluídas. Confira o cliente e use “Salvar e analisar”.');$('#salvarAna').scrollIntoView({behavior:'smooth',block:'center'})}});
 $$('.ana-prev').forEach(b=>b.onclick=()=>showAnaStage(Math.max(0,etapaAnamnese-1)));
 $('#anamneseForm').addEventListener('input',updateAnaProgress);
 $('#anamneseForm').addEventListener('change',updateAnaProgress);
 bindConditionalFields();updateAnaProgress();
}
function showAnaStage(index){
 etapaAnamnese=Math.max(0,Math.min(index,ANAMNESE.length-1));
 $$('.ana-stage').forEach(x=>x.classList.toggle('active',Number(x.dataset.stage)===etapaAnamnese));
 $$('[data-step]').forEach(x=>x.classList.toggle('active',Number(x.dataset.step)===etapaAnamnese));
 $('#anaEtapaNome').textContent=`Etapa ${etapaAnamnese+1} de ${ANAMNESE.length} • ${ANAMNESE[etapaAnamnese].sec}`;
 $('#anamneseForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function updateAnaProgress(){
 const fields=$$('#anamneseForm [data-q]');const filled=fields.filter(x=>String(x.value||'').trim()).length;const pct=fields.length?Math.round(filled/fields.length*100):0;
 $('#anaPercent').textContent=`${pct}% preenchido (${filled}/${fields.length})`;$('#anaBar').style.width=pct+'%';
}
buildAnamnese();

function clientes(){return DB.get("clientes")}
function refreshSelects(){
 const opts='<option value="">Selecione...</option>'+clientes().map(c=>`<option value="${c.id}">${c.nome}</option>`).join("");
 ["#anaCliente","#analiseCliente","#evoCliente"].forEach(s=>{const old=$(s).value;$(s).innerHTML=opts;$(s).value=old});
}
function renderClientes(f=""){
 const arr=clientes().filter(c=>c.nome.toLowerCase().includes(f.toLowerCase()));
 $("#listaClientes").innerHTML=arr.length?arr.map(c=>`<div class="card"><div class="card-head"><div><b>${c.nome}</b><p>${c.telefone||"Sem telefone"}${c.profissao?" • "+c.profissao:""}</p></div><div class="mini-actions"><button onclick="editCliente('${c.id}')">✎</button><button class="danger" onclick="delCliente('${c.id}')">×</button></div></div></div>`).join(""):'<div class="panel">Nenhum cliente cadastrado.</div>';
 refreshSelects();
}
$("#novoCliente").onclick=()=>{$("#clienteForm").reset();$("#clienteId").value="";$("#formCliente").classList.remove("hidden")};
$("#cancelCliente").onclick=()=>$("#formCliente").classList.add("hidden");
$("#clienteForm").onsubmit=e=>{e.preventDefault();let arr=clientes(),id=$("#clienteId").value||uid();const c={id,nome:$("#clienteNome").value,nascimento:$("#clienteNascimento").value,telefone:$("#clienteTelefone").value,profissao:$("#clienteProfissao").value,obs:$("#clienteObs").value};const i=arr.findIndex(x=>x.id===id);i>=0?arr[i]=c:arr.push(c);DB.set("clientes",arr);$("#formCliente").classList.add("hidden");renderClientes();stats();toast("Cliente salvo")};
window.editCliente=id=>{const c=clientes().find(x=>x.id===id);if(!c)return;$("#clienteId").value=c.id;$("#clienteNome").value=c.nome;$("#clienteNascimento").value=c.nascimento||"";$("#clienteTelefone").value=c.telefone||"";$("#clienteProfissao").value=c.profissao||"";$("#clienteObs").value=c.obs||"";$("#formCliente").classList.remove("hidden");window.scrollTo(0,0)};
window.delCliente=id=>{if(confirm("Excluir este cliente? As anamneses e evoluções não serão apagadas automaticamente.")){DB.set("clientes",clientes().filter(x=>x.id!==id));renderClientes();stats()}};
$("#buscaCliente").oninput=e=>renderClientes(e.target.value);

$("#salvarAna").onclick=()=>{
 const cid=$("#anaCliente").value;if(!cid)return toast("Selecione um cliente");
 const respostas={};$$("[data-q]").forEach(x=>{respostas[x.dataset.q]=x.value.trim()});
 const registro={id:uid(),clienteId:cid,data:new Date().toISOString(),respostas,versaoFormulario:2};
 let arr=DB.get("anamneses");arr.push(registro);DB.set("anamneses",arr);stats();$("#analiseCliente").value=cid;toast("Anamnese salva sem alterar registros anteriores");setTimeout(()=>go("analise"),500)
};
$("#limparAna").onclick=()=>{if(confirm("Limpar as respostas atuais? Os registros já salvos não serão afetados.")){$$("[data-q]").forEach(x=>x.value="");bindConditionalFields();updateAnaProgress();showAnaStage(0)}};

const RULES=[
{nome:"Deficiência de Qi do Baço",keys:["fadiga","cansaço","fezes amolecidas","diarreia","pouco apetite","distensão","peso","língua pálida","marcas dentárias"],principio:"Fortalecer Baço e tonificar Qi conforme confirmação clínica.",pontos:["E36","BP6","VC12"],tecnicas:"Moxa pode ser considerada se houver sinais de Frio/deficiência e ausência de contraindicações. Massagem/shiatsu podem apoiar relaxamento e função digestiva."},
{nome:"Estagnação de Qi do Fígado",keys:["irritabilidade","estresse","distensão","suspiros","tensão","cólica","piora emocional","opressão"],principio:"Mover Qi do Fígado e harmonizar conforme apresentação.",pontos:["F3","IG4","PC6","VB34"],tecnicas:"Shiatsu e massagem terapêutica podem ser associados; aurículo pode considerar pontos coerentes com a avaliação."},
{nome:"Deficiência de Yin",keys:["calor à noite","suor noturno","boca seca","garganta seca","calor nas mãos","calor nos pés","língua vermelha","pouca saburra","insônia"],principio:"Nutrir Yin e avaliar órgão/sistema predominante.",pontos:["R3","BP6","C7"],tecnicas:"Evitar pressupor que moxa seja adequada quando predominam sinais de calor; confirmar padrão."},
{nome:"Deficiência de Yang",keys:["frio","mãos frias","pés frios","cansaço","edema","urina clara","fezes amolecidas","língua pálida"],principio:"Aquecer e tonificar Yang conforme diferenciação e segurança.",pontos:["VC6","E36","R3","B23"],tecnicas:"Moxabustão pode ser considerada quando coerente com o padrão e sem contraindicações."},
{nome:"Estagnação de Xue",keys:["dor fixa","pontada","dor noturna","coágulos","arroxeada","roxa","massa"],principio:"Mobilizar Xue e Qi após avaliar causa, segurança e contraindicações.",pontos:["F3","IG4","BP6"],tecnicas:"Técnicas manuais ou ventosa dependem da condição local, coagulação, pele e avaliação profissional."},
{nome:"Umidade/Fleuma",keys:["peso","pesado","muco","fleuma","edema","náusea","tontura","saburra espessa","pegajosa","opressão"],principio:"Transformar Umidade/Fleuma e fortalecer transporte do Baço conforme padrão.",pontos:["E40","BP9","E36","VC12"],tecnicas:"Dietoterapia tradicional e técnicas complementares somente dentro do escopo e após avaliação."},
{nome:"Vento-Frio exterior",keys:["calafrio","aversão ao frio","rigidez de nuca","coriza clara","sem suor","vento"],principio:"Liberar exterior e dispersar Vento-Frio quando o quadro for compatível.",pontos:["P7","IG4","VB20"],tecnicas:"Moxa pode ser considerada conforme sinais e segurança. Diferenciar de infecção que necessite avaliação médica."},
{nome:"Calor",keys:["muito calor","sede intensa","bebida fria","face vermelha","urina escura","língua vermelha","febre","irritabilidade"],principio:"Identificar origem e natureza do Calor antes de selecionar método.",pontos:["IG11","F3"],tecnicas:"Evitar aquecimento indiscriminado. Febre ou sinais sistêmicos relevantes precisam de avaliação clínica."}
];
function latestAna(cid){return DB.get("anamneses").filter(a=>a.clienteId===cid).sort((a,b)=>b.data.localeCompare(a.data))[0]}
function analyze(cid){
 const a=latestAna(cid);if(!a)return null;
 const text=Object.values(a.respostas||{}).map(v=>Array.isArray(v)?v.join(" "):String(v??"")).join(" ").toLowerCase();
 return RULES.map(r=>{const hits=r.keys.filter(k=>text.includes(k));return {...r,hits,score:hits.length}}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,5)
}
$("#gerarAnalise").onclick=()=>{
 const cid=$("#analiseCliente").value;if(!cid)return toast("Selecione um cliente");const rs=analyze(cid);if(!rs)return $("#resultadoAnalise").innerHTML='<div class="panel">Não há anamnese salva para este cliente.</div>';
 const max=Math.max(...rs.map(x=>x.score),1);
 $("#resultadoAnalise").innerHTML=`<div class="notice"><b>Como interpretar</b><p>Estas são hipóteses de padrões para investigação, geradas por correspondência de achados. “Mais correspondências” não significa diagnóstico confirmado. Confirme por história, exame, língua, pulso, contraindicações e raciocínio clínico.</p></div>`+rs.map(r=>`<div class="analysis-card"><h3>${r.nome}</h3><div class="meter"><span style="width:${Math.min(100,r.score/max*100)}%"></span></div><p><b>Achados reconhecidos:</b> ${r.hits.join(", ")}</p><p><b>Princípio:</b> ${r.principio}</p><p><b>Pontos para considerar:</b> ${r.pontos.join(", ")}</p><p><b>Técnicas complementares:</b> ${r.tecnicas}</p><p><b>Antes de concluir:</b> procure achados que contradigam a hipótese e informações ainda não investigadas.</p></div>`).join("")
};

$("#evoData").value=new Date().toISOString().slice(0,10);
$("#evolucaoForm").onsubmit=e=>{e.preventDefault();const cid=$("#evoCliente").value;if(!cid)return;let arr=DB.get("evolucoes");arr.push({id:uid(),clienteId:cid,data:$("#evoData").value,queixa:$("#evoQueixa").value,dor:$("#evoDor").value,lingua:$("#evoLingua").value,pulso:$("#evoPulso").value,padrao:$("#evoPadrao").value,tecnicas:$("#evoTecnicas").value,resposta:$("#evoResposta").value});DB.set("evolucoes",arr);e.target.reset();$("#evoData").value=new Date().toISOString().slice(0,10);renderEvolucoes();stats();toast("Evolução salva")};
function renderEvolucoes(){
 const cs=clientes();const arr=DB.get("evolucoes").sort((a,b)=>b.data.localeCompare(a.data));
 $("#listaEvolucoes").innerHTML=arr.map(x=>`<div class="card"><div class="card-head"><b>${cs.find(c=>c.id===x.clienteId)?.nome||"Cliente"} • ${x.data}</b><span>${x.dor!==""&&x.dor!=null?"Dor "+x.dor+"/10":""}</span></div><p><b>Estado:</b> ${x.queixa||"—"}</p><p><b>Padrão/princípio:</b> ${x.padrao||"—"}</p><p><b>Técnicas:</b> ${x.tecnicas||"—"}</p><p><b>Resposta/plano:</b> ${x.resposta||"—"}</p></div>`).join("")||'<div class="panel">Nenhuma evolução registrada.</div>'
}

let filtroMer="";
function renderPontos(){
 const q=$("#buscaPonto").value.toLowerCase();
 const arr=PONTOS.filter(p=>(!filtroMer||p.meridiano===filtroMer)&&JSON.stringify(p).toLowerCase().includes(q));
 $("#listaPontos").innerHTML=arr.map(p=>`<article class="point-card"><span class="point-code">${p.codigo}</span><h3>${p.nome}</h3><small>${p.categoria}</small><p><b>Localização:</b> ${p.local}</p><p><b>Funções MTC:</b> ${p.funcoes}</p><div>${p.indicacoes.map(i=>`<span class="tag">${i}</span>`).join("")}</div><p><b>Segurança:</b> ${p.seguranca}</p><div class="visual-box"><b>🖼️ Localização visual</b><p class="course-note">Consulte referências visuais externas e confirme a anatomia antes da aplicação.</p><button class="secondary" onclick="abrirImagemPonto(\'${p.codigo}\',\'${p.nome}\')">Ver imagens externas ↗</button></div></article>`).join("")||'<div class="panel">Nenhum ponto encontrado.</div>'
}
$("#filtroMeridianos").innerHTML='<button class="chip active" data-m="">Todos</button>'+MERIDIANOS.map(m=>`<button class="chip" data-m="${m.sigla}">${m.sigla}</button>`).join("");
$$(".chip").forEach(b=>b.onclick=()=>{$$(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");filtroMer=b.dataset.m;renderPontos()});
$("#buscaPonto").oninput=renderPontos;renderPontos();
$("#listaMeridianos").innerHTML=MERIDIANOS.map(m=>`<div class="meridian-card"><div class="symbol">☯</div><h3>${m.sigla} • ${m.nome}</h3><p>${m.yinYang} • ${m.elemento} • ${m.horario}</p><p>${m.descricao}</p><span class="tag">${m.pontos} pontos tradicionais</span></div>`).join("");
function renderProtocolos(){
 const q=$("#buscaProtocolo").value.toLowerCase();const arr=PROTOCOLOS.filter(p=>JSON.stringify(p).toLowerCase().includes(q));
 $("#listaProtocolos").innerHTML=arr.map(p=>`<div class="card"><h3>${p.titulo}</h3><p><b>Diferenciar:</b> ${p.padroes.join(" • ")}</p><p><b>Raciocínio:</b> ${p.principio}</p><p><b>Pontos de referência:</b> ${p.pontos.join(", ")}</p><p><b>Complementares:</b> ${p.complementares}</p><p><b>⚠ Atenção:</b> ${p.alerta}</p></div>`).join("")
}
$("#buscaProtocolo").oninput=renderProtocolos;renderProtocolos();

function stats(){$("#statClientes").textContent=clientes().length;$("#statAnamneses").textContent=DB.get("anamneses").length;$("#statEvolucoes").textContent=DB.get("evolucoes").length;$("#statPontos").textContent=PONTOS.length}
$("#exportar").onclick=()=>{const data={versao:1,exportado:new Date().toISOString(),clientes:clientes(),anamneses:DB.get("anamneses"),evolucoes:DB.get("evolucoes")};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="backup-mtc-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href)};
$("#importar").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);["clientes","anamneses","evolucoes"].forEach(k=>Array.isArray(d[k])&&DB.set(k,d[k]));refreshSelects();stats();toast("Backup importado")}catch{toast("Arquivo inválido")}};r.readAsText(f)};

let deferredPrompt=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e});
$("#installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else toast("Use 'Adicionar à tela inicial' no menu do navegador")};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
refreshSelects();renderClientes();renderEvolucoes();stats();
function progressoCurso(id){const p=DB.get("progressoCursos",{});return p[id]||[]}
function setAula(id,idx,done){const p=DB.get("progressoCursos",{}),a=new Set(p[id]||[]);done?a.add(idx):a.delete(idx);p[id]=[...a];DB.set("progressoCursos",p);renderCursos($("#buscaCurso")?.value||"")}
function renderCursos(q=""){const arr=CURSOS.filter(c=>JSON.stringify(c).toLowerCase().includes(q.toLowerCase()));$("#listaCursos").innerHTML=arr.map(c=>{const n=progressoCurso(c.id).length,pc=Math.round(n/c.aulas.length*100);return `<div class="course-card" onclick="abrirCurso('${c.id}')"><div class="course-icon">${c.icone}</div><h3>${c.titulo}</h3><span class="tag">${c.nivel}</span><p>${c.desc}</p><div class="progress"><span style="width:${pc}%"></span></div><small>${n}/${c.aulas.length} aulas • ${pc}%</small></div>`}).join("")}
window.abrirCurso=id=>{const c=CURSOS.find(x=>x.id===id),done=progressoCurso(id);$("#listaCursos").classList.add("hidden");$("#cursoDetalhe").classList.remove("hidden");$("#cursoDetalhe").innerHTML=`<button class="secondary" onclick="fecharCurso()">← Voltar</button><div class="hero" style="margin-top:14px"><div><span class="eyebrow">${c.nivel}</span><h1>${c.icone} ${c.titulo}</h1><p>${c.desc}</p></div></div><div class="notice"><b>Conteúdo educacional</b><p>Técnicas invasivas, térmicas ou com risco exigem formação prática, anatomia, biossegurança e atuação dentro das normas aplicáveis.</p></div><h2>Aulas</h2>${c.aulas.map((a,i)=>`<div class="lesson"><div class="lesson-head" onclick="this.parentElement.classList.toggle('open')"><input type="checkbox" ${done.includes(i)?"checked":""} onclick="event.stopPropagation();setAula('${c.id}',${i},this.checked)"><b>${i+1}. ${a[0]}</b><span>⌄</span></div><div class="lesson-body">${a[1]}<p><b>Para fixar:</b> marque a aula ao concluir e anote dúvidas para aprofundamento.</p></div></div>`).join("")}`;window.scrollTo(0,0)}
window.fecharCurso=()=>{$("#cursoDetalhe").classList.add("hidden");$("#listaCursos").classList.remove("hidden");renderCursos($("#buscaCurso").value);window.scrollTo(0,0)}
$("#buscaCurso").oninput=e=>renderCursos(e.target.value);renderCursos();
window.abrirImagemPonto=(codigo,nome)=>{const q=encodeURIComponent(`${codigo} ${nome} acupuncture point location`);window.open(`https://commons.wikimedia.org/w/index.php?search=${q}&title=Special:MediaSearch&type=image`,"_blank","noopener")}
