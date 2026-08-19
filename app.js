const PRODUCTS = [
  ["E20S","ACCESSORIES"],["E300C","ACCESSORIES"],["E100C","ACCESSORIES"],
  ["T100S","TWS"],["T206","TWS"],["T405","TWS"],["OPENFIT R1","TWS"],["EBC-01","TWS"],["OW7","TWS"],["OPEN EAR A1","TWS"],
  ["SF21 (15W)","SPEAKER"],["S7H","SPEAKER"],["SF7","SPEAKER"],["SV6","SPEAKER"],
  ["P102S","POWERBANK"],["P13","POWERBANK"],
  ["META S1 LITE","SMARTWATCH"],["META S2 ULTRA","SMARTWATCH"],["FW6","SMARTWATCH"],["W16","SMARTWATCH"],
  ["D309BC","CABLE DATA"],["D306M","CABLE DATA"],["D306M REFILL","CABLE DATA"],["D306C","CABLE DATA"],
  ["C308CC 20W","CHARGER"],["C113M","CHARGER"],["C113C","CHARGER"],
  ["CF3","COOLER"]
];

let transactions = JSON.parse(localStorage.getItem("gadgetkita_transactions") || "[]");
let currentLiveRows = [];

const $ = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("id-ID") : "-";
const esc = s => String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const save = () => localStorage.setItem("gadgetkita_transactions", JSON.stringify(transactions));

