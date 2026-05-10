// =============================================
// CONFIG & STATE
// =============================================
let kategorier = [], produkter = [], ordrer = [], tavolina = [];
let erAdmin = false;
let aktivBruger = null; // {id, navn, rolle} — current session user
let _xhiroRel = []; // cached paid orders for current Xhiro period
let _histArkivMod = false;
let pinInput = '';
let pinMod = 'login'; // 'login' | 'pin-ri' | 'pin-konfirmo'
let pinRiTemp = '';
let bpPinInput = '', bpZgjedhurBrugerId = null;

function getPinKod(){ return localStorage.getItem('artizano_pin')||'88888888'; }

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
      document.getElementById('admin-btn').textContent='🔓 Admin';
      document.getElementById('admin-btn').classList.add('aktiv');
      visToast('Mirë se vini, Admin! 🔓');
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
      localStorage.setItem('artizano_pin',pinInput);
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
  document.getElementById('admin-btn').textContent='🔒 Hyr';
  document.getElementById('admin-btn').classList.remove('aktiv');
  if(document.getElementById('produkter-side').classList.contains('aktiv')) skiftTab('pos');
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
    const btn=document.getElementById('admin-btn');
    if(erAdmin){btn.textContent='🔓 Admin';btn.classList.add('aktiv')}
    else{btn.textContent=`👤 ${b.navn}`;btn.classList.add('aktiv')}
    visToast(`Mirë se vini, ${b.navn}! ✓`);
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
  const btn=document.getElementById('admin-btn');
  btn.textContent='🔒 Hyr';btn.classList.remove('aktiv');
  mbyllModal('bruger-picker-modal');
  if(document.getElementById('produkter-side').classList.contains('aktiv')) skiftTab('pos');
  visToast('Dolët nga sistemi');
}

function toggleArkivMod(el){
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
  const koha=new Date(o.oprettet).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
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
const RESTAURANT_ID = '0860de87-efd6-4ef4-b191-7635bc44e866';
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
    {id:'p102',navn:'Picë Artizano (M)',kategori_id:'k1',pris:5.00,ikon:'🍕',beskrivelse:'E mesme',udsolgt:false},
    {id:'p103',navn:'Picë Artizano (L)',kategori_id:'k1',pris:6.00,ikon:'🍕',beskrivelse:'E madhe',udsolgt:false},
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
    {id:'p405',navn:'Artizano Burger',kategori_id:'k4',pris:4.50,ikon:'🍔',beskrivelse:'Signatur burger',udsolgt:false},
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
function formatData(s){const d=new Date(s);return d.toLocaleDateString('sq-AL')+' '+d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}
function sotDita(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function _localIso(dateStr,time){return new Date(dateStr+'T'+time).toISOString()}
function unikID(){return 'id_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)}
function visToast(msg,tip='ok'){const t=document.getElementById('toast');t.textContent=msg;t.style.background=tip==='gabim'?'#C0392B':tip==='info'?'#2980B9':'#3B1F0E';t.classList.add('vis');setTimeout(()=>t.classList.remove('vis'),3000)}
function mbyllModal(id){document.getElementById(id).classList.remove('vis')}

// =============================================
// TABS
// =============================================
function skiftTab(tab) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('aktiv'));
  document.querySelectorAll('.side').forEach(s=>s.classList.remove('aktiv'));
  const idx={'pos':0,'aabne':1,'ventende':2,'omsaetning':3,'historik':4,'produkter':5};
  const tabs=document.querySelectorAll('.tab');
  if(idx[tab]!==undefined) tabs[idx[tab]].classList.add('aktiv');
  document.getElementById(tab+'-side').classList.add('aktiv');
  if(tab==='aabne') renderAabneBorde();
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
      // Redirect to POS — non-admin staff have no access here
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('aktiv'));
      document.querySelectorAll('.side').forEach(s=>s.classList.remove('aktiv'));
      document.querySelector('.tab').classList.add('aktiv');
      document.getElementById('pos-side').classList.add('aktiv');
      if(!aktivBruger) hapLoginModalNormal(); // nobody logged in → offer admin login
      visToast('🔒 Keni nevojë për login Admin!','gabim');
      return;
    }
    renderAdminProdukter();
    renderBrugereAdmin();
  }
}

