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
 const {data,error}=await client.from("tickets").select("number,status,reserved_until,buyer_id,buyers(name,whatsapp,city)").eq("raffle_id",window.RAFFLE_ID).order("number");if(error){toast(error.message);return}rows=data;renderAdmin();stats()}
function stats(){let sold=rows.filter(x=>x.status==="paid").length,held=rows.filter(x=>x.status==="reserved"&&x.reserved_until&&new Date(x.reserved_until)>new Date()).length;$("#aSold").textContent=sold;$("#aHeld").textContent=held;$("#aAvail").textContent=1000-sold-held;$("#aBonus").textContent=sold>=300?"ACTIVADO":"INACTIVO";$("#alert300").classList.toggle("hidden",sold<300)}
let statusFilter=null;
function renderAdmin(){const q=$("#aSearch").value.trim();let list=rows.filter(x=>!q||x.number===q);if(statusFilter)list=list.filter(x=>x.status===statusFilter);$("#adminTickets").innerHTML=list.slice(0,300).map(t=>`<button class="ticket ${t.status}" data-n="${t.number}">${t.number}</button>`).join("");$("#adminTickets").querySelectorAll("button").forEach(b=>b.onclick=()=>ticketDetail(b.dataset.n))}
window.filterAdmin=()=>renderAdmin();$("#aSearch").oninput=()=>renderAdmin();
function setStatusFilter(status,label){statusFilter=status;$("#statusFilterLabel").textContent=label;$("#statusFilterNote").classList.remove("hidden");renderAdmin()}
$("#filterPaid").onclick=()=>setStatusFilter("paid","Pagados");
$("#filterHeld").onclick=()=>setStatusFilter("reserved","Apartados");
$("#filterAvail").onclick=()=>setStatusFilter("available","Disponibles");
$("#clearStatusFilter").onclick=e=>{e.preventDefault();statusFilter=null;$("#statusFilterNote").classList.add("hidden");renderAdmin()};
async function updateTicketStatus(n,next){
 const {error}=await client.from("tickets").update({status:next,reserved_until:next==="reserved"?new Date(Date.now()+86400000).toISOString():null,buyer_id:next==="available"?null:undefined}).eq("raffle_id",window.RAFFLE_ID).eq("number",n);
 if(error){toast(error.message);return false}
 toast("Estado actualizado");return true;
}
async function ticketDetail(n){
 const t=rows.find(x=>x.number===n);
 const who=t.buyers?`${t.buyers.name} · ${t.buyers.whatsapp} · ${t.buyers.city}`:"Sin comprador";
 if(t.status==="reserved"){
  if(confirm(`Boleto ${n} — APARTADO\n${who}\n\nAceptar = Confirmar como PAGADO\nCancelar = ver otras opciones`)){
   if(await updateTicketStatus(n,"paid")){if(t.buyers)showReceipt(t.buyer_id,t.buyers);await loadAdmin()}
  } else if(confirm(`Boleto ${n} — APARTADO\n${who}\n\n¿Liberar este boleto y dejarlo disponible? (cancela el apartado)`)){
   if(await updateTicketStatus(n,"available"))await loadAdmin();
  }
  return;
 }
 if(t.status==="paid"){
  if(confirm(`Boleto ${n} — PAGADO\n${who}\n\n¿Liberar este boleto y dejarlo disponible? Úsalo solo si fue un error.`)){
   if(await updateTicketStatus(n,"available"))await loadAdmin();
  }
  return;
 }
 if(confirm(`Boleto ${n} está DISPONIBLE.\n\n¿Marcarlo como apartado manualmente (bloqueo administrativo, sin comprador)?`)){
  if(await updateTicketStatus(n,"reserved"))await loadAdmin();
 }
}

let receiptBlob=null,receiptPhone="";
async function showReceipt(buyerId,buyer){
 const {data,error}=await client.from("tickets").select("number").eq("raffle_id",window.RAFFLE_ID).eq("buyer_id",buyerId).eq("status","paid").order("number");
 const nums=error?[]:data.map(x=>x.number);
 const folio="LES-"+buyerId.toString().slice(-8);
 const now=new Date();
 $("#rFolio").textContent="Folio: "+folio;
 $("#rName").textContent=buyer.name;
 $("#rWhats").textContent=buyer.whatsapp;
 $("#rCity").textContent=buyer.city;
 $("#rNums").textContent=nums.join(", ");
 $("#rDate").textContent=now.toLocaleString("es-MX",{dateStyle:"long",timeStyle:"short"});
 $("#rTotal").textContent=formatMXN(calcTotal(nums.length));
 $("#receiptModal").classList.remove("hidden");
 window.__lastReceiptText=`Hola ${buyer.name}, tu pago fue confirmado ✅. Folio: ${folio}. Boletos: ${nums.join(", ")}. Total: ${formatMXN(calcTotal(nums.length))}. ¡Mucha suerte en Lucky Élite Select!`;
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
$("#closeReceipt").onclick=()=>$("#receiptModal").classList.add("hidden");
$("#winnerForm").onsubmit=async e=>{e.preventDefault();let n=$("#winnerNumber").value.padStart(3,"0");if(!/^\d{3}$/.test(n))return toast("Escribe un número de 3 dígitos.");const {error}=await client.from("raffles").update({winner_number:n}).eq("id",window.RAFFLE_ID);if(error)toast(error.message);else $("#winnerMsg").textContent=`Ganador publicado: ${n}`};
$("#logout").onclick=()=>client.auth.signOut();boot();
