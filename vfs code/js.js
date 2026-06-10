// ==UserScript==
// @name         VFS (AUT + MLT+ NLD) V2
// @namespace    http://tampermonkey.net/
// @description  automation
// @version      5.1
// @author       koword18
// @match        https://visa.vfsglobal.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/* jshint esversion: 11 */
/* eslint-disable */

(function(){"use strict";

// Block script on review-pay page
if(/\/review-pay/i.test(location.pathname))return;

// ★ LOGIN ACCOUNTS
const defaultLogins=()=>([
  {email:"said.zarouq@outlook.com",        password:"Azol@2000"},
  {email:"oumoulid48@gmail.com",       password:"Azol@2000"},
  {email:"boujidi627@gmail.com",       password:"Azol@2000"},
  {email:"lexec423@gmail.com",      password:"Azol@2000"},
  {email:"isbtissammoukalif@gmail.com",       password:"Azol@2000"},
  {email:"s8693574@gmail.com",   password:"Azol@2000"},
  {email:"isbtissammoukalif@gmail.com",     password:"Azol@2000"},
  {email:"visatanja1@gmail.com",     password:"Azol@2000"},
  {email:"fr2023mouni@gmail.com",     password:"Azol@2000"},
  {email:"n6039985@gmail.com",   password:"Azol@2000"},
  {email:"worrk1@outlook.fr",password:"Azol@2000"},
  {email:"visatanja1@gmail.com",        password:"Azol@2000"},
  {email:"visatanja2@gmail.com",       password:"Azol@2000"},
  {email:"visatanja3@gmail.com",       password:"Azol@2000"},
  {email:"visatanja5@gmail.com",      password:"Azol@2000"},
  {email:"visatanja6@gmail.com",       password:"Azol@2000"},
  {email:"visatanja7@gmail.com",   password:"Azol@2000"},
  {email:"visatanja8@gmail.com",     password:"Azol@2000"},
  {email:"visatanja1@gmail.com",     password:"Azol@2000"},
  {email:"visatanja9@gmail.com",     password:"Azol@2000"},
  {email:"visatanja11@gmail.com",   password:"Azol@2000"},
  {email:"worrk1@outlook.fr",password:"Azol@2000"},
]);

// ★ APPLICANT DATA
const defaultClients=()=>([
  {First_Name:"BOUCHAIB",LastName:"TAOUKIF", dateOfBirth:"15/10/1979",PassportNumber:"YF9817801",PassportExpiryDate:"28/10/2030",Gender:"MALE",Country:"MOROCCO"},
  {First_Name:"AMINE",   LastName:"DOUMA",   dateOfBirth:"11/01/1995",PassportNumber:"KD8916752",PassportExpiryDate:"11/03/2031",Gender:"MALE",Country:"MOROCCO"},
  {First_Name:"mustapha",LastName:"douma", dateOfBirth:"06/06/1985",PassportNumber:"BI0575307",PassportExpiryDate:"27/05/2030",Gender:"MALE",Country:"MOROCCO"},
  {First_Name:"ABDELKADER",LastName:"EL OMRANI", dateOfBirth:"04/02/1987",PassportNumber:"MP8429601",PassportExpiryDate:"26/02/2030",Gender:"MALE",Country:"MOROCCO"},

]);

// Mode constants
const AUT_C={RABAT:'Austria Visa Application Centre, Rabat',TANGIER:'Austria Visa Application Centre - Tangier',CASA:'Austria Visa Application Centre - Casablanca',APPT:'SCHENGEN VISA-TYPE C',VISA:'Visa Schengen-Court sejour'};
const NLD_C={RABAT:'Netherlands visa application centre Rabat',TANGIER:'Netherlands visa application centre Tangier',CASA:null,APPT:'Short Stay',VISA:'TouristVisaNM'};
const MLT_C={RABAT:'Malta Visa Application Centre - Rabat',TANGIER:'Malta Visa Application Centre - Tangier',CASA:'Malta Visa Application Centre - Casablanca',APPT:'Schengen Visa C',VISA:'Visa type C schengen'};
let VISA_MODE=localStorage.getItem('vfs_mode')||'AUT';
const C=()=>VISA_MODE==='NLD'?NLD_C:VISA_MODE==='MLT'?MLT_C:AUT_C;

// Storage
const LS_LOGIN='vfsg_logins_v1',LS_CLIENTS='vfsg_clients_v1',LS_SETTINGS='vfsg_settings_v1',LS_DELAY='vfs_retry_delay_ms',LS_STEP='vfs_step_delay_ms';
const lsGet=(k,def)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v!=null?v:def;}catch(e){return def;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const loadLogins  =()=>{const a=lsGet(LS_LOGIN,null);return Array.isArray(a)?a:defaultLogins();};
const saveLogins  =a=>lsSet(LS_LOGIN,a||[]);
const loadClients =()=>{const a=lsGet(LS_CLIENTS,null);return Array.isArray(a)?a:defaultClients();};
const saveClients =a=>lsSet(LS_CLIENTS,a||[]);
const loadSettings=()=>{const s=lsGet(LS_SETTINGS,null);return(s&&typeof s==='object')?s:{autoFillFirstClient:true};};
const saveSettings=s=>lsSet(LS_SETTINGS,s);

const _rt=window.setTimeout.bind(window);
const _ri=window.setInterval.bind(window);

// Nationality bypass — exact copy of vfs-bot.js nationalityAutoSave logic

// Login state
let loginIdx=lsGet('vfs_login_idx',0),loginBusy=false;
const getLogin=()=>{const a=loadLogins();if(loginIdx>=a.length)loginIdx=0;return a[loginIdx];};
const nextLogin=()=>{loginIdx=(loginIdx+1)%loadLogins().length;lsSet('vfs_login_idx',loginIdx);updateLoginBadge()};

// Utils
const esc=t=>String(t||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const wait=ms=>new Promise(r=>_rt(r,ms));
const jit=(b,r)=>b+Math.floor(Math.random()*r);
const dlg=()=>!!document.querySelector('.mat-mdc-dialog-container');
const onLogin=()=>!!document.getElementById('email')&&!!document.getElementById('password');
const isCaptcha=()=>{try{if(/just a moment|attention required|checking your browser|challenge|captcha|security check/i.test(document.title))return true;if(document.querySelector('#challenge-form,#cf-challenge-running,.cf-browser-verification,iframe[src*="challenges.cloudflare"]'))return true;}catch(e){}return false;};

async function simClick(el){
  if(!el)return;
  try{
    const r=el.getBoundingClientRect(),tx=r.left+r.width*(.3+Math.random()*.4),ty=r.top+r.height*(.3+Math.random()*.4);
    el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,cancelable:true,view:window,clientX:tx,clientY:ty}));
    await wait(jit(30,40));
    const o={bubbles:true,cancelable:true,view:window,clientX:tx,clientY:ty,buttons:1};
    el.dispatchEvent(new MouseEvent('mousedown',o));await wait(jit(40,60));
    el.dispatchEvent(new MouseEvent('mouseup',o));await wait(jit(10,20));
    el.dispatchEvent(new MouseEvent('click',o));
  }catch(e){}
}

