/* ═══════════════════════════════════════════════════════
   TRPG_TEAM · 세션 진행 포털
   데이터는 assets/data/*.json, 편집은 /admin/ 에서 합니다.
   ═══════════════════════════════════════════════════════ */

const DATA = 'assets/data/';
const IMG  = 'assets/images/';
const DOW  = ['일', '월', '화', '수', '목', '금', '토'];
const TABS = ['home', 'schedule', 'notices', 'resources', 'cast', 'records', 'gallery'];

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const esc = v => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* 저장 공간이 막혀 있어도(사파리 프라이빗 등) 사이트가 죽지 않도록 감쌉니다 */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 무시 */ } }
};

/* ── 이미지 경로 ──────────────────────────────────────
   관리자에서 올린 이미지는 "/assets/images/파일명"처럼 앞에 /가 붙습니다.
   그대로 두면 GitHub Pages(하위 경로) 배포에서 404가 나므로
   항상 페이지 기준 상대경로로 바꿔서 어느 호스팅에서도 뜨게 합니다. */
function imageUrl(value, fallback = '') {
  const p = String(value || fallback || '').trim();
  if (!p) return '';
  if (/^(https?:)?\/\//.test(p) || p.startsWith('data:')) return p;
  return IMG + p.replace(/^\/+/, '').replace(/^assets\/images\//, '');
}

/* 관리자가 올린 첨부파일은 "/assets/files/..." 로 저장됩니다.
   이미지와 같은 이유로 상대경로로 바꿔 어느 호스팅에서도 열리게 합니다. */
function linkUrl(value) {
  const p = String(value || '').trim();
  if (!p) return '';
  if (/^(https?:|mailto:|tel:)/.test(p) || p.startsWith('//')) return p;
  if (p.startsWith('/')) return p.replace(/^\/+/, '');
  return p;
}

/* 파일이 없을 때 깨진 아이콘 대신 조용히 사라지게 */
const HIDE_ON_ERROR = `onerror="this.style.visibility='hidden'"`;
const DROP_ON_ERROR = `onerror="this.remove()"`;

/* ── 날짜 ─────────────────────────────────────────── */
function toDate(s) {
  if (!s) return null;
  const d = new Date(String(s).slice(0, 10) + 'T00:00:00');
  return isNaN(d) ? null : d;
}
function dateText(s) {
  const d = toDate(s);
  if (!d) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}
function shortDate(s) {
  const d = toDate(s);
  if (!d) return '';
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}.${p(d.getDate())}(${DOW[d.getDay()]})`;
}
function todayKey() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function daysUntil(s) {
  const d = toDate(s);
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}
function ddayText(s) {
  const n = daysUntil(s);
  if (n === null) return '';
  if (n === 0) return '오늘';
  if (n === 1) return '내일';
  return n > 0 ? `D-${n}` : `${-n}일 전`;
}

/* ── 목록 데이터 꺼내기 ────────────────────────────────
   관리자는 목록을 {"items": [...]} 형태로 저장합니다.
   예전 파일은 벌거벗은 배열이었으므로 양쪽 다 받습니다. */
function asList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/* ── 상태 필터 ────────────────────────────────────── */
const visible = (list = []) => asList(list).filter(x => x && x.status !== '비공개');
const isLocked = x => x.status === '잠금';

/* ═══ 테마 ═══════════════════════════════════════════ */

/* 관리자 > 사이트 설정 > 테마 에서 고르는 값입니다.
   '직접 지정'을 고르면 아래 표 대신 '색상 직접 지정' 칸이 쓰입니다. */
const PRESETS = {
  '인디고': { accent:'#4a4f9e', background:'#eceef2', card:'#ffffff', text:'#16181f',
             subText:'#6b7280', line:'#dde1e9', darkCard:'#1c1f2b', darkText:'#f2f3f7', heroShade:'#0a0c14' },
  '먹빛':   { accent:'#3f4550', background:'#eeefef', card:'#ffffff', text:'#14161a',
             subText:'#6d7278', line:'#dfe1e3', darkCard:'#191b1f', darkText:'#f4f5f6', heroShade:'#08090c' },
  '자주':   { accent:'#8a3a5c', background:'#f2edef', card:'#ffffff', text:'#1e161a',
             subText:'#7a6b71', line:'#e6dde1', darkCard:'#241a20', darkText:'#f7f2f4', heroShade:'#14080e' },
  '숲':     { accent:'#2f6b52', background:'#eaefec', card:'#ffffff', text:'#141a17',
             subText:'#68756e', line:'#d9e2dd', darkCard:'#182220', darkText:'#f1f6f3', heroShade:'#071310' },
  '모래':   { accent:'#8a6a2f', background:'#f1eee8', card:'#ffffff', text:'#1b1811',
             subText:'#756e60', line:'#e4ded1', darkCard:'#221e16', darkText:'#f7f4ed', heroShade:'#120e07' }
};

function paintTheme(site = {}) {
  const preset = PRESETS[site.theme];
  const picked = site.colors || {};
  /* 프리셋이 있으면 프리셋, 없으면 직접 지정한 값, 그것도 비었으면 인디고 */
  const base = preset || {};
  const pick = key => base[key] || picked[key] || PRESETS['인디고'][key];

  const c = {
    accent: pick('accent'),
    background: pick('background'),
    card: pick('card'),
    text: pick('text'),
    subText: pick('subText'),
    line: pick('line'),
    darkCard: pick('darkCard'),
    darkText: pick('darkText'),
    heroShade: pick('heroShade')
  };

  const css = `
:root{
  --accent:${c.accent};
  --paper:${c.background};
  --card:${c.card};
  --text:${c.text};
  --sub:${c.subText};
  --line:${c.line};
  --dark-card:${c.darkCard};
  --dark-text:${c.darkText};
  --hero-shade:${c.heroShade};
}
:root[data-theme="dark"]{
  --accent:color-mix(in srgb, ${c.accent} 68%, #ffffff);
  --hero-shade:#05070c;
}`;
  let tag = $('#siteTheme');
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'siteTheme';
    document.head.appendChild(tag);
  }
  tag.textContent = css;
}

function setTheme(mode) {
  document.documentElement.dataset.theme = mode;
  $('#themeIcon').textContent = mode === 'dark' ? '☀' : '☾';
  $('#themeToggle').setAttribute('aria-label',
    mode === 'dark' ? '밝은 화면으로 전환' : '어두운 화면으로 전환');
  store.set('trpg-theme', mode);
}

function initTheme() {
  const saved = store.get('trpg-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark ? 'dark' : 'light'));
  $('#themeToggle').addEventListener('click', () =>
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
}

/* ═══ 탭 이동 (주소창에 기록되므로 새로고침·뒤로가기·링크공유가 됩니다) ═══ */
function showTab(id, { push = true, anchor = '' } = {}) {
  if (!TABS.includes(id)) id = 'home';

  TABS.forEach(t => {
    const panel = document.getElementById(t);
    const tab = document.getElementById('tab-' + t);
    const on = t === id;
    if (panel) panel.hidden = !on;
    if (tab) {
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    }
  });

  if (push) {
    const hash = '#' + id + (anchor ? '/' + anchor : '');
    if (location.hash !== hash) history.pushState(null, '', hash);
  }

  if (anchor) {
    setTimeout(() => {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  closeSidebar();
}

function routeFromHash({ push = false } = {}) {
  const [tab, anchor] = location.hash.replace(/^#/, '').split('/');
  showTab(tab, { push, anchor: anchor || '' });
}

/* ═══ 사이드바 (모바일) ═══════════════════════════════ */
function openSidebar() {
  $('#sidebar').classList.add('is-open');
  $('#scrim').hidden = false;
  $('#navToggle').setAttribute('aria-expanded', 'true');
  $('#sidebarClose').focus();
}
function closeSidebar() {
  $('#sidebar').classList.remove('is-open');
  $('#scrim').hidden = true;
  $('#navToggle').setAttribute('aria-expanded', 'false');
}

/* ═══ 사이트 설정 ═════════════════════════════════════ */
function renderSite(s = {}) {
  paintTheme(s);

  const team = s.teamName || 'TRPG_TEAM';
  document.title = s.title ? `${s.title} · ${team}` : team;
  $('#topTeam').textContent = team;
  $('#teamName').textContent = team;
  $('#siteTitle').textContent = s.title || '';
  $('#siteDescription').textContent = s.description || '';

  const hero = $('#heroImage');
  hero.src = imageUrl(s.heroImage, 'office.jpg');
  hero.onerror = () => hero.style.display = 'none';

  const pf = $('#profileImage');
  pf.src = imageUrl(s.profileImage, 'icon.jpg');
  pf.alt = s.profileName || '';
  pf.onerror = () => pf.style.visibility = 'hidden';

  $('#profileName').textContent = s.profileName || '';
  $('#profileSub1').textContent = s.profileSub1 || '';
  $('#profileSub2').textContent = s.profileSub2 || '';
  $('#profileSince').textContent = s.profileSince || '';

  const main = $('#mainImage');
  const mainSrc = imageUrl(s.mainImage, 'main.png');
  main.src = mainSrc;
  main.onerror = () => main.hidden = true;

  $('#footerText').textContent = s.footer || `© ${new Date().getFullYear()} ${team}`;

  $('#profileLinks').innerHTML = (s.profileLinks || [])
    .filter(l => l && l.label && l.url)
    .map(l => `<a href="${esc(linkUrl(l.url))}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
    .join('');

  /* 음악 — 내용이 없으면 빈 카드를 남기지 않고 숨깁니다 */
  const yt = (s.musicYoutubeId || '').trim();
  const hasMusic = yt || s.musicTitle;
  $('#musicCard').hidden = !hasMusic;
  if (hasMusic) {
    $('#musicTitle').textContent = s.musicTitle || '';
    $('#musicArtist').textContent = s.musicArtist || '';
    const thumb = $('#musicThumb');
    thumb.src = yt ? `https://img.youtube.com/vi/${encodeURIComponent(yt)}/mqdefault.jpg`
                   : imageUrl(s.profileImage, 'icon.jpg');
    thumb.onerror = () => thumb.style.visibility = 'hidden';
    const link = $('#musicLink');
    link.href = yt ? `https://youtu.be/${encodeURIComponent(yt)}` : '#';
    link.hidden = !yt;
  }
}

/* ═══ 일정 ═══════════════════════════════════════════ */
let scheduleCache = [];

function renderSchedules(items = []) {
  const list = visible(items)
    .filter(x => x.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((x, i) => ({ ...x, _i: i }));   /* 지난 일정도 달력에서 찾아갈 수 있게 고정 번호를 붙입니다 */
  scheduleCache = list;

  const today = todayKey();
  const upcoming = list.filter(x => x.date >= today);
  const past = list.filter(x => x.date < today).reverse();
  const next = upcoming[0];

  const card = (x, isNext) => `
    <article class="tl-item${isNext ? ' is-next' : ''}" id="sch-${x._i}">
      <div class="tl-date">
        <strong>${shortDate(x.date)}</strong>
        <span>${esc(x.time || '')}</span>
        <span>${ddayText(x.date)}</span>
      </div>
      <div>
        <h3>${esc(x.title || '제목 없음')}</h3>
        ${x.description ? `<p class="body-text">${esc(x.description)}</p>` : ''}
        ${x.location ? `<small class="tl-meta">장소 · ${esc(x.location)}</small>` : ''}
        ${x.url ? `<a class="link" href="${esc(linkUrl(x.url))}" target="_blank" rel="noopener">관련 링크</a>` : ''}
      </div>
    </article>`;

  $('#scheduleUpcoming').innerHTML = upcoming.length
    ? upcoming.map((x, i) => card(x, i === 0)).join('')
    : '<p class="empty">예정된 일정이 없습니다.</p>';

  $('#schedulePast').innerHTML = past.length
    ? past.map(x => card(x, false)).join('')
    : '<p class="empty">지난 일정이 없습니다.</p>';

  /* 히어로 한 줄 */
  const line = $('#nextLineBody');
  if (next) {
    const bits = [
      esc(next.title || '세션'),
      `${shortDate(next.date)}${next.time ? ' ' + esc(next.time) : ''}`
    ];
    if (next.location) bits.push(esc(next.location));
    line.innerHTML = bits.join('<span class="sep">·</span>')
      + `<span class="sep">·</span><span class="dday">${ddayText(next.date)}</span>`;
    $('#nextLine').hidden = false;
  } else {
    line.textContent = '예정된 세션이 없습니다';
  }

  /* 홈 카드 */
  $('#dashSchedule').innerHTML = next
    ? `<button class="dash-card" data-go="schedule">
         <strong>${esc(next.title || '세션')}</strong>
         <span>${shortDate(next.date)} ${esc(next.time || '')} · ${ddayText(next.date)}</span>
       </button>`
    : '<p class="empty">예정된 일정이 없습니다.</p>';
}

/* ═══ 공지 ═══════════════════════════════════════════ */
function renderNotices(items = []) {
  const list = visible(items).sort((a, b) =>
    (Number(!!b.pinned) - Number(!!a.pinned)) ||
    String(b.date || '').localeCompare(String(a.date || '')));

  $('#noticeList').innerHTML = list.length ? list.map(x => `
    <article class="notice${x.pinned ? ' pinned' : ''}">
      <div class="notice-top">
        <span>${x.pinned ? '고정 공지' : '공지'}</span>
        <time>${dateText(x.date)}</time>
      </div>
      <h3>${esc(x.title || '')}</h3>
      ${x.content ? `<p class="body-text">${esc(x.content)}</p>` : ''}
      ${x.url ? `<a class="link" href="${esc(linkUrl(x.url))}" target="_blank" rel="noopener">자세히 보기</a>` : ''}
    </article>`).join('')
    : '<p class="empty">등록된 공지가 없습니다.</p>';

  $('#dashNotices').innerHTML = list.length
    ? list.slice(0, 2).map(x => `
        <button class="dash-card" data-go="notices">
          <strong>${x.pinned ? '📌 ' : ''}${esc(x.title || '')}</strong>
          <span>${dateText(x.date)}</span>
        </button>`).join('')
    : '<p class="empty">새 공지가 없습니다.</p>';
}

/* ═══ 자료 (시트 + 핸드아웃) ══════════════════════════ */
let resourceCache = [];
let resourceKind = 'all';

function renderResources(sheets = [], handouts = []) {
  const tag = (arr, kind) => visible(arr).map(x => ({ ...x, _kind: kind }));
  resourceCache = [...tag(sheets, 'sheet'), ...tag(handouts, 'handout')];

  drawResources();

  const recent = tag(handouts, 'handout')
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 2);

  $('#dashResources').innerHTML = recent.length
    ? recent.map(x => `
        <button class="dash-card" data-go="resources">
          <strong>${isLocked(x) ? '🔒 ' : ''}${esc(x.title || '')}</strong>
          <span>${esc(x.category || '핸드아웃')}</span>
        </button>`).join('')
    : '<p class="empty">새 자료가 없습니다.</p>';
}

function resourceCard(x) {
  const kindLabel = x._kind === 'sheet' ? 'Sheet' : (x.category || 'Handout');

  if (isLocked(x)) return `
    <article class="res locked">
      <div class="lock" aria-hidden="true">🔒</div>
      <h3>${esc(x.title || '')}</h3>
      <p class="body-text">${esc(x.description || '아직 공개되지 않았습니다.')}</p>
      <span class="pill">잠금</span>
    </article>`;

  const target = linkUrl(x.url || x.file);
  return `
    <article class="res">
      ${x.image ? `<img src="${imageUrl(x.image)}" alt="" ${DROP_ON_ERROR}>` : ''}
      <p class="res-kind">${esc(kindLabel)}</p>
      <h3>${esc(x.title || '')}</h3>
      ${x.owner ? `<p class="res-owner">${esc(x.owner)}</p>` : ''}
      ${x.description ? `<p class="body-text">${esc(x.description)}</p>` : ''}
      ${x.content ? `<details class="fold"><summary>내용 보기</summary><p class="body-text">${esc(x.content)}</p></details>` : ''}
      ${target ? `<a class="btn" href="${esc(target)}" target="_blank" rel="noopener">열기</a>` : ''}
    </article>`;
}

function drawResources() {
  const q = ($('#resourceSearch').value || '').trim().toLowerCase();
  const list = resourceCache.filter(x => {
    if (resourceKind !== 'all' && x._kind !== resourceKind) return false;
    if (!q) return true;
    return [x.title, x.description, x.owner, x.category]
      .some(v => String(v || '').toLowerCase().includes(q));
  });

  $('#resourceGrid').innerHTML = list.length
    ? list.map(resourceCard).join('')
    : `<p class="empty">${q ? `"${esc(q)}"와 맞는 자료가 없습니다.` : '게시된 자료가 없습니다.'}</p>`;
}

/* ═══ 인물 ═══════════════════════════════════════════ */
function renderCharacters(items = []) {
  const list = visible(items);

  $('#castRail').innerHTML = list.map(c => `
    <button style="background-image:url('${imageUrl(c.banner)}')" data-char="${esc(c.id || '')}">
      <span>${esc(c.name || '')}</span>
    </button>`).join('');

  $('#characterList').innerHTML = list.length ? list.map(c => `
    <article class="char" id="char-${esc(c.id || '')}" style="--char-accent:${esc(c.accent || 'var(--accent)')}">
      <div class="char-banner" style="background-image:url('${imageUrl(c.banner)}')">
        <h3>${esc(c.name || '')}</h3>
      </div>
      <div class="char-body">
        <img class="standing" src="${imageUrl(c.standing)}" alt="${esc(c.name || '')}" ${HIDE_ON_ERROR}>
        <div>
          ${c.quote ? `<p class="quote">${esc(c.quote)}</p>` : ''}
          <div class="info">
            <div><span>이름</span>${esc(c.name || '—')}</div>
            <div><span>직업</span>${esc(c.job || '—')}</div>
            <div><span>나이</span>${esc(c.age || '—')}</div>
            <div><span>거주지</span>${esc(c.location || '—')}</div>
          </div>
          <div class="story">
            ${(c.story || []).map(s => `
              <details class="fold">
                <summary>${esc(s.title || '')}</summary>
                <p class="body-text">${esc(s.content || '')}</p>
              </details>`).join('')}
          </div>
        </div>
      </div>
    </article>`).join('')
    : '<p class="empty">등록된 캐릭터가 없습니다.</p>';

  $$('[data-char]').forEach(btn => {
    btn.addEventListener('click', () =>
      showTab('cast', { anchor: 'char-' + btn.dataset.char }));
  });
}

function renderNpc(items = []) {
  const colors = { '적': '#8f2f2f', '아군': '#2f6b4a', '중립': '#5a6070', '의뢰인': '#34558b' };
  const list = visible(items);
  $('#npcGrid').innerHTML = list.length ? list.map(n => `
    <article class="npc">
      ${n.relation ? `<span class="tag" style="background:${colors[n.relation] || '#5a6070'}">${esc(n.relation)}</span>` : ''}
      <img src="${imageUrl(n.image)}" alt="" ${HIDE_ON_ERROR}>
      <h3>${esc(n.name || '')}</h3>
      ${n.description ? `<p class="body-text">${esc(n.description)}</p>` : ''}
    </article>`).join('')
    : '<p class="empty">등록된 관계 인물이 없습니다.</p>';
}

/* ═══ 세션 기록 ═══════════════════════════════════════ */
let recordCache = [];

function renderRecords(items = []) {
  recordCache = visible(items).sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || '')));
  drawRecords();
}

