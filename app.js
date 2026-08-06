const sbReady = window.SUPABASE_URL && !window.SUPABASE_URL.includes("PEGA_AQUI") && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("PEGA_AQUI");
const supabaseClient = sbReady ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;
const PRICE=250, TOTAL=1000, BONUS=300, DRAW=new Date("2026-09-06T20:00:00-06:00");
let ticketRows=[], selected=new Set(), page=1, pageSize=100;

const $=s=>document.querySelector(s);
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3500)}
function formatMXN(n){return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n)}
function updateCountdown(){let d=DRAW-new Date(); if(d<0){$("#countdown").textContent="SORTEO REALIZADO";return}let s=Math.floor(d/1000),days=Math.floor(s/86400);s%=86400;let h=Math.floor(s/3600);s%=3600;let m=Math.floor(s/60),sec=s%60;$("#countdown").textContent=`${days}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(sec).padStart(2,"0")}s`}
setInterval(updateCountdown,1000);updateCountdown();

function demoTickets(){return Array.from({length:TOTAL},(_,i)=>({number:String(i).padStart(3,"0"),status:"available",reserved_until:null}))}
async function loadTickets(){
 if(!supabaseClient){ticketRows=demoTickets(); render(); return}
 const {data,error}=await supabaseClient.from("tickets").select("number,status,reserved_until").eq("raffle_id",window.RAFFLE_ID).order("number");
 if(error){toast("No se pudieron cargar los boletos: "+error.message);ticketRows=demoTickets()} else ticketRows=data.map(x=>({...x,status:x.status==="reserved"&&x.reserved_until&&new Date(x.reserved_until)<new Date()?"available":x.status}));
 render();
}
function renderStats(){
 const sold=ticketRows.filter(t=>t.status==="paid").length, held=ticketRows.filter(t=>t.status==="reserved").length, available=TOTAL-sold-held;
 $("#sold").textContent=sold;$("#soldPct").textContent=`(${(sold/TOTAL*100).toFixed(1)}%)`;$("#available").textContent=available;
 const rem=Math.max(0,BONUS-sold);$("#bonusRemaining").textContent=rem;$("#bonusSold").textContent=sold;$("#progressBar").style.width=Math.min(100,sold/BONUS*100)+"%";
 $("#bonusStatus").textContent=sold>=BONUS?"🎉 ¡BONUS ACTIVADO!":"Faltan "+rem+" boletos para activar el BONUS.";
 $("#bonusTitle").textContent=sold>=BONUS?"🎉 BONUS ACTIVADO":"¡Si llegamos a 300 boletos vendidos!";
}
function render(){
 renderStats();
 const q=($("#search")?.value||"").trim();
 let list=ticketRows.filter(t=>!q||t.number===q);
 const start=(page-1)*pageSize,end=start+pageSize;list=list.slice(start,end);
 $("#tickets").innerHTML=list.map(t=>`<button class="ticket ${t.status} ${selected.has(t.number)?"selected":""} ${t.status==="winner"?"winner":""}" data-n="${t.number}" ${t.status!=="available"&&!selected.has(t.number)?"disabled":""}>${t.number}</button>`).join("");
 $("#tickets").querySelectorAll(".ticket.available,.ticket.selected").forEach(b=>b.onclick=()=>toggle(b.dataset.n));
 const pages=Math.max(1,Math.ceil((q?ticketRows.filter(t=>t.number===q).length:TOTAL)/pageSize));
 $("#pagination").innerHTML=Array.from({length:Math.min(pages,10)},(_,i)=>`<button class="${i+1===page?"active":""}" data-p="${i+1}">${i+1}</button>`).join("");
 $("#pagination").querySelectorAll("button").forEach(b=>b.onclick=()=>{page=+b.dataset.p;render()});
 $("#selectedList").innerHTML=selected.size?Array.from(selected).sort().map(n=>`<span class="selected">${n}<button onclick="removeSelected('${n}')">×</button></span>`).join(""):'<span class="muted">Aún no seleccionas boletos.</span>';
 $("#selectionCount").textContent=`(${selected.size})`;$("#total").textContent=formatMXN(selected.size*PRICE);$("#reserveBtn").disabled=!selected.size;
}
window.removeSelected=n=>{selected.delete(n);render()};
function toggle(n){if(selected.has(n))selected.delete(n);else if(selected.size<50)selected.add(n);else toast("Puedes seleccionar hasta 50 boletos por operación.");render()}
$("#searchBtn").onclick=()=>{page=1;render()};$("#search").oninput=()=>{page=1;render()};$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#reserveBtn").onclick=()=>{if(!selected.size)return;$("#modalTickets").textContent=`Boletos: ${Array.from(selected).sort().join(", ")} · Total: ${formatMXN(selected.size*PRICE)}`;$("#modal").classList.remove("hidden")};

$("#reserveForm").onsubmit=async e=>{
 e.preventDefault();const fd=new FormData(e.target), name=fd.get("name").trim(), whatsapp=fd.get("whatsapp").trim(), city=fd.get("city").trim(), nums=Array.from(selected).sort();
 if(!sbReady){ // demo preview
   const text=`Hola, soy ${name}. Quiero participar en Lucky Élite Select. Mis boletos son: ${nums.join(", ")}. Total: ${formatMXN(nums.length*PRICE)}. Ciudad: ${city}.`;
   window.open(`https://wa.me/527225011229?text=${encodeURIComponent(text)}`,"_blank");toast("Modo demostración: conecta Supabase para bloquear boletos de verdad.");return;
 }
 const {data,error}=await supabaseClient.rpc("reserve_tickets",{p_raffle_id:window.RAFFLE_ID,p_numbers:nums,p_name:name,p_whatsapp:whatsapp,p_city:city});
 if(error){toast(error.message);return}
 const text=`Hola, soy ${name}. Quiero participar en Lucky Élite Select. Mis boletos son: ${nums.join(", ")}. Total: ${formatMXN(nums.length*PRICE)}. Ciudad: ${city}.`;
 window.open(`https://wa.me/527225011229?text=${encodeURIComponent(text)}`,"_blank");
 selected.clear();$("#modal").classList.add("hidden");e.target.reset();toast("Boletos apartados por 24 horas. Continúa por WhatsApp.");
 await loadTickets();
};
loadTickets();
