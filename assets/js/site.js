const DATA_BASE = 'assets/data/';
const IMG = 'assets/images/';
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

async function getJson(name) {
  const response = await fetch(`${DATA_BASE}${name}?v=${Date.now()}`);
  if (!response.ok) throw new Error(`${name} 로드 실패`);
  return response.json();
}

function showTab(id) {
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.toggle('active', panel.id === id));
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === id));
}

function applySite(site) {
  const legacyAccent = site.accent || '#7ccf2d';
  const colors = site.colors || {};
  const vars = {
    '--accent': colors.accent || legacyAccent,
    '--bg': colors.background || '#eef1f4',
    '--card': colors.card || '#ffffff',
    '--text': colors.text || '#181a1e',
    '--sub': colors.subText || '#70757d',
    '--line': colors.line || '#e5e8ec',
    '--dark-card': colors.darkCard || '#22252b',
    '--dark-text': colors.darkText || '#ffffff',
    '--hero-shade': colors.heroShade || '#000000'
  };
  Object.entries(vars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));

  document.title = site.teamName || 'TRPG_TEAM';
  $('#teamName').textContent = site.teamName || '';
  $('#siteTitle').textContent = site.title || '';
  $('#siteDescription').textContent = site.description || '';
  $('#heroImage').src = IMG + (site.heroImage || 'office.jpg');
  $('#profileImage').src = IMG + (site.profileImage || 'icon.jpg');
  $('#profileName').textContent = site.profileName || '';
  $('#profileSub1').textContent = site.profileSub1 || '';
  $('#profileSub2').textContent = site.profileSub2 || '';
  $('#profileSince').textContent = site.profileSince || '';
  $('#mainImage').src = IMG + (site.mainImage || 'main.png');
  $('#musicTitle').textContent = site.musicTitle || '';
  $('#musicArtist').textContent = site.musicArtist || '';
  $('#musicThumb').src = `https://img.youtube.com/vi/${site.musicYoutubeId || ''}/mqdefault.jpg`;
  $('#musicLink').href = `https://youtu.be/${site.musicYoutubeId || ''}`;
  $('#footerText').textContent = site.footer || '';

  const links = site.profileLinks?.length
    ? site.profileLinks
    : (site.mainLinkLabel && site.mainLinkUrl ? [{ label: site.mainLinkLabel, url: site.mainLinkUrl }] : []);
  $('#profileLinks').innerHTML = links.map((link) =>
    `<a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)}</a>`
  ).join('');
}