function fillInput(el,val){
  if(!el)return;
  try{el.focus();const ns=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;if(ns)ns.call(el,val);else el.value=val;['input','change','blur'].forEach(ev=>el.dispatchEvent(new Event(ev,{bubbles:true})));}catch(e){}
}

function playAlert(){
  try{const ctx=new(window.AudioContext||window.webkitAudioContext)();[0,.25,.5,.75,1].forEach(d=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.setValueAtTime(.35,ctx.currentTime+d);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+d+.18);o.start(ctx.currentTime+d);o.stop(ctx.currentTime+d+.18);});}catch(e){}
  try{if(Notification.permission==='granted')new Notification('VFS SLOT FOUND!',{body:'Slot available!'});else if(Notification.permission!=='denied')Notification.requestPermission();}catch(e){}
}

// Login
async function doLogin(acc){
  if(loginBusy)return;loginBusy=true;updateLoginBadge();
  const eEl=document.getElementById('email'),pEl=document.getElementById('password');
  if(!eEl||!pEl){loginBusy=false;return;}
  fillInput(eEl,'');fillInput(pEl,'');await wait(100);fillInput(eEl,acc.email);fillInput(pEl,acc.password);
  const t0=Date.now();
  while(Date.now()-t0<90000){await wait(500);const b=document.querySelector('button.btn-brand-orange');if(!b)break;if(!b.disabled&&!b.hasAttribute('disabled')&&!b.classList.contains('mat-mdc-button-disabled')){await wait(200+Math.random()*1000);b.click();break;}}
  loginBusy=false;
}
// Inject account buttons directly onto the VFS login page
function insertLoginButtons(){
  if(document.getElementById('vfs-acc-btns')||!onLogin())return;
  const signBtn=document.querySelector('button.btn-brand-orange');
  if(!signBtn)return;
  const wrap=document.createElement('div');wrap.id='vfs-acc-btns';
  wrap.style.cssText='margin:10px 0;';
  const lbl=document.createElement('div');
  lbl.style.cssText='font-size:12px;color:#666;margin-bottom:6px;font-weight:600;';
  lbl.textContent='Choose account:';
  wrap.appendChild(lbl);
  const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:6px;';
  loadLogins().forEach((acc,i)=>{
    const b=document.createElement('button');b.type='button';
    b.textContent=acc.email.split('@')[0];b.title=acc.email;
    b.style.cssText='padding:5px 12px;border-radius:20px;border:1px solid #6c5ce7;background:#ede9fe;color:#6c5ce7;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;';
    b.onclick=(e)=>{
      e.preventDefault();e.stopPropagation();
      row.querySelectorAll('button').forEach(x=>{x.style.background='#ede9fe';x.style.color='#6c5ce7';delete x.dataset.sel;});
      b.style.background='#6c5ce7';b.style.color='#fff';b.dataset.sel='1';
      loginIdx=i;updateLoginBadge();doLogin(acc);
    };
    row.appendChild(b);
  });
  wrap.appendChild(row);signBtn.parentNode.insertBefore(wrap,signBtn);
}
new MutationObserver(()=>{if(onLogin()&&!loginBusy)_rt(insertLoginButtons,700);}).observe(document.body,{childList:true,subtree:true});
if(document.readyState==='complete')_rt(insertLoginButtons,800);else window.addEventListener('load',()=>_rt(insertLoginButtons,800));
// Watchdog: auto-login only when bot is already running and gets kicked out
_ri(()=>{try{if(isCaptcha())return;if(onLogin()&&!loginBusy&&isRunning){stopMode();_rt(()=>doLogin(getLogin()),800);}}catch(e){}},5000);

