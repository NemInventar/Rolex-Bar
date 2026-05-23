// =============================================
// CONFIG & STATE
// =============================================
let kategorier = [], produkter = [], ordrer = [], tavolina = [];
let erAdmin = false;
let aktivBruger = null; // {id, navn, rolle} — current session user
let _xhiroRel = []; // cached paid orders for current Xhiro period
let _histArkivMod = false;
let _kassaMbyllur = false;
let _pendingTab = null;
let pinInput = '';
let pinMod = 'login'; // 'login' | 'pin-ri' | 'pin-konfirmo'
let pinRiTemp = '';
let bpPinInput = '', bpZgjedhurBrugerId = null;

function getPinKod(){ return localStorage.getItem('rolex_bar_pin')||'88888888'; }

// =============================================
// ADMIN / PIN
// =============================================
function toggleAdmin(){
  if(erAdmin){ logoutAdmin(); }
  else{ hapBrugerPicker(); }
}

function hapLoginModalNormal(){
  pinMod='login';
  pinInput='';
  pinRiTemp='';
  document.getElementById('pin-titulli').textContent='🔐 Login Admin';
  document.getElementById('pin-nentitulli').textContent='Shkruani kodin 8-shifror';
  document.getElementById('pin-gabim').style.display='none';
  rifreshoPinDisplay();
  document.getElementById('login-modal').classList.add('vis');
}

function hapNdryshimPin(){
  pinMod='pin-ri';
  pinInput='';
  pinRiTemp='';
  document.getElementById('pin-titulli').textContent='🔑 Ndrysho PIN';
  document.getElementById('pin-nentitulli').textContent='Shkruani kodin e ri (8 shifra)';
  document.getElementById('pin-gabim').style.display='none';
  rifreshoPinDisplay();
  document.getElementById('login-modal').classList.add('vis');
}

function pinShto(c){
  if(pinInput.length>=8) return;
  pinInput+=c;
  rifreshoPinDisplay();
  if(pinInput.length===8) setTimeout(konfirmoPin,180);
}
function pinFshi(){ pinInput=pinInput.slice(0,-1); rifreshoPinDisplay(); }
function pinReset(){ pinInput=''; rifreshoPinDisplay(); document.getElementById('pin-gabim').style.display='none'; }

function rifreshoPinDisplay(){
  const d=document.getElementById('pin-display');
  d.innerHTML='';
  for(let i=0;i<8;i++){
    const dot=document.createElement('div');
    dot.className='pin-dot'+(i<pinInput.length?' mbushur':'');
    d.appendChild(dot);
  }
}

function tregoPinGabim(msg){
  const el=document.getElementById('pin-gabim');
  el.textContent=msg;
  el.style.display='block';
  pinInput='';
  setTimeout(()=>{rifreshoPinDisplay();},300);
}

function konfirmoPin(){
  if(pinMod==='login'){
    if(pinInput===getPinKod()){
      erAdmin=true;
      aktivBruger={id:'_admin',navn:'Admin',rolle:'admin'};
      mbyllModal('login-modal');
      mbyllModal('bruger-picker-modal');
      visToast('Mirë se vini, Admin! 🔓');
      updateBrugerBadge();
      if(_pendingTab){const t=_pendingTab;_pendingTab=null;skiftTab(t);}
      pinInput='';
    } else {
      tregoPinGabim('❌ Kod i gabuar! Provoni sërish - ma ha karrin.');
    }
    return;
  }
  if(pinMod==='pin-ri'){
    pinRiTemp=pinInput;
    pinInput='';
    pinMod='pin-konfirmo';
    document.getElementById('pin-titulli').textContent='🔑 Konfirmo kodin e ri';
    document.getElementById('pin-nentitulli').textContent='Shkruani sërish kodin e ri';
    document.getElementById('pin-gabim').style.display='none';
    rifreshoPinDisplay();
    return;
  }
  if(pinMod==='pin-konfirmo'){
    if(pinInput===pinRiTemp){
      localStorage.setItem('rolex_bar_pin',pinInput);
      mbyllModal('login-modal');
      visToast('✓ Kodi u ndryshua me sukses!');
      pinInput=''; pinRiTemp='';
    } else {
      tregoPinGabim('❌ Kodet nuk përputhen! Rifilloni.');
      pinRiTemp='';
      pinInput='';
      pinMod='pin-ri';
      document.getElementById('pin-titulli').textContent='🔑 Ndrysho PIN';
      document.getElementById('pin-nentitulli').textContent='Shkruani kodin e ri (8 shifra)';
    }
  }
}

function logoutAdmin(){
  erAdmin=false;
  aktivBruger=null;
  const onAdminPage=['produkter-side','analitika-side'].some(id=>document.getElementById(id)?.classList.contains('aktiv'));
  if(onAdminPage) skiftTab('pos');
  updateBrugerBadge();
  visToast('Dolët nga sistemi');
}

function kerkoPinAdmin(fnPasCeses){
  // Helper: nëse jo admin, hap login modal dhe ekzekuto funksionin pas autentifikimit
  if(erAdmin){ fnPasCeses(); return; }
  hapLoginModalNormal();
  visToast('Keni nevojë për login Admin!','gabim');
}

// ─── BRUGER PICKER ────────────────────────────────
function hapBrugerPicker(){
  const aktive=brugere.filter(b=>b.aktiv);
  if(!aktive.length){hapLoginModalNormal();return}
  const grid=document.getElementById('bp-brugere-grid');
  grid.innerHTML=aktive.map((b,i)=>{
    const init=b.navn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const clr=BRUGER_COLORS[i%BRUGER_COLORS.length];
    return `<button class="bp-bruger-btn" onclick="bpZgjedhBrugerin('${b.id}')">
      <div class="bp-avatar" style="background:${clr}">${init}</div>
      <div class="bp-emri">${b.navn}</div>
      <div class="bp-rol">${b.rolle==='admin'?'Admin':'Kamerier'}</div>
    </button>`;
  }).join('');
  const wrap=document.getElementById('bp-logout-wrap');
  if(wrap){
    if(aktivBruger||erAdmin){
      const name=aktivBruger?.navn||'Admin';
      document.getElementById('bp-logout-btn').textContent=`↩ Dil (${name})`;
      wrap.style.display='block';
    } else {
      wrap.style.display='none';
    }
  }
  bpVisLista();
  document.getElementById('bruger-picker-modal').classList.add('vis');
}
function bpZgjedhBrugerin(id){
  bpZgjedhurBrugerId=id;
  bpPinInput='';
  const b=brugere.find(x=>x.id===id);
  if(!b) return;
  const aktive=brugere.filter(x=>x.aktiv);
  const idx=aktive.findIndex(x=>x.id===id);
  const clr=BRUGER_COLORS[idx>=0?idx%BRUGER_COLORS.length:0];
  const init=b.navn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('bp-pin-avatar').style.background=clr;
  document.getElementById('bp-pin-avatar').textContent=init;
  document.getElementById('bp-pin-emri').textContent=b.navn;
  document.getElementById('bp-pin-roli').textContent=b.rolle==='admin'?'Administrator':'Kamerier';
  document.getElementById('bp-pin-gabim').style.display='none';
  bpRifreshoPinDisplay();
  document.getElementById('bp-lista').style.display='none';
  document.getElementById('bp-pin').style.display='block';
  document.getElementById('bp-titulli').textContent='🔐 PIN';
}
function bpPinShto(c){
  if(bpPinInput.length>=4) return;
  bpPinInput+=c;
  bpRifreshoPinDisplay();
  if(bpPinInput.length===4) setTimeout(bpKonfirmoPin,180);
}
function bpPinFshi(){bpPinInput=bpPinInput.slice(0,-1);bpRifreshoPinDisplay()}
function bpRifreshoPinDisplay(){
  const d=document.getElementById('bp-pin-dots');
  if(!d) return;
  d.innerHTML='';
  for(let i=0;i<4;i++){const dot=document.createElement('div');dot.className='pin-dot'+(i<bpPinInput.length?' mbushur':'');d.appendChild(dot)}
}
async function bpKonfirmoPin(){
  const b=brugere.find(x=>x.id===bpZgjedhurBrugerId);
  if(!b) return;
  const hash=await hashPin(bpPinInput);
  if(hash===b.pin_hash){
    aktivBruger={id:b.id,navn:b.navn,rolle:b.rolle};
    erAdmin=(b.rolle==='admin');
    mbyllModal('bruger-picker-modal');
    updateBrugerBadge();
    visToast(`Mirë se vini, ${b.navn}! ✓`);
    if(typeof _resetInactivity==='function') _resetInactivity();
    bpPinInput='';bpZgjedhurBrugerId=null;
  } else {
    const g=document.getElementById('bp-pin-gabim');
    g.textContent='❌ PIN i gabuar!';g.style.display='block';
    bpPinInput='';bpRifreshoPinDisplay();
  }
}
function bpVisLista(){
  document.getElementById('bp-lista').style.display='block';
  document.getElementById('bp-pin').style.display='none';
  document.getElementById('bp-titulli').textContent='👥 Kush jeni?';
  bpPinInput='';bpZgjedhurBrugerId=null;
}
function logoutStaff(){
  aktivBruger=null;erAdmin=false;
  mbyllModal('bruger-picker-modal');
  if(document.getElementById('produkter-side').classList.contains('aktiv')) skiftTab('pos');
  updateBrugerBadge();
  visToast('Dolët nga sistemi');
}

function updateBrugerBadge(){
  const badge=document.getElementById('bruger-badge');
  const btn=document.getElementById('admin-btn');
  const analTab=document.getElementById('tab-analitika');
  if(!badge) return;
  if(aktivBruger){
    const idx=brugere.findIndex(b=>b.id===aktivBruger.id);
    const color=idx>=0?BRUGER_COLORS[idx%BRUGER_COLORS.length]:'#5C3317';
    document.getElementById('bb-avatar').style.background=color;
    document.getElementById('bb-avatar').textContent=aktivBruger.navn.charAt(0).toUpperCase();
    document.getElementById('bb-navn').textContent=aktivBruger.navn;
    document.getElementById('bb-rol').textContent=erAdmin?'Admin':'Personel';
    badge.style.display='flex';
    if(btn) btn.style.display='none';
    if(analTab) analTab.style.display=erAdmin?'':'none';
  } else {
    badge.style.display='none';
    if(btn){btn.style.display='';btn.textContent='🔒 Hyr';btn.classList.remove('aktiv')}
    if(analTab) analTab.style.display='none';
  }
}

function logoutBruger(){
  if(erAdmin) logoutAdmin();
  else logoutStaff();
}

function toggleArkivMod(el){
  if(!erAdmin){hapLoginModalNormal();visToast('🔒 Keni nevojë për login Admin!','gabim');return}
  _histArkivMod=!_histArkivMod;
  el.textContent=_histArkivMod?'📋 Historiku':'📦 Arkivi';
  el.classList.toggle('arkiv-aktiv',_histArkivMod);
  const btn=document.getElementById('hist-arkivo-listen-btn');
  if(btn) btn.style.display=_histArkivMod?'none':'';
  opdaterHistorik();
}

async function arkivoOrdren(id){
  if(!erAdmin){hapLoginModalNormal();visToast('🔒 Keni nevojë për login Admin!','gabim');return}
  await sb.from('ordrer').update({status:'arkiveret'}).eq('id',id);
  opdaterHistorik();
  visToast('Porosi u arkivua ✓');
}

async function arkivoListen(){
  if(!erAdmin){hapLoginModalNormal();visToast('🔒 Keni nevojë për login Admin!','gabim');return}
  const fra=document.getElementById('hist-fra').value,til=document.getElementById('hist-til').value;
  const bet=document.getElementById('hist-betaling').value,stat=document.getElementById('hist-status').value;
  const msg=fra||til?`Arkivo të gjitha porositë${fra?' nga '+fra:''}${til?' deri '+til:''}?`:'Arkivo të gjitha porositë e shfaqura?';
  if(!confirm(msg)) return;
  let q=sb.from('ordrer').update({status:'arkiveret'}).eq('restaurant_id',RESTAURANT_ID).in('status',['betalt','afvist']);
  if(fra) q=q.gte('oprettet',_localIso(fra,'00:00:00'));
  if(til) q=q.lte('oprettet',_localIso(til,'23:59:59'));
  if(bet) q=q.eq('betaling',bet);
  if(stat) q=q.eq('status',stat);
  const {error}=await q;
  if(error){visToast('Gabim gjatë arkivimit','gabim');return}
  opdaterHistorik();
  visToast('Lista u arkivua ✓');
}

function fshiNjeOrdre(id){
  if(!erAdmin){ hapLoginModalNormal(); visToast('🔒 Keni nevojë për login Admin!','gabim'); return; }
  const o=ordrer.find(x=>x.id===id);
  if(!o) return;
  const koha=new Date(o.oprettet).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});
  if(!confirm(`Fshi porosinë #${o.ordre_nummer} (${koha}, ${euro(o.total)})?`)) return;
  ordrer=ordrer.filter(x=>x.id!==id);
  gemData();
  opdaterHistorik();
  visToast(`Porosi #${o.ordre_nummer} u fshi ✓`);
}
let kurv = [], aktivKategori = 'alle';
let brugere = [];
let posPikZone = null;
let aktivPeriode = 'dag', periodeChart = null;
let keshAmount = '', keshOrdreId = null, keshGjithaBord = null;
let celebrationOrdreId = null;

// =============================================
// SUPABASE
// =============================================
const SUPABASE_URL = 'https://tsaxlluggcxdrvapaypp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYXhsbHVnZ2N4ZHJ2YXBheXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTU0MTAsImV4cCI6MjA5MzkzMTQxMH0.bIXF0dXrWSgtpYCpNzZz5Rh5BB_0R37dzNp_8jgFZGM';
const RESTAURANT_ID = 'bed2841c-eb79-47de-b754-3bca27d35050';
let sb; // assigned after DOM ready

