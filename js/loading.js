/* =========================================================
   loading.html 전용 스크립트
   - 단계별 진행 애니메이션을 보여주며 "분석 중"인 것처럼 연출합니다.
   - 실제로는 아래 더미 함수들이 랜덤 값을 생성합니다.
   - ⭐ 실제 모델을 연동할 때는 runAudioDeepfakeModel / runVideoDeepfakeModel
      두 함수의 내부만 실제 추론 API 호출로 교체하면 됩니다.
   ========================================================= */

const fileMeta = DG.getFileMeta();

// 업로드 없이 바로 접근한 경우 업로드 페이지로 되돌려보냄
if (!fileMeta) {
  window.location.replace("upload.html");
}

const STEPS = [
  { label: "영상 업로드 확인 중...", duration: 500 },
  { label: "오디오 트랙 분리 중...", duration: 900 },
  { label: "이미지 프레임 추출 중...", duration: 900 },
  { label: "오디오 딥페이크 탐지 모델 추론 중...", duration: 1400 },
  { label: "이미지 딥페이크 탐지 모델 추론 중...", duration: 1400 },
  { label: "얼굴 부위별 세부 분석 중...", duration: 1000 },
  { label: "결과 종합 중...", duration: 700 },
];

const TOTAL_DURATION = STEPS.reduce((sum, s) => sum + s.duration, 0);

const progressCircle = document.getElementById("progressCircle");
const pctText = document.getElementById("pctText");
const stepLabel = document.getElementById("stepLabel");
const stepItems = document.querySelectorAll(".step-item");
const loadingFile = document.getElementById("loadingFile");

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
progressCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;
progressCircle.style.strokeDashoffset = `${CIRCUMFERENCE}`;

if (fileMeta) {
  loadingFile.textContent = `${fileMeta.name} · ${DG.formatBytes(fileMeta.size)}`;
}

function setProgress(pct) {
  const offset = CIRCUMFERENCE * (1 - pct / 100);
  progressCircle.style.strokeDashoffset = `${offset}`;
  pctText.textContent = `${Math.round(pct)}%`;
}

function markStep(index, state) {
  const item = stepItems[index];
  if (!item) return;
  item.classList.remove("active", "done");
  if (state) item.classList.add(state);
  if (state === "done") {
    item.querySelector(".mark").textContent = "✓";
  }
}

/* =========================================================
   ⭐ 모델 연동 지점 (Dummy) ⭐
   실제 서비스에서는 아래 두 함수를 서버의 추론 API 호출로 교체하세요.
   예) const res = await fetch('/api/inference/audio', { method:'POST', body: audioBlob });
   ========================================================= */

// TODO: 실제 오디오 딥페이크 탐지 모델 추론으로 교체
async function runAudioDeepfakeModel(fileMeta) {
  // 현재는 더미 값(0~100 사이 확률)을 반환합니다.
  const prob = DG.clamp(DG.randRange(5, 95), 0, 100);
  return { fakeProbability: prob };
}

// TODO: 실제 이미지(영상 프레임) 딥페이크 탐지 모델 추론으로 교체
async function runVideoDeepfakeModel(fileMeta) {
  const prob = DG.clamp(DG.randRange(5, 95), 0, 100);

  // 얼굴 부위별 세부 점수 (더미)
  const regions = ["눈", "코", "입", "눈썹", "턱선/윤곽", "피부결"].map((name) => ({
    name,
    score: DG.clamp(prob + DG.randRange(-25, 25), 2, 98),
  }));

  // 시간대별 의심도 타임라인 (더미) - 영상 길이를 기준으로 20개 구간 생성
  const duration = fileMeta.duration && fileMeta.duration > 0 ? fileMeta.duration : 60;
  const pointCount = 20;
  const timeline = [];
  let cursor = DG.clamp(prob + DG.randRange(-15, 15), 5, 95);
  for (let i = 0; i < pointCount; i++) {
    cursor = DG.clamp(cursor + DG.randRange(-18, 18), 2, 98);
    // 가끔 스파이크(의심 급증 구간) 연출
    if (Math.random() < 0.12) cursor = DG.clamp(cursor + DG.randRange(15, 30), 2, 99);
    timeline.push({
      time: (duration / (pointCount - 1)) * i,
      suspicion: Math.round(cursor),
    });
  }

  return { fakeProbability: prob, regions, timeline, duration };
}

/* ========================================================= */

async function runPipeline() {
  let elapsed = 0;
  let audioResult = null;
  let videoResult = null;

  for (let i = 0; i < STEPS.length; i++) {
    markStep(i, "active");
    stepLabel.textContent = STEPS[i].label;

    // 실제 모델 호출은 해당 단계 도중에 트리거합니다.
    const stepPromise = (async () => {
      if (i === 3) audioResult = await runAudioDeepfakeModel(fileMeta);
      if (i === 4) videoResult = await runVideoDeepfakeModel(fileMeta);
    })();

    await Promise.all([DG.delay(STEPS[i].duration), stepPromise]);

    elapsed += STEPS[i].duration;
    setProgress((elapsed / TOTAL_DURATION) * 100);
    markStep(i, "done");
  }

  // 최종 결과 조합 (오디오 60% + 비디오 40% 가중 평균 예시)
  const videoFakeProb = Math.round(videoResult.fakeProbability);
  const audioFakeProb = Math.round(audioResult.fakeProbability);
  const overallScore = Math.round(videoFakeProb * 0.55 + audioFakeProb * 0.45);

  const result = {
    videoFakeProb,
    audioFakeProb,
    overallScore,
    isFake: overallScore >= 50,
    regions: videoResult.regions,
    timeline: videoResult.timeline,
    duration: videoResult.duration,
    analyzedAt: new Date().toISOString(),
  };

  DG.setResult(result);
  await DG.delay(350);
  window.location.href = "dashboard.html";
}

if (fileMeta) {
  runPipeline();
}
