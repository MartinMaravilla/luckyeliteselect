const ready=window.SUPABASE_URL&&!window.SUPABASE_URL.includes("PEGA_AQUI")&&window.SUPABASE_ANON_KEY&&!window.SUPABASE_ANON_KEY.includes("PEGA_AQUI");const client=ready?supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY):null;const $=s=>document.querySelector(s);let rows=[];
const PRICE=250;
function calcTotal(n){const groups=Math.floor(n/6),rem=n%6;return (groups*4+rem)*PRICE}
function formatMXN(n){return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n)}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3000)}
async function boot(){if(!ready){$("#loginMsg").textContent="Primero configura Supabase en config.js.";return}const {data}=await client.auth.getSession();if(data.session)show();client.auth.onAuthStateChange((event,s)=>{if(s){show()}else if(event==="SIGNED_OUT"){location.reload()}})}
$("#loginForm").onsubmit=async e=>{e.preventDefault();if(!client)return;const {error}=await client.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});if(error)$("#loginMsg").textContent=error.message}
async function show(){$("#login").classList.add("hidden");$("#dashboard").classList.remove("hidden");await loadAdmin()}

async function loadAdmin(){
 await client.from("tickets").update({status:"available",buyer_id:null,reserved_until:null}).eq("raffle_id",window.RAFFLE_ID).eq("status","reserved").lt("reserved_until",new Date().toISOString());
 const {data,error}=await client.from("tickets").select("number,status,reserved_until,buyer_id,buyers(name,whatsapp,city)").eq("raffle_id",window.RAFFLE_ID).order("number");
 if(error){toast(error.message);return}
 rows=data;renderAdmin();stats();
}

function stats(){
 let sold=rows.filter(x=>x.status==="paid").length,held=rows.filter(x=>x.status==="reserved").length;
 $("#aSold").textContent=sold;$("#aHeld").textContent=held;$("#aAvail").textContent=1000-sold-held;
 $("#aBonus").textContent=sold>=300?"ACTIVADO":"INACTIVO";$("#alert300").classList.toggle("hidden",sold<300);
}

let statusFilter=null;
function renderAdmin(){
 const q=$("#aSearch").value.trim();
 let list=rows.filter(x=>!q||x.number===q);
 if(statusFilter)list=list.filter(x=>x.status===statusFilter);
 $("#adminTickets").innerHTML=list.slice(0,1000).map(t=>`<button type="button" class="ticket ${t.status}" data-n="${t.number}">${t.number}</button>`).join("");
 $("#adminTickets").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>ticketDetail(b.dataset.n)));
 document.querySelectorAll(".stat-filter").forEach(el=>el.classList.remove("active"));
 if(statusFilter==="paid")$("#filterPaid").classList.add("active");
 if(statusFilter==="reserved")$("#filterHeld").classList.add("active");
 if(statusFilter==="available")$("#filterAvail").classList.add("active");
}
window.filterAdmin=()=>renderAdmin();
$("#aSearch").addEventListener("input",()=>renderAdmin());

function setStatusFilter(status,label){
 statusFilter=(statusFilter===status)?null:status; // clic otra vez = quitar filtro
 if(statusFilter){$("#statusFilterLabel").textContent=label;$("#statusFilterNote").classList.remove("hidden");}
 else{$("#statusFilterNote").classList.add("hidden");}
 renderAdmin();
}
$("#filterPaid").addEventListener("click",()=>setStatusFilter("paid","Pagados"));
$("#filterHeld").addEventListener("click",()=>setStatusFilter("reserved","Apartados"));
$("#filterAvail").addEventListener("click",()=>setStatusFilter("available","Disponibles"));
$("#clearStatusFilter").addEventListener("click",e=>{e.preventDefault();statusFilter=null;$("#statusFilterNote").classList.add("hidden");renderAdmin()});

function openTicketModal(title,buyerLine,nums,buttonsHtml){
 $("#tmTitle").textContent=title;
 $("#tmBuyer").textContent=buyerLine;
 $("#tmNums").innerHTML=nums.map(n=>`<span class="selected">${n}</span>`).join("");
 $("#tmActions").innerHTML=buttonsHtml;
 $("#ticketModal").classList.remove("hidden");
}
function closeTicketModal(){$("#ticketModal").classList.add("hidden")}
$("#closeTicketModal").addEventListener("click",closeTicketModal);

async function updateTicketsStatus(nums,next){
 const {error}=await client.from("tickets").update({status:next,reserved_until:next==="reserved"?new Date(Date.now()+86400000).toISOString():null,buyer_id:next==="available"?null:undefined}).eq("raffle_id",window.RAFFLE_ID).in("number",nums);
 if(error){toast(error.message);return false}
 toast(nums.length>1?`${nums.length} boletos actualizados`:"Boleto actualizado");
 return true;
}

