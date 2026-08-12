/* KARNAK V11 — one data source, one event bus, dynamic model tabs, dynamic Nour */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const FALLBACK_IMG="assets/nissan-suv.jpg";
const BRANDS=["Nissan","Jetour","Mitsubishi"];
const REMOTE_CFG=window.KARNAK_CONFIG||{};
const REMOTE_ENABLED=Boolean(REMOTE_CFG.remoteEnabled&&REMOTE_CFG.supabaseUrl&&REMOTE_CFG.supabaseAnonKey&&window.supabase?.createClient);
const supa=REMOTE_ENABLED?window.supabase.createClient(REMOTE_CFG.supabaseUrl,REMOTE_CFG.supabaseAnonKey):null;
function remoteTable(name){return ({cars:"cars",leads:"leads",analytics:"analytics",audit:"audit"}[name]||name)}
function normalizeRemote(row){
  if(!row)return row;
  if(row.meta_json!==undefined){row.meta=row.meta_json;delete row.meta_json}
  return row;
}
async function remoteAll(name){
  const {data,error}=await supa.from(remoteTable(name)).select("*");
  if(error)throw error;
  return (data||[]).map(normalizeRemote);
}
async function remotePut(name,v){
  const row={...v};
  if(row.meta!==undefined){row.meta_json=row.meta;delete row.meta}
  const {data,error}=await supa.from(remoteTable(name)).upsert(row).select().single();
  if(error)throw error;
  return normalizeRemote(data);
}
async function remoteRemove(name,id){
  const {error}=await supa.from(remoteTable(name)).delete().eq("id",id);
  if(error)throw error;
}
async function remoteUpload(file,folder){
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const path=`${folder}/${crypto.randomUUID()}-${safe}`;
  const {error}=await supa.storage.from("car-media").upload(path,file,{upsert:false,contentType:file.type});
  if(error)throw error;
  return supa.storage.from("car-media").getPublicUrl(path).data.publicUrl;
}

const BRAND_LABEL={Nissan:"NISSAN",Jetour:"JETOUR",Mitsubishi:"MITSUBISHI"};
const SEED=[
{id:"seed-xtrail",brand:"Nissan",name:"X-Trail e-POWER",year:"2026",img:"assets/xtrail_white.jpg",price:"1,999,990 جنيه",type:"SUV عائلية",engine:"e-POWER",power:"213 حصان",gear:"e-4ORCE / حسب الفئة",tags:["عائلية","مغامرة","Premium"],desc:"SUV عائلية تجمع بين الراحة والمساحة وتجربة قيادة كهربائية مدعومة بمحرك بنزين لتوليد الطاقة.",status:"active",order:1},
{id:"seed-sunny",brand:"Nissan",name:"Sunny",year:"2024",img:"assets/nissan-sunny.jpg",price:"765,000 جنيه",type:"Sedan",engine:"1.5L",power:"108 حصان",gear:"CVT / حسب الفئة",tags:["مدينة","اقتصادية"],desc:"سيدان عملية للاستخدام اليومي داخل المدينة مع مساحة مناسبة وتجهيزات أساسية.",status:"active",order:2},
{id:"seed-sentra",brand:"Nissan",name:"Sentra",year:"2026",img:"assets/nissan-sentra.jpg",price:"1,050,000 جنيه",type:"Sedan",engine:"1.6L",power:"118 حصان",gear:"CVT",tags:["مدينة","راحة"],desc:"سيدان مريحة للاستخدام اليومي والسفر.",status:"active",order:3},
{id:"seed-juke",brand:"Nissan",name:"Juke",year:"2026",img:"assets/nissan-juke.jpg",price:"1,159,999 جنيه",type:"Crossover",engine:"1.0L Turbo",power:"115 حصان",gear:"DCT / حسب الفئة",tags:["مدينة","Premium"],desc:"كروس أوفر مدمجة بتصميم جريء وحجم مناسب للمدينة.",status:"active",order:4},
{id:"seed-x70",brand:"Jetour",name:"X70 FL",year:"2026",img:"assets/jetour-x70.jpg",price:"يُحدد لدى الوكيل",type:"SUV 7 مقاعد",engine:"1.5L Turbo",power:"156 حصان",gear:"DCT / حسب الفئة",tags:["عائلية","راحة"],desc:"SUV عائلية بسبعة مقاعد ومساحة مناسبة للاستخدام العائلي.",status:"active",order:1},
{id:"seed-t2",brand:"Jetour",name:"T2",year:"2026",img:"assets/jetour-t2.png",price:"يُحدد لدى الوكيل",type:"SUV Adventure",engine:"2.0L Turbo",power:"254 حصان",gear:"7DCT",tags:["مغامرة","Premium"],desc:"SUV بطابع مغامر وتجهيزات قوية.",status:"active",order:2},
{id:"seed-eclipse",brand:"Mitsubishi",name:"Eclipse Cross",year:"2026",img:"assets/mitsubishi-eclipse-cross.jpg",price:"1,400,000 جنيه",type:"SUV",engine:"1.5L Turbo",power:"150 حصان",gear:"CVT",tags:["مدينة","Premium"],desc:"SUV متوازنة بين الاستخدام اليومي والتجهيزات والراحة.",status:"active",order:1},
{id:"seed-outlander",brand:"Mitsubishi",name:"Outlander Sport",year:"2026",img:"assets/mitsubishi-outlander.jpg",price:"1,375,000 جنيه",type:"SUV",engine:"2.0L",power:"150 حصان",gear:"CVT",tags:["عائلية","مدينة"],desc:"SUV عملية مع مساحة جيدة ووضعية قيادة مرتفعة.",status:"active",order:2}
];