// =============================================
// DATA
// =============================================
async function initMenuData() {
  const { data } = await sb.from('kategorier').select('id').eq('restaurant_id', RESTAURANT_ID).limit(1);
  if (data && data.length > 0) return; // already initialized

  kategorier = [
    {id:'k1',navn:'🍕 Pizza',sort:1},{id:'k2',navn:'🥩 Mishërat',sort:2},
    {id:'k3',navn:'🔥 Qebapa',sort:3},{id:'k4',navn:'🍔 Burgera & Döner',sort:4},
    {id:'k5',navn:'🥣 Supa & Sallata',sort:5},{id:'k6',navn:'🍰 Desert',sort:6},
    {id:'k7',navn:'🥤 Pije',sort:7},{id:'k8',navn:'🍺 Birra',sort:8},
  ];
  produkter = [
    {id:'p102',navn:'Picë Rolex Bar (M)',kategori_id:'k1',pris:5.00,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p103',navn:'Picë Rolex Bar (L)',kategori_id:'k1',pris:6.00,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
    {id:'p105',navn:'Margarita (M)',kategori_id:'k1',pris:4.00,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p106',navn:'Margarita (L)',kategori_id:'k1',pris:4.00,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
    {id:'p108',navn:'Pershute Fungio (M)',kategori_id:'k1',pris:4.00,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p109',navn:'Pershute Fungio (L)',kategori_id:'k1',pris:5.00,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
    {id:'p111',navn:'Fungie (M)',kategori_id:'k1',pris:4.00,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p112',navn:'Fungie (L)',kategori_id:'k1',pris:5.00,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
    {id:'p114',navn:'Sallami (M)',kategori_id:'k1',pris:4.00,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p115',navn:'Sallami (L)',kategori_id:'k1',pris:5.00,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
    {id:'p117',navn:'Tuna (M)',kategori_id:'k1',pris:4.50,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p118',navn:'Tuna (L)',kategori_id:'k1',pris:5.50,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
    {id:'p120',navn:'Vegetariane (M)',kategori_id:'k1',pris:5.00,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p121',navn:'Vegetariane (L)',kategori_id:'k1',pris:6.00,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
    {id:'p123',navn:'Domate Mocarella (M)',kategori_id:'k1',pris:5.00,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p124',navn:'Domate Mocarella (L)',kategori_id:'k1',pris:6.00,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
    {id:'p126',navn:'4 Djatherat (M)',kategori_id:'k1',pris:5.00,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p127',navn:'4 Djatherat (L)',kategori_id:'k1',pris:6.00,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
    {id:'p129',navn:'4 Stine (M)',kategori_id:'k1',pris:5.00,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p130',navn:'4 Stine (L)',kategori_id:'k1',pris:6.00,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
    {id:'p201',navn:'Kombinim i mishërave',kategori_id:'k2',pris:13.50,ikon:'🥩',beskrivelse:'',udsolgt:false},
    {id:'p202',navn:'Mish Viqi',kategori_id:'k2',pris:12.50,ikon:'🥩',beskrivelse:'',udsolgt:false},
    {id:'p203',navn:'Kotlet Viqi',kategori_id:'k2',pris:13.00,ikon:'🥩',beskrivelse:'',udsolgt:false},
    {id:'p204',navn:'File Pule',kategori_id:'k2',pris:5.50,ikon:'🍗',beskrivelse:'',udsolgt:false},
    {id:'p205',navn:'Mish Pruze',kategori_id:'k2',pris:13.00,ikon:'🥩',beskrivelse:'',udsolgt:false},
    {id:'p206',navn:'Biftek',kategori_id:'k2',pris:15.00,ikon:'🥩',beskrivelse:'',udsolgt:false},
    {id:'p207',navn:'Ramstek',kategori_id:'k2',pris:13.50,ikon:'🥩',beskrivelse:'',udsolgt:false},
    {id:'p301',navn:'Qofte Shtëpie (5 cope)',kategori_id:'k3',pris:6.00,ikon:'🔥',beskrivelse:'',udsolgt:false},
    {id:'p302',navn:'Qofte e Vogël (5 cope)',kategori_id:'k3',pris:3.00,ikon:'🔥',beskrivelse:'',udsolgt:false},
    {id:'p303',navn:'Qebapa (5 cope)',kategori_id:'k3',pris:3.00,ikon:'🔥',beskrivelse:'',udsolgt:false},
    {id:'p304',navn:'Qebapa (10 cope)',kategori_id:'k3',pris:6.00,ikon:'🔥',beskrivelse:'',udsolgt:false},
    {id:'p305',navn:'Pleskavice',kategori_id:'k3',pris:4.50,ikon:'🔥',beskrivelse:'',udsolgt:false},
    {id:'p306',navn:'Virshlle (5 cope)',kategori_id:'k3',pris:4.50,ikon:'🌭',beskrivelse:'',udsolgt:false},
    {id:'p307',navn:'Sumsuk (2 cope)',kategori_id:'k3',pris:3.00,ikon:'🔥',beskrivelse:'',udsolgt:false},
    {id:'p308',navn:'Bombice',kategori_id:'k3',pris:5.00,ikon:'🔥',beskrivelse:'',udsolgt:false},
    {id:'p401',navn:'Hamburger Classic',kategori_id:'k4',pris:3.00,ikon:'🍔',beskrivelse:'',udsolgt:false},
    {id:'p402',navn:'Chicken Burger',kategori_id:'k4',pris:3.00,ikon:'🍔',beskrivelse:'',udsolgt:false},
    {id:'p403',navn:'Cheese Burger',kategori_id:'k4',pris:3.50,ikon:'🍔',beskrivelse:'',udsolgt:false},
    {id:'p404',navn:'Egg Burger',kategori_id:'k4',pris:3.50,ikon:'🍔',beskrivelse:'',udsolgt:false},
    {id:'p405',navn:'Rolex Bar Burger',kategori_id:'k4',pris:4.50,ikon:'🍔',beskrivelse:'Signatur burger',udsolgt:false},
    {id:'p406',navn:'Sandwich Pule',kategori_id:'k4',pris:3.50,ikon:'🥪',beskrivelse:'',udsolgt:false},
    {id:'p407',navn:'Sandwich Përshuté',kategori_id:'k4',pris:3.50,ikon:'🥪',beskrivelse:'',udsolgt:false},
    {id:'p408',navn:'Sandwich Tuna',kategori_id:'k4',pris:3.50,ikon:'🥪',beskrivelse:'',udsolgt:false},
    {id:'p409',navn:'Döner Viqi',kategori_id:'k4',pris:3.50,ikon:'🌯',beskrivelse:'',udsolgt:false},
    {id:'p410',navn:'Döner Pule',kategori_id:'k4',pris:3.00,ikon:'🌯',beskrivelse:'',udsolgt:false},
    {id:'p501',navn:'Supë',kategori_id:'k5',pris:2.50,ikon:'🍲',beskrivelse:'',udsolgt:false},
    {id:'p502',navn:'Paqë',kategori_id:'k5',pris:2.50,ikon:'🍲',beskrivelse:'',udsolgt:false},
    {id:'p503',navn:'Sallata Shope',kategori_id:'k5',pris:0.00,ikon:'🥗',beskrivelse:'Ndrysho çmimin',udsolgt:false},
    {id:'p504',navn:'Sallata Mikse',kategori_id:'k5',pris:0.00,ikon:'🥗',beskrivelse:'Ndrysho çmimin',udsolgt:false},
    {id:'p505',navn:'Sallata Greke',kategori_id:'k5',pris:0.00,ikon:'🥗',beskrivelse:'Ndrysho çmimin',udsolgt:false},
    {id:'p601',navn:'Bonty',kategori_id:'k6',pris:2.20,ikon:'🍫',beskrivelse:'',udsolgt:false},
    {id:'p602',navn:'Trilece',kategori_id:'k6',pris:2.20,ikon:'🍰',beskrivelse:'',udsolgt:false},
    {id:'p603',navn:'Cheese Cake',kategori_id:'k6',pris:2.20,ikon:'🍰',beskrivelse:'',udsolgt:false},
    {id:'p604',navn:'Oreo',kategori_id:'k6',pris:2.20,ikon:'🍪',beskrivelse:'',udsolgt:false},
    {id:'p605',navn:'Boronic',kategori_id:'k6',pris:2.50,ikon:'🫐',beskrivelse:'',udsolgt:false},
    {id:'p701',navn:'Coca Cola',kategori_id:'k7',pris:1.50,ikon:'🥤',beskrivelse:'',udsolgt:false},
    {id:'p702',navn:'Coca Cola 0%',kategori_id:'k7',pris:1.50,ikon:'🥤',beskrivelse:'',udsolgt:false},
    {id:'p703',navn:'Schwepps',kategori_id:'k7',pris:1.50,ikon:'🥤',beskrivelse:'',udsolgt:false},
    {id:'p704',navn:'Tonic',kategori_id:'k7',pris:1.50,ikon:'🥤',beskrivelse:'',udsolgt:false},
    {id:'p705',navn:'Fanta',kategori_id:'k7',pris:1.50,ikon:'🧃',beskrivelse:'',udsolgt:false},
    {id:'p706',navn:'Fanta Exotic',kategori_id:'k7',pris:1.50,ikon:'🧃',beskrivelse:'',udsolgt:false},
    {id:'p707',navn:'Sprite',kategori_id:'k7',pris:1.50,ikon:'🥤',beskrivelse:'',udsolgt:false},
    {id:'p708',navn:'Sola',kategori_id:'k7',pris:1.50,ikon:'🥤',beskrivelse:'',udsolgt:false},
    {id:'p709',navn:'Ice Tea',kategori_id:'k7',pris:1.50,ikon:'🧊',beskrivelse:'',udsolgt:false},
    {id:'p710',navn:'Leng Boronice',kategori_id:'k7',pris:1.50,ikon:'🧃',beskrivelse:'',udsolgt:false},
    {id:'p711',navn:'Leng Dredhze',kategori_id:'k7',pris:1.50,ikon:'🧃',beskrivelse:'',udsolgt:false},
    {id:'p712',navn:'Leng Pjeshke',kategori_id:'k7',pris:1.50,ikon:'🧃',beskrivelse:'',udsolgt:false},
    {id:'p713',navn:'Leng Molle',kategori_id:'k7',pris:1.50,ikon:'🧃',beskrivelse:'',udsolgt:false},
    {id:'p714',navn:'Leng Vishnje',kategori_id:'k7',pris:1.50,ikon:'🧃',beskrivelse:'',udsolgt:false},
    {id:'p715',navn:'Leng Portokalli',kategori_id:'k7',pris:1.50,ikon:'🧃',beskrivelse:'',udsolgt:false},
    {id:'p716',navn:'Golden Eagle',kategori_id:'k7',pris:1.50,ikon:'🥤',beskrivelse:'',udsolgt:false},
    {id:'p717',navn:'Red Bull',kategori_id:'k7',pris:3.00,ikon:'🐂',beskrivelse:'',udsolgt:false},
    {id:'p718',navn:'Laqin',kategori_id:'k7',pris:1.00,ikon:'🥛',beskrivelse:'',udsolgt:false},
    {id:'p719',navn:'Ajran',kategori_id:'k7',pris:0.50,ikon:'🥛',beskrivelse:'',udsolgt:false},
    {id:'p720',navn:'Qaj rrusi',kategori_id:'k7',pris:1.00,ikon:'☕',beskrivelse:'',udsolgt:false},
    {id:'p721',navn:'Uje Natyral 0.25L',kategori_id:'k7',pris:1.00,ikon:'💧',beskrivelse:'',udsolgt:false},
    {id:'p722',navn:'Uje Natyral 0.75L',kategori_id:'k7',pris:2.50,ikon:'💧',beskrivelse:'',udsolgt:false},
    {id:'p723',navn:'Uje Mineral 0.25L',kategori_id:'k7',pris:1.20,ikon:'💧',beskrivelse:'',udsolgt:false},
    {id:'p724',navn:'Uje Mineral 0.75L',kategori_id:'k7',pris:2.50,ikon:'💧',beskrivelse:'',udsolgt:false},
    {id:'p801',navn:'Birra Peja 0.5L',kategori_id:'k8',pris:1.50,ikon:'🍺',beskrivelse:'',udsolgt:false},
    {id:'p802',navn:'Peja Lager 0.5L',kategori_id:'k8',pris:1.50,ikon:'🍺',beskrivelse:'',udsolgt:false},
    {id:'p803',navn:'Heineken',kategori_id:'k8',pris:2.00,ikon:'🍺',beskrivelse:'',udsolgt:false},
    {id:'p804',navn:'Laško',kategori_id:'k8',pris:1.50,ikon:'🍺',beskrivelse:'',udsolgt:false},
  ];
  ordrer = [];

  const katRows = kategorier.map(k => ({ ...k, restaurant_id: RESTAURANT_ID }));
  const prodRows = produkter.map(p => ({ ...p, restaurant_id: RESTAURANT_ID }));
  await sb.from('kategorier').insert(katRows);
  await sb.from('produkter').insert(prodRows);
}
function gemData() {
  // fire-and-forget: renders use in-memory state already
  _syncOrdrerToSupabase();
}

async function _syncOrdrerToSupabase() {
  try {
    for (const o of ordrer) {
      const { ordre_linjer, log, items, kilde, kusuri, ...ordreRow } = o;
      await sb.from('ordrer').upsert({ ...ordreRow, restaurant_id: RESTAURANT_ID });
      // ordre_linjer skrives KUN ved oprettelse via _insertNyOrdre — aldrig her
    }
  } catch(e) { console.error('Supabase sync fejl:', e); }
}

async function _insertNyOrdre(ordre) {
  try {
    const { ordre_linjer, log, items, kilde, kusuri, ...ordreRow } = ordre;
    await sb.from('ordrer').insert({ ...ordreRow, restaurant_id: RESTAURANT_ID });
    if (items && items.length) {
      const linjer = items.map(i => ({
        ordre_id: ordre.id,
        produkt_id: i.produkt_id,
        navn: i.produkt_navn,
        pris: i.produkt_pris,
        antal: i.antal
      }));
      await sb.from('ordre_linjer').insert(linjer);
    }
  } catch(e) { console.error('Insert ordre fejl:', e); }
}

function gemTavolina() {
  _syncTavolinaToSupabase();
}

async function _syncTavolinaToSupabase() {
  try {
    const rows = tavolina.map(t => ({ ...t, restaurant_id: RESTAURANT_ID }));
    await sb.from('tavolina').upsert(rows);
  } catch(e) { console.error('Tavolina sync fejl:', e); }
}

async function loadData() {
  const [katRes, prodRes, ordRes, tavRes, brugerRes] = await Promise.all([
    sb.from('kategorier').select('*').eq('restaurant_id', RESTAURANT_ID).order('sort'),
    sb.from('produkter').select('*').eq('restaurant_id', RESTAURANT_ID),
    sb.from('ordrer').select('*, ordre_linjer(*)').eq('restaurant_id', RESTAURANT_ID).in('status',['aaben','ventende']).order('oprettet'),
    sb.from('tavolina').select('*').eq('restaurant_id', RESTAURANT_ID),
    sb.from('brugere').select('*').eq('restaurant_id', RESTAURANT_ID).order('oprettet')
  ]);
  kategorier = katRes.data || [];
  produkter = prodRes.data || [];
  ordrer = (ordRes.data || []).map(o => ({
    ...o,
    items: (o.ordre_linjer || []).map(l => ({
      produkt_id: l.produkt_id,
      produkt_navn: l.navn,
      produkt_pris: l.pris,
      antal: l.antal,
      note: ''
    })),
    log: []
  }));
  tavolina = tavRes.data || [];
  brugere = brugerRes.data || [];
}

async function initTavolinat() {
  const { data } = await sb.from('tavolina').select('id').eq('restaurant_id', RESTAURANT_ID).limit(1);
  if (data && data.length > 0) return;
  tavolina = [
    ...Array.from({length:15},(_,i)=>({id:'tv'+(i+1), restaurant_id:RESTAURANT_ID, nr:String(i+1), emri:'Tavolina '+(i+1)})),
    ...Array.from({length:7},(_,i)=>({id:'tvt'+(i+1), restaurant_id:RESTAURANT_ID, nr:'T'+(i+1), emri:'Terasa '+(i+1)}))
  ];
  await sb.from('tavolina').insert(tavolina);
}

// =============================================
// HELPERS
// =============================================
function euro(v){return v.toFixed(2).replace('.',',')+' €'}
function formatData(s){const d=new Date(s);return d.toLocaleDateString('sq-AL')+' '+d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false})}
function sotDita(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function _localIso(dateStr,time){return new Date(dateStr+'T'+time).toISOString()}
function unikID(){return 'id_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)}
function visToast(msg,tip='ok'){const t=document.getElementById('toast');t.textContent=msg;t.style.background=tip==='gabim'?'#C0392B':tip==='info'?'#2980B9':'#3B1F0E';t.classList.add('vis');setTimeout(()=>t.classList.remove('vis'),3000)}
function mbyllModal(id){document.getElementById(id).classList.remove('vis')}
function mbyllLoginModal(){mbyllModal('login-modal');if(!aktivBruger&&!erAdmin)hapBrugerPicker();}

// =============================================
// TABS
// =============================================
function skiftTab(tab) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('aktiv'));
  document.querySelectorAll('.side').forEach(s=>s.classList.remove('aktiv'));
  document.getElementById('tab-'+tab)?.classList.add('aktiv');
  document.getElementById(tab+'-side').classList.add('aktiv');
  if(tab==='aabne') renderAabneBorde();
  if(tab==='pos') renderHurtigItems();
  if(tab==='omsaetning'){
    document.getElementById('periode-dato').value=sotDita();
    if(!document.getElementById('ps-fra').value){
      const now=new Date();const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0');
      document.getElementById('ps-fra').value=`${y}-${m}-01`;
      document.getElementById('ps-til').value=sotDita();
    }
    if(!document.getElementById('kassa-dato').value) document.getElementById('kassa-dato').value=sotDita();
    _shitjetNgarkuar=false;
    const det=document.getElementById('shitjet-produkt-details');
    if(det) det.removeAttribute('open');
    opdaterOmsaetning();
    renderKassaKontroll();
  }
  if(tab==='historik') opdaterHistorik();
  if(tab==='ventende') genindlaesVentende();
  if(tab==='produkter'){
    if(!erAdmin){
      skiftTab('aabne');
      if(!aktivBruger){_pendingTab='produkter';hapLoginModalNormal();}
      visToast('🔒 Keni nevojë për login Admin!','gabim');
      return;
    }
    renderAdminProdukter();
    renderBrugereAdmin();
  }
  if(tab==='analitika'){
    if(!erAdmin){
      skiftTab('aabne');
      _pendingTab='analitika';
      hapLoginModalNormal();
      return;
    }
    // Default: last 30 days
    if(!document.getElementById('anal-fra').value){
      const now=new Date();
      const d30=new Date(now);d30.setDate(d30.getDate()-30);
      document.getElementById('anal-fra').value=`${d30.getFullYear()}-${String(d30.getMonth()+1).padStart(2,'0')}-${String(d30.getDate()).padStart(2,'0')}`;
      document.getElementById('anal-til').value=sotDita();
    }
    renderAnalitika();
  }
}

// =============================================
// PRODUKT GRID
// =============================================
function renderKategorier(){
  const kolona=document.getElementById('kat-kolona');
  if(!kolona) return;
  kolona.innerHTML=kategorier.map(k=>`
    <button class="kat-v-btn${aktivKategori===k.id?' aktiv':''}" onclick="filtrerKategori('${k.id}')">
      ${k.ikon?k.ikon+' ':''}${k.navn}
    </button>`).join('');
}
function filtrerKategori(id){
  aktivKategori=id;
  renderKategorier();
  renderProduktGrid();
  document.getElementById('hurtig-panel').style.display='none';
  document.getElementById('produkt-panel').style.display='flex';
}
function kthehurNëHurtig(){
  aktivKategori='alle';
  renderKategorier();
  document.getElementById('produkt-panel').style.display='none';
  document.getElementById('hurtig-panel').style.display='flex';
  renderHurtigItems();
}

// =============================================
// HURTIGE VARER — dynamisk baseret på historik + tidspunkt
// =============================================
let _hurtigCache=[];
let _hurtigTs=0;

async function hentHurtigItems(){
  const now=Date.now();
  if(now-_hurtigTs<5*60*1000&&_hurtigCache.length) return _hurtigCache;

  const fraStr=new Date(now-14*24*3600000).toISOString();
  const {data}=await sb.from('ordrer')
    .select('oprettet,ordre_linjer(produkt_id,navn,antal)')
    .eq('restaurant_id',RESTAURANT_ID)
    .eq('status','betalt')
    .gte('oprettet',fraStr);

  const nowLocal=new Date(now+2*3600000);
  const curHour=nowLocal.getUTCHours();
  const WIN=2; // ±2 timer vindue
  const scored={};

  (data||[]).forEach(o=>{
    const oLocal=new Date(new Date(o.oprettet).getTime()+2*3600000);
    const oHour=oLocal.getUTCHours();
    const diff=Math.min(Math.abs(oHour-curHour),24-Math.abs(oHour-curHour));
    if(diff>WIN) return;
    const w=1-(diff/(WIN+1))*0.5; // 1.0 samme time → 0.67 ved ±2t
    (o.ordre_linjer||[]).forEach(l=>{
      if(!scored[l.produkt_id]) scored[l.produkt_id]={produkt_id:l.produkt_id,navn:l.navn,s:0};
      scored[l.produkt_id].s+=l.antal*w;
    });
  });

  let ranked=Object.values(scored).sort((a,b)=>b.s-a.s);

  // Fallback: ingen tids-filter hvis for lidt data
  if(ranked.length<6){
    const allScored={};
    (data||[]).forEach(o=>(o.ordre_linjer||[]).forEach(l=>{
      if(!allScored[l.produkt_id]) allScored[l.produkt_id]={produkt_id:l.produkt_id,s:0};
      allScored[l.produkt_id].s+=l.antal;
    }));
    const allRanked=Object.values(allScored).sort((a,b)=>b.s-a.s);
    const existing=new Set(ranked.map(r=>r.produkt_id));
    for(const r of allRanked){if(!existing.has(r.produkt_id)){ranked.push(r);existing.add(r.produkt_id)}}
  }

  // Map til produkter-objekter, fyld op til 12 fra alle produkter hvis nødvendigt
  const existing=new Set();
  _hurtigCache=[];
  for(const r of ranked){
    const p=produkter.find(x=>x.id===r.produkt_id&&!x.udsolgt);
    if(p&&!existing.has(p.id)){_hurtigCache.push(p);existing.add(p.id)}
    if(_hurtigCache.length>=12) break;
  }
  if(_hurtigCache.length<12){
    for(const p of produkter){
      if(!p.udsolgt&&!existing.has(p.id)){_hurtigCache.push(p);existing.add(p.id)}
      if(_hurtigCache.length>=12) break;
    }
  }
  _hurtigTs=now;
  return _hurtigCache;
}

async function renderHurtigItems(){
  const grid=document.getElementById('hurtig-grid');
  if(!grid) return;
  grid.innerHTML='<div class="ps-loading" style="grid-column:1/-1">⏳ Duke ngarkuar...</div>';
  const items=await hentHurtigItems();
  if(!items.length){grid.innerHTML='<div style="grid-column:1/-1;color:var(--tekst-lys);padding:20px;text-align:center">Nuk ka të dhëna akoma.</div>';return}
  grid.innerHTML=items.map(p=>`
    <button class="hurtig-btn" onclick="shtoNëShportë('${p.id}')">
      <div class="h-ikon">${p.ikon||'🍽️'}</div>
      <div class="h-emri">${emriBazë(p.navn)}</div>
      <div class="h-cmimi">${euro(p.pris)}</div>
    </button>`).join('');
}

// Grupëzo produktet sipas emrit bazë (pa sufiksin e madhësisë)
function emriBazë(emri){return emri.replace(/\s*\([SML]\)\s*$/,'').trim()}
function madhësia(emri){const m=emri.match(/\(([SML])\)\s*$/);return m?m[1]:null}
function etiketaMadhësisë(s){return s==='S'?'E Vogël':s==='M'?'E Mesme':s==='L'?'E Madhe':s}

function grupoProduktet(lista){
  const grupe={};
  lista.forEach(p=>{
    const bazë=emriBazë(p.navn);
    const çelës=bazë+'||'+p.kategori_id;
    if(!grupe[çelës]) grupe[çelës]={bazë,kategori_id:p.kategori_id,ikon:p.ikon||'🍽️',produktet:[]};
    grupe[çelës].produktet.push(p);
  });
  // Rendo madhësitë S→M→L brenda çdo grupi
  const renditje={S:0,M:1,L:2};
  Object.values(grupe).forEach(g=>{
    g.produktet.sort((a,b)=>(renditje[madhësia(a.navn)]??9)-(renditje[madhësia(b.navn)]??9));
  });
  return Object.values(grupe);
}

function renderProduktGrid(){
  const grid=document.getElementById('produkt-grid');
  const listë=aktivKategori==='alle'?produkter:produkter.filter(p=>p.kategori_id===aktivKategori);
  if(!listë.length){grid.innerHTML='<p style="color:var(--tekst-lys);padding:20px">Nuk ka produkte në këtë kategori.</p>';return}
  const grupe=grupoProduktet(listë);
  grid.innerHTML=grupe.map(g=>{
    if(g.produktet.length===1){
      const p=g.produktet[0];
      return `<div class="produkt-kort ${p.udsolgt?'udsolgt':''}" onclick="shtoNëShportë('${p.id}')">
        <div class="pk-ikon">${p.ikon||'🍽️'}</div>
        <div class="pk-navn">${p.navn}</div>
        <div class="pk-pris">${euro(p.pris)}</div>
        ${p.udsolgt?'<div class="pk-udsolgt">MBARUAR</div>':''}
      </div>`;
    }
    // Grup me madhësi të shumëfishta
    const çmimMin=Math.min(...g.produktet.map(p=>p.pris));
    const çmimMax=Math.max(...g.produktet.map(p=>p.pris));
    const madhësitë=g.produktet.map(p=>madhësia(p.navn)||'?');
    const idsStr=g.produktet.map(p=>p.id).join(',');
    const tëGjithaMbaruar=g.produktet.every(p=>p.udsolgt);
    return `<div class="produkt-kort ${tëGjithaMbaruar?'udsolgt':''}" onclick="hapSizePicker('${idsStr}')">
      <div class="pk-ikon">${g.ikon}</div>
      <div class="pk-navn">${g.bazë}</div>
      <div class="pk-pris">${çmimMin===çmimMax?euro(çmimMin):euro(çmimMin)+' – '+euro(çmimMax)}</div>
      <div class="pk-sizes">${madhësitë.map(m=>`<span class="pk-madhësia-dot">${m}</span>`).join('')}</div>
    </div>`;
  }).join('');
}

function hapSizePicker(idsStr){
  const ids=idsStr.split(',');
  const prods=ids.map(id=>produkter.find(p=>p.id===id)).filter(Boolean);
  if(!prods.length) return;
  document.getElementById('size-titulli').textContent=emriBazë(prods[0].navn)+' — Zgjidh madhësinë';
  document.getElementById('size-opsionet').innerHTML=prods.map(p=>{
    const m=madhësia(p.navn)||p.navn;
    const etiketa=etiketaMadhësisë(m);
    return `<button class="size-opt-btn" onclick="shtoNëShportë('${p.id}');mbyllModal('size-modal')" ${p.udsolgt?'disabled':''}>
      <div class="size-cirkel">${m}</div>
      <span class="size-etiketa">${etiketa}${p.udsolgt?' · <span style="color:var(--roed);font-size:.75rem">Mbaruar</span>':''}</span>
      <span class="size-cmimi">${euro(p.pris)}</span>
    </button>`;
  }).join('');
  document.getElementById('size-modal').classList.add('vis');
}

// =============================================
// SHPORTA (KURV)
// =============================================
function shtoNëShportë(prodId){
  const prod=produkter.find(p=>p.id===prodId);
  if(!prod||prod.udsolgt) return;
  const ekz=kurv.find(i=>i.produkt_id===prodId&&!i.note);
  if(ekz){ekz.antal++}else{kurv.push({produkt_id:prodId,produkt_navn:prod.navn,produkt_pris:prod.pris,antal:1,note:''})}
  renderShporta();
}
function ndryshoAntal(idx,delta){kurv[idx].antal+=delta;if(kurv[idx].antal<=0)kurv.splice(idx,1);renderShporta()}
function hiqNgaShporta(idx){kurv.splice(idx,1);renderShporta()}
function rydKurv(){
  kurv=[];
  posPikZone=null;
  document.getElementById('bord-felt').value='';
  document.getElementById('bord-gabim').style.display='none';
  document.getElementById('noter-felt').value='';
  const bi=document.getElementById('kurv-bord-info');if(bi) bi.textContent='';
  renderShporta();
  document.getElementById('tab-pos').style.display='none';
  skiftTab('aabne');
}

// =============================================
// TABLE PICKER (në panelin e shportës)
// =============================================
function renderTablePicker(){
  const picker=document.getElementById('table-picker');
  if(!picker) return;
  const bordVal=document.getElementById('bord-felt')?.value.trim()||'';
  const aabneNr=new Set(ordrer.filter(o=>o.status==='aaben').map(o=>o.bord));
  const zeneBorde=tavolina.filter(t=>aabneNr.has(t.nr));
  let html='';
  // Occupied tables — always visible
  if(zeneBorde.length){
    html+=`<div class="tp-zene-header">🔴 Me porosi aktive</div><div class="tp-row">`;
    html+=zeneBorde.map(t=>`<button class="tp-btn zene${bordVal===t.nr?' zgjedhur':''}" data-nr="${t.nr}" onclick="zgjidhTavolinë('${t.nr}')">${t.nr}</button>`).join('');
    html+=`</div>`;
  }
  // Zone selection for empty tables
  html+=`<div class="tp-zone-btns">
    <button class="tp-zone-btn${posPikZone==='brendshëm'?' aktiv':''}" onclick="zgjidhZonePOS('brendshëm')">🏠 Brendshëm</button>
    <button class="tp-zone-btn${posPikZone==='terasa'?' aktiv':''}" onclick="zgjidhZonePOS('terasa')">🌿 Terasa</button>
  </div>`;
  if(posPikZone){
    const erT=posPikZone==='terasa';
    const liste=tavolina.filter(t=>erT?t.nr.startsWith('T'):!t.nr.startsWith('T'));
    html+=`<div class="tp-row" style="margin-top:8px">`;
    html+=liste.map(t=>{
      const zene=aabneNr.has(t.nr);
      const zgj=bordVal===t.nr;
      const label=erT?t.nr.slice(1):t.nr;
      return `<button class="tp-btn${zgj?' zgjedhur':zene?' zene':''}" data-nr="${t.nr}" onclick="zgjidhTavolinë('${t.nr}')">${label}</button>`;
    }).join('');
    html+=`</div>`;
  }
  picker.innerHTML=html;
}

function zgjidhZonePOS(zone){
  posPikZone=posPikZone===zone?null:zone;
  renderTablePicker();
}

function zgjidhTavolinë(nr){
  document.getElementById('bord-felt').value=nr;
  document.getElementById('bord-gabim').style.display='none';
  const bi=document.getElementById('kurv-bord-info');
  if(bi) bi.textContent=nr?`🪑 Tavolina ${nr}`:'';
  const btn=document.getElementById('btn-opret');
  if(btn&&nr) btn.disabled=false;
}

function fillBordAndGoToArke(nr){
  document.getElementById('tab-pos').style.display='';
  skiftTab('pos');
  zgjidhTavolinë(nr);
  // Reset to quick-items view on each new table
  document.getElementById('produkt-panel').style.display='none';
  document.getElementById('hurtig-panel').style.display='flex';
  aktivKategori='alle';
  renderKategorier();
}
function renderShporta(){
  const liste=document.getElementById('kurv-liste');
  if(!kurv.length){liste.innerHTML='<div class="kurv-tom">Shporta është bosh.<br>Trokitni mbi një produkt.</div>';updateTotal();return}
  liste.innerHTML=kurv.map((item,i)=>`<div class="kurv-item"><div style="flex:1"><div class="ki-navn">${item.produkt_navn}</div></div><div style="display:flex;align-items:center;gap:4px"><button class="ki-btn" onclick="ndryshoAntal(${i},-1)">−</button><span class="ki-antal-tal">${item.antal}</span><button class="ki-btn" onclick="ndryshoAntal(${i},1)">+</button></div><span class="ki-pris">${euro(item.produkt_pris*item.antal)}</span><button class="ki-slet" onclick="hiqNgaShporta(${i})">✕</button></div>`).join('');
  updateTotal();
}
function updateTotal(){
  const total=kurv.reduce((s,i)=>s+i.produkt_pris*i.antal,0);
  document.getElementById('k-total').textContent=euro(total);
  document.getElementById('btn-opret').disabled=kurv.length===0;
}

// =============================================
// KRIJO POROSINË
// =============================================
function opretBestilling(){
  if(!kurv.length) return;
  const bord=document.getElementById('bord-felt').value.trim();
  const note=document.getElementById('noter-felt').value.trim();
  const bordInput=document.getElementById('bord-felt');
  const gabimDiv=document.getElementById('bord-gabim');

  // Validim: tavolina duhet të ekzistojë
  if(bord){
    const ekziston=tavolina.some(t=>t.nr===bord||t.emri.toLowerCase()===bord.toLowerCase());
    if(!ekziston){
      bordInput.classList.add('gabim');
      gabimDiv.style.display='block';
      gabimDiv.textContent=`⚠ Tavolina "${bord}" nuk ekziston! Zgjidhni nga lista ose shtoni te ⚙️ Menaxho.`;
      bordInput.focus();
      return;
    }
  } else {
    bordInput.classList.add('gabim');
    gabimDiv.style.display='block';
    gabimDiv.textContent='⚠ Zgjidhni tavolinën para se të dërgoni porosinë!';
    bordInput.focus();
    return;
  }

  // Pastro gabimin nëse ishte
  bordInput.classList.remove('gabim');
  gabimDiv.style.display='none';

  const total=parseFloat(kurv.reduce((s,i)=>s+i.produkt_pris*i.antal,0).toFixed(2));
  const ordre={
    id:unikID(), ordre_nummer:nestNr(), status:'aaben', kilde:'pos',
    bord:bord||'–', note:note, betaling:null,
    subtotal:total, moms:parseFloat((total*0.18).toFixed(2)), total,
    oprettet:new Date().toISOString(), betalt:null,
    bruger_id:aktivBruger?.id||null, bruger_navn:aktivBruger?.navn||null,
    items:kurv.map(i=>({...i})),
    log:[]
  };
  ordrer.push(ordre);
  _insertNyOrdre(ordre); // insert order + linjer én gang
  printOrderSlip(ordre);
  rydKurv(); opdaterAabneBadge();
  visCelebrationPorosi(ordre);
}

function onBordInput(inp){
  inp.classList.remove('gabim');
  document.getElementById('bord-gabim').style.display='none';
  // Deselektoj butonat e table picker
  document.querySelectorAll('.tp-btn').forEach(b=>b.classList.remove('zgjedhur'));
  // Nëse ka tekstin që përputhet me një tavolinë, shënoje
  const val=inp.value.trim();
  if(val){
    const t=tavolina.find(t=>t.nr===val||t.emri.toLowerCase()===val.toLowerCase());
    if(t) document.querySelectorAll('.tp-btn').forEach(b=>{if(b.dataset.nr===t.nr)b.classList.add('zgjedhur')});
  }
}

// =============================================
// CELEBRATION
// =============================================
// PRINT ORDER SLIP
// =============================================
function _buildReceiptHtml(ordre){
  const d=new Date(new Date(ordre.oprettet).getTime()+2*3600000);
  const koha=`${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
  const itemRows=ordre.items.map(i=>{
    const emri=i.produkt_navn.length>22?i.produkt_navn.slice(0,21)+'…':i.produkt_navn;
    const val=euro(i.produkt_pris*i.antal);
    return `${i.antal}x ${emri}${' '.repeat(Math.max(1,30-emri.length-val.length))}${val}`;
  }).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page{margin:4mm;size:80mm auto}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',Courier,monospace;font-size:12px;width:72mm;color:#000}
  .c{text-align:center}.b{font-weight:bold}
  .big{font-size:16px;font-weight:bold;letter-spacing:2px}
  .sep{border:none;border-top:1px dashed #000;margin:5px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .total{font-size:14px;font-weight:bold}
  pre{font-family:inherit;font-size:12px;white-space:pre-wrap}
</style></head><body>
  <div class="c big">ROLEX BAR</div>
  <div class="c" style="font-size:10px;margin:2px 0">Bar &amp; Restaurant</div>
  <hr class="sep">
  <div class="row"><span>Tavolina:</span><span class="b">${ordre.bord}</span></div>
  <div class="row"><span>Porosi #:</span><span class="b">${ordre.ordre_nummer}</span></div>
  <div class="row"><span>Ora:</span><span>${koha}</span></div>
  ${ordre.bruger_navn?`<div class="row"><span>Kamerier:</span><span>${ordre.bruger_navn}</span></div>`:''}
  <hr class="sep"><pre>${itemRows}</pre><hr class="sep">
  <div class="row total"><span>TOTALI</span><span>${euro(ordre.total)}</span></div>
  ${ordre.note?`<hr class="sep"><div style="font-size:11px">Shënim: ${ordre.note}</div>`:''}
  <div style="margin-top:8px;text-align:center;font-size:10px;color:#666">Faleminderit!</div>
</body></html>`;
}

let _qzPrinter=null;

async function lidhPrinter(){
  if(typeof qz==='undefined') return;
  const btn=document.getElementById('printer-btn');
  if(btn){btn.textContent='🖨️ …';btn.className='connecting';}
  try{
    qz.security.setCertificatePromise((resolve)=>resolve());
    qz.security.setSignatureAlgorithm('SHA512');
    qz.security.setSignaturePromise((toSign)=>(resolve)=>resolve());
    if(!qz.websocket.isActive()) await qz.websocket.connect({retries:2,delay:1});
    // Pre-godkend printer-adgang så ordrer ikke spørger igen
    _qzPrinter=await qz.printers.getDefault();
    // Test-print (tom) for at pre-godkende print-handlingen
    const cfg=qz.configs.create(_qzPrinter,{colorType:'blackwhite',copies:1});
    await qz.print(cfg,[{type:'html',format:'plain',data:'<html><body></body></html>'}]);
    if(btn){btn.textContent='🖨️';btn.className='online';btn.title='Printeri i lidhur';}
  }catch(e){
    if(btn){btn.textContent='🖨️';btn.className='';btn.title='Lidh printerin';}
    console.warn('QZ Tray:',e);
  }
}

async function printOrderSlip(ordre, type='kitchen'){
  // Prøv lokal print-server (silent)
  try{
    const r=await fetch('http://localhost:3001/print',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...ordre, printType:type}),
      signal:AbortSignal.timeout(3000)
    });
    if(r.ok) return; // silent print lykkedes
  }catch(_){}

  // Fallback: print-dialog
  const html=_buildReceiptHtml(ordre);
  const fw=window.open('','_blank','width=500,height=400,top=80,left=80,toolbar=no,menubar=no,scrollbars=no');
  if(fw&&!fw.closed){
    fw.document.write(html);
    fw.document.close();
    fw.focus();
    fw.print();
    fw.addEventListener('afterprint',()=>{try{fw.close();}catch(_){}});
    setTimeout(()=>{try{if(!fw.closed)fw.close();}catch(_){}},30000);
  }
}

// =============================================
function visCelebrationPorosi(ordre){
  document.getElementById('cel-ikon').textContent='🍽️';
  document.getElementById('cel-titulli').textContent=`Porosi #${ordre.ordre_nummer}`;
  document.getElementById('cel-sub').textContent=`Tavolina ${ordre.bord} • ${euro(ordre.total)}`;
  document.getElementById('cel-kusuri-boks').style.display='none';
  document.getElementById('cel-kthe-btn').style.display='none';
  celebrationOrdreId=null;
  krijoKonfetti(['#C9963B','#27AE60','#3B1F0E','#E8B96A','#fff'],40);
  document.getElementById('celebration').classList.add('vis');
  // Auto-mbyll pas 3s dhe kalon në tavolina
  setTimeout(()=>{if(document.getElementById('celebration').classList.contains('vis')){mbyllCelebration();skiftTab('aabne')}},3000);
}

function visCelebrationPagese(ordre, kusuri){
  document.getElementById('cel-ikon').textContent='💰';
  document.getElementById('cel-titulli').textContent='Fatura u pagua!';
  const _met=ordre.betaling==='kontant'?'Kesh':ordre.betaling==='kort'?'Kartë':'Mobil';
  document.getElementById('cel-sub').textContent=`Tavolina ${ordre.bord} • ${_met} • ${euro(ordre.total)}`;
  const kusuriBoks=document.getElementById('cel-kusuri-boks');
  if(kusuri>0.001){
    kusuriBoks.style.display='block';
    document.getElementById('cel-kusuri-val').textContent=euro(kusuri);
  } else {
    kusuriBoks.style.display='none';
  }
  document.getElementById('cel-kthe-btn').style.display='block';
  celebrationOrdreId=ordre.id;
  krijoKonfetti(['#27AE60','#C9963B','#fff','#2ECC71','#F1C40F'],70);
  document.getElementById('celebration').classList.add('vis');
  setTimeout(()=>{
    const ps=document.getElementById('cel-print-status');
    if(ps) ps.style.display='block';
  },2000);
  setTimeout(()=>{
    if(document.getElementById('celebration').classList.contains('vis')){
      const ps=document.getElementById('cel-print-status');
      if(ps) ps.style.display='none';
      mbyllCelebration();
      mbyllModal('kvittering-modal');
      skiftTab('aabne');
      if(aktivFatureOrdre) printOrderSlip(aktivFatureOrdre,'receipt');
    }
  },3000);
}

function mbyllCelebration(){
  document.getElementById('celebration').classList.remove('vis');
  document.getElementById('confetti-container').innerHTML='';
  celebrationOrdreId=null;
}

function krijoKonfetti(ngjyrat, sasia){
  const c=document.getElementById('confetti-container');
  c.innerHTML='';
  for(let i=0;i<sasia;i++){
    const el=document.createElement('div');
    el.className='cf';
    el.style.left=Math.random()*100+'vw';
    el.style.top='-10px';
    el.style.background=ngjyrat[Math.floor(Math.random()*ngjyrat.length)];
    el.style.width=(6+Math.random()*8)+'px';
    el.style.height=(6+Math.random()*8)+'px';
    el.style.borderRadius=Math.random()>.5?'50%':'0';
    el.style.animationDelay=(Math.random()*1.5)+'s';
    el.style.animationDuration=(2+Math.random()*2)+'s';
    c.appendChild(el);
  }
}

// =============================================
// KTHE POROSINË (UNDO)
// =============================================
function ktheOrdrenNgaCelebration(){
  if(!celebrationOrdreId) return;
  ktheOrdren(celebrationOrdreId);
  mbyllCelebration();
}

function ktheOrdren(id){
  const o=ordrer.find(x=>x.id===id);
  if(!o) return;
  const nga=aktivBruger?.navn||'Admin';
  const koha=new Date().toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});
  o.note=(o.note?o.note+'\n':'')+'🔧 '+koha+' '+nga+': ktheu pagesën';
  o.status='aaben';
  o.betaling=null;
  o.betalt=null;
  gemData();
  renderAabneBorde();
  opdaterAabneBadge();
  visToast(`Porosi #${o.ordre_nummer} u kthye në tavolina aktive`,'info');
}



// =============================================
// KESH LLOGARITËS
// =============================================
function hapKeshModal(ordreId){
  const o=ordrer.find(x=>x.id===ordreId);
  if(!o) return;
  keshOrdreId=ordreId; keshGjithaBord=null;
  keshAmount='';
  document.getElementById('kesh-titulli').textContent=`💵 Kesh — Tavolina ${o.bord}`;
  document.getElementById('kesh-totali-display').textContent=euro(o.total);
  rifreshKesh();
  document.getElementById('kesh-modal').classList.add('vis');
}

function hapKeshModalGjithe(bord){
  const ordrerT=ordrer.filter(o=>o.status==='aaben'&&o.bord===bord);
  if(!ordrerT.length) return;
  const total=parseFloat(ordrerT.reduce((s,o)=>s+o.total,0).toFixed(2));
  keshGjithaBord=bord; keshOrdreId=null;
  keshAmount='';
  document.getElementById('kesh-titulli').textContent=`💵 Kesh — Tavolina ${bord} (${ordrerT.length} porosi)`;
  document.getElementById('kesh-totali-display').textContent=euro(total);
  rifreshKesh();
  document.getElementById('kesh-modal').classList.add('vis');
}
function numpadShto(c){
  if(c==='.'&&keshAmount.includes('.')) return;
  if(c!=='.'&&keshAmount.includes('.')&&keshAmount.split('.')[1].length>=2) return;
  if(keshAmount.length>=8) return;
  keshAmount+=c;
  rifreshKesh();
}
function numpadFshi(){keshAmount='';rifreshKesh()}
function numpadBack(){keshAmount=keshAmount.slice(0,-1);rifreshKesh()}
function rifreshKesh(){
  const dhene=parseFloat(keshAmount)||0;
  let total=0;
  if(keshGjithaBord){
    total=parseFloat(ordrer.filter(o=>o.status==='aaben'&&o.bord===keshGjithaBord).reduce((s,o)=>s+o.total,0).toFixed(2));
  } else {
    const o=ordrer.find(x=>x.id===keshOrdreId);
    total=o?o.total:0;
  }
  const kusuri=dhene-total;
  document.getElementById('kesh-dhene-val').textContent=keshAmount?euro(dhene):'—';
  const kusuriBoks=document.getElementById('kesh-kusuri-boks');
  const kusiriEl=document.getElementById('kesh-kusuri-val');
  if(dhene>0){
    kusuriBoks.classList.toggle('negativ',kusuri<0);
    kusiriEl.textContent=kusuri>=0?euro(kusuri):'— (jo mjaftueshëm)';
  } else {
    kusuriBoks.classList.remove('negativ');
    kusiriEl.textContent='—';
  }
  document.getElementById('kesh-konfirmo-btn').disabled=dhene<total;
}
function konfirmoPagesaKesh(){
  const dhene=parseFloat(keshAmount)||0;
  mbyllModal('kesh-modal');
  if(keshGjithaBord){
    const ordrerT=ordrer.filter(o=>o.status==='aaben'&&o.bord===keshGjithaBord);
    const total=parseFloat(ordrerT.reduce((s,o)=>s+o.total,0).toFixed(2));
    const kusuri=parseFloat((dhene-total).toFixed(2));
    pageoOrdrerGjithe(keshGjithaBord,'kontant',kusuri);
  } else if(keshOrdreId){
    const o=ordrer.find(x=>x.id===keshOrdreId);
    const kusuri=parseFloat((dhene-o.total).toFixed(2));
    pageoOrdren(keshOrdreId,'kontant',kusuri);
  }
}

// =============================================
// PAGUAJ TË GJITHA POROSITË E TAVOLINËS
// =============================================
function betalGjithe(bord){
  const ordrerT=ordrer.filter(o=>o.status==='aaben'&&o.bord===bord);
  if(!ordrerT.length) return;
  if(ordrerT.length===1){ betalOrdre(ordrerT[0].id); return; }
  hapKeshModalGjithe(bord);
}

function pageoOrdrerGjithe(bord, metoda, kusuri=0){
  const ordrerT=ordrer.filter(o=>o.status==='aaben'&&o.bord===bord);
  const total=parseFloat(ordrerT.reduce((s,o)=>s+o.total,0).toFixed(2));
  const tani=new Date().toISOString();
  ordrerT.forEach((o,i)=>{
    o.status='betalt'; o.betaling=metoda; o.betalt=tani;
    o.kusuri=i===ordrerT.length-1?kusuri:0; // kusuri te e fundit
  });
  gemData();
  renderAabneBorde();
  opdaterAabneBadge();
  // Celebration me totalin e kombinuar
  const fakeOrdre={...ordrerT[0], total, kusuri, bord};
  visCelebrationPagese(fakeOrdre, kusuri);
  hapFaturaKombinuar(bord, ordrerT, total, kusuri);
}

function hapFaturaKombinuar(bord, ordrerList, total, kusuri){
  const tani=new Date();
  const ds=tani.toLocaleDateString('sq-AL')+' '+tani.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});
  const S='================================';
  let txt=`        ROLEX BAR\n     Bar & Restaurant\n${S}\n`;
  txt+=`Data: ${ds}\nTavolina: ${bord}\n`;
  txt+=`${S}\n`;
  ordrerList.forEach((o,i)=>{
    const oKoha=new Date(o.oprettet).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});
    txt+=`Porosi #${o.ordre_nummer} — ${oKoha}\n`;
    o.items.forEach(i=>{
      const nm=(i.antal+'× '+i.produkt_navn).slice(0,22);
      const pr=euro(i.produkt_pris*i.antal);
      txt+=nm.padEnd(32-pr.length,' ')+pr+'\n';
    });
    if(i<ordrerList.length-1) txt+=`--------------------------------\n`;
  });
  txt+=`${S}\n`;
  const totStr=euro(total);
  txt+=`${'TOTALI'.padEnd(32-totStr.length,' ')}${totStr}\n`;
  const bet='Kesh';
  txt+=`Paguar me: ${bet}\n`;
  if(kusuri>0.001) txt+=`Kusuri: ${euro(kusuri)}\n`;
  txt+=`${S}\n   Ju faleminderit! 🙏\n   Mirë se vini sërish`;

  // Ruaj faturën te aktivFatureOrdre (si faturë me shumë porosi)
  aktivFatureOrdre={
    id:'kombinuar', ordre_nummer:'GJITHË', status:'betalt',
    bord, betaling:ordrerList[0].betaling, total, kusuri,
    oprettet:ordrerList[0].oprettet, betalt:tani.toISOString(),
    items:ordrerList.flatMap(o=>o.items)
  };
  document.getElementById('kvit-indhold').textContent=txt;
  document.getElementById('kvittering-modal').classList.add('vis');
}

