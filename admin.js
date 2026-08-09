const ready=window.SUPABASE_URL&&!window.SUPABASE_URL.includes("PEGA_AQUI")&&window.SUPABASE_ANON_KEY&&!window.SUPABASE_ANON_KEY.includes("PEGA_AQUI");const client=ready?supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY):null;const $=s=>document.querySelector(s);let rows=[];
const PRICE=250;
function calcTotal(n){const groups=Math.floor(n/6),rem=n%6;return (groups*4+rem)*PRICE}
function formatMXN(n){return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n)}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3000)}
async function boot(){if(!ready){$("#loginMsg").textContent="Primero configura Supabase en config.js.";return}const {data}=await client.auth.getSession();if(data.session)show();client.auth.onAuthStateChange((event,s)=>{if(s){show()}else if(event==="SIGNED_OUT"){location.reload()}})}
$("#loginForm").onsubmit=async e=>{e.preventDefault();if(!client)return;const {error}=await client.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});if(error)$("#loginMsg").textContent=error.message}
async function show(){$("#login").classList.add("hidden");$("#dashboard").classList.remove("hidden");await loadAdmin()}
async function loadAdmin(){const {data,error}=await client.from("tickets").select("number,status,reserved_until,buyer_id,buyers(name,whatsapp,city)").eq("raffle_id",window.RAFFLE_ID).order("number");if(error){toast(error.message);return}rows=data;renderAdmin();stats()}
function stats(){let sold=rows.filter(x=>x.status==="paid").length,held=rows.filter(x=>x.status==="reserved"&&x.reserved_until&&new Date(x.reserved_until)>new Date()).length;$("#aSold").textContent=sold;$("#aHeld").textContent=held;$("#aAvail").textContent=1000-sold-held;$("#aBonus").textContent=sold>=300?"ACTIVADO":"INACTIVO";$("#alert300").classList.toggle("hidden",sold<300)}
function renderAdmin(){const q=$("#aSearch").value.trim();let list=rows.filter(x=>!q||x.number===q);$("#adminTickets").innerHTML=list.slice(0,300).map(t=>`<button class="ticket ${t.status}" data-n="${t.number}">${t.number}</button>`).join("");$("#adminTickets").querySelectorAll("button").forEach(b=>b.onclick=()=>ticketDetail(b.dataset.n))}
window.filterAdmin=()=>renderAdmin();$("#aSearch").oninput=()=>renderAdmin();
async function ticketDetail(n){const t=rows.find(x=>x.number===n);let who=t.buyers?`${t.buyers.name} · ${t.buyers.whatsapp} · ${t.buyers.city}`:"Sin comprador";const next=t.status==="reserved"?"paid":t.status==="paid"?"available":"reserved";if(!confirm(`Boleto ${n}\\nEstado: ${t.status}\\n${who}\\n\\nAceptar = cambiar a ${next}`))return;const {error}=await client.from("tickets").update({status:next,reserved_until:next==="reserved"?new Date(Date.now()+86400000).toISOString():null}).eq("raffle_id",window.RAFFLE_ID).eq("number",n);if(error){toast(error.message);return}toast("Estado actualizado");if(next==="paid"&&t.buyers){showReceipt(t.buyer_id,t.buyers)}await loadAdmin()}

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
}
$("#closeReceipt").onclick=()=>$("#receiptModal").classList.add("hidden");
$("#receiptWhatsapp").onclick=async()=>{
 const btn=$("#receiptWhatsapp");const originalText=btn.textContent;btn.textContent="Generando imagen…";btn.disabled=true;
 try{
  const canvas=await html2canvas($("#receiptContent"),{backgroundColor:"#0d0f13",scale:2});
  const blob=await new Promise(res=>canvas.toBlob(res,"image/png"));
  const num=($("#rWhats").textContent||"").replace(/\D/g,"");
  const file=new File([blob],"comprobante.png",{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:"Comprobante de pago",text:window.__lastReceiptText||""});
  } else {
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;a.download="comprobante.png";document.body.appendChild(a);a.click();a.remove();
   toast("Se descargó la imagen. Adjúntala manualmente en el chat de WhatsApp que se abrirá.");
   window.open(`https://wa.me/${num?("52"+num):""}`,"_blank");
  }
 }catch(err){ if(err.name!=="AbortError") toast("No se pudo generar la imagen: "+err.message); }
 btn.textContent=originalText;btn.disabled=false;
};
$("#winnerForm").onsubmit=async e=>{e.preventDefault();let n=$("#winnerNumber").value.padStart(3,"0");if(!/^\d{3}$/.test(n))return toast("Escribe un número de 3 dígitos.");const {error}=await client.from("raffles").update({winner_number:n}).eq("id",window.RAFFLE_ID);if(error)toast(error.message);else $("#winnerMsg").textContent=`Ganador publicado: ${n}`};
$("#logout").onclick=()=>client.auth.signOut();boot();