function drawRecords() {
  const q = ($('#recordSearch').value || '').trim().toLowerCase();
  const list = recordCache.filter(x => !q ||
    [x.title, x.summary, x.session].some(v => String(v || '').toLowerCase().includes(q)));

  $('#recordList').innerHTML = list.length ? list.map(x => `
    <article class="rec${x.image ? '' : ' no-img'}">
      ${x.image ? `<img src="${imageUrl(x.image)}" alt="" ${DROP_ON_ERROR}>` : ''}
      <div>
        <div class="rec-top">
          <span class="rec-no">${esc(x.session || 'SESSION')}</span>
          <time>${dateText(x.date)}</time>
        </div>
        <h3>${esc(x.title || '')}</h3>
        ${x.summary ? `<p class="body-text">${esc(x.summary)}</p>` : ''}
        ${x.content ? `<details class="fold"><summary>전체 기록 보기</summary><p class="body-text">${esc(x.content)}</p></details>` : ''}
        ${x.url ? `<a class="btn" href="${esc(linkUrl(x.url))}" target="_blank" rel="noopener">로그 열기</a>` : ''}
      </div>
    </article>`).join('')
    : `<p class="empty">${q ? `"${esc(q)}"와 맞는 기록이 없습니다.` : '등록된 세션 기록이 없습니다.'}</p>`;
}