// =============================================
// PAGESA
// =============================================
function betalOrdre(id){
  hapKeshModal(id);
}
function pageoOrdren(id,metoda,kusuri=0){
  const o=ordrer.find(x=>x.id===id);
  if(!o) return;
  o.status='betalt';
  o.betaling=metoda;
  o.betalt=new Date().toISOString();
  o.kusuri=kusuri;
  gemData();
  renderAabneBorde();
  opdaterAabneBadge();
  visCelebrationPagese(o,kusuri);
  hapFature(o); // Kvittering hapet automatikisht prapa festës
}

// =============================================
// TAVOLINAT AKTIVE
// =============================================
function nestNr(){if(!ordrer.length)return 1001;return Math.max(...ordrer.map(o=>o.ordre_nummer))+1}

function elapsedStr(isoStr){
  const min=Math.floor((new Date()-new Date(isoStr))/60000);
  return min<1?'tani':min<60?`${min} min.`:`${Math.floor(min/60)}h ${min%60}m`;
}

function renderAabneBorde(){
  const aabne=ordrer.filter(o=>o.status==='aaben');
  const c=document.getElementById('aabne-indhold');
  if(!tavolina.length){
    c.innerHTML='<div class="ingen-data">Nuk ka tavolina.<br>Shtoni tavolina me ⚙️ Menaxho.</div>';
    return;
  }
  const sorted=[...tavolina].sort((a,b)=>{
    const aZ=aabne.some(o=>o.bord===a.nr)?0:1;
    const bZ=aabne.some(o=>o.bord===b.nr)?0:1;
    if(aZ!==bZ) return aZ-bZ;
    return isNaN(a.nr)?a.nr.localeCompare(b.nr):parseInt(a.nr)-parseInt(b.nr);
  });

  c.innerHTML=`<div class="tv-grid">${sorted.map(t=>{
    const ordrerT=aabne.filter(o=>o.bord===t.nr).sort((a,b)=>new Date(a.oprettet)-new Date(b.oprettet));

    // ── TAVOLINË E LIRË ──
    if(!ordrerT.length){
      return `<div class="tv-kart lire" onclick="fillBordAndGoToArke('${t.nr}')">
        <div class="tvh lire">
          <div>
            <div class="tvh-nr lire">🪑 ${t.nr}</div>
            <div class="tvh-sub lire">Tavolina ${t.nr}</div>
          </div>
          <span class="tvh-badge lire">● E lirë</span>
        </div>
        <div class="tv-lire-body">
          <div class="tv-lire-icon">➕</div>
          <div class="tv-lire-hint">Kliko për porosi të re</div>
        </div>
      </div>`;
    }

    // ── TAVOLINË E ZËNË ──
    const shumePorosi=ordrerT.length>1;
    const totalGjithe=parseFloat(ordrerT.reduce((s,o)=>s+o.total,0).toFixed(2));
    const elapsed0=elapsedStr(ordrerT[0].oprettet);

    // Ndërto seksionet e porosive
    const ordinetHTML=ordrerT.map((ord,idx)=>{
      const log=ord.log||[];
      const logHTML=log.length?`
        <div style="font-size:.7rem;color:var(--guld);font-weight:600;margin:5px 0 0;cursor:pointer" onclick="toggleLog('${ord.id}')">
          📋 ${log.length} ndryshim${log.length!==1?'e':''}
        </div>
        <div class="log-entries" id="log-entries-${ord.id}" style="display:none">
          ${log.map(l=>`<div class="log-entry ${l.lloji}"><span class="log-koha">${new Date(l.koha).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false})}${l.nga?` · ${l.nga}`:''}</span><span class="log-tekst">${l.pershkrim}</span></div>`).join('')}
        </div>`:'';
      const ordKoha=new Date(ord.oprettet).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});
      const ordElapsed=elapsedStr(ord.oprettet);

      return `
        ${shumePorosi&&idx>0?`
          <div class="tv-ny-rund">
            <div class="tv-ny-rund-line"></div>
            <span class="tv-ny-rund-label">🆕 Rund ${idx+1}</span>
            <div class="tv-ny-rund-line"></div>
            <span class="tv-ny-rund-tid">${ordKoha} · ⏱ ${ordElapsed}</span>
          </div>`:''
        }
        <div class="tv-ordri">
          <div class="tv-ordri-head">
            <span class="tv-ordri-nr">${shumePorosi?`Rund ${idx+1}`:`Porosi #${ord.ordre_nummer}`}</span>
            <div class="tv-ordri-meta">
              ${ord.bruger_navn?`<span class="tv-tjener">👤 ${ord.bruger_navn}</span>`:''}
              ${shumePorosi?'':`<span>#${ord.ordre_nummer}</span>`}
              <span class="tv-ordri-elapsed">⏱ ${ordElapsed}</span>
            </div>
          </div>
          ${ord.items.map(i=>`
            <div class="tv-item">
              <span class="tv-item-navn">${i.antal}× ${i.produkt_navn}</span>
              <span class="tv-item-pris">${euro(i.produkt_pris*i.antal)}</span>
            </div>`).join('')}
          ${ord.note?`<div class="tv-ordri-note">📝 ${ord.note}</div>`:''}
          ${logHTML}
          <div class="tv-ordri-subtotal">
            <div class="tv-ordri-btns">
              <button class="tv-orb edit" onclick="hapRedaktimin('${ord.id}')">✏️ Ndrysho</button>
              <button class="tv-orb del" onclick="anuloOrdren('${ord.id}')">✕</button>
            </div>
            ${shumePorosi?`<span class="tv-ordri-subtotal-val">${euro(ord.total)}</span>`:''}
          </div>
        </div>`;
    }).join('');

    return `<div class="tv-kart zene">
      <div class="tvh zene">
        <div>
          <div class="tvh-nr zene">🪑 ${t.nr}</div>
          <div class="tvh-sub zene">${shumePorosi?`${ordrerT.length} porosi aktive`:`Porosi #${ordrerT[0].ordre_nummer}`}</div>
        </div>
        <div class="tvh-right">
          <span class="tvh-badge zene">● E zënë</span>
          <div class="tvh-elapsed">E hapur prej ${elapsed0}</div>
        </div>
      </div>
      ${ordinetHTML}
      <div class="tv-total-bar">
        <span class="tv-total-label">${shumePorosi?'💰 Totali i tavolinës':'Totali'}</span>
        <span class="tv-total-val">${euro(totalGjithe)}</span>
      </div>
      <div class="tv-acties">
        <button class="tv-btn kesh" onclick="betalGjithe('${t.nr}')">💵 ${shumePorosi?'Paguaj gjithçka':'Kesh'}</button>
        <button class="tv-btn shto" onclick="fillBordAndGoToArke('${t.nr}')">➕ Shto porosi të re</button>
      </div>
    </div>`;
  }).join('')}</div>`;

  renderTablePicker();
}
function toggleLog(id){
  const el=document.getElementById('log-entries-'+id);
  if(!el) return;
  el.style.display=el.style.display==='none'?'flex':'none';
}

