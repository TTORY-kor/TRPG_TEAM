/* ----------------------------------------------------------
       탭 전환
       ---------------------------------------------------------- */
    function openTab(tabName, btnElement = null) {
        document.querySelectorAll('.content-card').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const target = document.getElementById(tabName);
        if (target) target.classList.add('active');
        if (btnElement) btnElement.classList.add('active');
    }


    /* ----------------------------------------------------------
       레이더 차트 (8각형 — CoC 7판)
       data-stats 순서: 근력, 건강, 크기, 민첩, 외모, 지능, 정신, 교육
       꼭짓점에 마우스를 올리면 항목명과 수치가 표시됩니다.
       ---------------------------------------------------------- */
    function drawAllRadarCharts() {
        const labels = ["근력", "건강", "크기", "민첩", "외모", "지능", "정신", "교육"];
        const SIDES  = 8;
        const STEP   = (Math.PI * 2) / SIDES;
        const CX = 100, CY = 100, R = 75;

        document.querySelectorAll('.stats-wrapper').forEach(wrapper => {
            const stats    = (wrapper.dataset.stats || "50,50,50,50,50,50,50,50").split(',').map(Number);
            const colorRGB = wrapper.dataset.color || "61, 90, 97";

            const bgEl   = wrapper.querySelector('.chart-background');
            const polyEl = wrapper.querySelector('.chart-polygon');
            const dotsEl = wrapper.querySelector('.chart-dots');
            const lblEl  = wrapper.querySelector('.chart-labels');
            const tipEl  = wrapper.querySelector('.chart-tooltip');
            if (!bgEl || !polyEl || !lblEl) return;

            // 배경 그리드
            let gridHTML = "";
            for (let lv = 1; lv <= 5; lv++) {
                let pts = "";
                const r = (R / 5) * lv;
                for (let i = 0; i < SIDES; i++) {
                    pts += `${CX + r * Math.cos(i * STEP - Math.PI/2)},${CY + r * Math.sin(i * STEP - Math.PI/2)} `;
                }
                gridHTML += `<polygon points="${pts}" class="${lv === 5 ? 'grid-line-outer' : 'grid-line'}"></polygon>`;
            }

            // 축선 & 레이블
            let axisHTML = "", labelHTML = "";
            for (let i = 0; i < SIDES; i++) {
                const angle = i * STEP - Math.PI / 2;
                const ex = CX + R * Math.cos(angle), ey = CY + R * Math.sin(angle);
                axisHTML  += `<line x1="${CX}" y1="${CY}" x2="${ex}" y2="${ey}" class="axis-line"></line>`;
                const lx = CX + (R + 14) * Math.cos(angle), ly = CY + (R + 14) * Math.sin(angle);
                labelHTML += `<text x="${lx}" y="${ly}" class="chart-label">${labels[i]}</text>`;
            }
            bgEl.innerHTML  = gridHTML + axisHTML;
            lblEl.innerHTML = labelHTML;

            // 데이터 폴리곤 + 꼭짓점
            let pts = "", dotsHTML = "";
            for (let i = 0; i < SIDES; i++) {
                const r = (stats[i] / 100) * R;
                const x = CX + r * Math.cos(i * STEP - Math.PI/2);
                const y = CY + r * Math.sin(i * STEP - Math.PI/2);
                pts += `${x},${y} `;
                dotsHTML += `
                    <circle cx="${x}" cy="${y}" r="3" fill="rgb(${colorRGB})" stroke="white" stroke-width="1"></circle>
                    <circle cx="${x}" cy="${y}" r="10" fill="transparent" class="chart-dot-hit"
                        data-label="${labels[i]}" data-value="${stats[i]}" data-x="${x}" data-y="${y}"></circle>`;
            }
            polyEl.setAttribute("points", pts);
            polyEl.style.fill   = `rgba(${colorRGB}, 0.5)`;
            polyEl.style.stroke = `rgb(${colorRGB})`;
            if (dotsEl) dotsEl.innerHTML = dotsHTML;

            // 툴팁 이벤트
            if (!tipEl) return;
            const tipBg   = tipEl.querySelector('.tooltip-bg');
            const tipText = tipEl.querySelector('.tooltip-text');

            wrapper.querySelectorAll('.chart-dot-hit').forEach(hit => {
                hit.addEventListener('mouseenter', () => {
                    const lbl = hit.dataset.label, val = hit.dataset.value;
                    const hx  = parseFloat(hit.dataset.x), hy = parseFloat(hit.dataset.y);
                    const boxW = (lbl.length + val.length + 1) * 6.5 + 10, boxH = 16;
                    let tx = hx + 6, ty = hy - boxH - 4;
                    if (tx + boxW > 195) tx = hx - boxW - 6;
                    if (ty < 2) ty = hy + 6;
                    tipText.textContent = `${lbl} ${val}`;
                    tipBg.setAttribute('x', tx);   tipBg.setAttribute('y', ty);
                    tipBg.setAttribute('width', boxW); tipBg.setAttribute('height', boxH);
                    tipText.setAttribute('x', tx + boxW / 2);
                    tipText.setAttribute('y', ty + boxH / 2);
                    tipEl.style.display = 'block';
                });
                hit.addEventListener('mouseleave', () => { tipEl.style.display = 'none'; });
            });
        });
    }


    /* ----------------------------------------------------------
       다이스롤 결과 판별
       ---------------------------------------------------------- */
    function detectDiceResult(text) {
        const looksLikeDice = /[＞>]|\d+\s*[Dd]\s*\d+|CC\s*<=|주사위/.test(text);
        if (!looksLikeDice) return null;

        if (text.includes("대성공"))       return "critical";
        if (text.includes("대실패"))       return "fumble";
        if (text.includes("어려운 성공"))  return "hard";
        if (text.includes("보통 성공"))    return "success";
        if (text.includes("성공"))         return "success";
        if (text.includes("실패"))         return "failure";
        return null;
    }


    /* ----------------------------------------------------------
       로그 파서 — [main] 태그 인식 (코코포리아 출력 형식)
       형식: [main] 이름 : 대사내용

       캐릭터 색상 추가: "이름": "#색상코드" 형식으로 추가하세요.
       ---------------------------------------------------------- */
    function parseAllLogs() {
        // ↓ 캐릭터별 이름 색상, 로그 내의 이름과 띄어쓰기까지 동일해야 인식합니다
        const charColors = {
        "Ho 1"   : "#4d9c29",
        "Ho 2"   : "#34610a",
        "Ho 3"   : "#1b3106",
        "Ho 4"   : "#294d0b",
        "GM"     : "#555555",
        "system" : "#494949"
        };
        document.querySelectorAll('.details-content').forEach(container => {
            
            const raw = container.innerHTML
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/&nbsp;/g, ' ')
                .trim();

            const pattern = /\[main\]\s*([^\n:]*?)\s*:\s*([\s\S]*?)(?=\s*\[main\]|$)/g;
            let html = "", match;
            while ((match = pattern.exec(raw)) !== null) {
                const name = match[1].trim();
                const rawContent = match[2].trim();
                const content = rawContent
                    .split('\n')
                    .map(line => line.trim())
                    .join('<br>');
                if (!name && !content) continue;
                const dice = detectDiceResult(rawContent);
                const msgClass = dice ? `msg-text dice-roll dice-${dice}` : 'msg-text';

                html += `<div class="log-item">
                    <b class="log-name" style="color:${charColors[name] || '#636363'}">${name}</b>
                    <span class="${msgClass}">${content}</span>
                </div>`;
            }
            if (html) container.innerHTML = html;
        });
    }


    /* ----------------------------------------------------------
       NPC 카드 관계 배지 자동 생성
       새 유형 추가: colorMap에 "유형명": { bg, text } 추가
       ---------------------------------------------------------- */
    function buildRelationBadges() {
        const colorMap = {
            "적"    : { bg: "#7b1111", text: "#ffdada" },
            "아군"  : { bg: "#1a4d2e", text: "#d4f7e0" },
            "중립"  : { bg: "#3a3a3a", text: "#cccccc" },
            "의뢰인": { bg: "#0d2d5e", text: "#cce0ff" }
        };
        document.querySelectorAll('.relation-card[data-relation]').forEach(card => {
            const rel   = card.dataset.relation;
            const style = colorMap[rel];
            if (!style) return;
            const badge = document.createElement('span');
            badge.className     = 'relation-badge';
            badge.textContent   = rel;
            badge.style.cssText = `background:${style.bg}; color:${style.text};`;
            card.prepend(badge);
        });
    }


    /* ----------------------------------------------------------
       갤러리 라이트박스 (이미지 팝업)
       ---------------------------------------------------------- */
    function getLightbox() {
        let overlay = document.getElementById('lightbox');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id        = 'lightbox';
        overlay.className  = 'lightbox-overlay';
        overlay.innerHTML =
            '<div class="lightbox-content">' +
                '<button class="lightbox-close" aria-label="닫기">✕</button>' +
                '<img class="lightbox-img" src="" alt="갤러리 이미지">' +
                '<div class="lightbox-credit"></div>' +
            '</div>';

        overlay.addEventListener('click', closeLightbox);
        overlay.querySelector('.lightbox-content')
               .addEventListener('click', e => e.stopPropagation());
        overlay.querySelector('.lightbox-close')
               .addEventListener('click', closeLightbox);

        document.body.appendChild(overlay);
        return overlay;
    }

    function openLightbox(item) {
        const overlay = getLightbox();
        const img    = overlay.querySelector('.lightbox-img');
        const credit = overlay.querySelector('.lightbox-credit');

        const thumb = item.querySelector('img');
        img.src = item.dataset.full || (thumb ? thumb.src : '');
        img.alt = thumb ? thumb.alt : '갤러리 이미지';

        const creditText = item.dataset.credit || '';
        credit.textContent = creditText;
        credit.style.display = creditText ? 'block' : 'none';

        overlay.classList.add('active');
    }

    function closeLightbox(e) {
        if (e) e.stopPropagation();
        const overlay = document.getElementById('lightbox');
        if (overlay) overlay.classList.remove('active');
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });


    /* ----------------------------------------------------------
       캘린더
       일정 추가: events 객체에 아래 형식으로 입력하세요.
         "YYYY-MM-DD": ["일정 이름", "시간"]
       ---------------------------------------------------------- */
    function buildCalendar() {
        // ↓ 일정을 여기에 추가하세요
        const events = {
            "2026-05-14": ["세션 3", "20:00"],
            "2026-05-28": ["세션 4", "20:00"]
        };

        const el = document.getElementById('calendar');
        if (!el) return;

        const DOW = ["일","월","화","수","목","금","토"];
        let current = new Date();

        function render() {
            const year     = current.getFullYear();
            const month    = current.getMonth();
            const today    = new Date();
            const firstDay = new Date(year, month, 1).getDay();
            const lastDate = new Date(year, month + 1, 0).getDate();

            let dayCells = "";
            for (let i = 0; i < firstDay; i++) {
                dayCells += `<div class="cal-day empty"></div>`;
            }
            for (let d = 1; d <= lastDate; d++) {
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const ev      = events[dateStr];
                const tooltip = ev ? `<span class="cal-tooltip">${ev[0]}<br>${ev[1]}</span>` : "";
                dayCells += `<div class="cal-day ${isToday ? 'today' : ''} ${ev ? 'has-event' : ''}">${d}${tooltip}</div>`;
            }

            el.innerHTML = `
                <div class="cal-header">
                    <div class="cal-year">${year}</div>
                    <div class="cal-nav">
                        <button id="cal-prev">&lt;</button>
                        <span class="cal-month">${String(month+1).padStart(2,'0')}</span>
                        <button id="cal-next">&gt;</button>
                    </div>
                </div>
                <div class="cal-grid">
                    ${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}
                    ${dayCells}
                </div>`;

            document.getElementById('cal-prev').addEventListener('click', () => { current = new Date(year, month - 1, 1); render(); });
            document.getElementById('cal-next').addEventListener('click', () => { current = new Date(year, month + 1, 1); render(); });
        }

        render();
    }


    /* ----------------------------------------------------------
       모바일 사이드바 토글
       ---------------------------------------------------------- */
    function toggleSidebar() {
        document.querySelector('.sidebar-column').classList.toggle('open');
        document.querySelector('.sidebar-overlay').classList.toggle('active');
    }


   
    window.addEventListener('load', () => {
        drawAllRadarCharts();
        parseAllLogs();
        buildRelationBadges();
        buildCalendar();
        getLightbox();   
    });