// =============================================
// PRODUKT GRID
// =============================================
function renderKategorier(){
  const bar=document.getElementById('kategori-bar');
  bar.innerHTML=`<button class="kat-btn ${aktivKategori==='alle'?'aktiv':''}" onclick="filtrerKategori('alle')">Të gjitha</button>`;
  kategorier.forEach(k=>{bar.innerHTML+=`<button class="kat-btn ${aktivKategori===k.id?'aktiv':''}" onclick="filtrerKategori('${k.id}')">${k.navn}</button>`});
}
function filtrerKategori(id){aktivKategori=id;renderKategorier();renderProduktGrid()}

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
  document.getElementById('bord-felt').classList.remove('gabim');
  document.getElementById('bord-gabim').style.display='none';
  document.getElementById('noter-felt').value='';
  renderShporta();
  renderTablePicker();
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
  const inp=document.getElementById('bord-felt');
  inp.value=nr;
  inp.classList.remove('gabim');
  document.getElementById('bord-gabim').style.display='none';
  renderTablePicker();
}

function fillBordAndGoToArke(nr){
  skiftTab('pos');
  zgjidhTavolinë(nr);
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
    // Nëse nuk është zgjedhur tavolina, paralajmëro por mos ndalo
    visToast('Kujdes: nuk keni zgjedhur tavolinë!','info');
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
function visCelebrationPorosi(ordre){
  document.getElementById('cel-ikon').textContent='🍽️';
  document.getElementById('cel-titulli').textContent='Porosi u krijua!';
  document.getElementById('cel-sub').textContent=`Tavolina ${ordre.bord} • #${ordre.ordre_nummer} • ${euro(ordre.total)}`;
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
  document.getElementById('cel-titulli').textContent='Pagesa u krye!';
  document.getElementById('cel-sub').textContent=`Tavolina ${ordre.bord} • ${ordre.betaling==='kontant'?'Kesh':'Kartë'} • ${euro(ordre.total)}`;
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
  const koha=new Date().toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
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
function betalGjithe(bord, metoda){
  const ordrerT=ordrer.filter(o=>o.status==='aaben'&&o.bord===bord);
  if(!ordrerT.length) return;
  if(ordrerT.length===1){ betalOrdre(ordrerT[0].id, metoda); return; }
  if(metoda==='kontant'){ hapKeshModalGjithe(bord); }
  else { pageoOrdrerGjithe(bord,'kort',0); }
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
  const ds=tani.toLocaleDateString('sq-AL')+' '+tani.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
  const S='================================';
  let txt=`        ARTIZANO\n     Eat & More\n${S}\n`;
  txt+=`Data: ${ds}\nTavolina: ${bord}\n`;
  txt+=`${S}\n`;
  ordrerList.forEach((o,i)=>{
    const oKoha=new Date(o.oprettet).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
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
  const bet=ordrerList[0].betaling==='kontant'?'Kesh':'Kartë';
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
function betalOrdre(id,metoda){
  if(metoda==='kontant') hapKeshModal(id);
  else pageoOrdren(id,'kort',0);
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
          ${log.map(l=>`<div class="log-entry ${l.lloji}"><span class="log-koha">${new Date(l.koha).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}${l.nga?` · ${l.nga}`:''}</span><span class="log-tekst">${l.pershkrim}</span></div>`).join('')}
        </div>`:'';
      const ordKoha=new Date(ord.oprettet).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
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
        <button class="tv-btn kesh" onclick="betalGjithe('${t.nr}','kontant')">💵 ${shumePorosi?'Paguaj gjithçka':'Kesh'}</button>
        <button class="tv-btn karte" onclick="betalGjithe('${t.nr}','kort')">💳 ${shumePorosi?'Paguaj gjithçka':'Kartë'}</button>
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
  mbyllModal('redaktim-modal');
  renderAabneBorde();
  visToast(`${riLogje.length} ndryshim${riLogje.length!==1?'e':''} u ruajtën ✓`);

  // Hap logun automatikisht
  setTimeout(()=>{
    const el=document.getElementById('log-entries-'+redaktimOrdreId);
    const arrow=document.getElementById('log-arrow-'+redaktimOrdreId);
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
  const n=ordrer.filter(o=>o.status==='aaben').length;
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
  const ds=d.toLocaleDateString('sq-AL')+' '+d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
  const S='================================';
  let t=`        ARTIZANO\n     Eat & More\n${S}\n`;
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
  const ds=d.toLocaleDateString('sq-AL')+' '+d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('print-area').innerHTML=`<div style="width:80mm;font-family:'Courier New',monospace;font-size:12px;padding:4mm">
    <div style="text-align:center;font-size:15px;font-weight:bold;margin-bottom:3px">ARTIZANO</div>
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
        const koha=new Date(o.oprettet).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
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
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download=`artizano_${sotDita()}.csv`;a.click();
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
  wrap.innerHTML=`<table class="kassa-tabel">
    <thead><tr><th>Personi</th><th style="text-align:right">Fillimi €</th><th style="text-align:right">Shitje kesh</th><th style="text-align:right">Fundi €</th><th style="text-align:right">Diferenca</th></tr></thead>
    <tbody>${aktive.map((b,i)=>{
      const g=gj[b.id]||{};
      const fillim=g.fillim!=null?parseFloat(g.fillim):null;
      const fund=g.fund!=null?parseFloat(g.fund):null;
      const shitje=sh[b.id]||0;
      let diffHtml='<span class="kassa-diff nul">–</span>';
      if(fillim!==null&&fund!==null){
        const d=fund-(fillim+shitje);
        const cls=Math.abs(d)<0.005?'nul':d>0?'plus':'minus';
        diffHtml=`<span class="kassa-diff ${cls}">${d>=0?'+':''}${d.toFixed(2)} €</span>`;
      }
      // Fillimi: editable if not yet set; locked once saved
      const fillimCel = fillim===null
        ? `<input class="kassa-inp" type="number" step="0.01" min="0" placeholder="0.00" onblur="ruajKassa('${b.id}','fillim',this.value,'${dato}')">`
        : `<span class="kassa-locked">${fillim.toFixed(2)} €</span><span class="kassa-lock-ikon" title="E bllokuar">🔒</span>`+
          (erAdmin?`<button class="kassa-unlock-btn" title="Ndrysho (Admin)" onclick="hapeLlojaKasses('${b.id}',${fillim},'${dato}')">✏️</button>`:'');
      return `<tr>
        <td><span class="kassa-avatar-sm" style="background:${BRUGER_COLORS[i%BRUGER_COLORS.length]}">${b.navn.charAt(0)}</span>${b.navn}</td>
        <td id="kassa-fillim-${b.id}" style="text-align:right">${fillimCel}</td>
        <td class="kassa-shitje" style="text-align:right">${euro(shitje)}</td>
        <td style="text-align:right"><input class="kassa-inp" type="number" step="0.01" min="0" value="${fund!==null?fund.toFixed(2):''}" placeholder="0.00" onblur="ruajKassa('${b.id}','fund',this.value,'${dato}')"></td>
        <td style="text-align:right">${diffHtml}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function hapeLlojaKasses(brugerId, currentVal, dato){
  if(!erAdmin){visToast('🔒 Vetëm Admin mund ta ndryshojë fillimin!','gabim');return}
  const cell=document.getElementById('kassa-fillim-'+brugerId);
  cell.innerHTML=`<input class="kassa-inp" type="number" step="0.01" min="0" value="${parseFloat(currentVal).toFixed(2)}" onblur="ruajKassa('${brugerId}','fillim',this.value,'${dato}')">`;
  cell.querySelector('input').focus();
  cell.querySelector('input').select();
}

async function ruajKassa(brugerId,field,valStr,dato){
  const val=parseFloat(valStr);
  if(isNaN(val)||val<0) return;
  await sb.from('kassa_gjendja').upsert(
    {restaurant_id:RESTAURANT_ID,bruger_id:brugerId,data:dato,[field]:val},
    {onConflict:'restaurant_id,bruger_id,data'}
  );
  renderKassaKontroll();
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
  liste.innerHTML=vis.map(o=>{
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
  }).join('');
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
  let t=`======== RAPORT Z ========\nArtizano – Eat & More\nData: ${d.toLocaleDateString('sq-AL')}\nGjeneruar: ${d.toLocaleTimeString('sq-AL')}\n==========================\nNr. transaksioneve: ${dr.length}\n==========================\nKesh:      ${euro(kesh)}\nKartë/Mob: ${euro(karte)}\n--------------------------\nXhiro:     ${euro(xhiro)}\nTVSH (18%):${euro(tvsh)}\nNeto:      ${euro(xhiro-tvsh)}\n==========================\nGjendja e kasës:\nJu lutemi numëroni manualisht\n==========================`;
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
  document.getElementById('clock').innerHTML=n.toLocaleDateString('sq-AL',{weekday:'long',day:'numeric',month:'long'})+'<br>'+n.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
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
  renderProduktGrid();
  renderTablePicker();
  genindlaesVentende();
  opdaterAabneBadge();
  document.getElementById('periode-dato').value=sotDita();
  opdaterUr();
  setInterval(opdaterUr,1000);
  setInterval(async ()=>{
    await loadData();
    renderAabneBorde();
    genindlaesVentende();
    opdaterAabneBadge();
  }, 8000);

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

  // Realtime subscription for live order updates
  sb.channel('ordrer-live')
    .on('postgres_changes',
        {event:'*', schema:'public', table:'ordrer', filter:`restaurant_id=eq.${RESTAURANT_ID}`},
        () => loadData().then(() => { renderAabneBorde(); genindlaesVentende(); opdaterAabneBadge(); }))
    .subscribe();
});
