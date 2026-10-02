/* PD APP production upgrade — weather carousel, presence, Services taxonomy and accessibility polish. */
(() => {
  'use strict';

  const WEATHER_LOCATIONS = [
    {name:'Mombasa', lat:-4.0435, lon:39.6682},
    {name:'Malindi', lat:-3.2192, lon:40.1169},
    {name:'Kilifi', lat:-3.6305, lon:39.8499},
    {name:'Diani', lat:-4.2797, lon:39.5940},
    {name:'Lamu', lat:-2.2717, lon:40.9020},
    {name:'Kwale', lat:-4.1737, lon:39.4521},
    {name:'Watamu', lat:-3.3550, lon:40.0200}
  ];
  const WEATHER_CACHE = 'pd_coastal_weather_v2';
  const PRESENCE_TTL = 90 * 1000;
  const HEARTBEAT_MS = 30 * 1000;

  function esc(v){
    return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function weatherInfo(code){
    const c = Number(code);
    if(c === 0) return {icon:'☀️', en:'Clear sky', sw:'Anga safi'};
    if([1,2].includes(c)) return {icon:'🌤️', en:'Partly cloudy', sw:'Mawingu machache'};
    if(c === 3) return {icon:'☁️', en:'Overcast', sw:'Mawingu mazito'};
    if([45,48].includes(c)) return {icon:'🌫️', en:'Foggy', sw:'Ukungu'};
    if([51,53,55,56,57].includes(c)) return {icon:'🌦️', en:'Drizzle', sw:'Manyunyu'};
    if([61,63,65,66,67].includes(c)) return {icon:'🌧️', en:'Rain', sw:'Mvua'};
    if([71,73,75,77].includes(c)) return {icon:'🌨️', en:'Snow', sw:'Theluji'};
    if([80,81,82].includes(c)) return {icon:'🌦️', en:'Rain showers', sw:'Mafuriko ya mvua'};
    if([95,96,99].includes(c)) return {icon:'⛈️', en:'Thunderstorm', sw:'Mvua ya radi'};
    return {icon:'🌤️', en:'Weather update', sw:'Taarifa ya hali ya hewa'};
  }
  function currentLang(){ return localStorage.getItem('pd_app_lang_v3') || 'en'; }
  function t(en, sw){ return currentLang()==='sw' ? sw : en; }

  function weatherMarkup(rows, stale=false){
    const lang = currentLang();
    return `<div class="coastal-weather-head">
      <div><span class="eyebrow">${lang==='sw'?'PWANI YA KENYA':'KENYA COAST'}</span><b>${lang==='sw'?'Hali ya Hewa ya Pwani':'Coastal Weather'}</b><small>${stale ? (lang==='sw'?'Data ya mwisho iliyohifadhiwa':'Last saved update') : (lang==='sw'?'Taarifa ya sasa':'Live update')}</small></div>
      <button class="weather-refresh" type="button" onclick="window.loadWeather(true)" aria-label="Refresh weather">↻</button>
    </div>
    <div class="coastal-weather-track" id="coastalWeatherTrack">${rows.map((x,i)=>{
      const w=weatherInfo(x.weather_code);
      return `<article class="coastal-weather-card" data-weather-index="${i}" aria-label="${esc(x.name)} weather">
        <div class="coastal-weather-location"><span>📍</span><b>${esc(x.name)}</b></div>
        <div class="coastal-weather-main"><span class="coastal-weather-icon" aria-hidden="true">${w.icon}</span><strong>${Math.round(Number(x.temperature_2m ?? 0))}°C</strong></div>
        <div class="coastal-weather-condition">${lang==='sw'?w.sw:w.en}</div>
        <div class="coastal-weather-meta"><span>💧 ${Math.round(Number(x.relative_humidity_2m ?? 0))}%</span><span>💨 ${Math.round(Number(x.wind_speed_10m ?? 0))} km/h</span></div>
      </article>`;
    }).join('')}</div>
    <div class="coastal-weather-dots" role="tablist" aria-label="Coastal weather locations">${rows.map((x,i)=>`<button type="button" class="coastal-weather-dot ${i===0?'active':''}" data-weather-dot="${i}" aria-label="${esc(x.name)}"></button>`).join('')}</div>`;
  }

  let weatherTimer = null;
  let weatherRows = [];
  let weatherIndex = 0;
  function startWeatherCarousel(){
    clearInterval(weatherTimer);
    weatherTimer = setInterval(()=>{
      if(!weatherRows.length) return;
      weatherIndex=(weatherIndex+1)%weatherRows.length;
      const track=document.getElementById('coastalWeatherTrack');
      if(track) track.scrollTo({left:weatherIndex*track.clientWidth,behavior:'smooth'});
      document.querySelectorAll('[data-weather-dot]').forEach((d,i)=>d.classList.toggle('active',i===weatherIndex));
    },4500);
    document.querySelectorAll('[data-weather-dot]').forEach(dot=>dot.addEventListener('click',()=>{
      weatherIndex=Number(dot.dataset.weatherDot)||0;
      const track=document.getElementById('coastalWeatherTrack');
      if(track) track.scrollTo({left:weatherIndex*track.clientWidth,behavior:'smooth'});
      document.querySelectorAll('[data-weather-dot]').forEach((d,i)=>d.classList.toggle('active',i===weatherIndex));
    }));
  }

  async function fetchCoastalWeather(force=false){
    const cached = (()=>{try{return JSON.parse(localStorage.getItem(WEATHER_CACHE)||'null')}catch(e){return null}})();
    if(!navigator.onLine && cached){ renderCoastalWeather(cached,true); return; }
    if(!force && cached && Date.now()-Number(cached.savedAt||0)<10*60*1000){ renderCoastalWeather(cached.rows,false); return; }
    try{
      const rows = await Promise.all(WEATHER_LOCATIONS.map(async loc=>{
        const url=`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Africa%2FNairobi`;
        const res=await fetch(url,{cache:'no-store'});
        if(!res.ok) throw new Error('Weather HTTP '+res.status);
        const data=await res.json();
        return {name:loc.name,...data.current};
      }));
      const payload={rows,savedAt:Date.now()};
      localStorage.setItem(WEATHER_CACHE,JSON.stringify(payload));
      renderCoastalWeather(rows,false);
    }catch(err){
      console.warn('Coastal weather update failed',err);
      if(cached) renderCoastalWeather(cached.rows,true);
    }
  }
  function renderCoastalWeather(rows, stale){
    if(!Array.isArray(rows)||!rows.length) return;
    weatherRows=rows; weatherIndex=0;
    const el=document.getElementById('weatherBody');
    if(el){el.innerHTML=weatherMarkup(rows,stale); startWeatherCarousel();}
  }
  window.loadWeather = fetchCoastalWeather;

  function normalizeCategory(v){
    const raw=String(v||'').trim();
    if(!raw) return 'Services';
    if(/^(fundi|fundis|find fundi|find service|services?)$/i.test(raw)) return 'Services';
    return raw;
  }
  function normalizeServices(){
    if(!Array.isArray(window.services)) return;
    window.services.forEach(s=>{ if(s && s.category) s.category=normalizeCategory(s.category); });
  }
  const originalRenderList=window.renderList;
  if(typeof originalRenderList==='function'){
    window.renderList=function(){ normalizeServices(); return originalRenderList.apply(this,arguments); };
  }
  const originalRenderChips=window.renderChips;
  if(typeof originalRenderChips==='function'){
    window.renderChips=function(){ normalizeServices(); return originalRenderChips.apply(this,arguments); };
  }

  function refreshPresence(){
    const users=Array.isArray(window.PD_REMOTE_PRESENCE)?window.PD_REMOTE_PRESENCE:[];
    const now=Date.now();
    users.forEach(u=>u.isActive=Number(u.lastSeen||0)>now-PRESENCE_TTL);
    const list=document.getElementById('adminPresenceList');
    const active=users.filter(u=>u.isActive);
    const count=document.getElementById('presenceActiveCount');
    const known=document.getElementById('presenceKnownDevices');
    if(count) count.textContent=active.length;
    if(known) known.textContent=users.length;
    if(!list) return;
    if(!users.length){list.innerHTML=`<span class="hint">${esc(t('No active users yet.','Hakuna watumiaji wanaofanya kazi bado.'))}</span>`;return;}
    list.innerHTML=users.slice(0,50).map(u=>`<div class="presence-row">
      <div class="presence-main"><b>${esc(u.phone||t('Phone not provided','Namba haijawekwa'))}</b><span>${esc(u.page||'home')} · ${esc(u.userAgent||'')}</span></div>
      <div class="presence-right"><span class="presence-status ${u.isActive?'is-active':''}" title="${u.isActive?'Active':'Inactive'}"></span><span class="presence-time">${u.isActive?t('Active now','Yuko mtandaoni sasa'):new Date(Number(u.lastSeen||Date.now())).toLocaleString()}</span></div>
    </div>`).join('');
  }
  window.refreshPresenceList=refreshPresence;

  function heartbeat(){
    try{
      const phone=typeof window.getUserPhone==='function'?window.getUserPhone():localStorage.getItem('pd_app_phone')||'';
      const id=localStorage.getItem('pd_presence_id') || ('device_'+crypto.randomUUID());
      localStorage.setItem('pd_presence_id',id);
      const page=document.querySelector('.page.active')?.id||'home';
      if(typeof window.dbTrackPresence==='function') window.dbTrackPresence(id,phone,page,navigator.userAgent);
    }catch(e){console.warn('Presence heartbeat failed',e)}
  }

  function installUi(){
    const quick=document.querySelector('[data-i18n="qaFundi"]');
    if(quick) quick.textContent=t('Find Services','Tafuta Huduma');
    const sub=document.querySelector('[data-i18n="qaFundiSub"]');
    if(sub) sub.textContent=t('Driving, healthcare, hospitality & more','Shule za udereva, afya, malazi na zaidi');
    document.querySelectorAll('[data-i18n="qaFundi"]').forEach(x=>x.textContent=t('Find Services','Tafuta Huduma'));
    document.querySelectorAll('[data-i18n="qaFundiSub"]').forEach(x=>x.textContent=t('Driving, healthcare, hospitality & more','Shule za udereva, afya, malazi na zaidi'));
    document.querySelectorAll('.services-page-title,.services-heading').forEach(x=>x.textContent=t('Find Services','Tafuta Huduma'));
  }

  function contrastPolish(){
    document.documentElement.style.setProperty('--focus-ring','rgba(14,118,145,.8)');
    document.querySelectorAll('input,textarea,select,button').forEach(el=>{
      if(!el.hasAttribute('aria-label') && !el.textContent.trim() && el.title) el.setAttribute('aria-label',el.title);
    });
  }

  function init(){
    installUi(); contrastPolish(); normalizeServices();
    fetchCoastalWeather(false);
    heartbeat();
    setInterval(heartbeat,HEARTBEAT_MS);
    setInterval(refreshPresence,15000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden) heartbeat();});
    window.addEventListener('online',()=>fetchCoastalWeather(true));
    const more=document.getElementById('more');
    if(more) new MutationObserver(installUi).observe(more,{subtree:true,childList:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