/* ═══ 갤러리 · 라이트박스 ═════════════════════════════ */
let galleryCache = [];
let lbIndex = 0;

function renderGallery(items = []) {
  galleryCache = visible(items).filter(x => x && x.image);
  $('#galleryGrid').innerHTML = galleryCache.length
    ? galleryCache.map((x, i) => `
        <button data-i="${i}" aria-label="${esc(x.credit || `이미지 ${i + 1}`)} 크게 보기">
          <img src="${imageUrl(x.image)}" alt="${esc(x.credit || '')}" loading="lazy" ${DROP_ON_ERROR}>
        </button>`).join('')
    : '<p class="empty">등록된 이미지가 없습니다.</p>';
}

function openLightbox(i) {
  if (!galleryCache.length) return;
  lbIndex = (i + galleryCache.length) % galleryCache.length;
  const x = galleryCache[lbIndex];
  $('#lbImage').src = imageUrl(x.image);
  $('#lbImage').alt = x.credit || '';
  $('#lbCredit').textContent = x.credit || '';
  $('#lbCount').textContent = `${lbIndex + 1} / ${galleryCache.length}`;
  const multi = galleryCache.length > 1;
  $('#lbPrev').hidden = !multi;
  $('#lbNext').hidden = !multi;
  if (!$('#lightbox').open) $('#lightbox').showModal();
}

