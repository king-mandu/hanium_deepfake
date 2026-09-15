/* =========================================================
   dashboard.html 전용 스크립트
   - sessionStorage에 저장된 (더미) 분석 결과를 읽어 화면에 렌더링합니다.
   ========================================================= */

const fileMeta = DG.getFileMeta();
const result = DG.getResult();

// 분석 결과가 없으면(직접 접근 등) 업로드 페이지로 되돌려보냄
if (!fileMeta || !result) {
  window.location.replace("upload.html");
}

if (fileMeta && result) {
  renderSummary();
  renderVerdict();
  drawGauge("videoGauge", result.videoFakeProb, "videoGaugeNum", "비디오");
  drawGauge("audioGauge", result.audioFakeProb, "audioGaugeNum", "오디오");
  drawGauge("overallGauge", result.overallScore, "overallGaugeNum", "종합");
  drawTimeline();
  renderFaceRegions();
}

document.getElementById("restartBtn").addEventListener("click", () => {
  DG.clearAll();
  window.location.href = "upload.html";
});

/* ---------- 상단 요약 ---------- */

function renderSummary() {
  document.getElementById("sumFileName").textContent = fileMeta.name;
  document.getElementById("sumDuration").textContent = DG.formatDuration(
    result.duration || fileMeta.duration
  );
  const t = new Date(result.analyzedAt);
  document.getElementById("sumTime").textContent = t.toLocaleString("ko-KR");
}

/* ---------- 종합 판정 카드 ---------- */

function renderVerdict() {
  const card = document.getElementById("verdictCard");
  const icon = document.getElementById("verdictIcon");
  const title = document.getElementById("verdictTitle");
  const desc = document.getElementById("verdictDesc");
  const score = document.getElementById("verdictScore");

  score.textContent = `${result.overallScore}%`;

  if (result.isFake) {
    card.classList.add("verdict-fake");
    icon.textContent = "⚠";
    title.textContent = "합성(딥페이크) 영상으로 의심됩니다";
    desc.textContent = `비디오 위조 확률 ${result.videoFakeProb}% · 오디오 위조 확률 ${result.audioFakeProb}%를 종합한 결과, 위조 가능성이 높게 나타났습니다.`;
  } else {
    card.classList.add("verdict-real");
    icon.textContent = "✓";
    title.textContent = "실제(진짜) 영상으로 판단됩니다";
    desc.textContent = `비디오 위조 확률 ${result.videoFakeProb}% · 오디오 위조 확률 ${result.audioFakeProb}%를 종합한 결과, 위조 흔적이 낮게 나타났습니다.`;
  }
}

/* ---------- 게이지(원형 프로그레스) ---------- */

function drawGauge(canvasId, pct, numId, label) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = 74;
  const lineWidth = 14;
  const color = DG.colorForScoreHex(pct);

  ctx.clearRect(0, 0, w, h);

  // 배경 트랙
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#1c2540";
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // 진행 아크 (12시 방향에서 시작, 시계방향)
  const start = -Math.PI / 2;
  const end = start + (Math.PI * 2 * pct) / 100;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, end);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.stroke();

  // 중앙 퍼센트 텍스트
  ctx.fillStyle = "#eef2f9";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${Math.round(pct)}%`, cx, cy - 4);

  ctx.fillStyle = "#5c6884";
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText(label, cx, cy + 22);

  // 캔버스 아래 라벨
  const numEl = document.getElementById(numId);
  const riskLabel = pct >= 70 ? "위험 · 위조 가능성 높음" : pct >= 40 ? "주의 · 추가 확인 필요" : "안전 · 위조 흔적 낮음";
  numEl.innerHTML = `<span class="badge ${
    pct >= 70 ? "badge-danger" : pct >= 40 ? "badge-warning" : "badge-success"
  }">${riskLabel}</span>`;
}

/* ---------- 시간대별 딥페이크 의심도 라인차트 ---------- */