// =============================================
// TAVOLINA MANAGEMENT
// =============================================
function hapTavolinaModal(){
  if(!erAdmin){ hapLoginModalNormal(); visToast('🔒 Keni nevojë për login Admin!','gabim'); return; }
  rifreshoTavolinaAdmin();
  document.getElementById('tv-e-re').value='';
  document.getElementById('tavolina-modal').classList.add('vis');
}

function rifreshoTavolinaAdmin(){
  const el=document.getElementById('tavolina-lista-admin');
  const aabne=ordrer.filter(o=>o.status==='aaben');
  el.innerHTML=tavolina.map(t=>{
    const zene=aabne.some(o=>o.bord===t.nr);
    return `<div class="tv-list-item">
      <span class="tv-list-nr">🪑 ${t.nr} ${t.emri!==('Tavolina '+t.nr)?'<span style="color:var(--tekst-lys);font-weight:400;font-size:.8rem">('+t.emri+')</span>':''}</span>
      <div style="display:flex;align-items:center;gap:8px">
        ${zene?'<span style="font-size:.72rem;background:#FEF9E7;color:#7D6608;padding:2px 8px;border-radius:8px;font-weight:700">E zënë</span>':''}
        <button class="tv-fshi-btn" onclick="fshiTavolinë('${t.id}')" ${zene?'disabled title="Nuk mund të fshihet, është e zënë"':''}>Fshi</button>
      </div>
    </div>`;
  }).join('')||'<p style="color:var(--tekst-lys);font-size:.83rem">Nuk ka tavolina.</p>';
}

function shtoTavolinë(){
  const val=document.getElementById('tv-e-re').value.trim();
  if(!val) return;
  if(tavolina.some(t=>t.nr===val)){visToast(`Tavolina "${val}" ekziston tashmë!`,'gabim');return}
  const tv={id:'tv_'+unikID(),nr:val,emri:'Tavolina '+val};
  tavolina.push(tv);
  sb.from('tavolina').upsert({...tv, restaurant_id: RESTAURANT_ID}).then();
  gemTavolina();
  rifreshoTavolinaAdmin();
  renderTablePicker();
  renderAabneBorde();
  document.getElementById('tv-e-re').value='';
  visToast(`Tavolina "${val}" u shtua ✓`);
}

function fshiTavolinë(id){
  const t=tavolina.find(x=>x.id===id);
  if(!t) return;
  const zene=ordrer.some(o=>o.status==='aaben'&&o.bord===t.nr);
  if(zene){visToast(`Tavolina "${t.nr}" është e zënë!`,'gabim');return}
  if(!confirm(`Fshi Tavolinën "${t.nr}"?`)) return;
  tavolina=tavolina.filter(x=>x.id!==id);
  sb.from('tavolina').delete().eq('id', id).then();
  gemTavolina();
  rifreshoTavolinaAdmin();
  renderTablePicker();
  renderAabneBorde();
  visToast(`Tavolina "${t.nr}" u fshi`);
}

// =============================================
// REDAKTIM I POROSISË (EDIT ORDER)
// =============================================
let redaktimOrdreId = null;
let redaktimKurv = []; // kopia e items gjatë redaktimit

function hapRedaktimin(id){
  const o = ordrer.find(x=>x.id===id);
  if(!o) return;
  redaktimOrdreId = id;
  // Kopjo items
  redaktimKurv = o.items.map(i=>({...i}));
  document.getElementById('redaktim-titulli').textContent =
    `✏️ Ndrysho — Tavolina ${o.bord} (#${o.ordre_nummer})`;
  document.getElementById('redaktim-kerko').value='';
  rifredhoProduktetRedaktim(produkter);
  rifreshoRedaktimItems();
  document.getElementById('redaktim-modal').classList.add('vis');
}

function rifreshoRedaktimItems(){
  const c = document.getElementById('redaktim-items');
  if(!redaktimKurv.length){
    c.innerHTML='<p style="color:var(--tekst-lys);font-size:.83rem;padding:8px 0">Shporta është bosh.</p>';
    rifreshoRedaktimTotal();
    return;
  }
  c.innerHTML = redaktimKurv.map((item,i)=>`
    <div class="red-item">
      <div class="red-item-navn">${item.produkt_navn}</div>
      <button class="red-btn" onclick="ndryshoAntalRedaktim(${i},-1)">−</button>
      <span class="red-antal">${item.antal}</span>
      <button class="red-btn" onclick="ndryshoAntalRedaktim(${i},1)">+</button>
      <span class="red-item-pris">${euro(item.produkt_pris*item.antal)}</span>
      <button class="red-hiq" onclick="hiqNgaRedaktim(${i})" title="Hiq">✕</button>
    </div>`).join('');
  rifreshoRedaktimTotal();
}

function ndryshoAntalRedaktim(idx, delta){
  redaktimKurv[idx].antal += delta;
  if(redaktimKurv[idx].antal <= 0) redaktimKurv.splice(idx,1);
  rifreshoRedaktimItems();
}

function hiqNgaRedaktim(idx){
  redaktimKurv.splice(idx,1);
  rifreshoRedaktimItems();
}

function shtoNëRedaktim(prodId){
  const prod = produkter.find(p=>p.id===prodId);
  if(!prod||prod.udsolgt) return;
  const ekz = redaktimKurv.find(i=>i.produkt_id===prodId);
  if(ekz){ ekz.antal++ }
  else { redaktimKurv.push({produkt_id:prodId, produkt_navn:prod.navn, produkt_pris:prod.pris, antal:1, note:''}) }
  rifreshoRedaktimItems();
  // Flash the button
  visToast(`${prod.navn} u shtua ✓`);
}

function rifreshoRedaktimTotal(){
  const totalRi = redaktimKurv.reduce((s,i)=>s+i.produkt_pris*i.antal,0);
  const o = ordrer.find(x=>x.id===redaktimOrdreId);
  const totalVjeter = o ? o.total : 0;
  const diff = parseFloat((totalRi - totalVjeter).toFixed(2));
  document.getElementById('redaktim-total-val').textContent = euro(totalRi);
  const diffEl = document.getElementById('red-diff');
  if(Math.abs(diff)<0.001){diffEl.textContent='Pa ndryshim';diffEl.className='red-diff zero'}
  else if(diff>0){diffEl.textContent='+'+euro(diff);diffEl.className='red-diff plus'}
  else{diffEl.textContent=euro(diff);diffEl.className='red-diff minus'}
}

function kerkoProduktetRedaktim(){
  const q = document.getElementById('redaktim-kerko').value.trim().toLowerCase();
  const lista = q ? produkter.filter(p=>p.navn.toLowerCase().includes(q)||kategorier.find(k=>k.id===p.kategori_id)?.navn.toLowerCase().includes(q)) : produkter;
  rifredhoProduktetRedaktim(lista);
}

function rifredhoProduktetRedaktim(lista){
  const c = document.getElementById('redaktim-prod-liste');
  if(!lista.length){c.innerHTML='<p style="color:var(--tekst-lys);font-size:.8rem;padding:6px">Nuk u gjet asnjë produkt.</p>';return}
  // Grupëzo dhe shfaq
  const grupe = grupoProduktet(lista);
  c.innerHTML = grupe.map(g=>{
    if(g.produktet.length===1){
      const p=g.produktet[0];
      return `<button class="red-prod-btn" onclick="shtoNëRedaktim('${p.id}')" ${p.udsolgt?'disabled':''}>
        <span>${p.ikon||'🍽️'} <span class="rpb-emri">${p.navn}</span></span>
        <span class="rpb-cmimi">${euro(p.pris)}</span>
      </button>`;
    }
    return g.produktet.map(p=>{
      const m=madhësia(p.navn)||'';
      return `<button class="red-prod-btn" onclick="shtoNëRedaktim('${p.id}')" ${p.udsolgt?'disabled':''}>
        <span>${p.ikon||'🍽️'} <span class="rpb-emri">${emriBazë(p.navn)}</span> <span style="background:var(--brun);color:#fff;border-radius:5px;padding:1px 5px;font-size:.68rem;font-weight:700">${m}</span></span>
        <span class="rpb-cmimi">${euro(p.pris)}</span>
      </button>`;
    }).join('');
  }).join('');
}

function ruajNdryshimet(){
  if(!redaktimOrdreId) return;
  const o = ordrer.find(x=>x.id===redaktimOrdreId);
  if(!o) return;

  const tashme = new Date().toISOString();
  const nga = aktivBruger?.navn || 'Admin';
  const njërit = {}; // map prodId→antal (para ndryshimit)
  o.items.forEach(i=>{ njërit[i.produkt_id] = {antal:i.antal, namn:i.produkt_navn} });
  const riLogje = [];

  // Gjej ndryshimet
  const tëGjithaProdIds = new Set([
    ...o.items.map(i=>i.produkt_id),
    ...redaktimKurv.map(i=>i.produkt_id)
  ]);

  tëGjithaProdIds.forEach(pid=>{
    const vjeter = njërit[pid];
    const ri = redaktimKurv.find(i=>i.produkt_id===pid);
    const emri = vjeter?.namn || ri?.produkt_navn || '?';

    if(vjeter && !ri){
      // U hoq
      riLogje.push({
        koha:tashme, nga,
        lloji:'heqje',
        pershkrim:`<span class="log-i-vjeter">${vjeter.antal}× ${emri}</span> → u hoq ❌`
      });
    } else if(!vjeter && ri){
      // U shtua
      riLogje.push({
        koha:tashme, nga,
        lloji:'shtim',
        pershkrim:`${emri} u shtua (+${ri.antal}) ✅`
      });
    } else if(vjeter && ri && vjeter.antal !== ri.antal){
      // U ndryshua sasia
      riLogje.push({
        koha:tashme, nga,
        lloji:'ndryshim',
        pershkrim:`${emri}: <span class="log-i-vjeter">${vjeter.antal} cop.</span> → ${ri.antal} cop. ✏️`
      });
    }
  });

  if(!riLogje.length){
    visToast('Nuk ka ndryshime për të ruajtur.','info');
    mbyllModal('redaktim-modal');
    return;
  }

  // Apliko ndryshimet
  o.items = redaktimKurv.map(i=>({...i}));
  o.total = parseFloat(o.items.reduce((s,i)=>s+i.produkt_pris*i.antal,0).toFixed(2));
  o.subtotal = o.total;
  o.moms = parseFloat((o.total*0.18).toFixed(2));
  if(!o.log) o.log = [];
  o.log.push(...riLogje);

  gemData();

  // Sync ordre_linjer to Supabase: delete old lines, insert new
  const _oid = redaktimOrdreId;
  const _linjer = redaktimKurv.map(i=>({
    ordre_id: _oid,
    produkt_id: i.produkt_id,
    navn: i.produkt_navn,
    pris: i.produkt_pris,
    antal: i.antal
  }));
  sb.from('ordre_linjer').delete().eq('ordre_id',_oid).then(()=>{
    if(_linjer.length) sb.from('ordre_linjer').insert(_linjer).then();
  });

  mbyllModal('redaktim-modal');
  renderAabneBorde();
  visToast(`${riLogje.length} ndryshim${riLogje.length!==1?'e':''} u ruajtën ✓`);

  // Hap logun automatikisht
  setTimeout(()=>{
    const el=document.getElementById('log-entries-'+_oid);
    const arrow=document.getElementById('log-arrow-'+_oid);
    if(el){el.style.display='flex';if(arrow)arrow.textContent='▾'}
  },100);
}

function anuloOrdren(id){
  const o=ordrer.find(x=>x.id===id);
  if(!o||!confirm(`Anulo porosinë #${o.ordre_nummer} (Tavolina ${o.bord})?`)) return;
  o.status='afvist';
  gemData();
  renderAabneBorde();
  opdaterAabneBadge();
  visToast(`Porosi #${o.ordre_nummer} u anulua`,'gabim');
}

function opdaterAabneBadge(){
  const aabne=ordrer.filter(o=>o.status==='aaben');
  const n=tavolina.filter(t=>aabne.some(o=>o.bord===t.nr)).length;
  const tab=document.getElementById('tab-aabne');
  const badge=tab.querySelector('.badge');
  if(n>0){if(!badge)tab.innerHTML+=`<span class="badge">${n}</span>`;else badge.textContent=n}
  else if(badge) badge.remove();
}

// =============================================
// POROSI MOBILE (VENTENDE)
// =============================================
function genindlaesVentende(){
  const ventende=ordrer.filter(o=>o.status==='ventende');
  const c=document.getElementById('ventende-indhold');
  const badge=document.getElementById('tab-ventende').querySelector('.badge');
  if(ventende.length>0){if(!badge)document.getElementById('tab-ventende').innerHTML+=`<span class="badge">${ventende.length}</span>`;else badge.textContent=ventende.length}
  else if(badge) badge.remove();
  if(!ventende.length){c.innerHTML='<div class="ingen-data">✓ Nuk ka porosi nga mobili.</div>';return}
  c.innerHTML=`<div class="ordrer-grid">${ventende.map(o=>`<div class="ordre-kort">
    <div class="ok-header"><span class="ok-nr">Porosi #${o.ordre_nummer}</span><span class="ok-kilde">Mobil</span>${o.bruger_navn?`<span class="ok-tjener">👤 ${o.bruger_navn}</span>`:''}<span class="ok-tid">${formatData(o.oprettet)}</span></div>
    <div class="ok-body">
      ${o.bord&&o.bord!=='–'?`<div style="font-size:.8rem;color:var(--tekst-lys);margin-bottom:5px">🪑 Tavolina: <strong>${o.bord}</strong></div>`:''}
      ${o.items.map(i=>`<div class="ok-item"><span>${i.antal}× ${i.produkt_navn}</span><span>${euro(i.produkt_pris*i.antal)}</span></div>`).join('')}
      ${o.note?`<div class="ok-note">📝 ${o.note}</div>`:''}
      <div class="ok-total">Totali: ${euro(o.total)}</div>
    </div>
    <div class="ok-btns">
      <button class="ok-godkend" onclick="aprovoOrdren('${o.id}')">✓ Aprovo</button>
      <button class="ok-afvis" onclick="refuzoOrdren('${o.id}')">✕ Refuzo</button>
    </div>
  </div>`).join('')}</div>`;
}

function aprovoOrdren(id){
  const o=ordrer.find(x=>x.id===id);
  if(!o) return;
  o.status='aaben';
  gemData();
  renderAabneBorde();
  opdaterAabneBadge();
  genindlaesVentende();
  visToast(`Porosi #${o.ordre_nummer} u aprovua ✓ — Tavolina ${o.bord}`);
}
function refuzoOrdren(id){
  if(!confirm('Refuzo këtë porosi?')) return;
  const o=ordrer.find(x=>x.id===id);
  if(!o) return;
  o.status='afvist';gemData();genindlaesVentende();
  visToast(`Porosi #${o.ordre_nummer} u refuzua`,'gabim');
}

