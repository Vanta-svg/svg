(()=>{
'use strict';
const DEFAULT_WISP='wss://cdn.kcchallengevbc.com/adblock/';
const WISP_FALLBACKS=[
'wss://cdn.kcchallengevbc.com/adblock/',
'wss://cdn.northstreetumc.org/adblock/',
'wss://cdn.vipersfutbol.com/adblock/',
'wss://cdn.pcesc.org/adblock/',
'wss://cdn.slcbmooc.org/adblock/',
];
const getSavedWisp=()=>{try{return JSON.parse(localStorage.getItem('vanta.settings.v1')||'{}').wisp?.trim()||''}catch{return ''}};
const validWisp=u=>/^wss:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(String(u||'').trim());
const getWisp=()=>getSavedWisp()||DEFAULT_WISP;
let workingWispPromise=null;
let rotateWispOnNextCheck=false;
async function getWorkingWisp(){
if(workingWispPromise)return workingWispPromise;
workingWispPromise=(async()=>{
const saved=getSavedWisp();
const remembered=(()=>{try{return localStorage.getItem('vanta.lastWorkingWisp')||''}catch{return ''}})();
const rotate=rotateWispOnNextCheck;
rotateWispOnNextCheck=false;
const candidates=(rotate?[...WISP_FALLBACKS,saved,remembered]:[saved,remembered,...WISP_FALLBACKS]).filter(validWisp);
const unique=[...new Set(candidates)];
const api=window.EpoxyTransport || (await loadEpoxyTransport());
const Transport=api?.default || api;
if(typeof Transport!=='function')throw new Error('Epoxy transport is unavailable');
let lastError=null;
for(const wisp of unique){
try{
const transport=new Transport({wisp});
await Promise.race([
Promise.resolve(transport.init()),
new Promise((_,reject)=>setTimeout(()=>reject(new Error('WISP connection timed out')),7000))
]);
try{localStorage.setItem('vanta.lastWorkingWisp',wisp)}catch{}
return wisp;
}catch(e){
lastError=e;
console.warn('[Vanta] WISP failed:',wisp,e);
}
}
throw new Error('No WISP server could be initialized'+(lastError?.message?': '+lastError.message:''));
})().finally(()=>{workingWispPromise=null});
return workingWispPromise;
}
const $=id=>document.getElementById(id);
const sidebarTop=$('sidebar-top'), tabBar=$('tab-bar'), urlInput=$('url-input');
const homeView=$('home-view'), webView=$('web-view'), browserLoading=$('browser-loading'), proxyError=$('proxy-error'), proxyErrorMessage=$('proxy-error-message'), proxyErrorRetry=$('proxy-error-retry');
const backBtn=$('back'), forwardBtn=$('forward'), reloadBtn=$('reload');
function showSiteLoading(tab,message='Loading site'){
browserLoading.classList.remove('hidden'); browserLoading.classList.add('flex');
$('iframe-loading-bar')?.classList.add('active');
}
function hideSiteLoading(){
browserLoading.classList.add('hidden'); browserLoading.classList.remove('flex');
$('iframe-loading-bar')?.classList.remove('active');
}
function hideProxyError(){
proxyError.classList.add('hidden'); proxyError.classList.remove('flex');
}
function showProxyError(message){
hideSiteLoading();
const text=String(message||'');
proxyErrorMessage.textContent=text && text.length<220 ? text : 'The proxy connection stopped unexpectedly. Click Retry to reconnect.';
proxyError.classList.remove('hidden'); proxyError.classList.add('flex');
}
async function retryProxyConnection(){
const active=tabs.find(t=>t.id===activeTabId);
if(!active || active.type!=='proxy')return;
hideProxyError(); showSiteLoading(active);
clearTimeout(backendRetryTimer); backendRetryTimer=null;
ready=false; controller=null; resetProxyFrames();
try{
await recoverBackend('manual retry: re-inject service worker and WISP');
if(!ready || !controller)throw new Error('Backend is still unavailable');
const current=tabs.find(t=>t.id===activeTabId);
if(!current || current.type!=='proxy')return;
try{ current.proxyFrame?.destroy?.(); }catch{}
current.proxyFrame=null;
current.userNavigatingUntil=performance.now()+1800;
current.proxyFrame=controller.createFrame(current.iframe);
await Promise.resolve(current.proxyFrame.go(current.target||current.url));
}catch(error){
console.error('[Vanta] Manual proxy retry failed:',error);
showProxyError(String(error?.message||error));
}
}
proxyErrorRetry.onclick=retryProxyConnection;
const AppMap={
home:{id:'home',icon:'home',title:'Vanta.',url:'vanta://home',target:'./h.svg',type:'direct'},
movies:{id:'movies',icon:'clapperboard',title:'cineby.rocks',url:'https://cineby.rocks/',type:'proxy'},
g:{id:'g',icon:'gamepad-2',title:'Games',url:'vanta://g',target:'./g.svg',type:'direct'},
cloud:{id:'cloud',icon:'cloud',title:'Vanta Cloud',url:'vanta://cloud',target:'./c.svg',type:'direct'}
};
const sidebarOrder=['home','movies','g','cloud'];
let controller=null, ready=false, tabCounter=0, activeTabId=null;
const tabs=[];
function setStatus(text){ document.title='Vanta Browser'; }
function normalize(value){
value=String(value??'').trim();
if(!value || value.toLowerCase()==='home' || value==='/VW/home') return 'vanta://home';
const decodedProxy=extractOriginalUrl(value);
if(decodedProxy) value=decodedProxy;
try{
const local=new URL(value,location.href);
if(local.origin===location.origin){
if(local.pathname==='/home.html' || local.pathname==='/' || local.pathname==='/index.html') return 'vanta://home';
if(local.pathname==='/g.html') return 'vanta://g';
if(local.pathname==='/embed.html') return 'vanta://cloud';
if(local.pathname.startsWith('/~/') || local.pathname.includes('/sj/')){
const original=extractOriginalUrl(local.href);
if(original) value=original;
else return 'vanta://home';
}
}
}catch{}
if(value.toLowerCase()==='vanta://settings' || value.toLowerCase()==='vanta://settings') return 'vanta://settings';
if(!/^[a-z][a-z\d+.-]*:/i.test(value)){
if(value.includes('.')) value='https://'+value;
else {
let engine='brave'; try{engine=JSON.parse(localStorage.getItem('vanta.settings.v1')||'{}').search||'brave'}catch{}
const engines={brave:'https://search.brave.com/search?q=',duckduckgo:'https://duckduckgo.com/?q=',google:'https://www.google.com/search?q=',bing:'https://www.bing.com/search?q='};
value=(engines[engine]||engines.brave)+encodeURIComponent(value);
}
}
if(/^vanta:\/\//i.test(value)) {
const key=value.slice(8).split('/')[0].toLowerCase();
if(key==='games') return 'vanta://g';
if(key==='settings') return 'vanta://settings';
if(AppMap[key]) return 'vanta://'+key;
throw new Error('Unknown Vanta app');
}
const parsed=new URL(value);
if(!['http:','https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported');
return parsed.href;
}
const iconMap={globe:'fa-globe',settings:'fa-gear',plus:'fa-plus','arrow-left':'fa-arrow-left','arrow-right':'fa-arrow-right','rotate-cw':'fa-rotate-right',search:'fa-magnifying-glass',x:'fa-xmark',languages:'fa-language','gamepad-2':'fa-gamepad',cpu:'fa-microchip','message-square':'fa-message',clapperboard:'fa-clapperboard',monitor:'fa-display',radio:'fa-radio','panel-top':'fa-table-columns',sparkles:'fa-wand-magic-sparkles','server-cog':'fa-server','rotate-ccw':'fa-rotate-left','trash-2':'fa-trash','triangle-alert':'fa-triangle-exclamation',cloud:'fa-cloud',home:'fa-house'};
function iconMarkup(name,extra=''){ return '<i class="fa-solid '+(iconMap[name]||'fa-circle')+' '+extra+'"></i>'; }
function domainFromUrl(url){
try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''}
}
function faviconUrl(url){
const host=domainFromUrl(url);
return host ? 'https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=64' : '';
}
function titleFromUrl(url){
const host=domainFromUrl(url);
if(!host)return '';
const names={
'search.brave.com':'Brave Search',
'brave.com':'Brave',
'google.com':'Google',
'www.google.com':'Google',
'youtube.com':'YouTube',
'www.youtube.com':'YouTube',
'discord.com':'Discord',
'www.discord.com':'Discord',
'twitch.tv':'Twitch',
'www.twitch.tv':'Twitch',
'spotify.com':'Spotify',
'www.spotify.com':'Spotify',
'facebook.com':'Facebook',
'www.facebook.com':'Facebook'
};
return names[host] || host;
}
function tabIconNode(tab){
const box=document.createElement('span'); box.className='vanta-tab-icon';
const domain=domainFromUrl(tab.url);
if(domain && /^https?:\/\//i.test(tab.url||'')){
const img=document.createElement('img');
img.src=faviconUrl(tab.url); img.alt=''; img.referrerPolicy='no-referrer'; img.decoding='async';
img.onload=()=>{ if(img.naturalWidth<8 || img.naturalHeight<8){img.remove(); box.insertAdjacentHTML('beforeend',iconMarkup(tab.icon));} };
img.onerror=()=>{img.remove(); if(!box.querySelector('i')) box.insertAdjacentHTML('beforeend',iconMarkup(tab.icon));};
box.appendChild(img);
}else box.insertAdjacentHTML('beforeend',iconMarkup(tab.icon));
return box;
}
function renderSidebar(){
sidebarTop.innerHTML='';
sidebarOrder.forEach(appId=>{
const app=AppMap[appId], btn=document.createElement('button');
btn.className=`w-11 h-11 rounded-xl flex items-center justify-center icon-transition group mx-auto sidebar-btn-${appId}`;
btn.innerHTML=iconMarkup(app.icon,'w-[22px] h-[22px] transition-transform group-hover:scale-110');
btn.onclick=()=>openApp(appId); sidebarTop.appendChild(btn);
});
}
function updateSidebar(){
const active=tabs.find(t=>t.id===activeTabId);
sidebarOrder.forEach(id=>{const b=document.querySelector(`.sidebar-btn-${id}`); if(!b)return; const on=active&&active.appId===id; b.classList.toggle('bg-white',on);b.classList.toggle('text-black',on);b.classList.toggle('shadow-md',on);b.classList.toggle('text-gray-400',!on);});
}
function createTab(appId='home'){
const app=AppMap[appId]||AppMap.home, id='tab-'+tabCounter++;
const iframe=document.createElement('iframe');
iframe.className='absolute inset-0 w-full h-full border-0 bg-white';
iframe.title='Vanta browser content';
iframe.referrerPolicy='no-referrer';
iframe.style.display='none';
const frameHost=webView.querySelector('div');
if(frameHost && !frameHost.classList.contains('relative')) frameHost.classList.add('relative');
frameHost.insertBefore(iframe, browserLoading);
const tab={id,appId:app.id,title:app.title,icon:app.icon,url:app.url,type:app.type,target:app.target||app.url,proxyFrame:null,iframe,lastFrameUrl:'',urlWatcher:null,proxyOpening:null,navSeq:0,userNavigatingUntil:0};
iframe.src=(app.id==='home') ? new URL('/home.html',location.origin).href : 'about:blank';
tabs.push(tab);
iframe.addEventListener('load',()=>{if(activeTabId===id)hideSiteLoading(); updateTabAddressFromFrame(tab);});
renderTabs(); switchTab(id);
return tab;
}
function openApp(appId){
const app=AppMap[appId]; if(!app)return;
let t=tabs.find(x=>x.appId===appId);
if(!t)t=createTab(appId);
t.appId=app.id; t.title=app.title; t.icon=app.icon; t.url=app.url; t.type=app.type; t.target=app.target||app.url;
if(t.proxyFrame){ try{t.proxyFrame.destroy?.()}catch{}; t.proxyFrame=null; }
switchTab(t.id);
navigate(app.url).catch(e=>console.error('[Vanta] App navigation failed:',e));
}
function renderTabs(){
const plus=document.getElementById('new-tab-btn');
tabBar.innerHTML='';
tabs.forEach(tab=>{
const active=tab.id===activeTabId;
const el=document.createElement('div');
el.className=`group vanta-tab shrink-0 cursor-pointer tab-transition border ${active?'bg-[#151515] text-white border-[#ff7a00]':'bg-transparent text-gray-500 border-transparent hover:bg-[#0f0f0f] hover:text-gray-300'}`;
el.onclick=()=>switchTab(tab.id);
const icon=tabIconNode(tab);
const title=document.createElement('span'); title.className='vanta-tab-title text-xs truncate font-medium select-none'; title.textContent=tab.title||domainFromUrl(tab.url)||'New Tab';
const close=document.createElement('button'); close.type='button'; close.className='w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 shrink-0 transition-opacity'; close.title='Close Tab'; close.innerHTML='<i class="fa-solid fa-xmark"></i>'; close.onclick=e=>window.closeVantaTab(tab.id,e);
el.append(icon,title,close); tabBar.appendChild(el);
});
if(plus) tabBar.appendChild(plus);
}
function decodeProxyUrl(raw){
let value=String(raw||'').trim();
if(!value || value==='about:blank') return '';
for(let i=0;i<12;i++){
let next=value;
try{next=decodeURIComponent(value)}catch{}
if(next===value) break;
value=next;
}
return value;
}
function extractOriginalUrl(raw){
let u=decodeProxyUrl(raw);
if(!u)return null;
const matches=[];
const re=/https?:\/\//ig;
let m;
while((m=re.exec(u))!==null){
const candidate=decodeProxyUrl(u.slice(m.index)).replace(/[\s"'<>]+$/g,'').replace(/[)]+$/g,'');
try{
const parsed=new URL(candidate);
if(/^https?:$/i.test(parsed.protocol) && !/^127\.0\.0\.1$|^localhost$/i.test(parsed.hostname)) matches.push(parsed.href);
}catch{}
}
if(matches.length) return matches[matches.length-1];
try{
const direct=new URL(u);
if(/^https?:$/i.test(direct.protocol) && !/^127\.0\.0\.1$|^localhost$/i.test(direct.hostname)) return direct.href;
}catch{}
return null;
}
function cleanBrowserUrl(raw,fallback=''){
const original=extractOriginalUrl(raw);
if(original)return original;
const value=String(raw||'').trim();
if(/^vanta:\/\//i.test(value))return value;
return fallback||value;
}
function updateTabAddressFromFrame(tab){
if(!tab || tab.id!==activeTabId || tab.type!=='proxy')return false;
let candidates=[];
try{candidates.push(tab.proxyFrame?.url||'',tab.proxyFrame?.currentUrl||'')}catch{}
try{candidates.push(tab.iframe.src||'')}catch{}
try{candidates.push(tab.iframe.contentWindow?.location?.href||'')}catch{}
let original=null;
for(const candidate of candidates){
const found=extractOriginalUrl(candidate);
if(found){original=found;break;}
}
if(!original) original=extractOriginalUrl(tab.target)||cleanBrowserUrl(tab.url);
if(!original || !/^https?:\/\//i.test(original))return false;
let pageTitle='';
try{pageTitle=String(tab.iframe.contentDocument?.title||'').trim()}catch{}
const nextTitle=pageTitle && !/^Vanta(?: Browser)?$/i.test(pageTitle) ? pageTitle : (titleFromUrl(original)||tab.title);
const changedUrl=original!==tab.url, changedTitle=nextTitle!==tab.title;
if(changedUrl){tab.url=original;tab.target=original;}
if(changedTitle)tab.title=nextTitle;
if(changedUrl || changedTitle){
tab.lastFrameUrl=original;
const editing=document.activeElement===urlInput || document.activeElement===$('setting-tab-url');
if(!editing && performance.now()>Number(tab.userNavigatingUntil||0)) urlInput.value=original;
const settingInput=$('setting-tab-url');
if(settingInput && activeTabId===tab.id && document.activeElement!==settingInput) settingInput.value=original;
renderTabs();
return true;
}
if(document.activeElement!==urlInput && performance.now()>Number(tab.userNavigatingUntil||0) && urlInput.value!==original) urlInput.value=original;
return false;
}
function startFrameUrlWatcher(tab){
if(tab.urlWatcher)clearInterval(tab.urlWatcher);
tab.urlWatcher=setInterval(()=>{ if(performance.now()<Number(tab.userNavigatingUntil||0)) return; updateTabAddressFromFrame(tab); },1200);
}
function switchTab(id){
const tab=tabs.find(t=>t.id===id); if(!tab)return;
const changed=activeTabId!==id;
activeTabId=id;
if(changed){ hideSiteLoading(); hideProxyError(); }
urlInput.value=tab.url==='vanta://home'?'home':(tab.url||'home');
const settingsOpen=tab.url==='vanta://settings';
tabs.forEach(t=>{
if(!t.iframe)return;
const visible=t.id===id&&!settingsOpen;
t.iframe.style.setProperty('display',visible?'block':'none','important');
t.iframe.style.setProperty('visibility',visible?'visible':'hidden','important');
t.iframe.style.setProperty('pointer-events',visible?'auto':'none','important');
t.iframe.style.setProperty('z-index',visible?'1':'0','important');
t.iframe.setAttribute('aria-hidden',visible?'false':'true');
});
homeView.classList.add('opacity-0','pointer-events-none');
webView.classList.toggle('opacity-0',settingsOpen);
webView.classList.toggle('pointer-events-none',settingsOpen);
$('settings-view').classList.toggle('settings-open',settingsOpen);
renderTabs(); updateSidebar(); const tabUrlInput=$('setting-tab-url'); if(tabUrlInput) tabUrlInput.value=tab.url==='vanta://home'?'home':(tab.url||'');
}

window.closeVantaTab = (id, e) => {
e.stopPropagation();
const i = tabs.findIndex(t => t.id === id);
if (i < 0) return;
const tab = tabs[i];

if(tab.urlWatcher) clearInterval(tab.urlWatcher);
try { tab.proxyFrame?.destroy?.(); } catch(err) {}

if (tab.iframe) tab.iframe.remove();
tabs.splice(i, 1);

if (!tabs.length) {
createTab('home');
return;
}
if (activeTabId === id) {
switchTab(tabs[Math.max(0, Math.min(i, tabs.length - 1))].id);
} else {
renderTabs();
}
};
async function openProxyTab(tab,target){
if(!tab) throw new Error('Tab no longer exists');
if(tab.type!=='proxy') throw new Error('This tab is not a proxy tab');
target=extractOriginalUrl(target)||normalize(target);
if(/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/|$)/i.test(target)) throw new Error('Blocked local proxy URL');
if(tab.proxyOpening)return tab.proxyOpening;
tab.proxyOpening=(async()=>{
if(!ready || !controller) await recoverBackend('proxy backend unavailable for '+(tab.appId||'tab'));
if(!ready || !controller) throw new Error('Proxy backend is unavailable');
if(!tab.iframe || !tab.iframe.isConnected) throw new Error('Proxy iframe is unavailable');
const seq=++tab.navSeq;
tab.userNavigatingUntil=performance.now()+1800;
hideProxyError();
try{
let frame=tab.proxyFrame;
if(!frame || typeof frame.go!=='function'){
frame=controller.createFrame(tab.iframe);
if(!frame || typeof frame.go!=='function')throw new Error('Proxy frame could not be created');
tab.proxyFrame=frame;
}
tab.target=target; tab.url=target; tab.lastFrameUrl=target;
startFrameUrlWatcher(tab);
if(activeTabId===tab.id) urlInput.value=target;
renderTabs();
await Promise.resolve(frame.go(target));
if(seq!==tab.navSeq || tab.proxyFrame!==frame)return;
}catch(error){
console.warn('[Vanta] Proxy navigation failed:',error);
throw error;
}
})().finally(()=>{tab.proxyOpening=null; tab.userNavigatingUntil=performance.now()+700;});
return tab.proxyOpening;
}
async function navigate(value){
const active=tabs.find(t=>t.id===activeTabId); if(!active)return; let target; try{target=normalize(value);}catch(e){return;}
target=extractOriginalUrl(target)||target;
if(/^https?:\/\/(?:127\.0\.0\.1|localhost)/i.test(target)) return;
active.url=target;
if(target==='vanta://settings'){
active.appId='settings'; active.title='Settings'; active.icon='settings'; active.type='settings'; active.target=target; active.url=target;
urlInput.value='vanta://settings'; switchTab(active.id); loadSettings(); return;
}
const app=target.startsWith('vanta://') ? AppMap[target.slice(8).split('/')[0].toLowerCase()] : null;
if(app){
active.appId=app.id;
active.title=app.title;
active.type=app.type;
active.target=app.target||app.url||target;
} else {
active.appId=null;
active.type='proxy';
active.target=target;
active.title=titleFromUrl(target)||new URL(target).hostname;
active.icon='globe';
}
urlInput.value=target==='vanta://home'?'home':target;
hideProxyError();
homeView.classList.add('opacity-0','pointer-events-none');webView.classList.remove('opacity-0','pointer-events-none');showSiteLoading(active);renderTabs();
try{
if(active.type==='direct'){
active.iframe.src=active.target;
} else {
try{
await openProxyTab(active,active.target||target);
}catch(e){
if(!isWispMuxTaskEnded(e)) throw e;
lastBackendError=String(e?.message||e);
await recoverBackend(lastBackendError);
if(!ready||!controller) throw e;
await openProxyTab(active,active.target||target);
}
}
}catch(e){
if(active.type==='proxy' && activeTabId===active.id){
const message=String(e?.message||e);
if(isWispMuxTaskEnded(e) || /backend is unavailable|service worker|transport|wisp/i.test(message)){
ready=false; controller=null; resetProxyFrames();
clearTimeout(backendRetryTimer); backendRetryTimer=null;
}
showProxyError(message);
}
console.error('[Vanta] Navigation failed:',e);
} finally { if(activeTabId===active.id && active.iframe.contentWindow) setTimeout(()=>{ if(activeTabId===active.id) hideSiteLoading(); },8000); }
}
backBtn.onclick=()=>{const t=tabs.find(x=>x.id===activeTabId);if(t?.proxyFrame)t.proxyFrame.back();};
forwardBtn.onclick=()=>{const t=tabs.find(x=>x.id===activeTabId);if(t?.proxyFrame)t.proxyFrame.forward();};
reloadBtn.onclick=()=>{const t=tabs.find(x=>x.id===activeTabId);if(t?.proxyFrame)t.proxyFrame.reload();};
urlInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const clean=cleanBrowserUrl(urlInput.value);const active=tabs.find(t=>t.id===activeTabId);if(active)active.userNavigatingUntil=performance.now()+2200;urlInput.value=clean;navigate(clean);urlInput.blur();}});
urlInput.addEventListener('focus',()=>urlInput.select());
urlInput.addEventListener('input',()=>{
const clear=$('clear-url');
if(clear) clear.style.opacity=urlInput.value ? '1' : '0';
});
$('clear-url').onclick=()=>{urlInput.value='';urlInput.focus();};
let googleTranslateLoaded=false;
let googleTranslateLoading=null;
let translateComboObserver=null;
let translateInjectToken=0;
function setTranslateStatus(text,ok=false){
const status=$('translate-status');
if(status){status.textContent=text;status.classList.toggle('text-gray-400',ok);}
}
function getActiveContentDocument(){
const tab=tabs.find(t=>t.id===activeTabId);
if(!tab?.iframe)return null;
try{return tab.iframe.contentDocument||tab.iframe.contentWindow?.document||null}catch{return null;}
}
async function injectTranslateIntoActiveFrame(lang){
const tab=tabs.find(t=>t.id===activeTabId);
if(!tab?.iframe){setTranslateStatus('Open a page first.');return;}
const doc=getActiveContentDocument();
if(!doc){setTranslateStatus('This page does not allow iframe translation.');return;}
const win=tab.iframe.contentWindow;
if(!win)return;
const token=++translateInjectToken;
try{
let host=doc.getElementById('__vanta_google_translate');
if(!host){
host=doc.createElement('div');
host.id='__vanta_google_translate';
host.style.cssText='position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;overflow:hidden;z-index:2147483647;';
(doc.body||doc.documentElement).appendChild(host);
}
const callback='__vantaGoogleTranslateInit_'+token;
win[callback]=()=>{
try{
if(win.google?.translate?.TranslateElement){
host.innerHTML='';
new win.google.translate.TranslateElement({pageLanguage:'auto',autoDisplay:false,layout:win.google.translate.TranslateElement.InlineLayout.SIMPLE},host.id);
setTimeout(()=>{
const select=doc.querySelector('.goog-te-combo');
if(select){select.value=lang;select.dispatchEvent(new win.Event('change',{bubbles:true}));setTranslateStatus('Translated this tab to '+lang+'.',true);}
else setTranslateStatus('Translate loaded for this tab.',true);
},350);
}
}finally{try{delete win[callback]}catch{}}
};
let script=doc.getElementById('__vanta_google_translate_script');
if(!script){
script=doc.createElement('script');
script.id='__vanta_google_translate_script';
script.async=true;
script.src='https://translate.google.com/translate_a/element.js?cb='+encodeURIComponent(callback);
(doc.head||doc.documentElement).appendChild(script);
}else if(win.google?.translate?.TranslateElement){
win[callback]();
}
setTranslateStatus('Applying translation…');
setTimeout(()=>{if(token===translateInjectToken){const select=doc.querySelector('.goog-te-combo');if(select){select.value=lang;select.dispatchEvent(new win.Event('change',{bubbles:true}));}}},1200);
}catch(error){
console.warn('[Vanta] iframe Google Translate injection failed:',error);
setTranslateStatus('This tab cannot be translated from the browser.');
}
}
function watchTranslateSelector(){
if(translateComboObserver)translateComboObserver.disconnect();
const root=$('google_translate_element');
if(!root)return;
const bind=()=>{
const combo=root.querySelector('.goog-te-combo');
if(!combo||combo.dataset.vantaBound==='1')return;
combo.dataset.vantaBound='1';
combo.addEventListener('change',()=>{
if(combo.value)injectTranslateIntoActiveFrame(combo.value);
});
};
bind();
translateComboObserver=new MutationObserver(bind);
translateComboObserver.observe(root,{childList:true,subtree:true});
}
window.googleTranslateElementInit=()=>{
if(!window.google?.translate?.TranslateElement)return;
const root=$('google_translate_element');
if(!root)return;
root.innerHTML='';
new google.translate.TranslateElement({pageLanguage:'en',autoDisplay:false,layout:google.translate.TranslateElement.InlineLayout.SIMPLE},'google_translate_element');
googleTranslateLoaded=true;
setTranslateStatus('Choose a language to translate the current tab.');
setTimeout(watchTranslateSelector,50);
};
function loadGoogleTranslate(){
if(googleTranslateLoaded||window.google?.translate?.TranslateElement)return Promise.resolve();
if(googleTranslateLoading)return googleTranslateLoading;
googleTranslateLoading=new Promise((resolve,reject)=>{
const script=document.createElement('script');
script.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
script.async=true;
script.onload=()=>setTimeout(resolve,0);
script.onerror=()=>reject(new Error('Google Translate failed to load'));
document.head.appendChild(script);
});
return googleTranslateLoading;
}
const translateBtn=$('translate-btn'), translatePanel=$('translate-panel'), translateClose=$('translate-close');
translateBtn.onclick=async()=>{
const open=translatePanel.classList.toggle('hidden');
translateBtn.setAttribute('aria-expanded',String(!open));
if(!open){
try{
const status=$('translate-status');
if(status)status.textContent='Loading Google Translate…';
await loadGoogleTranslate();
if(!googleTranslateLoaded&&window.google?.translate?.TranslateElement)window.googleTranslateElementInit();
setTimeout(watchTranslateSelector,100);
}catch(e){
const status=$('translate-status');
if(status)status.textContent='Google Translate could not be loaded.';
}
}
};
translateClose.onclick=()=>{translatePanel.classList.add('hidden');translateBtn.setAttribute('aria-expanded','false');};
document.addEventListener('click',e=>{
if(translatePanel.classList.contains('hidden'))return;
if(!translatePanel.contains(e.target)&&!translateBtn.contains(e.target)){
translatePanel.classList.add('hidden');
translateBtn.setAttribute('aria-expanded','false');
}
});

const newTabBtn = document.getElementById('new-tab-btn');
if (newTabBtn) newTabBtn.onclick = () => createTab('home');
let backendStarting=false;
let backendRetryTimer=null;
let backendRetryDelay=1500;
let backendGeneration=0;
let backendRecoveryPromise=null;
let lastBackendError='';
function isWispMuxTaskEnded(error){
const text=String(error?.stack||error?.message||error||'');
return /MuxTaskEnded|Multiplexor task ended|Internal Service Worker Error/i.test(text);
}
function resetProxyFrames(){
tabs.forEach(t=>{ t.proxyFrame=null; });
}
const ENGINE_KEY='vanta.proxy.engine';
const EPOXY_LOCAL='./black/index.mjs';
const LIBCURL_LOCAL='./67/index.mjs';
const getEngine=()=>localStorage.getItem(ENGINE_KEY)==='two-jet'?'two-jet':'scramjet-v2';
const setEngine=engine=>localStorage.setItem(ENGINE_KEY,engine==='two-jet'?'two-jet':'scramjet-v2');

async function loadEpoxyTransport(){
if(window.EpoxyTransport) return window.EpoxyTransport.default || window.EpoxyTransport;
const mod = await import(new URL('./black/index.mjs', location.href).href);
const T = mod.default || mod.EpoxyTransport;
window.EpoxyTransport = T;
return T;
}
async function loadLibcurlTransport(){
if(window.LibcurlClient) return window.LibcurlClient;
const mod = await import(new URL('./67/index.mjs', location.href).href);
const T = mod.default || mod.LibcurlClient;
window.LibcurlClient = T;
return T;
}

function loadScriptOnce(src,id){
return new Promise((resolve,reject)=>{
const existing=id&&document.getElementById(id);
if(existing){
if(existing.dataset.loaded==='1') return resolve();
existing.addEventListener('load',()=>resolve(),{once:true});
existing.addEventListener('error',()=>reject(new Error('Failed to load '+src)),{once:true});
return;
}
const script=document.createElement('script');
if(id)script.id=id;
script.src=src;
script.async=false;
script.onload=()=>{script.dataset.loaded='1';resolve()};
script.onerror=()=>reject(new Error('Failed to load '+src));
document.head.appendChild(script);
});
}
async function unregisterAllServiceWorkers(){
if(!('serviceWorker' in navigator))return;
const regs=await navigator.serviceWorker.getRegistrations();
await Promise.all(regs.map(reg=>reg.unregister().catch(()=>false)));
}
async function waitForControllerControl(registration,timeout=8000){
if(navigator.serviceWorker.controller){
sessionStorage.removeItem('vanta.sw.control.reload');
return navigator.serviceWorker.controller;
}
const worker=registration.waiting||registration.installing||registration.active;
try{worker?.postMessage({type:'SKIP_WAITING'});}catch{}
const started=Date.now();
while(Date.now()-started<timeout){
if(navigator.serviceWorker.controller){
sessionStorage.removeItem('vanta.sw.control.reload');
return navigator.serviceWorker.controller;
}
await new Promise(r=>setTimeout(r,100));
}
const key='vanta.sw.control.reload';
if(!sessionStorage.getItem(key)){
sessionStorage.setItem(key,'1');
location.reload();
await new Promise(()=>{});
}
throw new Error('Service worker did not take control of Vanta');
}
async function registerFreshServiceWorker(){
if(!('serviceWorker' in navigator))throw new Error('Service workers are not supported');
const swPath='./sw.js';
const registration=await navigator.serviceWorker.register(swPath,{scope:'./',updateViaCache:'none'});
await navigator.serviceWorker.ready;
const worker=navigator.serviceWorker.controller || registration.active || (await navigator.serviceWorker.ready).active;
if(!worker)throw new Error('Selected service worker is not available');
return {registration,worker};
}
async function buildScramjetBackend(serviceworker){
if(!window.$vanta){
await loadScriptOnce('./vanta/vanta.core.js','vanta-core');
}
if(!window.$vantaController){
await loadScriptOnce('./vanta/vanta.api.js','vanta-api');
}
if(!window.$vantaController?.Controller)throw new Error('Vanta controller is unavailable (vanta/vanta.api.js)');
if(!window.$vanta)throw new Error('Vanta runtime is unavailable (vanta/vanta.core.js)');
const Transport=await loadEpoxyTransport();
if(typeof Transport!=='function')throw new Error('Epoxy transport (black/index.mjs) is unavailable');
const wisp=await getWorkingWisp();
const transport=new Transport({wisp});
await transport.init();
const instance=new window.$vantaController.Controller({
serviceworker,transport,
config:{
prefix:new URL('./~/sj/',location.href).pathname,
vantaPath:'./vanta/vanta.core.js',
wasmPath:'./vanta/vanta.wasm',
injectPath:'./vanta/vanta.inject.js',
codec:{encode:e=>e?encodeURIComponent(e):e,decode:e=>e?decodeURIComponent(e):e}
},
vantaConfig:window.$vanta.defaultConfig
});
await instance.wait();
return instance;
}
async function buildTwoJetBackend(serviceworker){
if(!window.$vanta){
await loadScriptOnce('./vanta/vanta.core.js','vanta-core');
}
if(!window.$vantaController){
await loadScriptOnce('./vanta/vanta.api.js','vanta-api');
}
if(!window.$vantaController?.Controller)throw new Error('Vanta controller is unavailable');
if(!window.$vanta)throw new Error('Vanta runtime is unavailable');
let transport;
try{
const Libcurl=await loadLibcurlTransport();
if(typeof Libcurl==='function'){
transport=new Libcurl({wisp:await getWorkingWisp()});
if(transport.init) await transport.init();
}
}catch(e){
console.warn('[Vanta] libcurl (67) failed, falling back to epoxy black:', e);
}
if(!transport){
const Transport=await loadEpoxyTransport();
const wisp=await getWorkingWisp();
transport=new Transport({wisp});
await transport.init();
}
const instance=new window.$vantaController.Controller({
serviceworker,transport,
config:{
prefix:new URL('./~/sj/',location.href).pathname,
vantaPath:'./vanta/vanta.core.js',
wasmPath:'./vanta/vanta.wasm',
injectPath:'./vanta/vanta.inject.js',
codec:{encode:e=>e?encodeURIComponent(e):e,decode:e=>e?decodeURIComponent(e):e}
},
vantaConfig:window.$vanta.defaultConfig
});
await instance.wait();
return instance;
}

async function buildBackend(serviceworker){
return getEngine()==='two-jet'
?buildTwoJetBackend(serviceworker)
:buildScramjetBackend(serviceworker);
}
function backendName(){return getEngine()==='two-jet'?'Two Jet':'Scramjet v2'}
async function rebuildProxyFrames(){
if(!controller)return;
for(const t of tabs){
if(t.type!=='proxy'||!t.iframe)continue;
try{
try{t.proxyFrame?.destroy?.()}catch{}
t.proxyFrame=null;
try{t.iframe.src='about:blank'}catch{}
const frame=controller.createFrame(t.iframe);
if(!frame||typeof frame.go!=='function')throw new Error('Proxy frame could not be created');
t.proxyFrame=frame;
const target=(t.target||t.url);
if(target&&/^https?:\/\//i.test(target)) await Promise.resolve(frame.go(target));
}catch(e){
t.proxyFrame=null;
console.warn('[Vanta] Frame rebuild failed:',e);
}
}
}
async function recoverBackend(reason){
if(backendRecoveryPromise)return backendRecoveryPromise;
backendRecoveryPromise=(async()=>{
console.warn('[Vanta] Recovering '+backendName()+':',reason);
ready=false;
controller=null;
resetProxyFrames();
browserLoading.classList.remove('hidden');
browserLoading.classList.add('flex');
try{
const result=await registerFreshServiceWorker();
controller=await buildBackend(result.worker);
ready=true; window.vantaLoading?.hide();
backendRetryDelay=1500;
const activeAfterRecovery=tabs.find(t=>t.id===activeTabId);
if(activeAfterRecovery&&activeAfterRecovery.type==='proxy'&&activeAfterRecovery.target&&/^https?:\/\//i.test(activeAfterRecovery.target)){
try{ await openProxyTab(activeAfterRecovery,activeAfterRecovery.target); }
catch(navError){ console.warn('[Vanta] Recovered tab navigation failed:',navError); }
}
console.info('[Vanta] '+backendName()+' recovered');
return true;
}catch(e){
ready=false;
controller=null;
resetProxyFrames();
console.error('[Vanta] '+backendName()+' recovery failed:',e);
clearTimeout(backendRetryTimer); backendRetryTimer=null;
const active=tabs.find(t=>t.id===activeTabId);
if(active?.type==='proxy')showProxyError(String(e?.message||e));
return false;
}finally{
browserLoading.classList.add('hidden');
browserLoading.classList.remove('flex');
backendRecoveryPromise=null;
}
})();
return backendRecoveryPromise;
}
async function initBackend(){
if(backendStarting||ready)return;
backendStarting=true;
try{
const {worker}=await registerFreshServiceWorker();
controller=await buildBackend(worker);
ready=true;
backendRetryDelay=1500;
console.info('[Vanta] '+backendName()+' ready');
}catch(e){
ready=false;
controller=null;
console.error('[Vanta] '+backendName()+' startup failed:',e);
clearTimeout(backendRetryTimer);
backendRetryTimer=setTimeout(()=>{
backendRetryDelay=Math.min(backendRetryDelay*2,15000);
initBackend();
},backendRetryDelay);
}finally{backendStarting=false;}
}
let runtimeRecoveryQueued=false;
function recoverAfterTransportFailure(reason){
if(runtimeRecoveryQueued||backendRecoveryPromise)return;
runtimeRecoveryQueued=true;
ready=false;
controller=null;
resetProxyFrames();
clearTimeout(backendRetryTimer); backendRetryTimer=null;
rotateWispOnNextCheck=true;
workingWispPromise=null;
try{localStorage.removeItem('vanta.lastWorkingWisp')}catch{}
setTimeout(async()=>{
try{
let recovered=false;
for(let attempt=0;attempt<4&&!recovered;attempt++){
try{ recovered=await recoverBackend(reason); }
catch(err){ console.warn('[Vanta] transport recovery attempt failed:',err); }
if(!recovered){rotateWispOnNextCheck=true;workingWispPromise=null;await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}
}
if(!recovered){
backendRetryTimer=setTimeout(()=>{runtimeRecoveryQueued=false;recoverAfterTransportFailure('retry after transport failure')},Math.min(backendRetryDelay,15000));
}
}finally{runtimeRecoveryQueued=false;}
},250);
}
window.addEventListener('unhandledrejection',e=>{
if(isWispMuxTaskEnded(e.reason))recoverAfterTransportFailure(e.reason?.message||e.reason);
});
window.addEventListener('error',e=>{
if(isWispMuxTaskEnded(e.error||e.message))recoverAfterTransportFailure(e.message||e.error);
});
navigator.serviceWorker?.addEventListener('message',event=>{
if(event.data?.$controller$swrevive)recoverBackend('service worker restarted');
});
navigator.serviceWorker?.addEventListener('controllerchange',()=>{
if(!ready)return;
clearTimeout(backendRetryTimer);
backendRetryTimer=setTimeout(()=>{
if(navigator.serviceWorker.controller) recoverBackend('service worker controller changed');
},500);
});
const SETTINGS_KEY='vanta.settings.v1';
function settingsStatus(text,ok=false){const el=$('settings-statusbar');if(el){el.textContent=text;el.classList.toggle('ok',ok);}}
function loadSettings(){
let s={}; try{s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}catch{}
const w=$('setting-wisp'); if(w) w.value=validWisp(s.wisp)?s.wisp:(validWisp(localStorage.getItem('vanta.lastWorkingWisp'))?localStorage.getItem('vanta.lastWorkingWisp'):DEFAULT_WISP);
const agent=$('setting-agent'); if(agent) agent.value=s.agent||'Default';
const search=$('setting-search'); if(search) search.value=s.search||'brave'; const eng=$('setting-engine'); if(eng) eng.value=s.engine||getEngine(); setEngine(eng?.value||getEngine());
setSwitch($('tab-cover-toggle'),!!s.tabCover); const activeForSettings=tabs.find(x=>x.id===activeTabId); const tabUrlInput=$('setting-tab-url'); if(tabUrlInput) tabUrlInput.value=activeForSettings ? (activeForSettings.url==='vanta://home'?'home':(activeForSettings.url||'')) : '';
applyTabCover(!!s.tabCover); updateSWStatus();
}
function saveSettings(){
const s={wisp:$('setting-wisp').value.trim(),agent:$('setting-agent').value,search:$('setting-search').value,engine:$('setting-engine')?.value||getEngine(),tabCover:$('tab-cover-toggle').classList.contains('on')}; setEngine(s.engine);
localStorage.setItem(SETTINGS_KEY,JSON.stringify(s)); return s;
}
function setSwitch(el,on){if(el)el.classList.toggle('on',!!on)}
function applyTabCover(on){
let icon=document.querySelector('link[data-vanta-tab-cover]');
if(on){if(!icon){icon=document.createElement('link');icon.rel='icon';icon.setAttribute('data-vanta-tab-cover','1');document.head.appendChild(icon);}icon.href='https://www.google.com/s2/favicons?domain=google.com&sz=64';document.title='Google';}
else{if(icon)icon.remove();document.title='Vanta Browser';}
}
async function updateSWStatus(){
const el=$('sw-status'); if(!el||!('serviceWorker' in navigator)) return;
try{const regs=await navigator.serviceWorker.getRegistrations();const active=regs.find(r=>r.active||r.waiting||r.installing); el.textContent=active?(getEngine()==='two-jet'?'sw2.js is registered':'sw.js is registered'):'No service worker registered';}catch{el.textContent='Unable to read service worker status';}
}
async function unregisterSW(){
const btn=$('unregister-sw');btn.disabled=true;btn.textContent='Unregistering…';
try{let count=0;if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();for(const r of regs){if(await r.unregister())count++;}}
ready=false;controller=null;resetProxyFrames();settingsStatus(count?`Unregistered ${count} service worker${count===1?'':'s'}. Reload Vanta to start it again.`:'No service workers were registered.',true);
await updateSWStatus();
}catch(e){settingsStatus('Could not unregister the active service worker.');console.error('[Vanta] Unregister SW:',e)}
btn.disabled=false;btn.textContent='Unregister active SW';
}
function openSettings(){
let t=tabs.find(x=>x.url==='vanta://settings');
if(!t){t=createTab('home');t.appId='settings';t.title='Settings';t.icon='settings';t.type='settings';t.url='vanta://settings';t.target=t.url;}
switchTab(t.id);loadSettings();
}
$('apply-tab-url').onclick=async()=>{
const active=tabs.find(x=>x.id===activeTabId); const input=$('setting-tab-url'); if(!active||!input)return;
const value=input.value.trim()||'home';
try{await navigate(value); settingsStatus('URL applied to this tab.',true);}catch(e){settingsStatus('Invalid URL.');}
};
$('settings-btn').onclick=openSettings;
$('test-relay').onclick=async()=>{
const status=$('relay-status'), input=$('setting-wisp'), btn=$('test-relay');
if(!status||!input||!btn)return;
const u=input.value.trim();
if(!validWisp(u)){status.textContent='Enter a valid wss:// endpoint';return;}
btn.disabled=true; status.textContent='Testing…';
let ws=null, settled=false, timer=null;
const finish=(ok,msg)=>{if(settled)return;settled=true;clearTimeout(timer);try{ws?.close()}catch{}btn.disabled=false;status.textContent=msg;};
try{
ws=new WebSocket(u);
timer=setTimeout(()=>finish(false,'Connection timed out'),6000);
ws.onopen=()=>finish(true,'Connection opened');
ws.onerror=()=>finish(false,'Connection failed');
ws.onclose=()=>{if(!settled)finish(false,'Connection closed')};
}catch(e){finish(false,'Connection failed');}
};
['tab-cover-toggle'].forEach(id=>$(id).onclick=()=>{const el=$(id);setSwitch(el,!el.classList.contains('on'));const st=saveSettings();if(id==='tab-cover-toggle')applyTabCover(st.tabCover);});$('setting-agent')?.addEventListener('change',saveSettings);
$('setting-search')?.addEventListener('change',saveSettings);$('setting-wisp')?.addEventListener('change',()=>{
const input=$('setting-wisp');
if(!input)return;
const value=input.value.trim();
if(value && !validWisp(value)){settingsStatus('Use a valid wss:// endpoint.');return;}
saveSettings();
workingWispPromise=null;
try{localStorage.removeItem('vanta.lastWorkingWisp')}catch{}
settingsStatus('WISP endpoint saved. New proxy sessions will use it first.',true);
});
$('setting-engine')?.addEventListener('change',()=>{
const next=$('setting-engine').value;
setEngine(next); saveSettings();
ready=false; controller=null; resetProxyFrames();
settingsStatus((next==='two-jet'?'Two Jet':'Scramjet v2')+' selected. Reload Vanta to apply the backend.',true);
});
$('reset-settings').onclick=()=>{localStorage.removeItem(SETTINGS_KEY);workingWispPromise=null;loadSettings();settingsStatus('Vanta preferences restored.',true);};
$('clear-site-data').onclick=async()=>{try{localStorage.clear();sessionStorage.clear();if('caches'in window){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));}}catch(e){console.warn(e)}loadSettings();settingsStatus('Local storage and caches cleared.',true);};$('unregister-sw').onclick=unregisterSW;
$('reset-backend').onclick=async()=>{const btn=$('reset-backend');btn.disabled=true;btn.textContent='Resetting…';try{try{localStorage.clear();sessionStorage.clear()}catch{}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()))}}catch(e){console.warn('[Vanta] Backend reset:',e)}location.reload();};
document.querySelectorAll('[data-settings-section]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-settings-section]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const target=btn.dataset.settingsSection;document.querySelectorAll('[data-settings-card]').forEach(card=>{card.style.display=card.dataset.settingsCard===target?'block':'none';});});
const initialSettingsSection=document.querySelector('[data-settings-section].active')?.dataset.settingsSection||'connection';
document.querySelectorAll('[data-settings-card]').forEach(card=>{card.style.display=card.dataset.settingsCard===initialSettingsSection?'block':'none';});
document.querySelectorAll('[data-home-app]').forEach(btn=>btn.addEventListener('click',()=>openApp(btn.dataset.homeApp)));
renderSidebar(); const initialHome=createTab('home'); navigate('vanta://home'); loadSettings(); initBackend();
const canvas=document.getElementById('background-canvas'),gl=canvas.getContext('webgl',{antialias:true,powerPreference:'high-performance'});
if(gl){
const vs=`attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}`;
const fs=`precision highp float;uniform vec2 r;uniform float t;float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i),b=hash21(i+vec2(1.0,0.0)),c=hash21(i+vec2(0.0,1.0)),d=hash21(i+vec2(1.0,1.0));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}float fbm(vec2 p){float v=0.0,a=0.5;v+=noise(p)*a;p=p*2.02+17.13;a*=0.5;v+=noise(p)*a;p=p*2.03+11.71;a*=0.5;v+=noise(p)*a;p=p*2.01+23.17;a*=0.5;v+=noise(p)*a;p=p*2.04+7.31;a*=0.5;v+=noise(p)*a;return v;}float field(vec2 p){float n1=fbm(p*.85+vec2(t*.018,-t*.014)),n2=fbm(p*1.7-vec2(t*.011,t*.017)),n3=fbm(p*3.1+vec2(-t*.009,t*.013));float d=n1*1.35+n2*.45+n3*.16;return d+sin(p.x*2.3+d*5.5+t*.025)*.09;}void main(){vec2 uv=gl_FragCoord.xy/r.xy,p=uv-.5;p.x*=r.x/r.y;p*=2.5;float f=field(p),scaled=f*26.0;float line=1.0-smoothstep(.015,.065,abs(fract(scaled)-.5)),soft=1.0-smoothstep(.04,.16,abs(fract(scaled)-.5));vec3 bg=vec3(.004),lc=vec3(.30),color=mix(bg,lc,line*.86+soft*.055);float v=1.0-smoothstep(.25,1.35,length(p*.42));gl_FragColor=vec4(color*(.80+v*.20),1.0);}`;
const program=gl.createProgram(),vsShader=gl.createShader(gl.VERTEX_SHADER),fsShader=gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(vsShader,vs);gl.compileShader(vsShader);gl.attachShader(program,vsShader);
gl.shaderSource(fsShader,fs);gl.compileShader(fsShader);gl.attachShader(program,fsShader);
gl.linkProgram(program);gl.useProgram(program);
const positionLocation=gl.getAttribLocation(program,'position'),buffer=gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation,2,gl.FLOAT,false,0,0);
const rLocation=gl.getUniformLocation(program,'r'),tLocation=gl.getUniformLocation(program,'t');
const resize=()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(rLocation,canvas.width,canvas.height);};
window.addEventListener('resize',resize);resize();
const render=time=>{gl.uniform1f(tLocation,time*0.001);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);requestAnimationFrame(render);};
requestAnimationFrame(render);
}
})();