function init(){
  $("inDate").value=today(); $("outDate").value=today(); $("liveDate").value=today();
  $("todayText").textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  populateProducts();
  populateCategories();
  renderAll();
  bindEvents();
}
function populateProducts(){
  ["inSku","outSku"].forEach(id=>{
    $(id).innerHTML='<option value="">-- Pilih Varian / SKU --</option>'+
      PRODUCTS.map(([sku,cat])=>`<option value="${esc(sku)}">${esc(sku)} — ${esc(cat)}</option>`).join("");
  });
}
function populateCategories(){
  const cats=[...new Set(PRODUCTS.map(p=>p[1]))];
  $("categoryFilter").innerHTML='<option value="">Semua Kategori</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");
}
function getStockRows(until=today()){
  return PRODUCTS.map(([sku,category])=>{
    const tx=transactions.filter(t=>t.sku===sku && t.date<=until);
    const stockIn=tx.filter(t=>t.type==="IN").reduce((a,t)=>a+t.qty,0);
    const stockOut=tx.filter(t=>t.type==="OUT").reduce((a,t)=>a+t.qty,0);
    return {sku,category,stockIn,stockOut,stock:stockIn-stockOut};
  });
}
function table(headers,rows){
  if(!rows.length)return '<div class="empty">Tidak ada data.</div>';
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
function renderDashboard(){
  const rows=getStockRows();
  $("totalSku").textContent=PRODUCTS.length;
  $("totalIn").textContent=transactions.filter(t=>t.type==="IN").reduce((a,t)=>a+t.qty,0);
  $("totalOut").textContent=transactions.filter(t=>t.type==="OUT").reduce((a,t)=>a+t.qty,0);
  $("totalLive").textContent=rows.reduce((a,r)=>a+r.stock,0);
  const sorted=rows.filter(r=>r.stock!==0).sort((a,b)=>b.stock-a.stock).slice(0,12);
  $("dashboardTable").innerHTML=table(["Kategori","Varian / SKU","Stock In","Stock Out","Live Stock"],
    sorted.map(r=>`<tr><td>${esc(r.category)}</td><td><b>${esc(r.sku)}</b></td><td>${r.stockIn}</td><td>${r.stockOut}</td><td class="${r.stock>0?'stock-positive':'stock-zero'}">${r.stock}</td></tr>`));
}
function renderStockIn(){
  const q=$("inSearch").value.toLowerCase();
  const data=transactions.filter(t=>t.type==="IN" && `${t.sku} ${t.note}`.toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  $("stockInTable").innerHTML=table(["Tanggal","SKU","Qty","Keterangan","Aksi"],data.map(t=>`<tr><td>${fmtDate(t.date)}</td><td><b>${esc(t.sku)}</b></td><td>${t.qty}</td><td>${esc(t.note||"-")}</td><td><button class="small-btn delete" onclick="deleteTransaction(${t.id})">Hapus</button></td></tr>`));
}
function renderStockOut(){
  const q=$("outSearch").value.toLowerCase();
  const data=transactions.filter(t=>t.type==="OUT" && `${t.sku} ${t.note}`.toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  $("stockOutTable").innerHTML=table(["Tanggal","SKU","Qty","Keterangan","Aksi"],data.map(t=>`<tr><td>${fmtDate(t.date)}</td><td><b>${esc(t.sku)}</b></td><td>${t.qty}</td><td>${esc(t.note||"-")}</td><td><button class="small-btn delete" onclick="deleteTransaction(${t.id})">Hapus</button></td></tr>`));
}
function renderLiveStock(){
  const until=$("liveDate").value||today(), cat=$("categoryFilter").value, q=$("liveSearch").value.toLowerCase();
  currentLiveRows=getStockRows(until).filter(r=>(!cat||r.category===cat)&&(!q||r.sku.toLowerCase().includes(q)));
  $("liveResultInfo").textContent=`${currentLiveRows.length} SKU • Stock sampai ${fmtDate(until)}`;
  $("liveStockTable").innerHTML=table(["Kategori","Varian / SKU","Total In","Total Out","Live Stock"],
    currentLiveRows.map(r=>`<tr><td>${esc(r.category)}</td><td><b>${esc(r.sku)}</b></td><td>${r.stockIn}</td><td>${r.stockOut}</td><td class="${r.stock>0?'stock-positive':'stock-zero'}">${r.stock}</td></tr>`));
}
function renderHistory(){
  const from=$("historyFrom").value,to=$("historyTo").value,type=$("historyType").value,q=$("historySearch").value.toLowerCase();
  const data=transactions.filter(t=>(!from||t.date>=from)&&(!to||t.date<=to)&&(!type||t.type===type)&&(!q||t.sku.toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  $("historyTable").innerHTML=table(["Tanggal","Jenis","Kategori","SKU","Qty","Keterangan"],data.map(t=>{
    const p=PRODUCTS.find(x=>x[0]===t.sku);
    return `<tr><td>${fmtDate(t.date)}</td><td><span class="badge ${t.type==="IN"?"in":"out"}">${t.type==="IN"?"STOCK IN":"STOCK OUT"}</span></td><td>${esc(p?.[1]||"-")}</td><td><b>${esc(t.sku)}</b></td><td>${t.qty}</td><td>${esc(t.note||"-")}</td></tr>`;
  }));
}
function renderAll(){renderDashboard();renderStockIn();renderStockOut();renderLiveStock();renderHistory();}
function deleteTransaction(id){
  if(!confirm("Hapus transaksi ini?"))return;
  transactions=transactions.filter(t=>t.id!==id); save(); renderAll();
}
function showSection(id){
  document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
  document.querySelectorAll(".nav-btn[data-section]").forEach(b=>b.classList.remove("active"));
  $(id).classList.add("active");
  const btn=document.querySelector(`.nav-btn[data-section="${id}"]`); if(btn)btn.classList.add("active");
  $("pageTitle").textContent={dashboard:"Dashboard",stockIn:"Stock In",stockOut:"Stock Out",liveStock:"Live Stock",history:"Riwayat Transaksi"}[id];
}
function exportLiveCSV(){
  const lines=[["Kategori","SKU","Total In","Total Out","Live Stock"],...currentLiveRows.map(r=>[r.category,r.sku,r.stockIn,r.stockOut,r.stock])];
  const csv=lines.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`live-stock-${$("liveDate").value||today()}.csv`;a.click();URL.revokeObjectURL(a.href);
}
function bindEvents(){
  $("loginForm").addEventListener("submit",e=>{
    e.preventDefault();
    if($("username").value==="Gadgetkita" && $("password").value==="Gasspoll"){
      $("loginPage").classList.add("hidden");$("appPage").classList.remove("hidden");sessionStorage.setItem("gadgetkita_login","1");
    }else $("loginError").textContent="Username atau password salah.";
  });
  $("logoutBtn").addEventListener("click",()=>{sessionStorage.removeItem("gadgetkita_login");location.reload()});
  document.querySelectorAll(".nav-btn[data-section]").forEach(b=>b.addEventListener("click",()=>showSection(b.dataset.section)));
  $("stockInForm").addEventListener("submit",e=>{
    e.preventDefault(); addTransaction("IN",$("inDate").value,$("inSku").value,$("inQty").value,$("inNote").value,e.target);
  });
  $("stockOutForm").addEventListener("submit",e=>{
    e.preventDefault();
    const sku=$("outSku").value, qty=Number($("outQty").value), date=$("outDate").value;
    const available=getStockRows(date).find(r=>r.sku===sku)?.stock||0;
    if(qty>available){alert(`Stock tidak cukup. Live stock ${sku} pada ${fmtDate(date)} = ${available}.`);return;}
    addTransaction("OUT",date,sku,qty,$("outNote").value,e.target);
  });
  ["inSearch","outSearch","liveDate","categoryFilter","liveSearch","historyFrom","historyTo","historyType","historySearch"].forEach(id=>$(id).addEventListener("input",renderAll));
}
function addTransaction(type,date,sku,qty,note,form){
  if(!date||!sku||Number(qty)<=0)return;
  transactions.push({id:Date.now()+Math.floor(Math.random()*1000),type,date,sku,qty:Number(qty),note:note.trim()});
  save();form.reset();$("inDate").value=today();$("outDate").value=today();renderAll();alert(`${type==="IN"?"Stock In":"Stock Out"} berhasil disimpan.`);
}
if(sessionStorage.getItem("gadgetkita_login")==="1"){$("loginPage").classList.add("hidden");$("appPage").classList.remove("hidden")}
document.addEventListener("DOMContentLoaded",init);