// =============================================
// FATURA (KVITTERING)
// =============================================
let aktivFatureOrdre=null;
function hapFature(ordre){
  aktivFatureOrdre=ordre;
  const d=new Date(ordre.betalt||ordre.oprettet);
  const ds=d.toLocaleDateString('sq-AL')+' '+d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});
  const S='================================';
  let t=`        ROLEX BAR\n     Bar & Restaurant\n${S}\n`;
  t+=`Data: ${ds}\nPorosi nr.: #${ordre.ordre_nummer}\n`;
  if(ordre.bord&&ordre.bord!=='–') t+=`Tavolina: ${ordre.bord}\n`;
  if(ordre.bruger_navn) t+=`Kamarieri: ${ordre.bruger_navn}\n`;
  t+=`${S}\n`;
  ordre.items.forEach(i=>{const nm=(i.antal+'× '+i.produkt_navn).slice(0,22);const pr=euro(i.produkt_pris*i.antal);t+=nm.padEnd(32-pr.length,' ')+pr+'\n'});
  t+=`${S}\n`;
  const totStr=euro(ordre.total);
  t+=`${'TOTALI'.padEnd(32-totStr.length,' ')}${totStr}\n`;
  const bet=ordre.betaling==='kontant'?'Kesh':ordre.betaling==='kort'?'Kartë':'Mobil';
  t+=`Paguar me: ${bet}\n`;
  if(ordre.kusuri>0.001) t+=`Kusuri: ${euro(ordre.kusuri)}\n`;
  if(ordre.note) t+=`Shënim: ${ordre.note}\n`;
  t+=`${S}\n   Ju faleminderit! 🙏\n   Mirë se vini sërish`;
  document.getElementById('kvit-indhold').textContent=t;
  document.getElementById('kvittering-modal').classList.add('vis');
}

function printFature(){
  if(!aktivFatureOrdre) return;
  const o=aktivFatureOrdre;
  const d=new Date(o.betalt||o.oprettet);
  const ds=d.toLocaleDateString('sq-AL')+' '+d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});
  document.getElementById('print-area').innerHTML=`<div style="width:80mm;font-family:'Courier New',monospace;font-size:12px;padding:4mm">
    <div style="text-align:center;font-size:15px;font-weight:bold;margin-bottom:3px">ROLEX BAR</div>
    <div style="text-align:center;font-size:10px;margin-bottom:7px">Eat & More</div>
    <div style="border-top:1px dashed #000;margin:5px 0"></div>
    <div>Data: ${ds}</div><div>Porosi: #${o.ordre_nummer}</div>
    ${o.bord&&o.bord!=='–'?`<div>Tavolina: ${o.bord}</div>`:''}
    ${o.bruger_navn?`<div>Kamarieri: ${o.bruger_navn}</div>`:''}
    <div style="border-top:1px dashed #000;margin:5px 0"></div>
    ${o.items.map(i=>`<div style="display:flex;justify-content:space-between"><span>${i.antal}× ${i.produkt_navn}</span><span>${euro(i.produkt_pris*i.antal)}</span></div>`).join('')}
    <div style="border-top:1px solid #000;margin:5px 0"></div>
    <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px"><span>TOTALI</span><span>${euro(o.total)}</span></div>
    <div>Paguar me: ${o.betaling==='kontant'?'Kesh':o.betaling==='kort'?'Kartë':'Mobil'}</div>
    ${o.kusuri>0.001?`<div>Kusuri: ${euro(o.kusuri)}</div>`:''}
    ${o.note?`<div style="margin-top:5px;font-size:10px">Shënim: ${o.note}</div>`:''}
    <div style="border-top:1px dashed #000;margin:7px 0"></div>
    <div style="text-align:center">Ju faleminderit! 🙏</div>
    <div style="text-align:center">Mirë se vini sërish</div>
  </div>`;
  document.getElementById('print-area').style.display='block';
  window.print();
  document.getElementById('print-area').style.display='none';
}

// =============================================
// XHIRO (OMSÆTNING)
// =============================================
function skiftPeriode(p,el){aktivPeriode=p;document.querySelectorAll('.periode-btn').forEach(b=>b.classList.remove('aktiv'));el.classList.add('aktiv');opdaterOmsaetning()}
async function opdaterOmsaetning(){
  const dato=document.getElementById('periode-dato').value||sotDita();
  const d=new Date(dato);
  let fraStr,tilStr,labels=[],data=[],titull='';
  if(aktivPeriode==='dag'){
    fraStr=_localIso(dato,'00:00:00');tilStr=_localIso(dato,'23:59:59');
    titull='Xhiro orë pas ore — '+d.toLocaleDateString('sq-AL');
  } else if(aktivPeriode==='uge'){
    const e=new Date(d);e.setDate(d.getDate()-((d.getDay()+6)%7));
    const s=new Date(e);s.setDate(e.getDate()+6);
    const ef=`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,'0')}-${String(e.getDate()).padStart(2,'0')}`;
    const sf=`${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,'0')}-${String(s.getDate()).padStart(2,'0')}`;
    fraStr=_localIso(ef,'00:00:00');tilStr=_localIso(sf,'23:59:59');
    titull='Xhiro ditore — Java '+(()=>{const d2=new Date(Date.UTC(e.getFullYear(),e.getMonth(),e.getDate()));d2.setUTCDate(d2.getUTCDate()+4-(d2.getUTCDay()||7));return Math.ceil(((d2-new Date(Date.UTC(d2.getUTCFullYear(),0,1)))/86400000+1)/7)})();
  } else {
    const v=d.getFullYear(),m=d.getMonth(),nd=new Date(v,m+1,0).getDate();
    const mStr=String(m+1).padStart(2,'0');
    fraStr=_localIso(`${v}-${mStr}-01`,'00:00:00');
    tilStr=_localIso(`${v}-${mStr}-${String(nd).padStart(2,'0')}`,'23:59:59');
    titull='Xhiro mujore — '+d.toLocaleDateString('sq-AL',{month:'long',year:'numeric'});
  }
  const {data:rows,error}=await sb.from('ordrer').select('*,ordre_linjer(*)').eq('restaurant_id',RESTAURANT_ID).eq('status','betalt').gte('oprettet',fraStr).lte('oprettet',tilStr);
  if(error){console.error('opdaterOmsaetning',error);document.getElementById('kpi-grid').innerHTML=`<div style="color:var(--roed);padding:12px;grid-column:1/-1">⚠️ Gabim: ${error.message}</div>`;return}
  const rel=(rows||[]).map(o=>({...o,items:(o.ordre_linjer||[]).map(l=>({produkt_navn:l.navn,antal:l.antal,produkt_pris:l.pris}))}));
  _xhiroRel=rel;
  // Staff cards — derived from same fetch, no extra query
  const stafiAgg={};
  rel.forEach(o=>{const key=o.bruger_id||'_anon';const navn=o.bruger_navn||'Pa caktuar';if(!stafiAgg[key])stafiAgg[key]={key,navn,porosi:0,xhiro:0};stafiAgg[key].porosi++;stafiAgg[key].xhiro+=parseFloat(o.total)||0});
  const stafiRadhit=Object.values(stafiAgg).sort((a,b)=>b.xhiro-a.xhiro);
  const stafiTot=stafiRadhit.reduce((s,r)=>s+r.xhiro,0);
  const stafiEl=document.getElementById('xh-stafi-kortet');
  if(stafiEl){
    document.getElementById('xh-stafi-periodo').textContent=titull.replace(/^Xhiro\s+\S+\s+—\s+/,'');
    stafiEl.innerHTML=!stafiRadhit.length?'<div class="ps-loading">Nuk ka të dhëna</div>':stafiRadhit.map((r,i)=>{const pct=stafiTot>0?Math.round(r.xhiro/stafiTot*100):0;const clr=BRUGER_COLORS[i%BRUGER_COLORS.length];const init=r.navn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();return `<div class="xh-stafi-kort" style="cursor:pointer" onclick="hapStafiOrdret('${r.key}',${i})"><div class="xh-stafi-avatar" style="background:${clr}">${init}</div><div class="xh-stafi-emri">${r.navn}</div><div class="xh-stafi-xhiro">${euro(r.xhiro)}</div><div class="xh-stafi-meta">${r.porosi} porosi · ${pct}%</div><div class="xh-stafi-bar-wrap"><div class="xh-stafi-bar-fill" style="width:${pct}%;background:${clr}"></div></div></div>`}).join('');
  }
  if(aktivPeriode==='dag'){
    const t={};for(let h=7;h<=22;h++)t[h]=0;
    rel.forEach(o=>{const h=new Date(o.oprettet).getHours();if(t[h]!==undefined)t[h]+=o.total});
    labels=Object.keys(t).map(h=>h+':00');data=Object.values(t);
  } else if(aktivPeriode==='uge'){
    const e=new Date(d);e.setDate(d.getDate()-((d.getDay()+6)%7));
    for(let i=0;i<7;i++){const g=new Date(e);g.setDate(e.getDate()+i);const ds=g.toISOString().slice(0,10);const dr=rel.filter(o=>o.oprettet.slice(0,10)===ds);labels.push(g.toLocaleDateString('sq-AL',{weekday:'short',day:'numeric'}));data.push(dr.reduce((s,o)=>s+o.total,0))}
  } else {
    const v=d.getFullYear(),m=d.getMonth(),nd=new Date(v,m+1,0).getDate();
    for(let g=1;g<=nd;g++){const ds=`${v}-${String(m+1).padStart(2,'0')}-${String(g).padStart(2,'0')}`;const dr=rel.filter(o=>o.oprettet.slice(0,10)===ds);labels.push(String(g));data.push(dr.reduce((s,o)=>s+o.total,0))}
  }
  document.getElementById('chart-titel').textContent=titull;
  const xhiro=rel.reduce((s,o)=>s+o.total,0);
  const nt=rel.length;
  const snit=nt?xhiro/nt:0;
  const tvsh=rel.reduce((s,o)=>s+(o.moms||0),0);
  const pt={};rel.forEach(o=>o.items.forEach(i=>{pt[i.produkt_navn]=(pt[i.produkt_navn]||0)+i.antal}));
  const top=Object.entries(pt).sort((a,b)=>b[1]-a[1])[0];
  const kesh=rel.filter(o=>o.betaling==='kontant').reduce((s,o)=>s+o.total,0);
  const karte=rel.filter(o=>o.betaling==='kort'||o.betaling==='mobil').reduce((s,o)=>s+o.total,0);
  document.getElementById('kpi-grid').innerHTML=`
    <div class="xh-total-kort">
      <div class="xh-total-label">${titull}</div>
      <div class="xh-total-vaerdi"><span>€</span>${xhiro.toFixed(2).replace('.',',')}</div>
      <div class="xh-total-stats"><span><strong>${nt}</strong> transaksione</span><span style="opacity:.4">·</span><span>mesatare <strong>${euro(snit)}</strong></span></div>
    </div>
    <div class="xh-kpi-row">
      <div class="xh-kpi-mini"><span class="xh-kpi-mini-ikon">🏆</span><span class="xh-kpi-mini-val">${top?top[0]:'–'}</span><span class="xh-kpi-mini-lbl">Produkti kryesor</span></div>
      <div class="xh-kpi-mini"><span class="xh-kpi-mini-ikon">🧾</span><span class="xh-kpi-mini-val">${Math.round(tvsh)} €</span><span class="xh-kpi-mini-lbl">TVSH 18%</span></div>
      <div class="xh-kpi-mini"><span class="xh-kpi-mini-ikon">💵</span><span class="xh-kpi-mini-val">${euro(kesh)}</span><span class="xh-kpi-mini-lbl">Kesh</span></div>
      <div class="xh-kpi-mini"><span class="xh-kpi-mini-ikon">💳</span><span class="xh-kpi-mini-val">${euro(karte)}</span><span class="xh-kpi-mini-lbl">Kartë/Mobil</span></div>
    </div>`;
  if(periodeChart) periodeChart.destroy();
  periodeChart=new Chart(document.getElementById('hoved-chart').getContext('2d'),{type:'bar',data:{labels,datasets:[{label:'€',data,backgroundColor:'rgba(201,150,59,.7)',borderColor:'#C9963B',borderWidth:2,borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>euro(c.raw)}}},scales:{y:{beginAtZero:true,ticks:{callback:v=>Math.round(v)+' €'}}}}});
  const top5=Object.entries(pt).sort((a,b)=>b[1]-a[1]).slice(0,5);
  document.getElementById('top5-tabel').innerHTML=`<h3>Top 5 produktet</h3>${top5.map((p,i)=>`<div class="mt-raekke"><span>${i+1}. ${p[0]}</span><span>${p[1]} cop.</span></div>`).join('')||'<div style="color:var(--tekst-lys);font-size:.83rem;padding:8px 0">Nuk ka të dhëna</div>'}`;
  document.getElementById('betaling-tabel').innerHTML=`<h3>Ndarja e pagesave</h3><div class="mt-raekke"><span>💵 Kesh</span><span>${euro(kesh)}</span></div><div class="mt-raekke"><span>💳 Kartë/Mobil</span><span>${euro(karte)}</span></div><div class="mt-raekke" style="font-weight:700"><span>Totali</span><span>${euro(xhiro)}</span></div>`;
}

function hapStafiOrdret(key, colorIdx){
  const clr=BRUGER_COLORS[colorIdx%BRUGER_COLORS.length];
  const ordret=key==='_anon'
    ?_xhiroRel.filter(o=>!o.bruger_id)
    :_xhiroRel.filter(o=>o.bruger_id===key);
  ordret.sort((a,b)=>new Date(b.oprettet)-new Date(a.oprettet));
  const navn=ordret[0]?.bruger_navn||'Pa caktuar';
  const init=navn.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const totXhiro=ordret.reduce((s,o)=>s+o.total,0);
  document.getElementById('so-header').innerHTML=`
    <div style="display:flex;align-items:center;gap:14px">
      <div style="width:48px;height:48px;border-radius:50%;background:${clr};display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:800;color:#fff;flex-shrink:0">${init}</div>
      <div>
        <div style="font-size:1.05rem;font-weight:800;color:var(--tekst)">${navn}</div>
        <div style="font-size:.8rem;color:var(--tekst-lys);margin-top:3px">${ordret.length} porosi · ${euro(totXhiro)}</div>
      </div>
    </div>`;
  document.getElementById('so-liste').innerHTML=!ordret.length
    ?'<div class="ps-loading" style="padding:24px 0">Nuk ka porosi</div>'
    :ordret.map(o=>{
        const koha=new Date(o.oprettet).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});
        const data=new Date(o.oprettet).toLocaleDateString('sq-AL',{day:'2-digit',month:'2-digit'});
        const items=(o.items||[]).map(i=>i.antal+'× '+i.produkt_navn).join(', ');
        const bet=o.betaling==='kontant'?'💵 Kesh':o.betaling==='kort'?'💳 Kartë':'💳';
        return `<div class="so-raekke">
          <div class="so-meta">#${o.ordre_nummer}${o.bord&&o.bord!=='–'?` · Tab ${o.bord}`:''} · ${data} ${koha}</div>
          <div class="so-items">${items||'–'}</div>
          <div class="so-total">${bet} · ${euro(o.total)}</div>
        </div>`;
      }).join('');
  document.getElementById('stafi-ordret-modal').classList.add('vis');
}

// ─── PRODUKT-SHITJE ───────────────────────────────
let _shitjetData=[];
let _sortKey='antal';
let _shitjetNgarkuar=false;
function ngarkoShitjetProdukt(el){
  if(el.open && !_shitjetNgarkuar){
    _shitjetNgarkuar=true;
    opdaterShitjetProdukt();
  }
}
async function opdaterShitjetProdukt(){
  const fra=document.getElementById('ps-fra').value;
  const til=document.getElementById('ps-til').value;
  const liste=document.getElementById('produkt-shitje-liste');
  liste.innerHTML='<div class="ps-loading">Duke ngarkuar...</div>';
  let q=sb.from('ordrer').select('ordre_linjer(navn,pris,antal)').eq('restaurant_id',RESTAURANT_ID).eq('status','betalt');
  if(fra) q=q.gte('oprettet',_localIso(fra,'00:00:00'));
  if(til) q=q.lte('oprettet',_localIso(til,'23:59:59'));
  const {data,error}=await q;
  if(error){liste.innerHTML='<div class="ps-loading" style="color:var(--roed)">Gabim gjatë ngarkimit</div>';return}
  const agg={};
  (data||[]).forEach(o=>(o.ordre_linjer||[]).forEach(l=>{
    if(!agg[l.navn]) agg[l.navn]={namn:l.navn,antal:0,xhiro:0};
    agg[l.navn].antal+=l.antal;
    agg[l.navn].xhiro+=l.pris*l.antal;
  }));
  _shitjetData=Object.values(agg);
  renderShitjet();
}
function renderShitjet(){
  const liste=document.getElementById('produkt-shitje-liste');
  if(!_shitjetData.length){liste.innerHTML='<div class="ps-loading">Nuk ka të dhëna për periudhën e zgjedhur</div>';return}
  let sorted=[..._shitjetData];
  if(_sortKey==='antal') sorted.sort((a,b)=>b.antal-a.antal);
  else if(_sortKey==='xhiro') sorted.sort((a,b)=>b.xhiro-a.xhiro);
  else sorted.sort((a,b)=>a.namn.localeCompare(b.namn));
  liste.innerHTML='<div class="ps-raekke ps-header-row"><span>Produkti</span><span>Sasia</span><span>Xhiro</span></div>'+
    sorted.map((p,i)=>`<div class="ps-raekke${i%2?'':' alt'}"><span class="ps-namn">${p.namn}</span><span class="ps-antal">${p.antal} cop.</span><span class="ps-xhiro">${euro(p.xhiro)}</span></div>`).join('');
}
function sorterShitjet(key,el){
  _sortKey=key;
  document.querySelectorAll('.ps-sort-btn').forEach(b=>b.classList.remove('aktiv'));
  el.classList.add('aktiv');
  renderShitjet();
}
function eksporterCSV(){
  let csv='Porosi,Data,Totali,Pagesa,Artikujt\n';
  ordrer.filter(o=>o.status==='betalt').forEach(o=>{const it=o.items.map(i=>i.antal+'x '+i.produkt_navn).join(' | ');csv+=`${o.ordre_nummer},"${formatData(o.oprettet)}",${o.total.toFixed(2)},${o.betaling},"${it}"\n`});
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download=`rolex_bar_${sotDita()}.csv`;a.click();
}