function ticketDetail(n){
 const t=rows.find(x=>x.number===n);
 if(!t)return;

 if(t.status==="available"){
  openTicketModal(`Boleto ${n} — Disponible`,"Sin comprador asociado.",[n],
   `<button type="button" class="primary" id="tmMarkReserved">📌 Marcar como apartado (bloqueo manual)</button>`);
  $("#tmMarkReserved").onclick=async()=>{closeTicketModal();if(await updateTicketsStatus([n],"reserved"))await loadAdmin();};
  return;
 }

 // reserved o paid: agrupar automáticamente con los demás boletos de la misma persona en el mismo estado
 const group=t.buyer_id?rows.filter(x=>x.buyer_id===t.buyer_id&&x.status===t.status).map(x=>x.number).sort():[n];
 const nums=group.length?group:[n];
 const buyer=t.buyers;
 const buyerLine=buyer?`${buyer.name} · ${buyer.whatsapp} · ${buyer.city}`:"Sin datos de comprador";

 if(t.status==="reserved"){
  openTicketModal(nums.length>1?`${nums.length} boletos apartados`:`Boleto ${n} — Apartado`,buyerLine,nums,
   `<button type="button" class="whatsapp" id="tmMarkPaid">✅ Marcar como PAGADO</button>
    <button type="button" class="ghost-btn" id="tmMarkAvail">↩️ Marcar como disponible</button>`);
  $("#tmMarkPaid").onclick=async()=>{
   closeTicketModal();
   if(await updateTicketsStatus(nums,"paid")){await loadAdmin();if(buyer)showReceipt(t.buyer_id,buyer,nums);}
  };
  $("#tmMarkAvail").onclick=async()=>{
   closeTicketModal();
   if(await updateTicketsStatus(nums,"available"))await loadAdmin();
  };
  return;
 }

 if(t.status==="paid"){
  openTicketModal(nums.length>1?`${nums.length} boletos pagados`:`Boleto ${n} — Pagado`,buyerLine,nums,
   `<button type="button" class="primary" id="tmResend">📲 Generar comprobante</button>
    <button type="button" class="ghost-btn" id="tmMarkAvail2">↩️ Marcar como disponible</button>`);
  $("#tmResend").onclick=()=>{closeTicketModal();if(buyer)showReceipt(t.buyer_id,buyer,nums)};
  $("#tmMarkAvail2").onclick=async()=>{
   closeTicketModal();
   if(await updateTicketsStatus(nums,"available"))await loadAdmin();
  };
 }
}

let receiptBlob=null,receiptPhone="";
async function showReceipt(buyerId,buyer,nums){
 const folio="LES-"+buyerId.toString().slice(-8);
 const now=new Date();
 const plural=nums.length>1;
 $("#rFolio").textContent="Folio: "+folio;
 $("#rName").textContent=buyer.name;
 $("#rWhats").textContent=buyer.whatsapp;
 $("#rCity").textContent=buyer.city;
 $("#rNums").textContent=nums.join(", ");
 $("#rDate").textContent=now.toLocaleString("es-MX",{dateStyle:"long",timeStyle:"short"});
 $("#rTotal").textContent=formatMXN(calcTotal(nums.length));
 $("#receiptModal").classList.remove("hidden");
 window.__lastReceiptText=`Hola ${buyer.name}, te envío tu comprobante: tu${plural?"s":""} boleto${plural?"s":""} ${nums.join(", ")} fue${plural?"ron":""} seleccionado${plural?"s":""} y marcado${plural?"s":""} como pagado${plural?"s":""} ✅. Folio: ${folio}. Total: ${formatMXN(calcTotal(nums.length))}. ¡Mucha suerte en Lucky Élite Select!`;
 receiptPhone=(buyer.whatsapp||"").replace(/\D/g,"");
 generateReceiptImage();
}

async function generateReceiptImage(){
 const btn=$("#receiptWhatsapp");
 receiptBlob=null;btn.disabled=true;btn.textContent="Generando comprobante…";
 try{
  const canvas=await html2canvas($("#receiptContent"),{backgroundColor:"#0d0f13",scale:2});
  receiptBlob=await new Promise(res=>canvas.toBlob(res,"image/png"));
  btn.textContent="📲 Enviar por WhatsApp";btn.disabled=false;
 }catch(err){
  btn.textContent="⚠️ Error al generar, reintentar";btn.disabled=false;
  btn.onclick=generateReceiptImage;
  return;
 }
 btn.onclick=sendReceiptWhatsapp;
}
function sendReceiptWhatsapp(){
 if(!receiptBlob){toast("La imagen aún no está lista.");return}
 const url=URL.createObjectURL(receiptBlob);
 const a=document.createElement("a");a.href=url;a.download="comprobante.png";document.body.appendChild(a);a.click();a.remove();
 toast("Imagen descargada. Adjúntala en el chat de WhatsApp que se abrió.");
 window.open(`https://wa.me/${receiptPhone?("52"+receiptPhone):""}?text=${encodeURIComponent(window.__lastReceiptText||"")}`,"_blank");
}
$("#closeReceipt").addEventListener("click",()=>$("#receiptModal").classList.add("hidden"));

$("#winnerForm").onsubmit=async e=>{e.preventDefault();let n=$("#winnerNumber").value.padStart(3,"0");if(!/^\d{3}$/.test(n))return toast("Escribe un número de 3 dígitos.");const {error}=await client.from("raffles").update({winner_number:n}).eq("id",window.RAFFLE_ID);if(error)toast(error.message);else $("#winnerMsg").textContent=`Ganador publicado: ${n}`};
$("#logout").onclick=()=>client.auth.signOut();
boot();