// Auto-login: cycle through accounts automatically on login page
let _alActive=false;
async function startAutoLogin(){
  if(_alActive||loginBusy||!onLogin()||isCaptcha())return;
  _alActive=true;
  try{
    await doLogin(getLogin());
    // Wait up to 10s to detect successful navigation away from login page
    for(let i=0;i<20;i++){await wait(500);if(!onLogin()){_alActive=false;return;}}
    // Still on login page — detect visible error element
    const err=document.querySelector('mat-error,.mat-mdc-form-field-error,[role="alert"],.mat-mdc-snack-bar-label,.mat-mdc-snack-bar-container');
    const hasError=!!(err&&err.offsetParent!==null&&err.textContent.trim());
    nextLogin();
    // 5s on error, 3–4s on no error
    await wait(hasError?5000:jit(3000,1000));
  }catch(e){}
  _alActive=false;
  if(onLogin())_rt(startAutoLogin,300);
}
// Trigger when login form appears via DOM mutation or on initial load
new MutationObserver(()=>{if(onLogin()&&!_alActive&&!loginBusy)_rt(startAutoLogin,1200);}).observe(document.body,{childList:true,subtree:true});
if(document.readyState==='complete'&&onLogin())_rt(startAutoLogin,1500);
else window.addEventListener('load',()=>{if(onLogin())_rt(startAutoLogin,1500);},{once:true});

// Form fill helpers
function findByLabel(txt){try{const l=Array.from(document.querySelectorAll('label,mat-label,.form-label')).find(l=>l.textContent.trim().toLowerCase().includes(txt.toLowerCase()));if(!l)return null;const id=l.getAttribute('for');if(id)return document.getElementById(id);return(l.closest('mat-form-field,.form-group,div')||l.parentElement)?.querySelector('input,select,textarea')||null;}catch(e){return null;}}
const toISO=s=>{const m=s&&s.trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:s||'';};

async function dropOpt(trigger,text){
  if(!trigger||!text)return false;
  try{const bd=document.querySelector('.cdk-overlay-backdrop');if(bd){bd.click();await wait(150);}trigger.click();return new Promise(res=>{const t0=Date.now(),it=setInterval(()=>{try{const tl=text.trim().toLowerCase();const opts=Array.from(document.querySelectorAll('mat-option,.mat-mdc-option'));let o=opts.find(p=>p.textContent.trim().toLowerCase()===tl)||opts.find(p=>p.textContent.trim().toLowerCase().includes(tl));if(!o){const spans=Array.from(document.querySelectorAll('.mat-mdc-option .mdc-list-item__primary-text,.mat-option-text,.mat-mdc-option-text'));o=spans.find(p=>p.textContent.trim().toLowerCase()===tl);}if(o){o.click();clearInterval(it);res(true);}if(Date.now()-t0>5000){clearInterval(it);res(false);}}catch(e){clearInterval(it);res(false);}},60);});}catch(e){return false;}
}

async function setValues(c){
  try{
    const fi=(el,v)=>{if(el&&v!=null)fillInput(el,v);};
    // Inputs — use IDs and placeholders exactly as in VFS HTML
    fi(document.querySelector("[placeholder*='first name' i]"),c.First_Name);
    fi(document.querySelector("[placeholder*='last name' i]"),c.LastName);
    fi(document.querySelector('#dateOfBirth'),c.dateOfBirth);
    fi(document.querySelector("[placeholder*='passport number' i]"),c.PassportNumber);
    fi(document.querySelector('#passportExpirtyDate'),c.PassportExpiryDate);
    await wait(300);
    // VFS uses template-driven forms — NO formcontrolname on mat-selects.
    // Gender = first [id*=mat-select-value], Nationality = second.
    const triggers=document.querySelectorAll('[id*=mat-select-value]');
    if(triggers[0])await dropOpt(triggers[0],c.Gender);
    await wait(300);
    if(triggers[1]){await dropOpt(triggers[1],c.Country);await wait(300);_forceSave();}
  }catch(e){}
}
function _forceSave(){
  try{Array.from(document.querySelectorAll('button,input[type=button],input[type=submit]')).filter(e=>/^SAVE$/i.test((e.textContent||e.value||'').trim())).forEach(el=>{try{el.disabled=false;el.removeAttribute('disabled');el.removeAttribute('aria-disabled');el.classList?.remove('mat-mdc-button-disabled');el.style.pointerEvents='auto';el.style.opacity='';el.click();}catch(e){}});}catch(e){}
}

// Slot search engine
let isRunning=false,stopReq=false,currentMode=null;
let RETRY=Number(localStorage.getItem(LS_DELAY))||45000;
let STEP =Number(localStorage.getItem(LS_STEP)) ||3000;