// ─── PERSONELI (USER MANAGEMENT) ─────────────
async function hashPin(pin){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

const BRUGER_COLORS=['#E74C3C','#E67E22','#27AE60','#2980B9','#8E44AD','#16A085','#C0392B','#1ABC9C'];

function renderBrugereAdmin(){
  const liste=document.getElementById('personel-liste');
  if(!liste) return;
  if(!brugere.length){
    liste.innerHTML='<div style="color:var(--tekst-lys);font-size:.85rem;padding:12px 0">Nuk ka personel. Shto personin e parë me butonin +.</div>';
    return;
  }
  liste.innerHTML=brugere.map((b,i)=>`
    <div class="pers-raekke">
      <div class="pers-avatar" style="background:${BRUGER_COLORS[i%BRUGER_COLORS.length]}">${b.navn.charAt(0).toUpperCase()}</div>
      <div class="pers-info">
        <div class="pers-emri">${b.navn}</div>
        <div class="pers-meta">${b.rolle==='admin'?'Administrator':'Kamerier'} · <span style="color:${b.aktiv?'var(--groen)':'var(--roed)'}">${b.aktiv?'Aktiv':'Joaktiv'}</span></div>
      </div>
      <div class="pers-btns">
        <button class="tilfoej-btn" style="font-size:.78rem;padding:6px 12px" onclick="hapBrugerModal('${b.id}')">✏️ Ndrysho</button>
        <button class="tilfoej-btn" style="font-size:.78rem;padding:6px 12px;background:${b.aktiv?'var(--roed)':'var(--groen)'}" onclick="toggleBrugerAktiv('${b.id}',${b.aktiv})">${b.aktiv?'Çaktivo':'Aktivo'}</button>
      </div>
    </div>`).join('');
}

function hapBrugerModal(id=null){
  if(!erAdmin){visToast('🔒 Vetëm Admin!','gabim');return}
  const b=id?brugere.find(x=>x.id===id):null;
  document.getElementById('bm-id').value=b?.id||'';
  document.getElementById('bm-titel').textContent=b?'Ndrysho personin':'Person i ri';
  document.getElementById('bm-navn').value=b?.navn||'';
  document.getElementById('bm-rolle').value=b?.rolle||'tjener';
  document.getElementById('bm-pin').value='';
  document.getElementById('bm-pin2').value='';
  document.getElementById('bm-gabim').style.display='none';
  document.getElementById('bm-pin-label').textContent=b?'PIN i ri (lëre bosh për ta mbajtur)':'PIN (4 shifra)';
  document.getElementById('bruger-modal').classList.add('vis');
}

async function ruajBruger(){
  const id=document.getElementById('bm-id').value;
  const navn=document.getElementById('bm-navn').value.trim();
  const rolle=document.getElementById('bm-rolle').value;
  const pin=document.getElementById('bm-pin').value;
  const pin2=document.getElementById('bm-pin2').value;
  const gabimEl=document.getElementById('bm-gabim');
  gabimEl.style.display='none';
  if(!navn){gabimEl.textContent='Emri është i detyrueshëm';gabimEl.style.display='block';return}
  let pin_hash=null;
  if(pin||!id){
    if(!pin){gabimEl.textContent='PIN-i është i detyrueshëm';gabimEl.style.display='block';return}
    if(!/^\d{4}$/.test(pin)){gabimEl.textContent='PIN-i duhet të jetë saktësisht 4 shifra';gabimEl.style.display='block';return}
    if(pin!==pin2){gabimEl.textContent='PIN-et nuk përputhen';gabimEl.style.display='block';return}
    pin_hash=await hashPin(pin);
  }
  const row={restaurant_id:RESTAURANT_ID,navn,rolle,...(pin_hash?{pin_hash}:{})};
  let error;
  if(id){({error}=await sb.from('brugere').update(row).eq('id',id))}
  else{({error}=await sb.from('brugere').insert({...row,aktiv:true}))}
  if(error){gabimEl.textContent='Gabim: '+error.message;gabimEl.style.display='block';return}
  mbyllModal('bruger-modal');
  const {data}=await sb.from('brugere').select('*').eq('restaurant_id',RESTAURANT_ID).order('oprettet');
  brugere=data||[];
  renderBrugereAdmin();
  visToast(id?'✓ I ruajtur':'✓ Personi u shtua');
}

async function toggleBrugerAktiv(id,aktiv){
  const {error}=await sb.from('brugere').update({aktiv:!aktiv}).eq('id',id);
  if(error){visToast('Gabim!','gabim');return}
  brugere=brugere.map(b=>b.id===id?{...b,aktiv:!aktiv}:b);
  renderBrugereAdmin();
  visToast(!aktiv?'✓ Aktivizuar':'Çaktivizuar');
}

// ─── PER-USER XHIRO ──────────────────────────
async function opdaterShitjetPersonel(){
  const fra=document.getElementById('ps-fra').value;
  const til=document.getElementById('ps-til').value;
  const liste=document.getElementById('personel-shitje-liste');
  if(!liste) return;
  liste.innerHTML='<div class="ps-loading">Duke ngarkuar...</div>';
  let q=sb.from('ordrer').select('bruger_id,bruger_navn,total').eq('restaurant_id',RESTAURANT_ID).eq('status','betalt');
  if(fra) q=q.gte('oprettet',_localIso(fra,'00:00:00'));
  if(til) q=q.lte('oprettet',_localIso(til,'23:59:59'));
  const {data,error}=await q;
  if(error){liste.innerHTML='<div class="ps-loading" style="color:var(--roed)">Gabim</div>';return}
  const agg={};
  (data||[]).forEach(o=>{
    const key=o.bruger_id||'_anon';
    const navn=o.bruger_navn||'Pa caktuar';
    if(!agg[key]) agg[key]={navn,porosi:0,xhiro:0};
    agg[key].porosi++;
    agg[key].xhiro+=parseFloat(o.total)||0;
  });
  const rows=Object.values(agg).sort((a,b)=>b.xhiro-a.xhiro);
  if(!rows.length){liste.innerHTML='<div class="ps-loading">Nuk ka të dhëna</div>';return}
  liste.innerHTML='<div class="ps-raekke ps-header-row"><span>Personi</span><span>Porosi</span><span>Xhiro</span></div>'+
    rows.map((r,i)=>`<div class="ps-raekke${i%2?'':' alt'}"><span class="ps-namn">${r.navn}</span><span class="ps-antal">${r.porosi}</span><span class="ps-xhiro">${euro(r.xhiro)}</span></div>`).join('');
}

// ─── KASSA KONTROLL ──────────────────────────
async function renderKassaKontroll(){
  const wrap=document.getElementById('kassa-tabel-wrap');
  if(!wrap) return;
  const dato=document.getElementById('kassa-dato').value||sotDita();
  wrap.innerHTML='<div class="ps-loading">Duke ngarkuar...</div>';
  const aktive=brugere.filter(b=>b.aktiv);
  if(!aktive.length){wrap.innerHTML='<div class="ps-loading">Nuk ka personel aktiv</div>';return}

  const [gjRes,salesRes]=await Promise.all([
    sb.from('kassa_gjendja').select('*').eq('restaurant_id',RESTAURANT_ID).eq('data',dato),
    sb.from('ordrer').select('bruger_id,total').eq('restaurant_id',RESTAURANT_ID).eq('status','betalt').eq('betaling','kontant').gte('oprettet',_localIso(dato,'00:00:00')).lte('oprettet',_localIso(dato,'23:59:59'))
  ]);
  const gj={};(gjRes.data||[]).forEach(r=>{gj[r.bruger_id]=r});
  const sh={};(salesRes.data||[]).forEach(o=>{if(o.bruger_id) sh[o.bruger_id]=(sh[o.bruger_id]||0)+parseFloat(o.total||0)});

  const rows=gjRes.data||[];
  const mbyllur=rows.some(r=>r.mbyllur);
  _kassaMbyllur=mbyllur;
  const mbyllurRow=rows.find(r=>r.mbyllur);
  const mbyllurNe=mbyllurRow?.mbyllur_ne;
  const mbyllurNga=mbyllurRow?.mbyllur_nga;

  const mbyllBtn=document.getElementById('kassa-mbyll-btn');
  if(mbyllBtn) mbyllBtn.style.display=(erAdmin&&!mbyllur)?'':'none';

  const timeStr=mbyllurNe
    ?new Date(mbyllurNe).toLocaleTimeString('sq',{hour:'2-digit',minute:'2-digit',hour12:false}):'';
  const banner=mbyllur
    ?`<div class="kassa-mbyllur-banner">✅ Ditë e mbyllur · ${dato}${timeStr?' · '+timeStr:''}${mbyllurNga?' nga '+mbyllurNga:''}`
      +(erAdmin?`<button class="kassa-rihap-btn" onclick="rihaditDiten('${dato}')">✏️ Rihap</button>`:'')
      +`</div>`
    :'';

  const tableRows=aktive.map((b,i)=>{
    const g=gj[b.id]||{};
    const fillim=g.fillim!=null?parseFloat(g.fillim):null;
    const fund=g.fund!=null?parseFloat(g.fund):null;
    const shitje=mbyllur?(g.shitje_kesh!=null?parseFloat(g.shitje_kesh):0):(sh[b.id]||0);
    let diffHtml='<span class="kassa-diff nul">–</span>';
    if(fillim!==null&&fund!==null){
      const d=fund-(fillim+shitje);
      const cls=Math.abs(d)<0.005?'nul':d>0?'plus':'minus';
      diffHtml=`<span class="kassa-diff ${cls}">${d>=0?'+':''}${d.toFixed(2)} €</span>`;
    }
    if(mbyllur){
      return `<tr>
        <td><span class="kassa-avatar-sm" style="background:${BRUGER_COLORS[i%BRUGER_COLORS.length]}">${b.navn.charAt(0)}</span>${b.navn}</td>
        <td style="text-align:right"><span class="kassa-locked">${fillim!==null?fillim.toFixed(2)+' €':'–'}</span></td>
        <td class="kassa-shitje" style="text-align:right">${euro(shitje)}</td>
        <td style="text-align:right"><span class="kassa-locked">${fund!==null?fund.toFixed(2)+' €':'–'}</span></td>
        <td style="text-align:right">${diffHtml}</td>
      </tr>`;
    }
    const fillimCel=fillim===null
      ?`<input class="kassa-inp" type="number" step="0.01" min="0" placeholder="0.00" onblur="ruajKassa('${b.id}','fillim',this.value,'${dato}')">`
      :`<span class="kassa-locked">${fillim.toFixed(2)} €</span><span class="kassa-lock-ikon" title="E bllokuar">🔒</span>`
        +(erAdmin?`<button class="kassa-unlock-btn" title="Ndrysho (Admin)" onclick="hapeLlojaKasses('${b.id}',${fillim},'${dato}')">✏️</button>`:'');
    return `<tr>
      <td><span class="kassa-avatar-sm" style="background:${BRUGER_COLORS[i%BRUGER_COLORS.length]}">${b.navn.charAt(0)}</span>${b.navn}</td>
      <td id="kassa-fillim-${b.id}" style="text-align:right">${fillimCel}</td>
      <td class="kassa-shitje" style="text-align:right">${euro(shitje)}</td>
      <td style="text-align:right"><input class="kassa-inp" type="number" step="0.01" min="0" value="${fund!==null?fund.toFixed(2):''}" placeholder="0.00" onblur="ruajKassa('${b.id}','fund',this.value,'${dato}')"></td>
      <td style="text-align:right">${diffHtml}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML=banner+`<table class="kassa-tabel">
    <thead><tr>
      <th>Personi</th>
      <th style="text-align:right">Fillimi €</th>
      <th style="text-align:right">Shitje kesh</th>
      <th style="text-align:right">Fundi €</th>
      <th style="text-align:right">Diferenca</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>`;
}

function hapeLlojaKasses(brugerId,currentVal,dato){
  if(!erAdmin){visToast('🔒 Vetëm Admin mund ta ndryshojë fillimin!','gabim');return}
  if(_kassaMbyllur){visToast('🔒 Dita është mbyllur. Rihap para se të ndryshosh.','gabim');return}
  const cell=document.getElementById('kassa-fillim-'+brugerId);
  cell.innerHTML=`<input class="kassa-inp" type="number" step="0.01" min="0" value="${parseFloat(currentVal).toFixed(2)}" onblur="ruajKassa('${brugerId}','fillim',this.value,'${dato}')">`;
  cell.querySelector('input').focus();
  cell.querySelector('input').select();
}

async function ruajKassa(brugerId,field,valStr,dato){
  if(_kassaMbyllur){visToast('🔒 Dita është mbyllur. Rihap para se të ndryshosh.','gabim');renderKassaKontroll();return}
  const val=parseFloat(valStr);
  if(isNaN(val)||val<0) return;
  await sb.from('kassa_gjendja').upsert(
    {restaurant_id:RESTAURANT_ID,bruger_id:brugerId,data:dato,[field]:val},
    {onConflict:'restaurant_id,bruger_id,data'}
  );
  renderKassaKontroll();
}

async function mbyllDiten(){
  if(!erAdmin){hapLoginModalNormal();visToast('🔒 Vetëm Admin!','gabim');return}
  const dato=document.getElementById('kassa-dato').value||sotDita();
  if(!confirm(`Mbyll ditën ${dato}?\n\nKjo do të bllokojë të dhënat e kasës për këtë ditë.\nMund të hapet sërish vetëm me veprim të qëllimshëm Admin.`)) return;

  const [gjRes,salesRes]=await Promise.all([
    sb.from('kassa_gjendja').select('*').eq('restaurant_id',RESTAURANT_ID).eq('data',dato),
    sb.from('ordrer').select('bruger_id,total').eq('restaurant_id',RESTAURANT_ID).eq('status','betalt').eq('betaling','kontant').gte('oprettet',_localIso(dato,'00:00:00')).lte('oprettet',_localIso(dato,'23:59:59'))
  ]);
  const sh={};
  (salesRes.data||[]).forEach(o=>{if(o.bruger_id) sh[o.bruger_id]=(sh[o.bruger_id]||0)+parseFloat(o.total||0)});
  const existing={};
  (gjRes.data||[]).forEach(r=>{existing[r.bruger_id]=r});

  const tani=new Date().toISOString();
  const mbyllurNga=aktivBruger?.navn||'Admin';
  const upsertRows=brugere.filter(b=>b.aktiv).map(b=>{
    const e=existing[b.id]||{};
    return {restaurant_id:RESTAURANT_ID,bruger_id:b.id,data:dato,
      fillim:e.fillim??null,fund:e.fund??null,
      shitje_kesh:sh[b.id]||0,mbyllur:true,mbyllur_ne:tani,mbyllur_nga:mbyllurNga};
  });
  const {error}=await sb.from('kassa_gjendja').upsert(upsertRows,{onConflict:'restaurant_id,bruger_id,data'});
  if(error){visToast('Gabim gjatë mbylljes','gabim');console.error(error);return}
  visToast(`Dita ${dato} u mbyll ✓`);
  renderKassaKontroll();
  const histDet=document.getElementById('kassa-historia-details');
  if(histDet?.open) ngarkoHistorikenKasses(histDet);
}

async function rihaditDiten(dato){
  if(!erAdmin){hapLoginModalNormal();return}
  if(!confirm(`Rihap ditën ${dato}?\n\nTë dhënat do të bëhen sërish të redaktueshme.`)) return;
  const {error}=await sb.from('kassa_gjendja').update({mbyllur:false,mbyllur_ne:null})
    .eq('restaurant_id',RESTAURANT_ID).eq('data',dato);
  if(error){visToast('Gabim','gabim');return}
  renderKassaKontroll();
  visToast(`Dita ${dato} u rihap ✓`);
}

async function ngarkoHistorikenKasses(el){
  if(!el.open) return;
  const wrap=document.getElementById('kassa-historia-wrap');
  if(!wrap) return;
  wrap.innerHTML='<div class="ps-loading">Duke ngarkuar...</div>';
  const {data,error}=await sb.from('kassa_gjendja').select('*')
    .eq('restaurant_id',RESTAURANT_ID).eq('mbyllur',true).order('data',{ascending:false});
  if(error||!data?.length){
    wrap.innerHTML='<div class="ps-loading">Nuk ka ditë të mbyllura akoma</div>';return;
  }
  const byDate={};
  data.forEach(r=>{if(!byDate[r.data]) byDate[r.data]=[];byDate[r.data].push(r)});
  const dates=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
  wrap.innerHTML=dates.map(dato=>{
    const rows=byDate[dato];
    const totFillim=rows.reduce((s,r)=>s+(parseFloat(r.fillim)||0),0);
    const totShitje=rows.reduce((s,r)=>s+(parseFloat(r.shitje_kesh)||0),0);
    const totFund=rows.reduce((s,r)=>s+(parseFloat(r.fund)||0),0);
    const diff=totFund-(totFillim+totShitje);
    const diffCls=Math.abs(diff)<0.005?'nul':diff>0?'plus':'minus';
    const mne=rows[0]?.mbyllur_ne?new Date(rows[0].mbyllur_ne):null;
    const mnga=rows[0]?.mbyllur_nga||'';
    const closedStr=mne
      ?mne.toLocaleDateString('sq',{day:'2-digit',month:'2-digit',year:'numeric'})
        +' '+mne.toLocaleTimeString('sq',{hour:'2-digit',minute:'2-digit',hour12:false})
      :dato;
    return `<details class="kh-dita">
      <summary class="kh-summary">
        <span class="kh-dato">${dato}</span>
        <span class="kh-col"><span class="kh-lbl">Fillim</span>${euro(totFillim)}</span>
        <span class="kh-col"><span class="kh-lbl">Shitje kesh</span>${euro(totShitje)}</span>
        <span class="kh-col"><span class="kh-lbl">Fundi</span>${euro(totFund)}</span>
        <span class="kassa-diff ${diffCls}">${diff>=0?'+':''}${diff.toFixed(2)} €</span>
        <span class="kh-closed-by">🔒 ${closedStr}${mnga?' · '+mnga:''}</span>
      </summary>
      <div class="kh-personel">${rows.map((r,i)=>{
        const b=brugere.find(x=>x.id===r.bruger_id);
        const emri=b?.navn||'I panjohur';
        const fill=parseFloat(r.fillim)||0;
        const shitje=parseFloat(r.shitje_kesh)||0;
        const fund=parseFloat(r.fund)||0;
        const dif=fund-(fill+shitje);
        const dc=Math.abs(dif)<0.005?'nul':dif>0?'plus':'minus';
        return `<div class="kh-row">
          <span class="kassa-avatar-sm" style="background:${BRUGER_COLORS[i%BRUGER_COLORS.length]}">${emri.charAt(0)}</span>
          <span class="kh-emri">${emri}</span>
          <span class="kh-v"><span class="kh-lbl">Fillim</span>${r.fillim!=null?euro(fill):'–'}</span>
          <span class="kh-v"><span class="kh-lbl">Shitje</span>${euro(shitje)}</span>
          <span class="kh-v"><span class="kh-lbl">Fundi</span>${r.fund!=null?euro(fund):'–'}</span>
          <span class="kassa-diff ${dc}">${dif>=0?'+':''}${dif.toFixed(2)} €</span>
        </div>`;
      }).join('')}</div>
    </details>`;
  }).join('');
}

// =============================================
// HISTORIKU
// =============================================
async function opdaterHistorik(){
  const fra=document.getElementById('hist-fra').value,til=document.getElementById('hist-til').value;
  const bet=document.getElementById('hist-betaling').value,stat=document.getElementById('hist-status').value;
  const liste=document.getElementById('historik-liste');
  liste.innerHTML='<div class="ingen-data" style="padding:30px">Duke ngarkuar...</div>';

  const statusFilter=_histArkivMod?['arkiveret']:['betalt','afvist'];
  let q=sb.from('ordrer')
    .select('*, ordre_linjer(*)')
    .eq('restaurant_id',RESTAURANT_ID)
    .in('status',statusFilter)
    .order('oprettet',{ascending:false})
    .limit(200);
  if(fra) q=q.gte('oprettet',_localIso(fra,'00:00:00'));
  if(til) q=q.lte('oprettet',_localIso(til,'23:59:59'));
  if(bet) q=q.eq('betaling',bet);
  if(stat&&!_histArkivMod) q=q.eq('status',stat);

  const {data,error}=await q;
  if(error){liste.innerHTML='<div class="ingen-data" style="padding:30px">Gabim gjatë ngarkimit</div>';return}

  const vis=(data||[]).map(o=>({
    ...o,
    items:(o.ordre_linjer||[]).map(l=>({produkt_id:l.produkt_id,produkt_navn:l.navn,produkt_pris:l.pris,antal:l.antal,note:''})),
    log:[]
  }));

  if(!vis.length){liste.innerHTML='<div class="ingen-data" style="padding:30px">Nuk ka porosi me këto filtra</div>';return}

  // Group orders paid at the same time on the same table (multi-round sessions)
  const gruper={};
  vis.forEach(o=>{
    const key=(o.betalt&&o.bord&&o.bord!=='–')?`${o.betalt}|${o.bord}`:o.id;
    if(!gruper[key]) gruper[key]=[];
    gruper[key].push(o);
  });
  const grupetList=Object.values(gruper).sort((a,b)=>new Date(b[0].oprettet)-new Date(a[0].oprettet));

  window._histGruper={};
  let gIdx=0;

  liste.innerHTML=grupetList.map(grup=>{
    const multi=grup.length>1;
    if(!multi){
      const o=grup[0];
      const sc=o.status==='betalt'?'paguar':o.status==='afvist'?'refuzuar':'arkivuar';
      const sl=o.status==='betalt'?'Paguar':o.status==='afvist'?'Refuzuar':'Arkivuar';
      return `<div class="ht-raekke" onclick='hapFature(${JSON.stringify(o)})'>
      <div>#${o.ordre_nummer}</div>
      <div>${formatData(o.oprettet)}</div>
      <div>${euro(o.total)}</div>
      <div>${o.betaling==='kontant'?'Kesh':o.betaling==='kort'?'Kartë':o.betaling||'–'}</div>
      <div><span class="ht-status ${sc}">${sl}</span></div>
      <div style="display:flex;gap:3px;align-items:center">
        <button class="ht-print-btn" onclick="event.stopPropagation();hapFature(${JSON.stringify(o).replace(/'/g,'&#39;')})">🖨 Printo</button>
        ${erAdmin&&!_histArkivMod?`<button class="ht-arkivo-btn" onclick="event.stopPropagation();arkivoOrdren('${o.id}')">📦</button>`:''}
      </div>
    </div>`;
    } else {
      const key='g'+(gIdx++);
      window._histGruper[key]=grup;
      const total=parseFloat(grup.reduce((s,o)=>s+parseFloat(o.total),0).toFixed(2));
      const oldest=grup[grup.length-1];
      return `<div class="ht-raekke ht-grup" onclick='hapFatureGrup("${key}")'>
      <div>🍽️ ${oldest.bord} <span class="ht-runde-badge">${grup.length} runde</span></div>
      <div>${formatData(oldest.oprettet)}</div>
      <div>${euro(total)}</div>
      <div>Kesh</div>
      <div><span class="ht-status paguar">Paguar</span></div>
      <div style="display:flex;gap:3px;align-items:center">
        <button class="ht-print-btn" onclick="event.stopPropagation();hapFatureGrup('${key}')">🖨 Printo</button>
        ${erAdmin&&!_histArkivMod?`<button class="ht-arkivo-btn" onclick="event.stopPropagation();arkivoGrupin('${key}')">📦</button>`:''}
      </div>
    </div>`;
    }
  }).join('');
}

function hapFatureGrup(key){
  const grup=window._histGruper[key];
  if(!grup) return;
  const ordrerList=grup.slice().reverse(); // oldest first
  const total=parseFloat(ordrerList.reduce((s,o)=>s+parseFloat(o.total),0).toFixed(2));
  const kusuri=ordrerList[ordrerList.length-1].kusuri||0;
  const bord=ordrerList[0].bord;
  const d=new Date(ordrerList[ordrerList.length-1].betalt||ordrerList[ordrerList.length-1].oprettet);
  const ds=d.toLocaleDateString('sq-AL')+' '+d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});
  const S='================================';
  let t=`        ROLEX BAR\n     Bar & Restaurant\n${S}\n`;
  t+=`Data: ${ds}\nTavolina: ${bord}\n${S}\n`;
  ordrerList.forEach((o,i)=>{
    const oKoha=new Date(o.oprettet).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});
    t+=`Porosi #${o.ordre_nummer} — ${oKoha}\n`;
    o.items.forEach(it=>{const nm=(it.antal+'× '+it.produkt_navn).slice(0,22);const pr=euro(it.produkt_pris*it.antal);t+=nm.padEnd(32-pr.length,' ')+pr+'\n'});
    if(i<ordrerList.length-1) t+=`--------------------------------\n`;
  });
  const totStr=euro(total);
  t+=`${S}\n${'TOTALI'.padEnd(32-totStr.length,' ')}${totStr}\nPaguar me: Kesh\n`;
  if(kusuri>0.001) t+=`Kusuri: ${euro(kusuri)}\n`;
  t+=`${S}\n   Ju faleminderit! 🙏\n   Mirë se vini sërish`;
  aktivFatureOrdre={
    id:'kombinuar',ordre_nummer:'GJITHË',status:'betalt',
    bord,betaling:'kontant',total,kusuri,
    oprettet:ordrerList[0].oprettet,betalt:ordrerList[ordrerList.length-1].betalt,
    items:ordrerList.flatMap(o=>o.items)
  };
  document.getElementById('kvit-indhold').textContent=t;
  document.getElementById('kvittering-modal').classList.add('vis');
}

async function arkivoGrupin(key){
  if(!erAdmin){hapLoginModalNormal();visToast('🔒 Keni nevojë për login Admin!','gabim');return}
  const ids=(window._histGruper[key]||[]).map(o=>o.id);
  if(!ids.length) return;
  await sb.from('ordrer').update({status:'arkiveret'}).in('id',ids);
  opdaterHistorik();
  visToast(`${ids.length} porosi u arkivuan ✓`);
}

// =============================================
// PRODUKTET ADMIN
// =============================================
function renderAdminProdukter(){
  const grid=document.getElementById('produkt-admin-grid');
  if(!produkter.length){grid.innerHTML='<div class="ingen-data">Nuk ka produkte. Shto me "+ Produkt".</div>';return}
  grid.innerHTML=produkter.map(p=>{const k=kategorier.find(x=>x.id===p.kategori_id);return `<div class="prod-kort"><div style="font-size:1.9rem;margin-right:4px">${p.ikon||'🍽️'}</div><div class="pk-info"><h4>${p.navn}</h4><div class="kat-tag">${k?k.navn:'Pa kategori'}</div><div class="pris-tag">${euro(p.pris)}</div>${p.udsolgt?'<div class="udsolgt-tag">⚠ Mbaruar</div>':''}</div><div class="pk-handlinger"><button class="pk-rediger" onclick="hapProduktModal('${p.id}')">Ndrysho</button><button class="pk-slet" onclick="fshiProduktDirekt('${p.id}')">Fshi</button></div></div>`}).join('');
}
function hapProduktModal(id){
  const sel=document.getElementById('pm-kategori');
  sel.innerHTML=kategorier.map(k=>`<option value="${k.id}">${k.navn}</option>`).join('');
  const sb=document.getElementById('pm-slet-btn');
  if(id){const p=produkter.find(x=>x.id===id);document.getElementById('pm-titel').textContent='Ndrysho produktin';document.getElementById('pm-id').value=id;document.getElementById('pm-navn').value=p.navn;document.getElementById('pm-pris').value=p.pris;sel.value=p.kategori_id;document.getElementById('pm-ikon').value=p.ikon||'';document.getElementById('pm-beskrivelse').value=p.beskrivelse||'';document.getElementById('pm-udsolgt').checked=p.udsolgt;sb.style.display='block'}
  else{document.getElementById('pm-titel').textContent='Produkt i ri';document.getElementById('pm-id').value='';document.getElementById('pm-navn').value='';document.getElementById('pm-pris').value='';document.getElementById('pm-ikon').value='';document.getElementById('pm-beskrivelse').value='';document.getElementById('pm-udsolgt').checked=false;sb.style.display='none';if(kategorier.length)sel.value=kategorier[0].id}
  document.getElementById('produkt-modal').classList.add('vis');
}
function ruajProdukt(){
  if(!erAdmin){visToast('🔒 Keni nevojë për login Admin!','gabim');return}
  const id=document.getElementById('pm-id').value,emri=document.getElementById('pm-navn').value.trim(),cmimi=parseFloat(document.getElementById('pm-pris').value),kat=document.getElementById('pm-kategori').value,ikon=document.getElementById('pm-ikon').value.trim()||'🍽️',pershk=document.getElementById('pm-beskrivelse').value.trim(),mbaruar=document.getElementById('pm-udsolgt').checked;
  if(!emri){visToast('Shkruaj emrin e produktit','gabim');return}
  if(isNaN(cmimi)||cmimi<0){visToast('Çmim i pavlefshëm','gabim');return}
  if(id){const i=produkter.findIndex(p=>p.id===id);produkter[i]={...produkter[i],navn:emri,pris:cmimi,kategori_id:kat,ikon,beskrivelse:pershk,udsolgt:mbaruar};sb.from('produkter').upsert({...produkter[i], restaurant_id: RESTAURANT_ID}).then();visToast(`"${emri}" u ndryshua ✓`)}
  else{const prod={id:unikID(),navn:emri,pris:cmimi,kategori_id:kat,ikon,beskrivelse:pershk,udsolgt:mbaruar};produkter.push(prod);sb.from('produkter').upsert({...prod, restaurant_id: RESTAURANT_ID}).then();visToast(`"${emri}" u shtua ✓`)}
  gemData();mbyllModal('produkt-modal');renderProduktGrid();renderAdminProdukter();renderKategorier();
}
function fshiProdukt(){
  if(!erAdmin){visToast('🔒 Keni nevojë për login Admin!','gabim');return}
  const id=document.getElementById('pm-id').value;if(!id) return;
  const p=produkter.find(x=>x.id===id);
  if(!confirm(`Fshi "${p.navn}"?`)) return;
  produkter=produkter.filter(x=>x.id!==id);sb.from('produkter').delete().eq('id', id).then();gemData();mbyllModal('produkt-modal');renderProduktGrid();renderAdminProdukter();visToast(`"${p.navn}" u fshi`);
}
function fshiProduktDirekt(id){
  if(!erAdmin){visToast('🔒 Keni nevojë për login Admin!','gabim');return}
  const p=produkter.find(x=>x.id===id);
  if(!confirm(`Fshi "${p.navn}"?`)) return;
  produkter=produkter.filter(x=>x.id!==id);sb.from('produkter').delete().eq('id', id).then();gemData();renderProduktGrid();renderAdminProdukter();visToast(`"${p.navn}" u fshi`);
}

// =============================================
// KATEGORITE
// =============================================
function hapKategoriModal(){
  renderKatAdmin();
  document.getElementById('ny-kat-navn').value='';
  document.getElementById('kategori-modal').classList.add('vis');
}
function renderKatAdmin(){
  document.getElementById('kat-liste-admin').innerHTML=kategorier.map(k=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span style="font-weight:600">${k.navn}</span><div style="display:flex;gap:6px"><button onclick="riemertojKategorine('${k.id}')" style="padding:3px 10px;background:var(--brun);color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:.75rem">Riemërto</button><button onclick="fshiKategorine('${k.id}')" style="padding:3px 10px;background:none;border:1px solid var(--roed);color:var(--roed);border-radius:5px;cursor:pointer;font-size:.75rem">Fshi</button></div></div>`).join('')||'<p style="color:var(--tekst-lys);font-size:.83rem">Nuk ka kategori</p>';
}
function shtoKategori(){if(!erAdmin){visToast('🔒 Keni nevojë për login Admin!','gabim');return}const emri=document.getElementById('ny-kat-navn').value.trim();if(!emri) return;const kat={id:unikID(),navn:emri,sort:kategorier.length+1};kategorier.push(kat);sb.from('kategorier').upsert({...kat, restaurant_id: RESTAURANT_ID}).then();gemData();renderKatAdmin();document.getElementById('ny-kat-navn').value='';renderKategorier();visToast(`Kategoria "${emri}" u shtua`)}
function riemertojKategorine(id){if(!erAdmin){visToast('🔒 Keni nevojë për login Admin!','gabim');return}const k=kategorier.find(x=>x.id===id);const e=prompt('Emri i ri:',k.navn);if(!e||e===k.navn) return;k.navn=e.trim();gemData();renderKatAdmin();renderKategorier();renderProduktGrid();renderAdminProdukter();visToast(`Kategoria u riemërtua`)}
function fshiKategorine(id){if(!erAdmin){visToast('🔒 Keni nevojë për login Admin!','gabim');return}const k=kategorier.find(x=>x.id===id);if(!confirm(`Fshi kategorinë "${k.navn}"?`)) return;kategorier=kategorier.filter(x=>x.id!==id);produkter.forEach(p=>{if(p.kategori_id===id)p.kategori_id=''});sb.from('kategorier').delete().eq('id', id).then();gemData();renderKatAdmin();renderKategorier();renderProduktGrid();renderAdminProdukter()}

// =============================================
// RAPORT Z
// =============================================
async function hapZRaport(){
  const sot=sotDita();
  document.getElementById('zrap-indhold').textContent='Duke ngarkuar...';
  document.getElementById('zrap-modal').classList.add('vis');
  const {data,error}=await sb.from('ordrer')
    .select('total,moms,betaling')
    .eq('restaurant_id',RESTAURANT_ID)
    .eq('status','betalt')
    .gte('oprettet',_localIso(sot,'00:00:00'))
    .lte('oprettet',_localIso(sot,'23:59:59'));
  if(error){document.getElementById('zrap-indhold').textContent='⚠️ Gabim: '+error.message;return}
  const dr=data||[];
  const kesh=dr.filter(o=>o.betaling==='kontant').reduce((s,o)=>s+o.total,0);
  const karte=dr.filter(o=>o.betaling==='kort'||o.betaling==='mobil').reduce((s,o)=>s+o.total,0);
  const tvsh=dr.reduce((s,o)=>s+(o.moms||0),0);
  const xhiro=dr.reduce((s,o)=>s+o.total,0);
  const d=new Date();
  let t=`======== RAPORT Z ========\nRolex Bar\nData: ${d.toLocaleDateString('sq-AL')}\nGjeneruar: ${d.toLocaleTimeString('sq-AL')}\n==========================\nNr. transaksioneve: ${dr.length}\n==========================\nKesh:      ${euro(kesh)}\nKartë/Mob: ${euro(karte)}\n--------------------------\nXhiro:     ${euro(xhiro)}\nTVSH (18%):${euro(tvsh)}\nNeto:      ${euro(xhiro-tvsh)}\n==========================\nGjendja e kasës:\nJu lutemi numëroni manualisht\n==========================`;
  document.getElementById('zrap-indhold').textContent=t;
}
function printZRaport(){
  document.getElementById('print-area').innerHTML=`<div style="width:80mm;font-family:'Courier New',monospace;font-size:12px;padding:4mm">${document.getElementById('zrap-indhold').textContent.replace(/\n/g,'<br>')}</div>`;
  document.getElementById('print-area').style.display='block';window.print();document.getElementById('print-area').style.display='none';
}

// =============================================
// UR / ORA
// =============================================
function opdaterUr(){
  const n=new Date();
  document.getElementById('clock').innerHTML=n.toLocaleDateString('sq-AL',{weekday:'long',day:'numeric',month:'long'})+'<br>'+n.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
}

// =============================================
// ANALITIKA
// =============================================
let analChart=null, analForecastChart=null;
const MUAJT_SQ=['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor'];

async function renderUgensAnalyse(){
  const el=document.getElementById('anal-uge-wrap');
  if(!el) return;
  el.innerHTML='<div class="ps-loading">Analyserer ugen...</div>';

  // Week boundaries in Kosovo local time (UTC+2)
  const nowUTC=Date.now();
  const nowLocal=new Date(nowUTC+2*3600000);
  const todayStr=nowLocal.toISOString().split('T')[0];
  const dow=nowLocal.getUTCDay(); // 0=Sun
  const daysFromMon=dow===0?6:dow-1;
  const daysElapsed=daysFromMon+1;

  const thisMonLocal=new Date(nowLocal);
  thisMonLocal.setUTCDate(nowLocal.getUTCDate()-daysFromMon);
  const thisMonStr=thisMonLocal.toISOString().split('T')[0];

  const lastMonLocal=new Date(thisMonLocal);
  lastMonLocal.setUTCDate(thisMonLocal.getUTCDate()-7);
  const lastMonStr=lastMonLocal.toISOString().split('T')[0];

  const lastSunLocal=new Date(thisMonLocal);
  lastSunLocal.setUTCDate(thisMonLocal.getUTCDate()-1);
  const lastSunStr=lastSunLocal.toISOString().split('T')[0];

  const [twRes,lwRes]=await Promise.all([
    sb.from('ordrer').select('id,oprettet,total,antal_guests,bord,bruger_id,bruger_navn,ordre_linjer(navn,antal)')
      .eq('restaurant_id',RESTAURANT_ID).eq('status','betalt')
      .gte('oprettet',_localIso(thisMonStr,'00:00:00')).lte('oprettet',_localIso(todayStr,'23:59:59')),
    sb.from('ordrer').select('id,oprettet,total,antal_guests,bord,bruger_id,bruger_navn,ordre_linjer(navn,antal)')
      .eq('restaurant_id',RESTAURANT_ID).eq('status','betalt')
      .gte('oprettet',_localIso(lastMonStr,'00:00:00')).lte('oprettet',_localIso(lastSunStr,'23:59:59'))
  ]);

  const tw=twRes.data||[], lw=lwRes.data||[];
  const hasLast=lw.length>0;

  if(!tw.length&&!lw.length){
    el.innerHTML='<div class="anal-insight">Nuk ka të dhëna porosish — analiza do të shfaqet sapo të regjistrohen porositë e para.</div>';
    return;
  }

  // ── Helpers ──
  const sum=arr=>arr.reduce((s,o)=>s+(parseFloat(o.total)||0),0);
  const pctChg=(a,b)=>b>0?Math.round((a-b)/b*100):null;
  const fmtPct=n=>(n>=0?'+':'')+n+'%';
  const localH=o=>new Date(new Date(o.oprettet).getTime()+2*3600000).getUTCHours();
  const stdDev=arr=>{if(arr.length<2)return 0;const m=arr.reduce((s,v)=>s+v,0)/arr.length;return Math.sqrt(arr.reduce((s,v)=>s+(v-m)**2,0)/arr.length)};
  const dayKey=o=>new Date(new Date(o.oprettet).getTime()+2*3600000).toISOString().split('T')[0];
  const bold=s=>`<strong>${s}</strong>`;

  // ── Metrics ──
  const twRev=sum(tw), lwRev=sum(lw);
  const twCount=tw.length, lwCount=lw.length;
  const twAOV=twCount?twRev/twCount:0, lwAOV=lwCount?lwRev/lwCount:0;
  const revChg=pctChg(twRev,lwRev), cntChg=pctChg(twCount,lwCount), aovChg=pctChg(twAOV,lwAOV);

  // Guest counts
  const withG=arr=>arr.filter(o=>(o.antal_guests||0)>0);
  const avgG=arr=>{const g=withG(arr);return g.length?g.reduce((s,o)=>s+(o.antal_guests||0),0)/g.length:0};
  const twAvgG=avgG(tw), lwAvgG=avgG(lw);

  // Timing
  const twSD=stdDev(tw.map(localH)), lwSD=stdDev(lw.map(localH));
  const twHourBuckets=new Array(24).fill(0); tw.forEach(o=>twHourBuckets[localH(o)]++);
  const peakH=twHourBuckets.indexOf(Math.max(...twHourBuckets));

  // Top products this week
  const pMap={};
  tw.forEach(o=>(o.ordre_linjer||[]).forEach(l=>{pMap[l.navn]=(pMap[l.navn]||0)+(l.antal||1)}));
  const topProds=Object.entries(pMap).sort((a,b)=>b[1]-a[1]).slice(0,3);

  // Tables
  const twTables=new Set(tw.map(o=>o.bord)).size;
  const lwTables=new Set(lw.map(o=>o.bord)).size;

  // Active days
  const twDays=[...new Set(tw.map(dayKey))].length;
  const lwDays=[...new Set(lw.map(dayKey))].length;

  // Day names
  const DITE_SQ=['e diel','e hënë','e martë','e mërkurë','e enjte','e premte','e shtunë'];
  const weekDayName=DITE_SQ[new Date(thisMonStr+'T12:00:00Z').getUTCDay()];

  // ── Build paragraphs ──
  const paras=[];

  // 1. Opening
  if(!hasLast){
    paras.push(`Kjo është java e parë me të dhëna porosish — ende nuk ka asgjë për krahasim. Më poshtë është një përmbledhje e javës nga ${bold(weekDayName)} deri sot.`);
  } else {
    if(revChg===null) paras.push(`Nuk ka xhiro për të krahasuar nga java e kaluar.`);
    else if(revChg>=10) paras.push(`Ka qenë një ${bold('javë e fortë')} — xhiroja ka shënuar rritje prej ${bold(fmtPct(revChg))} krahasuar me javën e kaluar.`);
    else if(revChg>0) paras.push(`Java ka treguar ${bold('rritje të lehtë')} prej ${fmtPct(revChg)} në xhiro krahasuar me javën e kaluar.`);
    else if(revChg>=-5) paras.push(`Java ka ecur ${bold('relativisht qëndrueshëm')} me një rënie minimale prej ${Math.abs(revChg)}% në xhiro.`);
    else paras.push(`Këtë javë ${bold('xhiroja ka qenë më e ulët')} se java e kaluar — rënie prej ${bold(Math.abs(revChg)+'%')}.`);
  }

  // 2. Financial summary
  const financeLine=hasLast
    ?`Xhiro: ${bold(euro(twRev))} (kundrejt ${euro(lwRev)} javën e kaluar) · Porosi: ${bold(twCount)} (kundrejt ${lwCount}) · Mesatare/porosi: ${bold(euro(twAOV))} (kundrejt ${euro(lwAOV)})`
    :`Xhiro: ${bold(euro(twRev))} · Porosi: ${bold(twCount)} · Mesatare/porosi: ${bold(euro(twAOV))}`;
  paras.push(financeLine);

  // 3. Orders vs revenue divergence
  if(hasLast&&cntChg!==null&&aovChg!==null){
    if(cntChg>10&&aovChg<-8) paras.push(`Vërehet se kanë ardhur ${bold('më shumë porosi se javën e kaluar')} (${fmtPct(cntChg)}), por porosia mesatare ka rënë me ${bold(Math.abs(aovChg)+'%')}. Kjo mund të tregojë vizita më të shkurtra ose zgjedhje të artikujve më të lirë.`);
    else if(cntChg<-10&&aovChg>8) paras.push(`Edhe pse kanë ardhur ${bold('më pak mysafirë')} se javën e kaluar (${fmtPct(cntChg)}), ata kanë shpenzuar ${bold('më shumë për vizitë')} (+${aovChg}% mesatare/porosi) — pak mysafirë, por buxhet më të lartë.`);
    else if(cntChg>10&&aovChg>8) paras.push(`Javë ${bold('dyfisht pozitive')}: si numër porosish ashtu edhe mesatare/porosi janë rritur krahasuar me javën e kaluar.`);
    else if(cntChg<-10&&aovChg<-8) paras.push(`Javë me presion të dyfishtë — ${bold('si porosi më pak ashtu edhe mesatare më e ulët')} se javën e kaluar.`);
  }

  // 4. Guest/seating behavior
  if(twAvgG>0){
    if(hasLast&&lwAvgG>0){
      const gDiff=twAvgG-lwAvgG;
      if(gDiff>0.4) paras.push(`Mysafirët kanë ardhur në ${bold('grupe më të mëdha')} këtë javë — mesatarisht ${bold(twAvgG.toFixed(1))} persona për tavolinë kundrejt ${lwAvgG.toFixed(1)} javën e kaluar. Grupe më të mëdha zakonisht sjellin xhiro më të lartë për tavolinë.`);
      else if(gDiff<-0.4) paras.push(`Mysafirët kanë ardhur në ${bold('grupe më të vogla')} se javën e kaluar — mesatare ${bold(twAvgG.toFixed(1))} kundrejt ${lwAvgG.toFixed(1)} për tavolinë.`);
      else paras.push(`Madhësia e grupeve mbetet e qëndrueshme: ${bold(twAvgG.toFixed(1)+' persona/tavolinë')} (e pandryshuar nga java e kaluar).`);
    } else {
      paras.push(`Mysafirët kanë ulur mesatarisht ${bold(twAvgG.toFixed(1)+' persona')} për tavolinë.`);
    }
  }

  // 5. Timing pattern
  if(tw.length>=4){
    if(hasLast&&lw.length>=4){
      if(twSD>lwSD+0.8) paras.push(`Mysafirët kanë ardhur në ${bold('orare më të parregullta')} se javën e kaluar (shpërndarje ${twSD.toFixed(1)}h kundrejt ${lwSD.toFixed(1)}h) — kjo e bën planifikimin e stafit dhe përgatitjen më të vështirë.`);
      else if(lwSD>twSD+0.8) paras.push(`Mysafirët kanë treguar ${bold('model më të parashikueshëm')} se javën e kaluar (shpërndarje ${twSD.toFixed(1)}h kundrejt ${lwSD.toFixed(1)}h) — më e lehtë për t'u planifikuar.`);
    }
    if(twHourBuckets[peakH]>0) paras.push(`Ora më e ngarkuar këtë javë ka qenë ${bold(String(peakH).padStart(2,'0')+':00–'+String(peakH+1).padStart(2,'0')+':00')} me ${twHourBuckets[peakH]} porosi.`);
  }

  // 6. Table utilization
  if(hasLast&&twTables!==lwTables){
    if(twTables>lwTables) paras.push(`Aktiviteti është shpërndarë në ${bold(twTables+' tavolina')} këtë javë kundrejt ${lwTables} javën e kaluar — shfrytëzim më i gjerë i tavolinave.`);
    else paras.push(`Aktiviteti është përqendruar në ${bold(twTables+' tavolina')} (nga ${lwTables} javën e kaluar).`);
  }

  // 7. Top products
  if(topProds.length){
    const prodStr=topProds.map(([n,c])=>`${bold(n)} (${c} cop.)`).join(', ');
    paras.push(`Artikujt më të porositur këtë javë: ${prodStr}.`);
  }

  // 8. Days active + pace
  const ordersPerDay=twDays>0?Math.round(twCount/twDays):twCount;
  if(hasLast){
    const lwOrdersPerDay=lwDays>0?Math.round(lwCount/lwDays):lwCount;
    paras.push(`Ka pasur porosi në ${bold(twDays+' nga '+daysElapsed+' ditët')} deri tani këtë javë — ${bold(ordersPerDay+' porosi/ditë')} (kundrejt ${lwOrdersPerDay} javën e kaluar).`);
  } else {
    paras.push(`Ka pasur porosi në ${bold(twDays+' nga '+daysElapsed+' ditët')} — mesatare ${bold(ordersPerDay+' porosi/ditë')}.`);
  }

  el.innerHTML=paras.map(p=>`<p class="uge-analyse-p">${p}</p>`).join('');
}