let db=null, cars=[], leads=[], analytics=[], activeBrand="", activeModel="all", speechEnabled=true, voices=[];
const VISITOR_KEY="karnakVisitorId", SESSION_KEY="karnakSessionId";
const visitorId=localStorage.getItem(VISITOR_KEY)||crypto.randomUUID(); localStorage.setItem(VISITOR_KEY,visitorId);
const sessionId=sessionStorage.getItem(SESSION_KEY)||crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY,sessionId);
let currentCarId=null,currentCarOpenedAt=0;

const Bus={
  events:{},
  on(name,fn){(this.events[name]??=[]).push(fn)},
  emit(name,payload){(this.events[name]||[]).forEach(fn=>fn(payload))}
};

function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
function openDB(){
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open("KarnakSmartShowroom",3);
  r.onupgradeneeded=()=>{
    const d=r.result;
    if(!d.objectStoreNames.contains("cars"))d.createObjectStore("cars",{keyPath:"id"});
    if(!d.objectStoreNames.contains("leads"))d.createObjectStore("leads",{keyPath:"id"});
    if(!d.objectStoreNames.contains("audit"))d.createObjectStore("audit",{keyPath:"id"});
    if(!d.objectStoreNames.contains("settings"))d.createObjectStore("settings",{keyPath:"key"});
    if(!d.objectStoreNames.contains("analytics"))d.createObjectStore("analytics",{keyPath:"id"});
  };
  r.onsuccess=()=>{db=r.result;resolve(db)};r.onerror=()=>reject(r.error);
 })
}
function store(name,mode="readonly"){return db.transaction(name,mode).objectStore(name)}
async function all(name){
 if(REMOTE_ENABLED && ["cars","leads","analytics","audit"].includes(name)) return remoteAll(name);
 return new Promise((res,rej)=>{const r=store(name).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})
}
async function put(name,v){
 if(REMOTE_ENABLED && ["cars","leads","analytics","audit"].includes(name)) return remotePut(name,v);
 return new Promise((res,rej)=>{const r=store(name,"readwrite").put(v);r.onsuccess=()=>res(v);r.onerror=()=>rej(r.error)})
}
async function remove(name,id){
 if(REMOTE_ENABLED && ["cars","leads","analytics","audit"].includes(name)) return remoteRemove(name,id);
 return new Promise((res,rej)=>{const r=store(name,"readwrite").delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})
}
async function audit(action,details){
 await put("audit",{id:crypto.randomUUID(),action,details,created:new Date().toISOString()});
 Bus.emit("data:changed",{action})
}