async function closeOverlay(){try{const bd=document.querySelector('.cdk-overlay-backdrop');if(bd){bd.click();await wait(200);}if(document.querySelector('.cdk-overlay-pane')){document.body.click();await wait(150);}}catch(e){}}

async function selMat(sel,text,tries=3){
  try{
    const el=document.querySelector(sel);if(!el)return false;
    const tr=el.shadowRoot?.querySelector('.mat-mdc-select-trigger')||el.querySelector('.mat-mdc-select-trigger');if(!tr)return false;
    const s=text.trim().toLowerCase(),kw=s.split(/\s+/).filter(w=>w.length>3).pop()||s;
    for(let i=0;i<tries;i++){
      await closeOverlay();await wait(jit(200,150));await simClick(tr);
      let opt=null;
      for(let w=0;w<10;w++){await wait(200);const opts=Array.from(document.querySelectorAll('mat-option,.mat-mdc-option'));opt=opts.find(o=>o.textContent.trim().toLowerCase()===s)??opts.find(o=>o.textContent.trim().toLowerCase().includes(s))??opts.find(o=>o.textContent.trim().toLowerCase().includes(kw));if(opt)break;}
      if(opt){try{opt.scrollIntoView({block:'nearest',behavior:'instant'});}catch(e){}await wait(jit(80,60));await simClick(opt);await wait(jit(200,150));await closeOverlay();return true;}
      await closeOverlay();await wait(jit(300,200));
    }
    return false;
  }catch(e){return false;}
}

async function selAll(center){
  const{APPT,VISA}=C();
  if(stopReq||dlg())return false;
  if(!await selMat('mat-select[formcontrolname="centerCode"]',center)||stopReq||dlg())return false;
  for(let s=Math.round(STEP/1000);s>0;s--){if(stopReq)return false;await wait(1000);}if(stopReq||dlg())return false;
  if(!await selMat('mat-select[formcontrolname="selectedSubvisaCategory"]',APPT)||stopReq||dlg())return false;
  for(let s=Math.round(STEP/1000);s>0;s--){if(stopReq)return false;await wait(1000);}if(stopReq||dlg())return false;
  if(!await selMat('mat-select[formcontrolname="visaCategoryCode"]',VISA)||stopReq||dlg())return false;
  await wait(400);return true;
}

async function refresh(center,resetTo){if(stopReq)return;try{await selMat('mat-select[formcontrolname="centerCode"]',resetTo);await wait(250);}catch(e){}}

const btnTxt=t=>{try{return Array.from(document.querySelectorAll('button')).find(b=>{const l=b.querySelector('.mdc-button__label');return l&&l.textContent.trim().toLowerCase()===t.toLowerCase()&&!b.disabled&&b.offsetParent!==null});}catch(e){return null;}};

async function contLoop(n=20){for(let i=0;i<n;i++){if(stopReq||dlg())return false;try{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim().toLowerCase().includes('continue')&&!b.disabled);if(b){await wait(700);b.click();await wait(200);return true;}}catch(e){}await wait(300);}return false;}

async function bookSlot(){
  try{
    const days=Array.from(document.querySelectorAll('td.date-availiable:not(.fc-day-disabled)[data-date]'));if(!days.length)return false;
    const tgt=days[0];tgt.scrollIntoView({behavior:'auto',block:'center'});await wait(200);
    const r=tgt.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    for(const el of[tgt,tgt.querySelector('.fc-event,.availiable')||tgt])try{['mouseover','mousedown','mouseup','click'].forEach(ev=>el.dispatchEvent(new MouseEvent(ev,{bubbles:true,cancelable:true,view:window,clientX:cx,clientY:cy,button:0})));}catch(e){}
    let radio=null;for(let i=0;i<30;i++){await wait(400);const r2=Array.from(document.querySelectorAll('input.ba-slot-radio'));if(r2.length){radio=r2[0];break;}}
    if(!radio)return false;
    const lbl=document.querySelector(`label[for="${radio.id}"]`)||radio.closest('.ba-slot-box')?.querySelector('label');
    if(lbl){simClick(lbl);await wait(200);}
    radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));await wait(300);return await contLoop();
  }catch(e){return false;}
}

async function waitResult(max=12){
  for(let i=0;i<max;i++){
    if(stopReq||dlg())return false;
    try{
      if(/earliest available slot for/i.test(document.body.innerText||'')){playAlert();await wait(600);await contLoop();await wait(800);const d=document.querySelector('td.date-availiable:not(.fc-day-disabled)[data-date]');if(d){const ok=await bookSlot();if(ok)return true;}return false;}
      const lbl=Array.from(document.querySelectorAll('label')).find(e=>e.textContent.toLowerCase().includes('no slots'));
      if(lbl){const cb=document.getElementById(lbl.getAttribute('for'));if(cb&&!cb.checked)simClick(cb);await contLoop();return false;}
      const d=document.querySelector('td.date-availiable:not(.fc-day-disabled)[data-date]');
      if(d){playAlert();const ok=await bookSlot();if(ok)return true;await wait(1000);continue;}
    }catch(e){}
    await wait(450);
  }
  return false;
}