function hapTargetEdit(key){
  const cur=parseFloat(localStorage.getItem(key))||'';
  const val=prompt('Target mujor (€):',cur);
  if(val===null) return;
  const n=parseFloat(val.replace(',','.'));
  if(isNaN(n)||n<0) return;
  localStorage.setItem(key,n);
  renderAnalitika();
}

async function renderAnalitika(){
  if(!erAdmin) return;
  const fra=document.getElementById('anal-fra').value;
  const til=document.getElementById('anal-til').value;
  const filteredIds=['anal-orare','anal-produkt','anal-tavolina','anal-stafi','anal-bashke','anal-rek'];
  [...filteredIds,'anal-kpi','anal-forecast'].forEach(id=>{const el=document.getElementById(id+'-wrap');if(el)el.innerHTML='<div class="ps-loading">Duke ngarkuar...</div>'});

  let q=sb.from('ordrer')
    .select('id,bord,total,betaling,oprettet,bruger_id,bruger_navn,antal_guests,ordre_linjer(navn,pris,antal)')
    .eq('restaurant_id',RESTAURANT_ID).eq('status','betalt');
  if(fra) q=q.gte('oprettet',_localIso(fra,'00:00:00'));
  if(til) q=q.lte('oprettet',_localIso(til,'23:59:59'));
  const alltimeQ=sb.from('ordrer').select('total,oprettet').eq('restaurant_id',RESTAURANT_ID).eq('status','betalt');
  const [{data,error},{data:atData}]=await Promise.all([q,alltimeQ]);

  // ── AOV + all-time KPIs ──
  const atOrders=atData||[];
  const atTotal=atOrders.reduce((s,o)=>s+parseFloat(o.total||0),0);
  const atCount=atOrders.length;
  const aov=atCount>0?atTotal/atCount:0;
  const kpiEl=document.getElementById('anal-kpi-wrap');
  if(kpiEl) kpiEl.innerHTML=`<div class="anal-kpi-grid">
    <div class="anal-kpi"><div class="anal-kpi-val">${euro(aov)}</div><div class="anal-kpi-lbl">Vlera mesatare / porosi</div></div>
    <div class="anal-kpi"><div class="anal-kpi-val">${atCount.toLocaleString('sq-AL')}</div><div class="anal-kpi-lbl">Porosi gjithsej</div></div>
    <div class="anal-kpi"><div class="anal-kpi-val">${euro(atTotal)}</div><div class="anal-kpi-lbl">Xhiro gjithsej</div></div>
  </div>`;

  // ── Revenue forecast (always current month) ──
  const now=new Date();
  const yr=now.getFullYear(),mo=now.getMonth();
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const todayDay=now.getDate();
  const mStart=new Date(yr,mo,1),mEnd=new Date(yr,mo+1,0,23,59,59);
  const monthOrders=atOrders.filter(o=>{const d=new Date(o.oprettet);return d>=mStart&&d<=mEnd});
  const dailyRev=new Array(daysInMonth).fill(0);
  monthOrders.forEach(o=>{
    const local=new Date(new Date(o.oprettet).getTime()+2*3600000);
    const day=local.getUTCDate()-1;
    if(day>=0&&day<daysInMonth) dailyRev[day]+=parseFloat(o.total)||0;
  });
  const cumActual=[];let running=0;
  for(let i=0;i<daysInMonth;i++){
    if(i<todayDay){running+=dailyRev[i];cumActual.push(parseFloat(running.toFixed(2)))}
    else cumActual.push(null);
  }
  const totalSoFar=cumActual[todayDay-1]||0;
  const dataStartDay=monthOrders.length>0?Math.min(...monthOrders.map(o=>new Date(new Date(o.oprettet).getTime()+2*3600000).getUTCDate())):todayDay;
  const activeDays=Math.max(1,todayDay-dataStartDay+1);
  const avgDaily=totalSoFar/activeDays;
  // forecast line: null for past days, projects forward from today's cumulative
  const forecastLine=Array.from({length:daysInMonth},(_,i)=>{
    if(i<todayDay-1) return null;
    return parseFloat((totalSoFar+avgDaily*(i-todayDay+1)).toFixed(2));
  });
  const projectedTotal=forecastLine[daysInMonth-1]??totalSoFar;
  const fMuaj=document.getElementById('anal-forecast-muaj');
  if(fMuaj) fMuaj.textContent=`${MUAJT_SQ[mo]} ${yr}`;
  const fEl=document.getElementById('anal-forecast-wrap');
  if(fEl){
    fEl.innerHTML='<canvas id="anal-forecast-chart" style="max-height:260px"></canvas>';
    if(analForecastChart) analForecastChart.destroy();
    analForecastChart=new Chart(document.getElementById('anal-forecast-chart').getContext('2d'),{
      type:'line',
      data:{labels:Array.from({length:daysInMonth},(_,i)=>String(i+1)),
        datasets:[
          {label:'Realizuar',data:cumActual,borderColor:'#27AE60',backgroundColor:'rgba(39,174,96,.1)',borderWidth:2.5,pointRadius:2,tension:0.3,fill:true,spanGaps:false},
          {label:'Parashikuar',data:forecastLine,borderColor:'#C9963B',borderWidth:2,borderDash:[6,4],pointRadius:0,tension:0,fill:false}
        ]},
      options:{responsive:true,
        plugins:{legend:{display:true,position:'top'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+euro(c.raw||0)}}},
        scales:{y:{beginAtZero:true,ticks:{callback:v=>Math.round(v)+' €'}}}}
    });
    const fInsight=document.getElementById('anal-forecast-insight');
    if(fInsight){fInsight.style.display='';fInsight.innerHTML=`Tempo: <strong>${euro(avgDaily)}/ditë</strong> (nga ${dataStartDay} ${MUAJT_SQ[mo]}) · Parashikim i muajit: <strong>${euro(projectedTotal)}</strong> · Realizuar deri tani: <strong>${euro(totalSoFar)}</strong>`}
  }

  // ── Target panel ──
  const targetKey=`pizza_target_${yr}_${mo}`;
  const targetVal=parseFloat(localStorage.getItem(targetKey))||0;
  // Use active days only (from dataStartDay, not day 1) so the expected pace is fair
  const activeMonthDays=daysInMonth-dataStartDay+1;
  const activeDaysElapsed=Math.max(0,todayDay-dataStartDay+1);
  const expectedSoFar=targetVal>0?parseFloat((targetVal*activeDaysElapsed/activeMonthDays).toFixed(2)):0;
  const diff=totalSoFar-expectedSoFar;
  const pct=targetVal>0?Math.round(totalSoFar/targetVal*100):0;
  const ahead=diff>=0;
  const tPanel=document.getElementById('anal-target-panel');
  if(tPanel){
    tPanel.innerHTML=`
      <div class="target-header">
        <h3 class="anal-titull" style="margin-bottom:0">🎯 Target — ${MUAJT_SQ[mo]} ${yr}</h3>
        <button class="target-edit-btn" onclick="hapTargetEdit('${targetKey}')">✏️ Ndrysho</button>
      </div>
      ${targetVal>0?`
      <div class="target-amount-row">
        <span class="target-amount-lbl">Target:</span>
        <span class="target-amount-val">${euro(targetVal)}</span>
      </div>
      <div class="target-prog-bg"><div class="target-prog-bar" style="width:${Math.min(100,pct)}%;background:${ahead?'#27AE60':'#E74C3C'}"></div></div>
      <div class="target-pct" style="color:${ahead?'#27AE60':'#E74C3C'}">${pct}% af target</div>
      <div class="target-stats">
        <div>Realizuar: <strong>${euro(totalSoFar)}</strong></div>
        <div>Target i muajit: <strong>${euro(targetVal)}</strong></div>
        <div>Pritet sot (ditë ${activeDaysElapsed}/${activeMonthDays} aktive): <strong>${euro(expectedSoFar)}</strong></div>
      </div>
      <div class="target-pace ${ahead?'target-pace-ahead':'target-pace-behind'}">
        ${ahead?'▲':'▼'} ${euro(Math.abs(diff))} ${ahead?'para targetit sot':'prapa targetit sot'}
      </div>`
      :`<div class="anal-insight" style="margin-top:12px">Kliko <strong>✏️ Ndrysho</strong> për të vendosur target mujor.</div>`}
    `;
  }

  const ingen='<div class="ps-loading">Nuk ka të dhëna për periudhën e zgjedhur</div>';
  if(error||!data?.length){filteredIds.forEach(id=>{const el=document.getElementById(id+'-wrap');if(el)el.innerHTML=ingen});return}
  const dr=data;

  // 1. Peak hours
  const orarCount=new Array(24).fill(0);
  dr.forEach(o=>{const h=new Date(new Date(o.oprettet).getTime()+2*3600000).getUTCHours();orarCount[h]++});
  const orarEl=document.getElementById('anal-orare-wrap');
  if(orarEl){
    orarEl.innerHTML='<canvas id="anal-orar-chart" style="max-height:220px"></canvas>';
    if(analChart) analChart.destroy();
    const maxVal=Math.max(...orarCount)||1;
    analChart=new Chart(document.getElementById('anal-orar-chart').getContext('2d'),{
      type:'bar',
      data:{labels:Array.from({length:24},(_,i)=>String(i).padStart(2,'0')+':00'),
        datasets:[{label:'Porosi',data:orarCount,
          backgroundColor:orarCount.map(v=>v===maxVal&&v>0?'rgba(201,150,59,.95)':'rgba(201,150,59,.4)'),
          borderRadius:4}]},
      options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw+' porosi'}}},
        scales:{y:{beginAtZero:true,ticks:{stepSize:1,precision:0}}}}
    });
    const peak=orarCount.indexOf(maxVal);
    if(maxVal>0) orarEl.insertAdjacentHTML('beforeend',`<div class="anal-insight">Ora më e ngarkuar: <strong>${String(peak).padStart(2,'0')}:00–${String(peak+1).padStart(2,'0')}:00</strong> · <strong>${maxVal}</strong> porosi</div>`);
  }

  // 2. Product performance
  const prodAgg={};
  dr.forEach(o=>(o.ordre_linjer||[]).forEach(l=>{
    if(!prodAgg[l.navn]) prodAgg[l.navn]={namn:l.navn,antal:0,xhiro:0};
    prodAgg[l.navn].antal+=l.antal; prodAgg[l.navn].xhiro+=l.pris*l.antal;
  }));
  const prodSort=Object.values(prodAgg).sort((a,b)=>b.antal-a.antal).slice(0,10);
  const prodEl=document.getElementById('anal-produkt-wrap');
  if(prodEl){
    const maxA=prodSort[0]?.antal||1;
    prodEl.innerHTML=prodSort.map((p,i)=>`
      <div class="anal-prod-rad">
        <div class="anal-prod-info"><span class="anal-prod-rank">${i+1}.</span><span class="anal-prod-namn">${p.namn}</span><span class="anal-prod-xhiro">${euro(p.xhiro)}</span></div>
        <div class="anal-bar-wrap"><div class="anal-bar-fill" style="width:${Math.round(p.antal/maxA*100)}%"></div><span class="anal-bar-lbl">${p.antal} cop.</span></div>
      </div>`).join('')||ingen;
  }

  // 3. Table analysis
  const tavAgg={};
  dr.forEach(o=>{
    if(!o.bord||o.bord==='–') return;
    if(!tavAgg[o.bord]) tavAgg[o.bord]={bord:o.bord,porosi:0,xhiro:0,guests:0,guestOrders:0};
    tavAgg[o.bord].porosi++; tavAgg[o.bord].xhiro+=parseFloat(o.total)||0;
    if((o.antal_guests||0)>0){tavAgg[o.bord].guests+=o.antal_guests;tavAgg[o.bord].guestOrders++}
  });
  const tavSort=Object.values(tavAgg).sort((a,b)=>b.xhiro-a.xhiro);
  const tavEl=document.getElementById('anal-tavolina-wrap');
  if(tavEl) tavEl.innerHTML=!tavSort.length?ingen:
    `<div class="ps-raekke ps-header-row"><span>Tavolina</span><span>Porosi</span><span>Mys. mes.</span><span>Xhiro</span></div>`+
    tavSort.map((t,i)=>`<div class="ps-raekke${i%2?'':' alt'}"><span class="ps-namn">🪑 ${t.bord}</span><span>${t.porosi}</span><span>${t.guestOrders>0?(t.guests/t.guestOrders).toFixed(1):'–'}</span><span class="ps-xhiro">${euro(t.xhiro)}</span></div>`).join('');

  // 4. Staff performance
  const stafiAgg={};
  dr.forEach(o=>{const key=o.bruger_id||'_anon';const navn=o.bruger_navn||'Pa caktuar';if(!stafiAgg[key])stafiAgg[key]={navn,porosi:0,xhiro:0};stafiAgg[key].porosi++;stafiAgg[key].xhiro+=parseFloat(o.total)||0});
  const stafiSort=Object.values(stafiAgg).sort((a,b)=>b.xhiro-a.xhiro);
  const stafiTot=stafiSort.reduce((s,r)=>s+r.xhiro,0);
  const stafiEl=document.getElementById('anal-stafi-wrap');
  if(stafiEl) stafiEl.innerHTML=!stafiSort.length?ingen:stafiSort.map((r,i)=>{
    const pct=stafiTot>0?Math.round(r.xhiro/stafiTot*100):0;
    const clr=BRUGER_COLORS[i%BRUGER_COLORS.length];
    return `<div class="anal-stafi-rad"><div class="anal-stafi-left"><div class="anal-avatar-sm" style="background:${clr}">${r.navn.charAt(0).toUpperCase()}</div><span class="anal-stafi-emri">${r.navn}</span></div><div class="anal-bar-wrap" style="flex:1"><div class="anal-bar-fill" style="width:${pct}%;background:${clr}"></div><span class="anal-bar-lbl">${r.porosi} porosi · ${euro(r.xhiro)} · ${pct}%</span></div></div>`;
  }).join('');

  // 5. Co-occurrence
  const pairs={};
  dr.forEach(o=>{const it=(o.ordre_linjer||[]).map(l=>l.navn);for(let a=0;a<it.length;a++)for(let b=a+1;b<it.length;b++){const k=[it[a],it[b]].sort().join(' + ');pairs[k]=(pairs[k]||0)+1}});
  const pairSort=Object.entries(pairs).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const bashkeEl=document.getElementById('anal-bashke-wrap');
  if(bashkeEl) bashkeEl.innerHTML=!pairSort.length?ingen:
    `<div class="ps-raekke ps-header-row"><span>Kombinimi</span><span>Herë</span></div>`+
    pairSort.map((p,i)=>`<div class="ps-raekke${i%2?'':' alt'}"><span class="ps-namn">${p[0]}</span><span class="ps-antal">${p[1]}×</span></div>`).join('');

  // 6. Recommendations
  const reks=[];
  const peak=orarCount.indexOf(Math.max(...orarCount));
  if(orarCount[peak]>0) reks.push(`⏰ Ora <strong>${String(peak).padStart(2,'0')}:00</strong> është ora juaj më e ngarkuar — planifikoni stafin sipas kësaj.`);
  if(prodSort.length) reks.push(`🏆 <strong>${prodSort[0].namn}</strong> është produkti juaj bestseller me <strong>${prodSort[0].antal}</strong> porosi të shitura.`);
  if(pairSort.length) reks.push(`🔗 <strong>${pairSort[0][0]}</strong> porositen bashkë ${pairSort[0][1]} herë — mendoni paketë çmimesh.`);
  if(tavSort.length) reks.push(`🪑 Tavolina <strong>${tavSort[0].bord}</strong> gjeneron xhirën më të lartë (${euro(tavSort[0].xhiro)}).`);
  if(stafiSort.length>1) reks.push(`👥 <strong>${stafiSort[0].navn}</strong> ka xhirën kryesore (${euro(stafiSort[0].xhiro)}), <strong>${stafiSort[stafiSort.length-1].navn}</strong> ka potencial rritjeje.`);
  const rekEl=document.getElementById('anal-rek-wrap');
  if(rekEl) rekEl.innerHTML=!reks.length?ingen:reks.map(r=>`<div class="anal-rek-item">${r}</div>`).join('');

  renderUgensAnalyse();
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  await loadData();
  await initMenuData();
  await initTavolinat();
  // After init, reload to get any freshly inserted rows
  await loadData();
  renderKategorier();
  renderAabneBorde();
  genindlaesVentende();
  opdaterAabneBadge();
  if(!aktivBruger&&!erAdmin) hapBrugerPicker();
  document.getElementById('periode-dato').value=sotDita();
  opdaterUr();
  setInterval(opdaterUr,1000);
  setInterval(async ()=>{
    await loadData();
    renderAabneBorde();
    genindlaesVentende();
    opdaterAabneBadge();
    // Rydder hurtig-cache hvert 10 min så den tager nye ordrer med
    if(Date.now()-_hurtigTs>10*60*1000) _hurtigTs=0;
  }, 8000);

  // Auto-logout after 30 seconds of inactivity
  let _inactivityTimer=null;
  function _resetInactivity(){
    if(!aktivBruger&&!erAdmin) return;
    clearTimeout(_inactivityTimer);
    _inactivityTimer=setTimeout(()=>{
      if(aktivBruger||erAdmin){
        logoutBruger();
        hapBrugerPicker();
      }
    },30*1000);
  }
  ['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(ev=>
    document.addEventListener(ev,_resetInactivity,{passive:true})
  );

  // Keyboard support for PIN modal
  document.addEventListener('keydown', e=>{
    if(!document.getElementById('login-modal').classList.contains('vis')) return;
    if(e.key>='0'&&e.key<='9'){e.preventDefault();pinShto(e.key)}
    else if(e.key==='Backspace'){e.preventDefault();pinFshi()}
    else if(e.key==='Delete'){e.preventDefault();pinReset()}
    else if(e.key==='Escape'){e.preventDefault();mbyllLoginModal()}
  });

  // Keyboard support for staff PIN (bruger-picker)
  document.addEventListener('keydown', e=>{
    const modal=document.getElementById('bruger-picker-modal');
    if(!modal?.classList.contains('vis')) return;
    if(document.getElementById('bp-pin')?.style.display==='none') return;
    if(e.key>='0'&&e.key<='9'){e.preventDefault();bpPinShto(e.key)}
    else if(e.key==='Backspace'){e.preventDefault();bpPinFshi()}
    else if(e.key==='Escape'){e.preventDefault();document.getElementById('bp-pin').style.display='none'}
  });

  // Keyboard support for cash modal
  document.addEventListener('keydown', e=>{
    if(!document.getElementById('kesh-modal').classList.contains('vis')) return;
    if(e.key>='0'&&e.key<='9'){e.preventDefault();numpadShto(e.key)}
    else if(e.key==='.'||e.key===','){e.preventDefault();numpadShto('.')}
    else if(e.key==='Backspace'){e.preventDefault();numpadBack()}
    else if(e.key==='Delete'){e.preventDefault();numpadFshi()}
    else if(e.key==='Enter'){e.preventDefault();const b=document.getElementById('kesh-konfirmo-btn');if(!b.disabled)konfirmoPagesaKesh()}
    else if(e.key==='Escape'){e.preventDefault();mbyllModal('kesh-modal')}
  });

  // QZ Tray printer-knap — bruger forbinder manuelt én gang per vagt
  if(typeof qz==='undefined'){
    const btn=document.getElementById('printer-btn');
    if(btn) btn.style.display='none';
  }

  // Realtime subscription for live order updates
  sb.channel('ordrer-live')
    .on('postgres_changes',
        {event:'*', schema:'public', table:'ordrer', filter:`restaurant_id=eq.${RESTAURANT_ID}`},
        () => loadData().then(() => { renderAabneBorde(); genindlaesVentende(); opdaterAabneBadge(); }))
    .subscribe();
});