/* ═══ 달력 ═══════════════════════════════════════════ */
function buildCalendar(events = []) {
  const el = $('#calendar');
  let cursor = new Date();

  const byDate = {};
  visible(events).forEach(e => {
    if (!e.date) return;
    (byDate[e.date] ||= []).push(e);
  });

  function draw() {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const lastDate = new Date(y, m + 1, 0).getDate();
    const today = todayKey();
    const p = n => String(n).padStart(2, '0');

    let cells = '';
    for (let i = 0; i < firstDow; i++) cells += '<div class="cal-empty"></div>';

    for (let d = 1; d <= lastDate; d++) {
      const key = `${y}-${p(m + 1)}-${p(d)}`;
      const list = byDate[key];
      const cls = ['cal-day', list ? 'has-event' : '', key === today ? 'is-today' : '']
        .filter(Boolean).join(' ');
      const title = list
        ? list.map(e => `${e.title || '일정'}${e.time ? ' ' + e.time : ''}`).join(' / ')
        : '';
      cells += list
        ? `<button class="${cls}" data-date="${key}" title="${esc(title)}">${d}</button>`
        : `<div class="${cls}">${d}</div>`;
    }

    el.innerHTML = `
      <div class="cal-head">
        <button data-nav="-1" aria-label="이전 달">‹</button>
        <strong>${y}.${p(m + 1)}</strong>
        <button data-nav="1" aria-label="다음 달">›</button>
      </div>
      <div class="cal-grid">
        ${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}
        ${cells}
      </div>`;

    el.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
      cursor = new Date(y, m + Number(b.dataset.nav), 1);
      draw();
    }));

    /* 날짜를 누르면 그 일정으로 바로 이동합니다 */
    el.querySelectorAll('[data-date]').forEach(b => b.addEventListener('click', () => {
      const hit = scheduleCache.find(x => x.date === b.dataset.date);
      showTab('schedule', { anchor: hit ? `sch-${hit._i}` : '' });
    }));
  }

  draw();
}