function renderCharacters(list) {
  $('#characterShortcuts').innerHTML = list.map((character) =>
    `<button style="background-image:url('${IMG + character.banner}')" data-char="${esc(character.id)}"><span>${esc(character.name)}</span></button>`
  ).join('');
  $('#characterList').innerHTML = list.map((character) => `
    <article class="character-card" id="char-${esc(character.id)}" style="--char-accent:${esc(character.accent)}">
      <div class="character-banner" style="background-image:url('${IMG + character.banner}')"><h3>${esc(character.name)}</h3></div>
      <div class="character-body">
        <img class="standing" src="${IMG + character.standing}" alt="${esc(character.name)}">
        <div>
          <p class="quote">“ ${esc(character.quote)} ”</p>
          <div class="info-grid">
            <div><span>이름</span>${esc(character.name)}</div><div><span>직업</span>${esc(character.job)}</div>
            <div><span>나이</span>${esc(character.age)}</div><div><span>거주지</span>${esc(character.location)}</div>
          </div>
          <div class="stats">
            <div>${['근력','건강','크기','민첩','외모','지능','정신','교육'].map((name,index) => `<div class="stat-row"><small><span>${name}</span><span>${character.stats?.[index] ?? 0}</span></small><div class="bar"><i style="width:${character.stats?.[index] ?? 0}%"></i></div></div>`).join('')}</div>
            <div class="stat-bars">${[['내향','외향'],['감각','직관'],['사고','감정'],['판단','인식']].map((names,index) => `<div class="stat-row"><small><span>${names[0]}</span><span>${names[1]}</span></small><div class="bar"><i style="width:${character.personality?.[index] ?? 50}%"></i></div></div>`).join('')}</div>
          </div>
          <div class="story">${(character.story || []).map((story) => `<details><summary>${esc(story.title)}</summary><p>${esc(story.content)}</p></details>`).join('')}</div>
        </div>
      </div>
    </article>`).join('');
  document.querySelectorAll('[data-char]').forEach((button) => {
    button.onclick = () => {
      showTab('characters');
      setTimeout(() => $(`#char-${button.dataset.char}`)?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
  });
}

function renderNpc(list) {
  const colors = { '적':'#7b1111', '아군':'#1a4d2e', '중립':'#444', '의뢰인':'#0d2d5e' };
  $('#npcGrid').innerHTML = list.map((npc) => `<article class="npc-card"><span class="badge" style="background:${colors[npc.relation] || '#444'}">${esc(npc.relation)}</span><img src="${IMG + npc.image}" alt="${esc(npc.name)}"><h3>${esc(npc.name)}</h3><p>${esc(npc.description)}</p></article>`).join('');
}
function renderGallery(list) {
  $('#galleryGrid').innerHTML = list.map((item,index) => `<button data-i="${index}"><img src="${IMG + item.image}" alt="gallery ${index + 1}"></button>`).join('');
  $('#galleryGrid').onclick = (event) => {
    const button = event.target.closest('button'); if (!button) return;
    const item = list[Number(button.dataset.i)];
    $('#lightboxImage').src = IMG + item.image; $('#lightboxCredit').textContent = item.credit || ''; $('#lightbox').showModal();
  };
}
function renderBackup(list) { $('#backupList').innerHTML = `<div class="log">${list.map((item) => `<details><summary>${esc(item.title)}</summary><pre>${esc(item.content)}</pre></details>`).join('')}</div>`; }
function buildCalendar(events) {
  const element = $('#calendar'); let current = new Date();
  function draw() {
    const year=current.getFullYear(), month=current.getMonth(), first=new Date(year,month,1).getDay(), last=new Date(year,month+1,0).getDate(), today=new Date();
    const map=Object.fromEntries(events.map((event)=>[event.date,event])); let cells='';
    for(let index=0;index<first;index++) cells+='<div></div>';
    for(let day=1;day<=last;day++) { const key=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`, item=map[key]; const cls=[item?'cal-event':'',day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear()?'cal-today':''].join(' '); cells+=`<div class="${cls}" title="${item?esc(item.title+' '+item.time):''}">${day}</div>`; }
    element.innerHTML=`<div class="cal-head"><button id="prev">‹</button><strong>${year}.${String(month+1).padStart(2,'0')}</strong><button id="next">›</button></div><div class="cal-grid">${['일','월','화','수','목','금','토'].map((day)=>`<div class="cal-dow">${day}</div>`).join('')}${cells}</div>`;
    $('#prev').onclick=()=>{current=new Date(year,month-1,1);draw();}; $('#next').onclick=()=>{current=new Date(year,month+1,1);draw();};
  } draw();
}
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const [site,characters,npc,gallery,events,backup] = await Promise.all(['site.json','characters.json','npc.json','gallery.json','events.json','backup.json'].map(getJson));
    applySite(site); renderCharacters(characters); renderNpc(npc); renderGallery(gallery); renderBackup(backup); buildCalendar(events);
  } catch(error) { console.error(error); }
  document.querySelectorAll('.tab').forEach((button)=>button.onclick=()=>showTab(button.dataset.tab));
  $('#lightboxClose').onclick=()=>$('#lightbox').close();
  $('#mobileMenu').onclick=()=>{$('#sidebar').classList.add('open');$('#overlay').classList.add('active');};
  $('#overlay').onclick=()=>{$('#sidebar').classList.remove('open');$('#overlay').classList.remove('active');};
});