let svcDone=false,revDone=false,wlDone=false;
const resetFlags=()=>{svcDone=false;revDone=false;wlDone=false;};

async function loopSingle(center,reset){
  let fails=0;
  while(isRunning&&!stopReq){
    resetFlags();if(dlg()){await wait(800);continue;}
    await refresh(center,reset);if(stopReq)break;await wait(200);
    const ok=await selAll(center);
    if(!ok){fails++;if(fails>=5){if(isCaptcha()){fails=0;await wait(5000);continue;}fails=0;nextLogin();stopMode();return;}await wait(1500);continue;}
    fails=0;await wait(400);const done=await waitResult();if(done||stopReq)break;await wait(RETRY);
  }
  cleanup();
}

async function loopData(p,bk){
  let fails=0;
  while(isRunning&&!stopReq){
    resetFlags();if(dlg()){await wait(800);continue;}
    for(const[c,r]of[[p,bk],[bk,p]]){
      if(stopReq)break;await refresh(c,r);await wait(200);
      const ok=await selAll(c);
      if(!ok){fails++;if(fails>=5){if(isCaptcha()){fails=0;await wait(5000);continue;}fails=0;nextLogin();stopMode();return;}await wait(1200);continue;}
      fails=0;await wait(400);const done=await waitResult();if(done||stopReq)break;await wait(1500);
    }
    if(stopReq)break;await wait(RETRY);
  }
  cleanup();
}

async function loopAll(){
  const{RABAT,TANGIER,CASA}=C();
  const centers=[{c:RABAT,r:TANGIER},{c:TANGIER,r:RABAT},...(CASA?[{c:CASA,r:RABAT}]:[])];
  let idx=0,fails=0;
  while(isRunning&&!stopReq){
    if(dlg()){await wait(800);continue;}
    const{c,r}=centers[idx%centers.length];
    resetFlags();await refresh(c,r);await wait(200);
    const ok=await selAll(c);
    if(!ok){fails++;if(fails>=6){if(isCaptcha()){fails=0;await wait(5000);continue;}fails=0;nextLogin();stopMode();return;}idx++;await wait(1000);continue;}
    fails=0;await wait(400);const done=await waitResult();if(done||stopReq)break;
    idx++;await wait(idx%centers.length===0?RETRY:1500);
  }
  cleanup();
}

function startMode(mode){
  if(isRunning)return;
  if(!document.querySelector('mat-select[formcontrolname="centerCode"]'))return;
  const{RABAT,TANGIER,CASA}=C();
  stopReq=false;isRunning=true;currentMode=mode;updBadge();setBtnState(true);
  if(mode==='RBA')loopSingle(RABAT,TANGIER);
  else if(mode==='TNG')loopSingle(TANGIER,RABAT);
  else if(mode==='CASA'&&CASA)loopSingle(CASA,RABAT);
  else if(mode==='TNG>RBA')loopData(TANGIER,RABAT);
  else if(mode==='RBA>TNG')loopData(RABAT,TANGIER);
  else if(mode==='ALL')loopAll();
}
function stopMode(){stopReq=true;isRunning=false;currentMode=null;updBadge();setBtnState(false);}
function cleanup(){isRunning=false;currentMode=null;resetFlags();updBadge();setBtnState(false);}
function updBadge(){}
function setBtnState(r){
  const stop=document.getElementById('vfs-stop-inline');
  if(stop)stop.style.display=r?'':'none';
  const bar=document.getElementById('vfs-ctrl-bar');
  if(bar)bar.querySelectorAll('[data-act]').forEach(b=>b.style.display=r?'none':'');
}
function updateLoginBadge(){}

// Auto-booking observer
new MutationObserver(()=>{
  try{
    if(!wlDone){const mat=document.querySelector('mat-checkbox[formcontrolname="agreeToWaitlist"]'),inp=document.querySelector('#mat-mdc-checkbox-0-input');if(mat&&inp){playAlert();wlDone=true;if(!inp.checked){mat.click();inp.dispatchEvent(new Event('change',{bubbles:true}));}_rt(()=>{const b=btnTxt('continue');if(b)b.click();},80);}}
    if(wlDone&&document.body.innerText.includes('Summary')&&!/\/your-details/i.test(location.pathname)){const b=btnTxt('continue');if(b)b.click();}
    if(!svcDone&&document.querySelector('app-manage-service')){const b=btnTxt('continue');if(b){b.click();svcDone=true;}}
    if(!svcDone&&document.body.innerText.includes('Summary')&&!/\/your-details/i.test(location.pathname)){const b=btnTxt('continue');if(b){b.click();svcDone=true;}}
    if(!revDone&&document.querySelector('app-review-and-payment')){const tnc=document.querySelector('#mat-mdc-checkbox-0-input');if(tnc&&!tnc.checked){tnc.click();tnc.dispatchEvent(new Event('change',{bubbles:true}));}const p=btnTxt('pay online');if(p&&!p.disabled){p.click();revDone=true;}}
    const cbs=document.querySelectorAll('mat-checkbox input[type="checkbox"]');
    if(cbs.length>=3&&document.body.innerText.includes('Confirm')){cbs.forEach(cb=>{if(!cb.checked)cb.click();});_rt(()=>{const b=btnTxt('confirm');if(b)b.click();},80);}
  }catch(e){}
}).observe(document.body,{childList:true,subtree:true});