/* ═══ 데이터 불러오기 ═════════════════════════════════ */
async function getJson(name) {
  const res = await fetch(`${DATA}${name}?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${name} · ${res.status}`);
  return res.json();
}

function fail(selector, label) {
  const el = $(selector);
  if (el) el.innerHTML =
    `<p class="error">${label}을(를) 불러오지 못했습니다. 새로고침하거나 assets/data 파일을 확인하세요.</p>`;
}

async function loadAll() {
  const files = [
    'site.json', 'characters.json', 'npc.json', 'schedules.json',
    'notices.json', 'sheets.json', 'handouts.json', 'records.json', 'gallery.json'
  ];

  /* allSettled — 파일 하나가 없어도 나머지 화면은 정상으로 뜹니다 */
  const results = await Promise.allSettled(files.map(getJson));
  const val = i => results[i].status === 'fulfilled' ? results[i].value : null;
  const ok = i => results[i].status === 'fulfilled';

  renderSite(val(0) || {});

  ok(1) ? renderCharacters(val(1)) : fail('#characterList', '캐릭터');
  ok(2) ? renderNpc(val(2)) : fail('#npcGrid', '관계 인물');

  if (ok(3)) {
    renderSchedules(val(3));
    buildCalendar(val(3));
  } else {
    fail('#scheduleUpcoming', '일정');
    fail('#dashSchedule', '일정');
    $('#nextLineBody').textContent = '일정을 불러오지 못했습니다';
    $('#calendar').hidden = true;
  }

  ok(4) ? renderNotices(val(4)) : (fail('#noticeList', '공지'), fail('#dashNotices', '공지'));

  if (ok(5) || ok(6)) {
    renderResources(val(5) || [], val(6) || []);
  } else {
    fail('#resourceGrid', '자료');
    fail('#dashResources', '자료');
  }

  ok(7) ? renderRecords(val(7)) : fail('#recordList', '세션 기록');
  ok(8) ? renderGallery(val(8)) : fail('#galleryGrid', '갤러리');

  const broken = files.filter((_, i) => !ok(i));
  if (broken.length) console.warn('불러오지 못한 파일:', broken.join(', '));
}