async function init(){
 await openDB();
 cars=await all("cars");
 if(!cars.length){for(const c of SEED)await put("cars",c);cars=await all("cars")}
 leads=await all("leads");
 analytics=await all("analytics");
 await track("session_start",null,{path:location.pathname+location.hash});
 activeBrand=cars[0]?.brand||"Nissan";
 wire();
 renderAll();
 initSpeech();
}
function wire(){
 $("#search").oninput=()=>{renderTabs();renderCars()};
 $("#brandFilter").onchange=e=>{activeBrand=e.target.value||"";activeModel="all";renderTabs();renderCars()};
 $("#compareBtn").onclick=renderCompare;
 $("#finderBtn").onclick=()=>openNour("عايز عربية مناسبة ليا");
 $("#nourBtn").onclick=()=>openNour();
 $("#closeNour").onclick=closeNour;
 $("#sendNour").onclick=sendNour;
 $("#chatInput").onkeydown=e=>{if(e.key==="Enter")sendNour()};
 $("#speechToggle").onclick=toggleSpeech;
 $("#adminBtn").onclick=adminOpen;
 $("#langBtn").onclick=()=>toast("النسخة الحالية عربية مصرية، والبيانات نفسها جاهزة للإنجليزي.");
 document.querySelectorAll("[data-nour]").forEach(b=>b.onclick=()=>{openNour();$("#chatInput").value=b.dataset.nour;sendNour()});
 Bus.on("data:changed",async()=>{cars=await all("cars");leads=await all("leads");
 analytics=await all("analytics");
 await track("session_start",null,{path:location.pathname+location.hash});renderAll()});
}
function renderAll(){renderBrands();renderBrandFilter();renderTabs();renderCars();fillCompare()}
async function track(type,carId=null,meta={}){
 const e={id:crypto.randomUUID(),type,carId:carId||null,visitorId,sessionId,created:new Date().toISOString(),meta};
 try{await put("analytics",e);analytics.push(e)}catch(err){console.warn("Analytics failed",err)}
}
function countEvents(type,carId){return analytics.filter(e=>e.type===type&&(!carId||e.carId===carId)).length}
function uniqueVisitors(events){return new Set(events.map(e=>e.visitorId).filter(Boolean)).size}
function liked(id){return localStorage.getItem("karnakLike:"+id)==="1"}
async function toggleLike(id){const on=!liked(id);localStorage.setItem("karnakLike:"+id,on?"1":"0");await track(on?"like":"unlike",id);renderCars()}
function visibleCars(){
 const q=($("#search").value||"").trim().toLowerCase(), bf=$("#brandFilter").value;
 return cars.filter(c=>c.status!=="hidden"&&(!bf||c.brand===bf)&&(!q||`${c.brand} ${c.name} ${c.year}`.toLowerCase().includes(q))&&(!activeBrand||c.brand===activeBrand)&& (activeModel==="all"||c.id===activeModel)).sort((a,b)=>(a.order||999)-(b.order||999));
}
function renderBrands(){
 const counts=BRANDS.map(b=>[b,cars.filter(c=>c.brand===b&&c.status!=="hidden").length]);
 $("#brandsGrid").innerHTML=counts.map(([b,n])=>`<button data-brand="${b}"><b>${BRAND_LABEL[b]}</b><span>${n} موديل متاح دلوقتي</span></button>`).join("");
 document.querySelectorAll("#brandsGrid [data-brand]").forEach(b=>b.onclick=()=>{activeBrand=b.dataset.brand;activeModel="all";$("#brandFilter").value=activeBrand;renderTabs();renderCars();location.hash="cars"});
}
function renderBrandFilter(){
 const old=$("#brandFilter").value;
 $("#brandFilter").innerHTML='<option value="">كل العلامات</option>'+BRANDS.map(b=>`<option value="${b}">${BRAND_LABEL[b]}</option>`).join("");
 $("#brandFilter").value=old||"";
}
function renderTabs(){
 const brand=$("#brandFilter").value||activeBrand||"";
 activeBrand=brand;
 const models=cars.filter(c=>c.status!=="hidden"&&(!brand||c.brand===brand)).sort((a,b)=>(a.order||999)-(b.order||999));
 $("#modelTabs").innerHTML=`<button class="all ${activeModel==="all"?"active":""}" data-model="all">كل الموديلات</button>`+models.map(c=>`<button class="${activeModel===c.id?"active":""}" data-model="${c.id}">${esc(c.name)}</button>`).join("");
 document.querySelectorAll("#modelTabs button").forEach(btn=>btn.onclick=()=>{activeModel=btn.dataset.model;renderTabs();renderCars()});
}
function renderCars(){
 const arr=visibleCars();
 $("#carsGrid").innerHTML=arr.length?arr.map(c=>`
 <article class="car-card">
  <div class="car-img"><span class="tag">${esc(BRAND_LABEL[c.brand]||c.brand)}</span><img src="${esc(c.img||FALLBACK_IMG)}" alt="${esc(c.name)}" onerror="this.src='${FALLBACK_IMG}'"></div>
  <div class="car-body"><small>${esc(c.type)} • ${esc(c.year)}</small><h3>${esc(c.name)}</h3>
  <div class="specs">${(c.tags||[]).slice(0,3).map(t=>`<span>${esc(t)}</span>`).join("")}</div>
  <div class="price">${esc(c.price||"السعر لدى الوكيل")}</div>
  <div class="card-actions"><button class="main" data-open="${c.id}">افتح الـShowroom</button><button data-like="${c.id}">${liked(c.id)?"♥ معجب بيها":"♡ إعجاب"}</button><button data-compare="${c.id}">+ قارن</button></div></div>
 </article>`).join(""):`<div class="empty">مفيش عربيات بالمواصفات دي.</div>`;
 document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openCar(b.dataset.open));
 document.querySelectorAll("[data-compare]").forEach(b=>b.onclick=()=>{addCompare(b.dataset.compare)});
 document.querySelectorAll("[data-like]").forEach(b=>b.onclick=async()=>toggleLike(b.dataset.like));
}
async function addCompare(id){$("#cmpA").value=id;await track("compare_add",id);location.hash="compare"}
function fillCompare(){
 const opts=cars.filter(c=>c.status!=="hidden").map(c=>`<option value="${c.id}">${esc(c.brand)} — ${esc(c.name)}</option>`).join("");
 $("#cmpA").innerHTML=opts;$("#cmpB").innerHTML=opts;
 if(cars[1])$("#cmpB").value=cars[1].id;
}
function renderCompare(){
 const a=cars.find(c=>c.id===$("#cmpA").value),b=cars.find(c=>c.id===$("#cmpB").value);if(!a||!b)return;
 const rows=[["السنة",a.year,b.year],["النوع",a.type,b.type],["المحرك",a.engine,b.engine],["القوة",a.power,b.power],["ناقل الحركة",a.gear,b.gear],["السعر",a.price,b.price],["التصنيفات",(a.tags||[]).join("، "),(b.tags||[]).join("، ")]];
 $("#cmpResult").innerHTML=`<div class="compare-table"><table><tr><th>المواصفة</th><th>${esc(a.brand)} ${esc(a.name)}</th><th>${esc(b.brand)} ${esc(b.name)}</th></tr>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</table></div>`;
}
async function openCar(id){
 const c=cars.find(x=>x.id===id);if(!c)return;
 if(currentCarId&&currentCarId!==id) await closeCarAnalytics();
 currentCarId=id;currentCarOpenedAt=Date.now();await track("car_view",id);
 let i=0,down=false,lastX=0;
 $("#modal").innerHTML=`<div class="modal-box"><button class="close" id="closeModal">×</button><div class="detail-grid">
 <div><div class="viewer" id="viewer"><span class="viewer-badge">${c.frames?.length?`360° • ${c.frames.length} صورة`:"360° • غير مرفوع بعد"}</span><img id="viewerImg" src="${esc(c.img||FALLBACK_IMG)}" alt="${esc(c.name)}"></div>
 <div class="viewer-hint">${c.frames?.length?"اسحب يمين أو شمال لتدوير العربية.":"العربية هتفضل بالصورة الرئيسية لحد ما الإدارة ترفع فريمات 360."}</div></div>
 <div class="detail-panel"><span class="eyebrow">${esc(BRAND_LABEL[c.brand]||c.brand)}</span><h2>${esc(c.name)} <small>${esc(c.year||"")}</small></h2><p>${esc(c.desc||"")}</p><div class="detail-price">${esc(c.price||"السعر لدى الوكيل")}</div>
 <div class="detail-specs"><div><small>المحرك</small><b>${esc(c.engine||"—")}</b></div><div><small>القوة</small><b>${esc(c.power||"—")}</b></div><div><small>ناقل الحركة</small><b>${esc(c.gear||"—")}</b></div><div><small>النوع</small><b>${esc(c.type||"—")}</b></div></div>
 <div class="card-actions" style="margin-top:18px"><button class="main" id="leadBtn">احجز تجربة قيادة</button><button id="likeDetail">${liked(c.id)?"♥ معجب بيها":"♡ إعجاب"}</button><button id="shareCar">↗ مشاركة</button><button id="askCar">اسأل نور</button></div></div></div></div>`;
 $("#modal").classList.add("show");$("#closeModal").onclick=closeModal;$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
 $("#leadBtn").onclick=async()=>{await track("lead_click",c.id);openLead(c.id)};
  $("#likeDetail").onclick=async()=>{await toggleLike(c.id);$("#likeDetail").textContent=liked(c.id)?"♥ معجب بيها":"♡ إعجاب"};
  $("#shareCar").onclick=async()=>{
    const url=new URL(location.href);url.hash=`car=${encodeURIComponent(c.id)}`;
    try{
      if(navigator.share){await navigator.share({title:`${c.brand} ${c.name} | KARNAK`,text:`شوف ${c.brand} ${c.name} على معرض الكرنك`,url:url.href});await track("share",c.id)}
      else{await navigator.clipboard.writeText(url.href);await track("share_copy",c.id);toast("اتنسخ لينك العربية، ابعته لأي حد")}
    }catch(_){}
  };
  $("#askCar").onclick=async()=>{await track("nour_car_question",c.id);openNour(`ممكن تشرحي لي ${c.name}`)};
 const viewer=$("#viewer"),img=$("#viewerImg");
 const pos=e=>e.clientX??e.touches?.[0]?.clientX??0;
 const start=e=>{down=true;lastX=pos(e)};
 const move=e=>{if(!down||!c.frames?.length)return;const dx=pos(e)-lastX;if(Math.abs(dx)>=4){i=(i+(dx<0?1:-1)+c.frames.length)%c.frames.length;img.src=c.frames[i];lastX=pos(e)}};
 const end=()=>down=false;
 viewer.onmousedown=start;viewer.ontouchstart=start;viewer.ontouchmove=move;viewer.ontouchend=end;viewer.onmouseleave=end;
}
async function closeCarAnalytics(){if(!currentCarId)return;const seconds=Math.max(0,Math.round((Date.now()-currentCarOpenedAt)/1000));await track("car_dwell",currentCarId,{seconds});currentCarId=null;currentCarOpenedAt=0}
async function closeModal(){await closeCarAnalytics();$("#modal").classList.remove("show")}
function openLead(id){
 const c=cars.find(x=>x.id===id);if(!c)return;
 $("#modal").innerHTML=`<div class="modal-box" style="max-width:560px"><button class="close" id="leadClose">×</button><span class="eyebrow">TEST DRIVE</span><h2>احجز تجربة قيادة</h2><p>سيارة: <b>${esc(c.name)}</b></p><form class="admin-form" id="leadForm"><label>الاسم<input name="name" required></label><label>رقم الهاتف<input name="phone" required></label><label>الفرع<input name="branch"></label><label>التاريخ<input name="date" type="date"></label><label class="full">ملاحظات<textarea name="note"></textarea></label><button class="btn primary full">إرسال الطلب</button></form></div>`;
 $("#modal").classList.add("show");$("#leadClose").onclick=closeModal;
 $("#leadForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);await track("lead_created",id);await put("leads",{id:crypto.randomUUID(),carId:id,name:f.get("name"),phone:f.get("phone"),branch:f.get("branch"),date:f.get("date"),note:f.get("note"),created:new Date().toISOString()});await audit("lead.created",`طلب تجربة لـ ${c.name}`);toast("تم حفظ طلب تجربة القيادة");closeModal()};
}

/* Nour: dynamic, Egyptian, and reads current cars from the same data source */
function openNour(prefill){$("#nour").classList.add("open");if(prefill)setTimeout(()=>{$("#chatInput").value=prefill;sendNour()},180)}
function closeNour(){ $("#nour").classList.remove("open");if("speechSynthesis"in window)speechSynthesis.cancel() }
function normalize(s){return String(s).toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[؟?!.,،]/g," ").replace(/\s+/g," ").trim()}
function findCarInText(x){return cars.find(c=>x.includes(normalize(c.name))||x.includes(normalize(c.brand))||x.includes(normalize(c.name).replace(/[-_]/g," ")))}
function nourReply(q){
 const x=normalize(q), has=(...w)=>w.some(v=>x.includes(normalize(v)));
 const active=cars.filter(c=>c.status!=="hidden");
 if(has("اهلا","السلام عليكم","هاي","hello"))return "أهلاً بيك ❤️ نورت كرنك. أنا نور. قولي بس استخدامك إيه وميزانيتك كام وأنا أختار لك من العربيات الموجودة عندنا فعلًا.";
 if(has("موديلات","العربيات","ايه عندكم","عندكم ايه","الموجود")){const grouped=BRANDS.map(b=>{const a=active.filter(c=>c.brand===b).map(c=>c.name);return a.length?`${BRAND_LABEL[b]}: ${a.join("، ")}`:""}).filter(Boolean);return `طبعًا، دي الموديلات الموجودة دلوقتي: ${grouped.join(" — ")}. لو تقولي استخدامك وميزانيتك أضيّق لك الاختيارات.`}
 const mentioned=findCarInText(x);
 if(mentioned){
   if(has("سعر","بكام","كام","فلوس","ميزانيه","ميزانية"))return `سعر ${mentioned.name} المسجل عندنا حاليًا هو ${mentioned.price||"السعر لدى الوكيل"}. ولو عايز السعر الرسمي المؤكد وقت الشراء، الأفضل نراجعه مع الوكيل قبل ما تعتمد القرار.`;
   if(has("مواصفات","موتور","محرك","قوه","قوة","فتيس","ناقل"))return `${mentioned.name}: المحرك ${mentioned.engine||"غير مضاف"}، القوة ${mentioned.power||"غير مضافة"}، والفتيس ${mentioned.gear||"غير مضاف"}. ولو تحب أفتح لك صفحة العربية وتشوف كل التفاصيل.`;
   return `آه، ${mentioned.name} موجودة عندنا. ${mentioned.desc||""} تحب تعرف سعرها، مواصفاتها، ولا نقارنها بعربية تانية؟`;
 }
 if(has("عائلية","عيله","اسره","اسرة","اطفال")){
   const picks=active.filter(c=>(c.tags||[]).some(t=>normalize(t).includes("عائليه")||normalize(t).includes("عيله"))).slice(0,3);
   return picks.length?`لو العيلة أهم حاجة، أنا هبدأ بـ${picks.map(c=>c.name).join(" و")} لأنهم متسجلين عندنا كاختيارات عائلية. قولي عدد الأفراد واستخدامك مدينة ولا سفر.`:"قولي عدد أفراد الأسرة وأنا أختار لك من الـSUV والسيدان الموجودة عندنا.";
 }
 if(has("مدينة","مدينه","شغل","مشاوير","يومي")){
   const picks=active.filter(c=>(c.tags||[]).some(t=>["مدينه","اقتصاديه"].includes(normalize(t)))).slice(0,3);
   return picks.length?`للمدينة، عندنا ${picks.map(c=>c.name).join(" و")}. لو الميزانية عندك محددة قولي الرقم وأنا أرتبهم لك.`:"تمام، قولي ميزانيتك وأنا أفلتر لك العربيات المناسبة للمدينة.";
 }
 if(has("سفر","طريق","سفرية"))return "تمام، لو السفر داخل في الحسبة، هركز على الراحة والمساحة والثبات. قولي ميزانيتك وعدد أفراد الأسرة.";
 if(has("مغامرة","مغامره","اوف رود","صحرا")){const p=active.find(c=>(c.tags||[]).some(t=>normalize(t).includes("مغامره")));return p?`لو عايز طابع مغامرة، الـ${p.name} داخلة عندنا في الاختيارات دي. تحب أقولك مواصفاتها ولا نقارنها بغيرها؟`:"عندنا اختيارات SUV بطابع مغامر؛ قولي ميزانيتك وأنا أطلعها لك."}
 if(has("سعر","اسعار","بكام","ميزانيه","ميزانية"))return "ولا يهمك. قولي الرقم اللي حاطه في دماغك، حتى لو تقريبي، وأنا هفلتر لك من العربيات اللي موجودة دلوقتي. ومش هفتي في سعر مش موجود عندنا.";
 if(has("قارن","مقارنة","مقارنه","فرق","افضل","أفضل"))return "طبعًا. اكتبلي اسمي العربيتين، وأنا أقارنهم لك في السعر والموتور والقوة والفتيس والاستخدام.";
 if(has("شكرا","شكراً","ميرسي"))return "العفو يا سيدي ❤️ أنا موجودة عشان أخلي الاختيار أسهل.";
 return "تمام، أنا معاكي. احكيلي براحتك: عايز العربية لعيلة ولا مدينة ولا سفر؟ وميزانيتك تقريبًا كام؟";
}
function appendMsg(t,who="bot",speak=false){$("#chat").insertAdjacentHTML("beforeend",`<div class="msg ${who}">${esc(t)}</div>`);$("#chat").scrollTop=$("#chat").scrollHeight;if(speak)speakNour(t)}
async function sendNour(){const q=$("#chatInput").value.trim();if(!q)return;await track("nour_message",null,{q:q.slice(0,120)});$("#chatInput").value="";appendMsg(q,"user");const typing=document.createElement("div");typing.className="msg bot";typing.textContent="نور بتفكر...";$("#chat").appendChild(typing);setTimeout(()=>{typing.remove();appendMsg(nourReply(q),"bot",true)},350)}
function initSpeech(){if(!("speechSynthesis"in window))return;voices=speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=()=>voices=speechSynthesis.getVoices()}
function speakNour(t){if(!speechEnabled||!("speechSynthesis"in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="ar-EG";u.rate=.94;u.pitch=1.08;u.voice=voices.find(v=>/^ar-EG/i.test(v.lang))||voices.find(v=>/^ar/i.test(v.lang))||null;speechSynthesis.speak(u)}
function toggleSpeech(){speechEnabled=!speechEnabled;$("#speechToggle").textContent=speechEnabled?"🔊 نور بتتكلم":"🔇 الصوت مقفول";if(!speechEnabled&&"speechSynthesis"in window)speechSynthesis.cancel()}

/* Admin — all writes go through IndexedDB + audit + one event bus */
async function adminOpen(){
 if(REMOTE_ENABLED){
   const {data}=await supa.auth.getSession();
   data.session?renderAdmin("cars"):renderLogin();
   return;
 }
 sessionStorage.getItem("karnakAdmin")==="1"?renderAdmin("cars"):renderLogin()
}
function renderLogin(){
 $("#modal").innerHTML=`<div class="modal-box login"><span class="eyebrow">KARNAK CONTROL CENTER</span><h2>دخول الإدارة</h2><p>البيانات محلية على الجهاز. أي تعديل من الإدارة ينعكس تلقائيًا على المعرض ونور والمقارنة.</p><form class="admin-form" id="loginForm"><label class="full">اسم المستخدم<input name="u" value="admin" required></label><label class="full">كلمة المرور<input name="p" type="password" required></label><button class="btn primary full">دخول</button></form><small>بيانات الدخول الحالية: admin / 1234</small></div>`;
 $("#modal").classList.add("show");
  $("#loginForm").onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    if(REMOTE_ENABLED){
      const {error}=await supa.auth.signInWithPassword({email:String(f.get("u")).trim(),password:String(f.get("p"))});
      if(error){toast("بيانات الدخول غير صحيحة");return}
      renderAdmin("cars");return;
    }
    if(f.get("u")==="admin"&&f.get("p")==="1234"){sessionStorage.setItem("karnakAdmin","1");renderAdmin("cars")}
    else toast("اسم المستخدم أو كلمة المرور غلط")
  };
}
function renderAdmin(tab="cars"){
 $("#modal").innerHTML=`<div class="modal-box"><button class="close" id="adminClose">×</button><div class="admin-shell">
 <div class="admin-top"><div><span class="eyebrow">KARNAK CONTROL CENTER</span><h2>لوحة الإدارة</h2><p>مصدر بيانات واحد — تعديل واحد يسمع في كل الموقع.</p></div><button class="btn ghost" id="logout">خروج</button></div>
 <div class="admin-stat"><div><b>${cars.length}</b><span>إجمالي الموديلات</span></div><div><b>${BRANDS.length}</b><span>العلامات</span></div><div><b>${cars.filter(c=>c.frames?.length).length}</b><span>موديلات 360 جاهزة</span></div><div><b>${leads.length}</b><span>طلبات تجربة</span></div></div>
 <div class="admin-nav"><button data-tab="cars">السيارات</button><button data-tab="add">+ إضافة موديل</button><button data-tab="leads">طلبات التجربة</button><button data-tab="analytics">تحليل العملاء</button><button data-tab="audit">سجل التغييرات</button></div>
 <div id="adminContent"></div></div></div>`;
 $("#modal").classList.add("show");
 $("#adminClose").onclick=closeModal;
  $("#logout").onclick=async()=>{if(REMOTE_ENABLED)await supa.auth.signOut();sessionStorage.removeItem("karnakAdmin");renderLogin()};
 document.querySelectorAll(".admin-nav [data-tab]").forEach(b=>b.onclick=()=>renderAdmin(b.dataset.tab));
 document.querySelector(`.admin-nav [data-tab="${tab}"]`)?.classList.add("active");
 if(tab==="cars")adminCars();else if(tab==="add")adminForm();else if(tab==="leads")adminLeads();else if(tab==="analytics")adminAnalytics();else adminAudit();
}
function adminCars(){
 $("#adminContent").innerHTML=`<div class="admin-card"><div class="mini-help">هنا كل الموديلات. زر التعديل يغيّر نفس السجل، وزر الإخفاء يوقف ظهوره من المعرض من غير ما يمسحه.</div></div>
 <div style="overflow:auto"><table class="admin-table"><thead><tr><th>الصورة</th><th>العلامة</th><th>الموديل</th><th>السنة</th><th>السعر</th><th>360</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${cars.sort((a,b)=>(a.order||999)-(b.order||999)).map(c=>`<tr><td><img src="${esc(c.img||FALLBACK_IMG)}" onerror="this.src='${FALLBACK_IMG}'"></td><td>${esc(c.brand)}</td><td>${esc(c.name)}</td><td>${esc(c.year||"")}</td><td>${esc(c.price||"—")}</td><td>${c.frames?.length?`<span class="status">${c.frames.length} فريم</span>`:"—"}</td><td>${c.status==="hidden"?"مخفي":"ظاهر"}</td><td><button class="btn ghost" data-edit="${c.id}">تعديل</button> <button class="btn ${c.status==="hidden"?"":"danger"}" data-hide="${c.id}">${c.status==="hidden"?"إظهار":"إخفاء"}</button> <button class="btn danger" data-del="${c.id}">حذف</button></td></tr>`).join("")}</tbody></table></div>`;
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>adminForm(cars.find(c=>c.id===b.dataset.edit)));
 document.querySelectorAll("[data-hide]").forEach(b=>b.onclick=()=>toggleCar(b.dataset.hide));
 document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>deleteCar(b.dataset.del));
}
async function toggleCar(id){const c=cars.find(x=>x.id===id);if(!c)return;c.status=c.status==="hidden"?"active":"hidden";await put("cars",c);await audit("car.visibility",`${c.name} => ${c.status}`);toast(c.status==="hidden"?"تم إخفاء الموديل":"تم إظهار الموديل");renderAdmin("cars")}
async function deleteCar(id){const c=cars.find(x=>x.id===id);if(!c)return;if(!confirm(`هتحذف ${c.name} نهائيًا. متأكد؟`))return;await remove("cars",id);await audit("car.deleted",c.name);toast("تم حذف الموديل");renderAdmin("cars")}
function adminForm(c=null){
 const isEdit=!!c;
 $("#adminContent").innerHTML=`<form id="carForm" class="admin-form">
 <label>العلامة<select name="brand">${BRANDS.map(b=>`<option ${c?.brand===b?"selected":""}>${b}</option>`).join("")}</select></label>
 <label>اسم الموديل<input name="name" value="${esc(c?.name||"")}" placeholder="مثال: X-Trail e-POWER" required></label>
 <label>السنة<input name="year" value="${esc(c?.year||"2026")}" required></label>
 <label>السعر<input name="price" value="${esc(c?.price||"")}" placeholder="مثال: 1,999,990 جنيه" required></label>
 <label>الترتيب داخل تاب الموديلات<input name="order" type="number" min="1" value="${esc(c?.order||1)}"></label>
 <label>الحالة<select name="status"><option value="active" ${c?.status!=="hidden"?"selected":""}>ظاهر</option><option value="hidden" ${c?.status==="hidden"?"selected":""}>مخفي</option></select></label>
 <label>النوع<input name="type" value="${esc(c?.type||"SUV")}"></label><label>المحرك<input name="engine" value="${esc(c?.engine||"")}"></label>
 <label>القوة<input name="power" value="${esc(c?.power||"")}"></label><label>ناقل الحركة<input name="gear" value="${esc(c?.gear||"")}></label>
 <label class="full">الوصف<textarea name="desc">${esc(c?.desc||"")}</textarea></label>
 <label class="full">التصنيفات<input name="tags" value="${esc((c?.tags||[]).join(", "))}" placeholder="عائلية, مدينة, Premium"></label>
 <div class="upload-box full"><b>📷 الصورة الرئيسية</b><p class="mini-help">يفضل صورة العربية بخلفية بيضاء. الصورة الجديدة تستبدل القديمة.</p><input id="mainImage" type="file" accept="image/*"><div id="mainPreview" class="preview-grid"></div></div>
 <div class="upload-box full"><b>🔄 صور 360</b><p class="mini-help">اختار 24–36 صورة لنفس العربية، وأسماء الملفات لو فيها 01،02... هتتحفظ بالترتيب.</p><input id="framesInput" type="file" accept="image/*" multiple><div id="framePreview" class="preview-grid"></div></div>
 <div class="admin-actions full"><button class="btn primary">${isEdit?"حفظ التعديلات":"إضافة الموديل"}</button><button type="button" class="btn ghost" id="cancelForm">رجوع</button></div>
 </form>`;
 if(c?.img)$("#mainPreview").innerHTML=`<img src="${esc(c.img)}">`;
 if(c?.frames?.length)$("#framePreview").innerHTML=c.frames.map(x=>`<img src="${esc(x)}">`).join("");
 $("#mainImage").onchange=()=>previewFiles($("#mainImage").files,$("#mainPreview"),false);
 $("#framesInput").onchange=()=>previewFiles($("#framesInput").files,$("#framePreview"),true);
 $("#cancelForm").onclick=()=>renderAdmin("cars");
 $("#carForm").onsubmit=async e=>{
   e.preventDefault();
   try{
    const f=new FormData(e.target);
    const name=String(f.get("name")).trim();
    if(!name)return toast("اكتب اسم الموديل");
    let img=c?.img||FALLBACK_IMG;if($("#mainImage").files[0])img=await fileData($("#mainImage").files[0]);
    let frames=c?.frames||[];if($("#framesInput").files.length){frames=await Promise.all([...$("#framesInput").files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).slice(0,36).map(fileData))}
    const item={id:c?.id||crypto.randomUUID(),brand:f.get("brand"),name,year:String(f.get("year")||""),price:String(f.get("price")||""),type:String(f.get("type")||""),engine:String(f.get("engine")||""),power:String(f.get("power")||""),gear:String(f.get("gear")||""),desc:String(f.get("desc")||""),tags:String(f.get("tags")||"").split(",").map(s=>s.trim()).filter(Boolean),order:Number(f.get("order")||1),status:f.get("status")||"active",img,frames};
    await put("cars",item);await audit(isEdit?"car.updated":"car.created",item.name);toast(isEdit?"تم حفظ التعديلات، ونور اتحدثت تلقائيًا":"تم إضافة الموديل، وظهر تلقائيًا في المعرض ونور");renderAdmin("cars");
   }catch(err){console.error(err);toast("حصل خطأ في الحفظ. جرّب تاني.");}
 };
}
function previewFiles(files,target,multi){target.innerHTML="";[...files].slice(0,multi?36:1).forEach(file=>{const u=URL.createObjectURL(file);const im=document.createElement("img");im.src=u;im.onload=()=>URL.revokeObjectURL(u);target.appendChild(im)})}
function fileData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(file)})}
async function adminLeads(){
 leads=await all("leads");
 analytics=await all("analytics");
 await track("session_start",null,{path:location.pathname+location.hash});
 $("#adminContent").innerHTML=`<div style="overflow:auto"><table class="admin-table"><thead><tr><th>التاريخ</th><th>الاسم</th><th>الهاتف</th><th>السيارة</th><th>الفرع</th><th>الحالة</th></tr></thead><tbody>${leads.length?leads.slice().sort((a,b)=>b.created.localeCompare(a.created)).map(l=>{const c=cars.find(x=>x.id===l.carId);return `<tr><td>${new Date(l.created).toLocaleString("ar-EG")}</td><td>${esc(l.name)}</td><td>${esc(l.phone)}</td><td>${esc(c?.name||"الموديل اتحذف")}</td><td>${esc(l.branch||"—")}</td><td>${esc(l.status||"جديد")}</td></tr>`}).join(""):"<tr><td colspan=6>مفيش طلبات لسه.</td></tr>"}</tbody></table></div>`;
}
async function adminAnalytics(){
 const active=cars.filter(c=>c.status!=="hidden");
 const views=analytics.filter(e=>e.type==="car_view"), likes=analytics.filter(e=>e.type==="like"), compares=analytics.filter(e=>e.type==="compare_add"), leadsClicks=analytics.filter(e=>e.type==="lead_click");
 const totalVisitors=uniqueVisitors(analytics), totalSessions=new Set(analytics.map(e=>e.sessionId).filter(Boolean)).size;
 const rows=active.map(c=>{const v=views.filter(e=>e.carId===c.id).length,l=likes.filter(e=>e.carId===c.id).length,d=analytics.filter(e=>e.type==="car_dwell"&&e.carId===c.id).reduce((a,e)=>a+(Number(e.meta?.seconds)||0),0),cc=compares.filter(e=>e.carId===c.id).length;return {c,v,l,d,cc}}).sort((a,b)=>b.v-a.v);
 const top=rows[0];
 $("#adminContent").innerHTML=`<div class="analytics-grid"><div class="admin-card"><small>زوار مميزين</small><b>${totalVisitors}</b><span>متصفح/جهاز مختلف</span></div><div class="admin-card"><small>جلسات</small><b>${totalSessions}</b><span>زيارات للمعرض</span></div><div class="admin-card"><small>مشاهدات سيارات</small><b>${views.length}</b><span>فتح تفاصيل الموديلات</span></div><div class="admin-card"><small>إعجابات</small><b>${likes.length}</b><span>اختيارات العملاء</span></div></div>
 <div class="admin-card"><h3>🔥 أكتر موديل عليه اهتمام</h3><p>${top?`${esc(top.c.name)} — ${top.v} مشاهدة، ${top.l} إعجاب، ${top.cc} مقارنة`:'لسه مفيش بيانات كفاية.'}</p></div>
 <div class="admin-card"><h3>تحليل كل موديل</h3><div style="overflow:auto"><table class="admin-table"><thead><tr><th>الموديل</th><th>المشاهدات</th><th>الإعجابات</th><th>المقارنات</th><th>وقت المشاهدة</th><th>طلبات تجربة</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.c.brand)} ${esc(r.c.name)}</td><td>${r.v}</td><td>${r.l}</td><td>${r.cc}</td><td>${r.d} ثانية</td><td>${leads.filter(x=>x.carId===r.c.id).length}</td></tr>`).join('')}</tbody></table></div></div>
 <div class="admin-card"><h3>إيه اللي بنقيسه؟</h3><p class="mini-help">الموقع بيسجل مشاهدة الموديل، الإعجاب، المقارنة، الضغط على حجز تجربة، سؤال نور، ومدة بقاء العميل على صفحة العربية. البيانات دي محلية على الجهاز الحالي في النسخة دي.</p></div>`;
}
async function adminAudit(){
 const a=(await all("audit")).slice().sort((x,y)=>y.created.localeCompare(x.created)).slice(0,100);
 $("#adminContent").innerHTML=`<div class="admin-card"><div class="mini-help">السجل ده بيوضح مين غيّر إيه داخل النسخة المحلية. مفيد جدًا لو أكتر من شخص بيشتغل على نفس الجهاز.</div></div><div style="overflow:auto"><table class="admin-table"><thead><tr><th>التاريخ</th><th>العملية</th><th>التفاصيل</th></tr></thead><tbody>${a.length?a.map(x=>`<tr><td>${new Date(x.created).toLocaleString("ar-EG")}</td><td>${esc(x.action)}</td><td>${esc(x.details)}</td></tr>`).join(""):"<tr><td colspan=3>لسه مفيش تغييرات مسجلة.</td></tr>"}</tbody></table></div>`;
}
init();