function drawTimeline() {
  const canvas = document.getElementById("timelineChart");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || canvas.parentElement.clientWidth;
  const cssHeight = 220;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const padding = { top: 16, right: 18, bottom: 28, left: 40 };
  const chartW = cssWidth - padding.left - padding.right;
  const chartH = cssHeight - padding.top - padding.bottom;

  const points = result.timeline;
  const maxT = points[points.length - 1].time || 1;

  const xFor = (t) => padding.left + (t / maxT) * chartW;
  const yFor = (v) => padding.top + chartH - (v / 100) * chartH;

  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // 위험/주의 구간 배경 밴드
  ctx.fillStyle = "rgba(255,84,112,0.07)";
  ctx.fillRect(padding.left, yFor(100), chartW, yFor(70) - yFor(100));
  ctx.fillStyle = "rgba(255,180,84,0.06)";
  ctx.fillRect(padding.left, yFor(70), chartW, yFor(40) - yFor(70));

  // 가로 그리드 + y축 라벨
  ctx.strokeStyle = "#1c2540";
  ctx.fillStyle = "#5c6884";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  [0, 25, 50, 75, 100].forEach((v) => {
    const y = yFor(v);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();
    ctx.fillText(`${v}`, padding.left - 8, y);
  });

  // x축 시간 라벨 (0, 25%, 50%, 75%, 100% 지점)
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
    const t = maxT * f;
    ctx.fillText(DG.formatDuration(t), xFor(t), padding.top + chartH + 8);
  });

  // 영역 채우기 (그라데이션)
  const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
  grad.addColorStop(0, "rgba(79,209,255,0.35)");
  grad.addColorStop(1, "rgba(79,209,255,0.02)");

  ctx.beginPath();
  points.forEach((p, i) => {
    const x = xFor(p.time);
    const y = yFor(p.suspicion);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(xFor(points[points.length - 1].time), padding.top + chartH);
  ctx.lineTo(xFor(points[0].time), padding.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 라인
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = xFor(p.time);
    const y = yFor(p.suspicion);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#4fd1ff";
  ctx.lineWidth = 2.2;
  ctx.lineJoin = "round";
  ctx.stroke();

  // 포인트 (임계값 이상은 빨간 점으로 강조)
  points.forEach((p) => {
    const x = xFor(p.time);
    const y = yFor(p.suspicion);
    ctx.beginPath();
    ctx.arc(x, y, p.suspicion >= 70 ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = p.suspicion >= 70 ? "#ff5470" : "#4fd1ff";
    ctx.fill();
  });
}

/* ---------- 얼굴 부위별 분석 ---------- */

const REGION_SVG_MAP = {
  "눈": "regEyes",
  "코": "regNose",
  "입": "regMouth",
  "눈썹": "regBrows",
  "턱선/윤곽": "regJaw",
  "피부결": "regSkin",
};

function renderFaceRegions() {
  const list = document.getElementById("faceRegionList");
  list.innerHTML = "";

  result.regions
    .slice()
    .sort((a, b) => b.score - a.score)
    .forEach((region) => {
      const pct = Math.round(region.score);
      const color = DG.colorForScoreHex(pct);

      const row = document.createElement("div");
      row.className = "face-region-item";
      row.innerHTML = `
        <span>${region.name}</span>
        <span class="region-bar-track">
          <span class="region-bar-fill" style="width:${pct}%; background:${color}"></span>
        </span>
        <span class="region-pct" style="color:${color}">${pct}%</span>
      `;
      list.appendChild(row);

      // SVG 얼굴 다이어그램 색상 연동
      const svgId = REGION_SVG_MAP[region.name];
      const svgEl = document.getElementById(svgId);
      if (svgEl) {
        if (svgId === "regSkin") {
          svgEl.setAttribute("fill", color);
          svgEl.setAttribute("fill-opacity", 0.22);
        } else if (svgEl.tagName.toLowerCase() === "g") {
          svgEl.querySelectorAll("ellipse").forEach((el) => el.setAttribute("fill", color));
        } else {
          svgEl.setAttribute("stroke", color);
        }
      }
    });
}

window.addEventListener("resize", () => {
  if (result) drawTimeline();
});
