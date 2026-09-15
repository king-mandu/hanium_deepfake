/* =========================================================
   upload.html 전용 스크립트
   - 드래그 앤 드롭 / 파일 선택
   - 영상 길이(duration) 및 썸네일 캡처 (브라우저 API 사용, 실제 값)
   - 선택한 파일 정보를 sessionStorage에 저장하고 loading.html 로 이동
   ========================================================= */

const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB (데모용 제한)

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const filePreview = document.getElementById("filePreview");
const fileThumb = document.getElementById("fileThumb");
const fileName = document.getElementById("fileName");
const fileSub = document.getElementById("fileSub");
const fileRemoveBtn = document.getElementById("fileRemoveBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const errorMsg = document.getElementById("errorMsg");
const hiddenVideo = document.getElementById("hiddenVideo");
const hiddenCanvas = document.getElementById("hiddenCanvas");

let selectedMeta = null; // { name, size, type, duration, thumbnail }

/* ---------- 이벤트 바인딩 ---------- */

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) handleFile(file);
});

fileRemoveBtn.addEventListener("click", () => {
  resetSelection();
});

analyzeBtn.addEventListener("click", () => {
  if (!selectedMeta) return;
  DG.setFileMeta(selectedMeta);
  DG.setResult(null); // 이전 결과 제거
  window.location.href = "loading.html";
});

/* ---------- 핵심 로직 ---------- */

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add("show");
}

function clearError() {
  errorMsg.classList.remove("show");
  errorMsg.textContent = "";
}

function resetSelection() {
  selectedMeta = null;
  fileInput.value = "";
  filePreview.classList.remove("show");
  analyzeBtn.disabled = true;
  fileThumb.style.backgroundImage = "";
  fileThumb.textContent = "🎬";
  clearError();
}

async function handleFile(file) {
  clearError();

  if (!file.type.startsWith("video/")) {
    showError("영상 파일만 업로드할 수 있습니다. (예: mp4, mov, webm)");
    return;
  }

  if (file.size > MAX_SIZE_BYTES) {
    showError(
      `파일 용량이 너무 큽니다. 최대 ${DG.formatBytes(MAX_SIZE_BYTES)}까지 업로드할 수 있습니다.`
    );
    return;
  }

  fileName.textContent = file.name;
  fileSub.textContent = `${DG.formatBytes(file.size)} · 길이 확인 중...`;
  filePreview.classList.add("show");
  analyzeBtn.disabled = true;

  try {
    const { duration, thumbnail } = await readVideoInfo(file);

    selectedMeta = {
      name: file.name,
      size: file.size,
      type: file.type,
      duration: duration,
      thumbnail: thumbnail,
      uploadedAt: new Date().toISOString(),
    };

    fileSub.textContent = `${DG.formatBytes(file.size)} · 길이 ${DG.formatDuration(duration)}`;
    if (thumbnail) {
      fileThumb.style.backgroundImage = `url(${thumbnail})`;
      fileThumb.textContent = "";
    }
    analyzeBtn.disabled = false;
  } catch (err) {
    // 메타데이터 추출에 실패해도 업로드 자체는 진행할 수 있도록 허용
    selectedMeta = {
      name: file.name,
      size: file.size,
      type: file.type,
      duration: 0,
      thumbnail: null,
      uploadedAt: new Date().toISOString(),
    };
    fileSub.textContent = `${DG.formatBytes(file.size)} · 길이 확인 불가`;
    analyzeBtn.disabled = false;
  }
}

/** 브라우저의 <video> 엘리먼트를 이용해 실제 영상 길이와 썸네일 프레임을 읽어옵니다. */
function readVideoInfo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    hiddenVideo.src = url;

    const cleanup = () => {
      hiddenVideo.removeEventListener("loadedmetadata", onMeta);
      hiddenVideo.removeEventListener("seeked", onSeeked);
      hiddenVideo.removeEventListener("error", onError);
    };

    const onError = () => {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new Error("영상을 읽을 수 없습니다."));
    };

    const onMeta = () => {
      // 썸네일을 위해 1초 지점(또는 가능한 가장 이른 지점)으로 이동
      const seekTo = Math.min(1, (hiddenVideo.duration || 1) / 2);
      try {
        hiddenVideo.currentTime = seekTo;
      } catch (e) {
        finish(null);
      }
    };

    const onSeeked = () => {
      let thumb = null;
      try {
        hiddenCanvas.width = 160;
        hiddenCanvas.height = 90;
        const ctx = hiddenCanvas.getContext("2d");
        ctx.drawImage(hiddenVideo, 0, 0, 160, 90);
        thumb = hiddenCanvas.toDataURL("image/jpeg", 0.7);
      } catch (e) {
        thumb = null;
      }
      finish(thumb);
    };

    const finish = (thumb) => {
      const duration = hiddenVideo.duration;
      cleanup();
      URL.revokeObjectURL(url);
      resolve({ duration: isFinite(duration) ? duration : 0, thumbnail: thumb });
    };

    hiddenVideo.addEventListener("loadedmetadata", onMeta);
    hiddenVideo.addEventListener("seeked", onSeeked);
    hiddenVideo.addEventListener("error", onError);
  });
}