// Nationality auto-save + timer bypass (ported from vfs2.js)
(function(){
  const _sto=window.setTimeout.bind(window);
  const _sti=window.setInterval.bind(window);
  const _zsto=typeof window.__zone_symbol__setTimeout==='function'?window.__zone_symbol__setTimeout.bind(window):null;
  const _zsti=typeof window.__zone_symbol__setInterval==='function'?window.__zone_symbol__setInterval.bind(window):null;
  function getMatTxt(sel){if(!sel)return'';return((sel.querySelector('.mat-mdc-select-value')||sel).textContent||'').trim();}
  function isMorocco(){return Array.from(document.querySelectorAll('mat-select')).some(m=>/MOROCCO/i.test(getMatTxt(m)));}
  function findSaves(){return Array.from(document.querySelectorAll('button,input[type=button],input[type=submit]')).filter(el=>/^SAVE$/i.test((el.textContent||el.value||'').trim()));}
  function enableAndClick(el){try{el.disabled=false;el.removeAttribute('disabled');el.removeAttribute('aria-disabled');el.classList?.remove('mat-mdc-button-disabled');el.style.pointerEvents='auto';el.style.opacity='';el.click();}catch(e){}}
  let _once=false;
  function maybeClickSave(){
    if(_once)return;
    if(!isMorocco())return;
    const saves=findSaves();
    if(saves.length){_once=true;_sto(()=>saves.forEach(enableAndClick),50);}
    else _sto(maybeClickSave,200);
  }
  function wrapTimeout(orig){
    return function(cb,delay,...args){
      const isLong=typeof delay==='number'&&delay>=29000&&delay<=32000;
      const wrapped=function(){try{if(typeof cb==='function')cb.apply(this,args);}catch(e){}if(isLong)maybeClickSave();};
      return orig(wrapped,isLong?0:delay);
    };
  }
  function wrapInterval(orig){
    return function(cb,delay,...args){return orig(cb,typeof delay==='number'&&delay>=1000?1:delay,...args);};
  }
  window.setTimeout=wrapTimeout(_sto);
  window.setInterval=wrapInterval(_sti);
  if(_zsto)window.__zone_symbol__setTimeout=wrapTimeout(_zsto);
  if(_zsti)window.__zone_symbol__setInterval=wrapInterval(_zsti);
  new MutationObserver(()=>{try{maybeClickSave();}catch(e){}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','class']});
  // Reset _once when SPA navigates back to your-details
  _sti(()=>{try{if(!/your-details/i.test(location.href)&&_once&&!document.querySelector('#mintime'))_once=false;}catch(e){}},800);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',maybeClickSave,{once:true});
  else maybeClickSave();
})();

// Auto-start booking
let _snbCooldown=false;
function tryClickStartNewBooking(){
  try{
    if(_snbCooldown)return;
    const btn=Array.from(document.querySelectorAll('button')).find(b=>{
      if(b.disabled||b.offsetParent===null)return false;
      return(b.textContent||'').trim().toLowerCase().includes('start new booking');
    });
    if(!btn)return;
    _snbCooldown=true;
    _rt(()=>{_snbCooldown=false;},4000);
    _rt(()=>{try{btn.scrollIntoView({block:'center',behavior:'auto'});simClick(btn);}catch(e){}},300+Math.random()*200);
  }catch(e){}
}
new MutationObserver(()=>tryClickStartNewBooking()).observe(document.body,{childList:true,subtree:true});
setInterval(tryClickStartNewBooking,1200);

// Helper: build login URL based on current visa mode or current URL
function getLoginUrl(){
  const m=location.pathname.match(/\/mar\/en\/(aut|mlt|nld)\//i);
  const code=m?m[1].toLowerCase():VISA_MODE.toLowerCase();
  return location.origin+'/mar/en/'+code+'/login';
}

// Auto-click "Go back to home" — open login in new tab instead
let _gbhCooldown=false;
function tryClickGoHome(){
  try{
    if(_gbhCooldown)return;
    const a=Array.from(document.querySelectorAll('a.c-brand-orange')).find(el=>el.textContent.toLowerCase().includes('go back to home')&&el.offsetParent!==null);
    if(!a)return;
    _gbhCooldown=true;
    nextLogin();
    _rt(()=>{_gbhCooldown=false;},5000);
    _rt(()=>{try{window.open(getLoginUrl(),'_blank');}catch(e){}},400+Math.random()*300);
  }catch(e){}
}
new MutationObserver(()=>tryClickGoHome()).observe(document.body,{childList:true,subtree:true});
setInterval(tryClickGoHome,1500);

// 504 / error page detector — advance account and open login in new tab
let _504Cooldown=false;
function tryHandle504(){
  try{
    if(_504Cooldown)return;
    const title=document.title||'';
    const body=document.body?.innerText||'';
    const is504=/504|gateway\s*timeout|bad\s*gateway/i.test(title+' '+body.slice(0,300));
    const isErrPage=is504&&!document.querySelector('mat-select,app-appointment-booking,#email');
    if(!isErrPage)return;
    _504Cooldown=true;
    nextLogin();
    _rt(()=>{_504Cooldown=false;},20000);
    _rt(()=>{try{window.open(getLoginUrl(),'_blank');}catch(e){}},1000);
  }catch(e){}
}
new MutationObserver(()=>tryHandle504()).observe(document.body,{childList:true,subtree:true});
setInterval(tryHandle504,3000);

// Your Details Summary page — wait 3s then click Continue
let _ydDone=false;
function tryYourDetailsContinue(){
  try{
    if(_ydDone)return;
    if(!/\/your-details/i.test(location.pathname))return;
    const btn=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim().toLowerCase()==='continue'&&!b.disabled&&b.offsetParent!==null);
    if(!btn)return;
    _ydDone=true;
    _rt(()=>{_ydDone=false;},15000);
    _rt(()=>{try{btn.scrollIntoView({block:'center',behavior:'auto'});btn.click();}catch(e){}},3000);
  }catch(e){}
}
new MutationObserver(()=>tryYourDetailsContinue()).observe(document.body,{childList:true,subtree:true});
setInterval(tryYourDetailsContinue,1500);

// Auto-submit Cloudflare captcha dialog after 10 seconds
let _cfCooldown=false;
function trySubmitCaptchaDialog(){
  try{
    if(_cfCooldown)return;
    const dialog=document.querySelector('app-cloudflare-dialog');
    if(!dialog)return;
    const btn=Array.from(dialog.querySelectorAll('button')).find(b=>b.textContent.trim().toLowerCase()==='submit'&&!b.disabled&&b.offsetParent!==null);
    if(!btn)return;
    _cfCooldown=true;
    _rt(()=>{_cfCooldown=false;},15000);
    _rt(()=>{try{btn.click();}catch(e){}},10000);
  }catch(e){}
}
new MutationObserver(()=>trySubmitCaptchaDialog()).observe(document.body,{childList:true,subtree:true});
setInterval(trySubmitCaptchaDialog,2000);

// Slot alert
let _af2=false;
new MutationObserver(()=>{try{if(_af2)return;if(/earliest available slot for/i.test(document.body.innerText||'')){_af2=true;playAlert();_rt(()=>{_af2=false;},10000);}}catch(e){}}).observe(document.body,{childList:true,subtree:true,characterData:true});

// Auto-fill engine
let _afBusy=false,_afT=null,_afMs=0;
function schedFill(force){
  if(!force&&Date.now()-_afMs<4000)return;
  clearTimeout(_afT);
  _afT=_rt(async()=>{
    if(_afBusy)return;
    try{
      const ready=document.querySelector("[placeholder*='first name' i],[formcontrolname='firstName']");
      const sp=document.querySelector('.sk-ball-spin-clockwise');
      if(!ready||(sp&&getComputedStyle(sp).display!=='none'))return;
      const s=loadSettings(),idx=s.autoFillClientIndex??(s.autoFillFirstClient?0:-1);if(idx<0)return;
      const c=loadClients()[idx];if(!c)return;
      _afBusy=true;await wait(600);await setValues(c);await wait(600);await setValues(c);_afMs=Date.now();
    }catch(e){}
    _afBusy=false;
  },400);
}
new MutationObserver(()=>{if(document.querySelector("[placeholder*='first name' i],[formcontrolname='firstName']"))schedFill(false);}).observe(document.body,{childList:true,subtree:true});
_rt(()=>schedFill(true),1000);

// Inline control bar
function insertControlBar(){
  if(document.getElementById('vfs-ctrl-bar'))return;
  const anchor=document.querySelector('p.c-brand-grey-para.mb-15');
  if(!anchor)return;
  const{CASA}=C();
  const bar=document.createElement('div');bar.id='vfs-ctrl-bar';
  bar.innerHTML=`
<div class="vcb-row">
  <button class="vcb-mode${VISA_MODE==='AUT'?' vcb-active':''}" data-vm="AUT">🇦🇹 Austria</button>
  <button class="vcb-mode${VISA_MODE==='NLD'?' vcb-active':''}" data-vm="NLD">🇳🇱 NLD</button>
  <button class="vcb-mode${VISA_MODE==='MLT'?' vcb-active':''}" data-vm="MLT">🇲🇹 Malta</button>
</div>
<div class="vcb-row" id="vcb-actions">
  <button class="vcb-act" style="background:#16a34a" data-act="RBA">▶ Rabat</button>
  <button class="vcb-act" style="background:#0284c7" data-act="TNG">▶ Tangier</button>
  ${CASA?`<button class="vcb-act" style="background:#d97706" data-act="CASA">▶ Casa</button>`:''}
  <button class="vcb-act" style="background:#6c5ce7" data-act="TNG>RBA">T→R</button>
  <button class="vcb-act" style="background:#6c5ce7" data-act="RBA>TNG">R→T</button>
  <button class="vcb-act" style="background:#6c5ce7" data-act="ALL">All</button>
  <button class="vcb-act" style="background:#ef4444;display:none" id="vfs-stop-inline">⏹ Stop</button>
</div>
<div class="vcb-row">
  <label class="vcb-lbl">Step <input class="vcb-inp" id="vfs-step-input" type="number" value="${(STEP/1000).toFixed(1)}" min="0" step="0.5"> s</label>
  <label class="vcb-lbl">Retry <input class="vcb-inp" id="vfs-delay-input" type="number" value="${(RETRY/1000).toFixed(0)}" min="1"> s</label>
</div>`;
  anchor.parentNode.insertBefore(bar,anchor);
  bar.querySelectorAll('[data-vm]').forEach(b=>b.onclick=()=>{
    VISA_MODE=b.dataset.vm;localStorage.setItem('vfs_mode',VISA_MODE);
    bar.querySelectorAll('[data-vm]').forEach(x=>x.classList.toggle('vcb-active',x.dataset.vm===VISA_MODE));
  });
  bar.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{if(!isRunning)startMode(b.dataset.act);});
  document.getElementById('vfs-stop-inline').onclick=()=>stopMode();
  document.getElementById('vfs-step-input').onchange=()=>{const s=parseFloat(document.getElementById('vfs-step-input').value);if(!isNaN(s)&&s>=0){STEP=Math.round(s*1000);try{localStorage.setItem(LS_STEP,String(STEP));}catch(e){}}};
  document.getElementById('vfs-delay-input').onchange=()=>{const s=parseFloat(document.getElementById('vfs-delay-input').value);if(!isNaN(s)&&s>=1){RETRY=Math.round(s*1000);try{localStorage.setItem(LS_DELAY,String(RETRY));}catch(e){}}};
}
new MutationObserver(()=>{try{if(!document.getElementById('vfs-ctrl-bar'))insertControlBar();}catch(e){}}).observe(document.body,{childList:true,subtree:true});

// CSS
const _style=document.createElement('style');
_style.textContent=`
#vfs-ctrl-bar{font-family:system-ui,sans-serif;margin-bottom:14px;display:flex;flex-direction:column;gap:8px;padding:10px 0}
.vcb-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.vcb-mode{padding:5px 14px;border-radius:20px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s}
.vcb-mode.vcb-active{background:#ede9fe;border-color:#6c5ce7;color:#6c5ce7}
.vcb-act{padding:7px 16px;border-radius:8px;border:none;font-size:12px;font-weight:700;color:#fff;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.18);transition:opacity .15s}
.vcb-act:hover{opacity:.88}
.vcb-lbl{font-size:11px;font-weight:600;color:#64748b;display:flex;align-items:center;gap:4px}
.vcb-inp{width:52px;padding:5px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;text-align:center;color:#1e293b;font-family:inherit}
.vcb-inp:focus{outline:none;border-color:#6c5ce7}
`;
document.head.appendChild(_style);

function buildQF(){
  try{
    const ex=document.getElementById('vfs-quick-fill');if(ex)ex.remove();
    const clients=loadClients();if(!clients.length)return;
    const bar=document.createElement('div');bar.id='vfs-quick-fill';
    bar.style.cssText='position:fixed;bottom:10px;left:10px;z-index:999999;background:#fff;border:2px solid #FCC761;border-radius:10px;padding:8px 10px;font-family:system-ui,sans-serif;font-size:11px;display:flex;flex-direction:column;gap:5px;max-height:320px;overflow-y:auto;box-shadow:0 4px 16px rgba(252,199,97,.35)';
    const title=document.createElement('div');title.style.cssText='font-size:11px;font-weight:700;color:#64748b;border-bottom:1px solid #FCC761;padding-bottom:4px;margin-bottom:2px;display:flex;align-items:center;justify-content:space-between';title.innerHTML='<span>👤 Quick Fill</span>';
    bar.appendChild(title);
    clients.forEach((c,i)=>{
      const b=document.createElement('button');
      b.style.cssText='padding:5px 10px;border-radius:7px;border:1px solid #0077b6;background:#0077b6;font-size:11px;font-weight:600;cursor:pointer;text-align:left;white-space:nowrap';
      b.innerHTML=`<span style="color:rgba(255,255,255,.6);font-size:10px">#${i+1}</span>  <span style="color:#fff">${esc(c.First_Name)} ${esc(c.LastName)}</span>`;
      b.onmouseenter=()=>{b.style.background='#005f8e';b.style.borderColor='#005f8e';};
      b.onmouseleave=()=>{b.style.background='#0077b6';b.style.borderColor='#0077b6';};
      b.onclick=()=>{setValues(c);b.textContent='✅ Filled!';setTimeout(()=>{b.innerHTML=`<span style="color:rgba(255,255,255,.6);font-size:10px">#${i+1}</span>  <span style="color:#fff">${esc(c.First_Name)} ${esc(c.LastName)}</span>`;},1200);};
      bar.appendChild(b);
    });
    document.body.appendChild(bar);
  }catch(e){}
}

// Init
buildQF();
window.__vfs={loadLogins,saveLogins,loadClients,saveClients,startMode,stopMode,nextLogin};
})();
