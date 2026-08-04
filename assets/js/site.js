/* ═══════════════════════════════════════════════════════
   TRPG_TEAM · 세션 진행 포털 (구글시트 연동판)
   데이터는 구글 스프레드시트에서 직접 읽습니다.
   설정은 assets/js/config.js 한 파일에만 있습니다.
   ═══════════════════════════════════════════════════════ */

const CFG  = window.TRPG_SHEET || {};
const TABS_CFG = CFG.tabs || {};
const IMG  = 'assets/images/';
const DOW  = ['일', '월', '화', '수', '목', '금', '토'];
const TABS = ['home', 'schedule', 'notices', 'resources', 'cast', 'records', 'gallery'];

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const esc = v => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 무시 */ } }
};

/* ═══ 구글시트 읽기 ═══════════════════════════════════ */

const sheetId = String(CFG.id || '').trim();
const idLooksReal = sheetId && !/여기에|스프레드시트_ID/.test(sheetId);

function sheetUrl(tabName) {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}` +
         `/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

/* 따옴표 안의 쉼표와 줄바꿈까지 제대로 처리하는 CSV 해석기 */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else {
      if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* 첫 줄을 열 이름으로 삼아 객체 배열로 */
function toObjects(rows) {
  if (!rows.length) return [];
  const head = rows[0].map(h => String(h || '').replace(/\s+/g, '').trim());
  return rows.slice(1)
    .filter(r => r.some(c => String(c || '').trim() !== ''))   // 빈 줄 버리기
    .map(r => {
      const o = {};
      head.forEach((h, i) => { if (h) o[h] = String(r[i] ?? '').trim(); });
      return o;
    });
}

async function readTab(key) {
  const name = TABS_CFG[key] || key;
  const res = await fetch(sheetUrl(name), { cache: 'no-store' });
  if (!res.ok) throw new Error(`${name} 탭 · HTTP ${res.status}`);
  const text = await res.text();
  if (/^\s*</.test(text)) throw new Error(`${name} 탭 · 공유 설정을 확인하세요`);
  return toObjects(parseCsv(text));
}

/* ═══ 셀 읽기 도우미 ═══════════════════════════════════ */
const S = (row, key) => String(row?.[key] ?? '').trim();
const YES = v => /^(o|ㅇ|y|yes|true|예|네|1|v|✓)$/i.test(String(v || '').trim());

/* 공개 상태 — 비워두면 공개로 봅니다 */
function statusOf(row) {
  const v = S(row, '공개');
  if (!v) return '공개';
  if (/비공개|숨김|x/i.test(v)) return '비공개';
  if (/잠금|잠김|lock/i.test(v)) return '잠금';
  return '공개';
}

const visible = (list = []) => list.filter(x => x && x.status !== '비공개');
const isLocked = x => x.status === '잠금';

/* ═══ 이미지 주소 ═════════════════════════════════════ */

/* 구글 드라이브 공유 링크는 <img>로 바로 안 뜨므로 직접 주소로 바꿉니다 */
function driveDirect(url) {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}

function imageUrl(value, fallback = '') {
  const p = String(value || fallback || '').trim();
  if (!p) return '';
  if (/^data:/.test(p)) return p;
  if (/^(https?:)?\/\//.test(p)) return driveDirect(p);
  return IMG + p.replace(/^\/+/, '').replace(/^assets\/images\//, '');
}

function linkUrl(value) {
  const p = String(value || '').trim();
  if (!p) return '';
  if (/^(https?:|mailto:|tel:)/.test(p) || p.startsWith('//')) return p;
  if (p.startsWith('/')) return p.replace(/^\/+/, '');
  return p;
}

const HIDE_ON_ERROR = `onerror="this.style.visibility='hidden'"`;
const DROP_ON_ERROR = `onerror="this.remove()"`;

/* ═══ 날짜 ═══════════════════════════════════════════ */

/* 시트의 날짜 서식이 제각각일 수 있어 넉넉히 받습니다 */
function parseDate(s) {
  const t = String(s || '').trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})[-./]+(\d{1,2})[-./]+(\d{4})/);      // 8/10/2026
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
  const d = new Date(t);
  return isNaN(d) ? null : d;
}
const pad = n => String(n).padStart(2, '0');
function dateKey(s) {
  const d = parseDate(s);
  return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';
}
function dateText(key) {
  const d = parseDate(key);
  return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : '';
}
function shortDate(key) {
  const d = parseDate(key);
  return d ? `${pad(d.getMonth() + 1)}.${pad(d.getDate())}(${DOW[d.getDay()]})` : '';
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function ddayText(key) {
  const d = parseDate(key);
  if (!d) return '';
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const n = Math.round((d - now) / 86400000);
  if (n === 0) return '오늘';
  if (n === 1) return '내일';
  return n > 0 ? `D-${n}` : `${-n}일 전`;
}

/* ═══ 테마 ═══════════════════════════════════════════ */
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

function paintTheme(themeName, accentOverride) {
  const c = { ...(PRESETS[String(themeName || '').trim()] || PRESETS['인디고']) };
  if (accentOverride) c.accent = accentOverride;

  const css = `
:root{
  --accent:${c.accent}; --paper:${c.background}; --card:${c.card};
  --text:${c.text}; --sub:${c.subText}; --line:${c.line};
  --dark-card:${c.darkCard}; --dark-text:${c.darkText}; --hero-shade:${c.heroShade};
}
:root[data-theme="dark"]{
  --accent:color-mix(in srgb, ${c.accent} 68%, #ffffff);
  --hero-shade:#05070c;
}`;
  let tag = $('#siteTheme');
  if (!tag) { tag = document.createElement('style'); tag.id = 'siteTheme'; document.head.appendChild(tag); }
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

/* ═══ 탭 이동 ═════════════════════════════════════════ */
function showTab(id, { push = true, anchor = '' } = {}) {
  if (!TABS.includes(id)) id = 'home';
  TABS.forEach(t => {
    const panel = document.getElementById(t);
    const tab = document.getElementById('tab-' + t);
    const on = t === id;
    if (panel) panel.hidden = !on;
    if (tab) { tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; }
  });
  if (push) {
    const hash = '#' + id + (anchor ? '/' + anchor : '');
    if (location.hash !== hash) history.pushState(null, '', hash);
  }
  if (anchor) {
    setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  closeSidebar();
}
function routeFromHash({ push = false } = {}) {
  const [tab, anchor] = location.hash.replace(/^#/, '').split('/');
  showTab(tab, { push, anchor: anchor || '' });
}

/* ═══ 사이드바 ════════════════════════════════════════ */
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

/* ═══ 설정 · 링크 ═════════════════════════════════════ */
function renderSite(settingRows = [], linkRows = []) {
  /* 설정 탭은 "항목 / 값" 두 열입니다 */
  const s = {};
  settingRows.forEach(r => {
    const k = S(r, '항목');
    if (k) s[k] = S(r, '값');
  });

  paintTheme(s['테마'], s['강조색']);

  const team = s['팀이름'] || 'TRPG_TEAM';
  document.title = s['제목'] ? `${s['제목']} · ${team}` : team;
  $('#topTeam').textContent = team;
  $('#teamName').textContent = team;
  $('#siteTitle').textContent = s['제목'] || '';
  $('#siteDescription').textContent = s['소개'] || '';

  const hero = $('#heroImage');
  hero.src = imageUrl(s['배너이미지'], 'office.jpg');
  hero.onerror = () => hero.style.display = 'none';

  const pf = $('#profileImage');
  pf.src = imageUrl(s['프로필이미지'], 'icon.jpg');
  pf.alt = s['프로필이름'] || '';
  pf.onerror = () => pf.style.visibility = 'hidden';

  $('#profileName').textContent = s['프로필이름'] || '';
  $('#profileSub1').textContent = s['소개1'] || '';
  $('#profileSub2').textContent = s['소개2'] || '';
  $('#profileSince').textContent = s['활동기간'] || '';

  const main = $('#mainImage');
  main.src = imageUrl(s['메인이미지'], 'main.png');
  main.onerror = () => main.hidden = true;

  $('#footerText').textContent = s['하단문구'] || `© ${new Date().getFullYear()} ${team}`;

  $('#profileLinks').innerHTML = linkRows
    .filter(r => S(r, '이름') && S(r, '주소'))
    .map(r => `<a href="${esc(linkUrl(S(r, '주소')))}" target="_blank" rel="noopener">${esc(S(r, '이름'))}</a>`)
    .join('');

  const yt = (s['유튜브ID'] || '').trim();
  const hasMusic = yt || s['음악제목'];
  $('#musicCard').hidden = !hasMusic;
  if (hasMusic) {
    $('#musicTitle').textContent = s['음악제목'] || '';
    $('#musicArtist').textContent = s['음악아티스트'] || '';
    const thumb = $('#musicThumb');
    thumb.src = yt ? `https://img.youtube.com/vi/${encodeURIComponent(yt)}/mqdefault.jpg`
                   : imageUrl(s['프로필이미지'], 'icon.jpg');
    thumb.onerror = () => thumb.style.visibility = 'hidden';
    const link = $('#musicLink');
    link.href = yt ? `https://youtu.be/${encodeURIComponent(yt)}` : '#';
    link.hidden = !yt;
  }
}

/* ═══ 일정 ═══════════════════════════════════════════ */
let scheduleCache = [];

function renderSchedules(rows = []) {
  const list = visible(rows.map(r => ({
    date: dateKey(S(r, '날짜')),
    time: S(r, '시간'),
    title: S(r, '제목'),
    description: S(r, '설명'),
    location: S(r, '장소'),
    url: S(r, '링크'),
    status: statusOf(r)
  })))
    .filter(x => x.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((x, i) => ({ ...x, _i: i }));

  scheduleCache = list;

  const today = todayKey();
  const upcoming = list.filter(x => x.date >= today);
  const past = list.filter(x => x.date < today).reverse();
  const next = upcoming[0];

  const card = (x, isNext) => `
    <article class="tl-item${isNext ? ' is-next' : ''}" id="sch-${x._i}">
      <div class="tl-date">
        <strong>${shortDate(x.date)}</strong>
        <span>${esc(x.time)}</span>
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

  const line = $('#nextLineBody');
  if (next) {
    const bits = [esc(next.title || '세션'),
                  `${shortDate(next.date)}${next.time ? ' ' + esc(next.time) : ''}`];
    if (next.location) bits.push(esc(next.location));
    line.innerHTML = bits.join('<span class="sep">·</span>')
      + `<span class="sep">·</span><span class="dday">${ddayText(next.date)}</span>`;
  } else {
    line.textContent = '예정된 세션이 없습니다';
  }

  $('#dashSchedule').innerHTML = next
    ? `<button class="dash-card" data-go="schedule">
         <strong>${esc(next.title || '세션')}</strong>
         <span>${shortDate(next.date)} ${esc(next.time)} · ${ddayText(next.date)}</span>
       </button>`
    : '<p class="empty">예정된 일정이 없습니다.</p>';
}

/* ═══ 공지 ═══════════════════════════════════════════ */
function renderNotices(rows = []) {
  const list = visible(rows.map(r => ({
    date: dateKey(S(r, '날짜')),
    title: S(r, '제목'),
    content: S(r, '내용'),
    url: S(r, '링크'),
    pinned: YES(S(r, '고정')),
    status: statusOf(r)
  }))).sort((a, b) =>
    (Number(b.pinned) - Number(a.pinned)) || String(b.date).localeCompare(String(a.date)));

  $('#noticeList').innerHTML = list.length ? list.map(x => `
    <article class="notice${x.pinned ? ' pinned' : ''}">
      <div class="notice-top">
        <span>${x.pinned ? '고정 공지' : '공지'}</span>
        <time>${dateText(x.date)}</time>
      </div>
      <h3>${esc(x.title)}</h3>
      ${x.content ? `<p class="body-text">${esc(x.content)}</p>` : ''}
      ${x.url ? `<a class="link" href="${esc(linkUrl(x.url))}" target="_blank" rel="noopener">자세히 보기</a>` : ''}
    </article>`).join('')
    : '<p class="empty">등록된 공지가 없습니다.</p>';

  $('#dashNotices').innerHTML = list.length
    ? list.slice(0, 2).map(x => `
        <button class="dash-card" data-go="notices">
          <strong>${x.pinned ? '📌 ' : ''}${esc(x.title)}</strong>
          <span>${dateText(x.date)}</span>
        </button>`).join('')
    : '<p class="empty">새 공지가 없습니다.</p>';
}

/* ═══ 자료 ═══════════════════════════════════════════ */
let resourceCache = [];
let resourceKind = 'all';

function renderResources(rows = []) {
  resourceCache = visible(rows.map(r => ({
    _kind: /시트/.test(S(r, '종류')) ? 'sheet' : 'handout',
    title: S(r, '제목'),
    owner: S(r, '담당'),
    category: S(r, '분류'),
    description: S(r, '설명'),
    image: S(r, '이미지'),
    url: S(r, '링크'),
    content: S(r, '본문'),
    date: dateKey(S(r, '등록일')),
    status: statusOf(r)
  })));

  drawResources();

  const recent = resourceCache
    .filter(x => x._kind === 'handout')
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 2);

  $('#dashResources').innerHTML = recent.length
    ? recent.map(x => `
        <button class="dash-card" data-go="resources">
          <strong>${isLocked(x) ? '🔒 ' : ''}${esc(x.title)}</strong>
          <span>${esc(x.category || '핸드아웃')}</span>
        </button>`).join('')
    : '<p class="empty">새 자료가 없습니다.</p>';
}

function resourceCard(x) {
  const kindLabel = x._kind === 'sheet' ? 'Sheet' : (x.category || 'Handout');
  if (isLocked(x)) return `
    <article class="res locked">
      <div class="lock" aria-hidden="true">🔒</div>
      <h3>${esc(x.title)}</h3>
      <p class="body-text">${esc(x.description || '아직 공개되지 않았습니다.')}</p>
      <span class="pill">잠금</span>
    </article>`;

  const target = linkUrl(x.url);
  return `
    <article class="res">
      ${x.image ? `<img src="${imageUrl(x.image)}" alt="" ${DROP_ON_ERROR}>` : ''}
      <p class="res-kind">${esc(kindLabel)}</p>
      <h3>${esc(x.title)}</h3>
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
function renderCharacters(rows = []) {
  const list = visible(rows.map(r => {
    const story = [];
    for (let n = 1; n <= 4; n++) {
      const t = S(r, `소개제목${n}`), c = S(r, `소개내용${n}`);
      if (t || c) story.push({ title: t, content: c });
    }
    return {
      id: S(r, 'ID') || S(r, '아이디'),
      name: S(r, '이름'),
      banner: S(r, '배너'),
      standing: S(r, '스탠딩'),
      accent: S(r, '강조색'),
      quote: S(r, '한마디'),
      job: S(r, '직업'),
      age: S(r, '나이'),
      location: S(r, '거주지'),
      story,
      status: statusOf(r)
    };
  }));

  $('#castRail').innerHTML = list.map(c => `
    <button style="background-image:url('${imageUrl(c.banner)}')" data-char="${esc(c.id)}">
      <span>${esc(c.name)}</span>
    </button>`).join('');

  $('#characterList').innerHTML = list.length ? list.map(c => `
    <article class="char" id="char-${esc(c.id)}" style="--char-accent:${esc(c.accent || 'var(--accent)')}">
      <div class="char-banner" style="background-image:url('${imageUrl(c.banner)}')">
        <h3>${esc(c.name)}</h3>
      </div>
      <div class="char-body">
        <img class="standing" src="${imageUrl(c.standing)}" alt="${esc(c.name)}" ${HIDE_ON_ERROR}>
        <div>
          ${c.quote ? `<p class="quote">${esc(c.quote)}</p>` : ''}
          <div class="info">
            <div><span>이름</span>${esc(c.name || '—')}</div>
            <div><span>직업</span>${esc(c.job || '—')}</div>
            <div><span>나이</span>${esc(c.age || '—')}</div>
            <div><span>거주지</span>${esc(c.location || '—')}</div>
          </div>
          <div class="story">
            ${c.story.map(s => `
              <details class="fold">
                <summary>${esc(s.title)}</summary>
                <p class="body-text">${esc(s.content)}</p>
              </details>`).join('')}
          </div>
        </div>
      </div>
    </article>`).join('')
    : '<p class="empty">등록된 캐릭터가 없습니다.</p>';

  $$('[data-char]').forEach(btn =>
    btn.addEventListener('click', () => showTab('cast', { anchor: 'char-' + btn.dataset.char })));
}

function renderNpc(rows = []) {
  const colors = { '적': '#8f2f2f', '아군': '#2f6b4a', '중립': '#5a6070', '의뢰인': '#34558b' };
  const list = visible(rows.map(r => ({
    name: S(r, '이름'),
    image: S(r, '이미지'),
    relation: S(r, '관계'),
    description: S(r, '설명'),
    status: statusOf(r)
  })));

  $('#npcGrid').innerHTML = list.length ? list.map(n => `
    <article class="npc">
      ${n.relation ? `<span class="tag" style="background:${colors[n.relation] || '#5a6070'}">${esc(n.relation)}</span>` : ''}
      <img src="${imageUrl(n.image)}" alt="" ${HIDE_ON_ERROR}>
      <h3>${esc(n.name)}</h3>
      ${n.description ? `<p class="body-text">${esc(n.description)}</p>` : ''}
    </article>`).join('')
    : '<p class="empty">등록된 관계 인물이 없습니다.</p>';
}

/* ═══ 기록 ═══════════════════════════════════════════ */
let recordCache = [];

function renderRecords(rows = []) {
  recordCache = visible(rows.map(r => ({
    session: S(r, '회차'),
    date: dateKey(S(r, '날짜')),
    title: S(r, '제목'),
    summary: S(r, '요약'),
    image: S(r, '이미지'),
    content: S(r, '본문'),
    url: S(r, '링크'),
    status: statusOf(r)
  }))).sort((a, b) => String(b.date).localeCompare(String(a.date)));
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
        <h3>${esc(x.title)}</h3>
        ${x.summary ? `<p class="body-text">${esc(x.summary)}</p>` : ''}
        ${x.content ? `<details class="fold"><summary>전체 기록 보기</summary><p class="body-text">${esc(x.content)}</p></details>` : ''}
        ${x.url ? `<a class="btn" href="${esc(linkUrl(x.url))}" target="_blank" rel="noopener">로그 열기</a>` : ''}
      </div>
    </article>`).join('')
    : `<p class="empty">${q ? `"${esc(q)}"와 맞는 기록이 없습니다.` : '등록된 세션 기록이 없습니다.'}</p>`;
}

/* ═══ 갤러리 ═════════════════════════════════════════ */
let galleryCache = [];
let lbIndex = 0;

function renderGallery(rows = []) {
  galleryCache = visible(rows.map(r => ({
    image: S(r, '이미지'),
    credit: S(r, '크레딧'),
    status: statusOf(r)
  }))).filter(x => x.image);

  $('#galleryGrid').innerHTML = galleryCache.length
    ? galleryCache.map((x, i) => `
        <button data-i="${i}" aria-label="${esc(x.credit || `이미지 ${i + 1}`)} 크게 보기">
          <img src="${imageUrl(x.image)}" alt="${esc(x.credit)}" loading="lazy" ${DROP_ON_ERROR}>
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
function buildCalendar() {
  const el = $('#calendar');
  let cursor = new Date();

  const byDate = {};
  scheduleCache.forEach(e => { if (e.date) (byDate[e.date] ||= []).push(e); });

  function draw() {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const lastDate = new Date(y, m + 1, 0).getDate();
    const today = todayKey();

    let cells = '';
    for (let i = 0; i < firstDow; i++) cells += '<div class="cal-empty"></div>';
    for (let d = 1; d <= lastDate; d++) {
      const key = `${y}-${pad(m + 1)}-${pad(d)}`;
      const list = byDate[key];
      const cls = ['cal-day', list ? 'has-event' : '', key === today ? 'is-today' : '']
        .filter(Boolean).join(' ');
      const title = list ? list.map(e => `${e.title || '일정'}${e.time ? ' ' + e.time : ''}`).join(' / ') : '';
      cells += list
        ? `<button class="${cls}" data-date="${key}" title="${esc(title)}">${d}</button>`
        : `<div class="${cls}">${d}</div>`;
    }

    el.innerHTML = `
      <div class="cal-head">
        <button data-nav="-1" aria-label="이전 달">‹</button>
        <strong>${y}.${pad(m + 1)}</strong>
        <button data-nav="1" aria-label="다음 달">›</button>
      </div>
      <div class="cal-grid">
        ${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}
        ${cells}
      </div>`;

    el.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
      cursor = new Date(y, m + Number(b.dataset.nav), 1); draw();
    }));
    el.querySelectorAll('[data-date]').forEach(b => b.addEventListener('click', () => {
      const hit = scheduleCache.find(x => x.date === b.dataset.date);
      showTab('schedule', { anchor: hit ? `sch-${hit._i}` : '' });
    }));
  }
  draw();
}

/* ═══ 알림 ═══════════════════════════════════════════ */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.hidden = true, 2600);
}

/* ═══ 불러오기 ════════════════════════════════════════ */
function fail(selector, label, why) {
  const el = $(selector);
  if (el) el.innerHTML =
    `<p class="error">${esc(label)}을(를) 불러오지 못했습니다. ${esc(why || '')}</p>`;
}

async function loadAll({ quiet = false } = {}) {
  if (!idLooksReal) {
    $('#setupNotice').hidden = false;
    $('#hero').hidden = true;
    $('#layout').hidden = true;
    $('#setupDetail').textContent =
      '아래 파일에서 id 값을 바꾸면 이 안내가 사라지고 시트 내용이 표시됩니다: assets/js/config.js';
    return;
  }
  $('#setupNotice').hidden = true;
  $('#hero').hidden = false;
  $('#layout').hidden = false;

  const keys = ['설정', '링크', '일정', '공지', '자료', '인물', '관계인물', '기록', '갤러리'];
  const results = await Promise.allSettled(keys.map(readTab));
  const at = k => results[keys.indexOf(k)];
  const ok = k => at(k).status === 'fulfilled';
  const val = k => ok(k) ? at(k).value : [];
  const why = k => ok(k) ? '' : String(at(k).reason?.message || '');

  renderSite(val('설정'), val('링크'));

  ok('일정') ? renderSchedules(val('일정'))
             : (fail('#scheduleUpcoming', '일정', why('일정')),
                fail('#dashSchedule', '일정', why('일정')),
                $('#nextLineBody').textContent = '일정을 불러오지 못했습니다');
  buildCalendar();

  ok('공지') ? renderNotices(val('공지'))
             : (fail('#noticeList', '공지', why('공지')), fail('#dashNotices', '공지', why('공지')));

  ok('자료') ? renderResources(val('자료'))
             : (fail('#resourceGrid', '자료', why('자료')), fail('#dashResources', '자료', why('자료')));

  ok('인물') ? renderCharacters(val('인물')) : fail('#characterList', '캐릭터', why('인물'));
  ok('관계인물') ? renderNpc(val('관계인물')) : fail('#npcGrid', '관계 인물', why('관계인물'));
  ok('기록') ? renderRecords(val('기록')) : fail('#recordList', '세션 기록', why('기록'));
  ok('갤러리') ? renderGallery(val('갤러리')) : fail('#galleryGrid', '갤러리', why('갤러리'));

  const broken = keys.filter(k => !ok(k));
  if (broken.length) console.warn('불러오지 못한 탭:', broken.join(', '));
  if (!quiet) toast(broken.length ? `${broken.join(', ')} 탭을 읽지 못했습니다` : '시트에서 불러왔습니다');
}

/* ═══ 시작 ═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const edit = String(CFG.editUrl || '').trim();
  if (edit) { $('#editLink').href = edit; $('#editLink').hidden = false; }

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

  document.body.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) showTab(go.dataset.go);
  });
  $('#nextLine').addEventListener('click', () => showTab('schedule'));

  $('#resourceSearch').addEventListener('input', drawResources);
  $('#recordSearch').addEventListener('input', drawRecords);
  $('#resourceSeg').addEventListener('click', e => {
    const seg = e.target.closest('.seg');
    if (!seg) return;
    resourceKind = seg.dataset.kind;
    $$('#resourceSeg .seg').forEach(b => b.classList.toggle('is-on', b === seg));
    drawResources();
  });

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

  $('#navToggle').addEventListener('click', () =>
    $('#sidebar').classList.contains('is-open') ? closeSidebar() : openSidebar());
  $('#sidebarClose').addEventListener('click', closeSidebar);
  $('#scrim').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });

  /* 시트를 고친 뒤 이 버튼만 누르면 반영됩니다 */
  $('#refreshBtn').addEventListener('click', () => {
    $('#refreshBtn').disabled = true;
    loadAll().finally(() => $('#refreshBtn').disabled = false);
  });

  window.addEventListener('popstate', () => routeFromHash({ push: false }));
  routeFromHash({ push: false });

  loadAll({ quiet: true }).then(() => {
    const anchor = location.hash.replace(/^#/, '').split('/')[1];
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