/* ═══ 시작 ═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  /* 탭 — 클릭 + 좌우 화살표 키 */
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
    btn.addEventListener('keydown', e => {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const i = TABS.indexOf(btn.dataset.tab);
      const next = TABS[(i + dir + TABS.length) % TABS.length];
      showTab(next);
      document.getElementById('tab-' + next).focus();
    });
  });

  /* 홈 카드 · 히어로 한 줄 */
  document.body.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) showTab(go.dataset.go);
  });
  $('#nextLine').addEventListener('click', () => showTab('schedule'));

  /* 검색 · 분류 */
  $('#resourceSearch').addEventListener('input', drawResources);
  $('#recordSearch').addEventListener('input', drawRecords);
  $('#resourceSeg').addEventListener('click', e => {
    const seg = e.target.closest('.seg');
    if (!seg) return;
    resourceKind = seg.dataset.kind;
    $$('#resourceSeg .seg').forEach(b => b.classList.toggle('is-on', b === seg));
    drawResources();
  });

  /* 갤러리 · 라이트박스 */
  $('#galleryGrid').addEventListener('click', e => {
    const btn = e.target.closest('[data-i]');
    if (btn) openLightbox(Number(btn.dataset.i));
  });
  $('#lbClose').addEventListener('click', () => $('#lightbox').close());
  $('#lbPrev').addEventListener('click', () => openLightbox(lbIndex - 1));
  $('#lbNext').addEventListener('click', () => openLightbox(lbIndex + 1));
  $('#lightbox').addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') openLightbox(lbIndex - 1);
    if (e.key === 'ArrowRight') openLightbox(lbIndex + 1);
  });
  $('#lightbox').addEventListener('click', e => {
    if (e.target.id === 'lightbox') $('#lightbox').close();
  });

  /* 사이드바 */
  $('#navToggle').addEventListener('click', () =>
    $('#sidebar').classList.contains('is-open') ? closeSidebar() : openSidebar());
  $('#sidebarClose').addEventListener('click', closeSidebar);
  $('#scrim').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSidebar();
  });

  /* 뒤로가기 · 링크로 들어온 경우 */
  window.addEventListener('popstate', () => routeFromHash({ push: false }));
  routeFromHash({ push: false });

  loadAll().then(() => {
    /* 데이터가 채워진 뒤 앵커가 있으면 다시 한 번 맞춥니다 */
    const anchor = location.hash.replace(/^#/, '').split('/')[1];
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
