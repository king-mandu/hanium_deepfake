/* =========================================================
   DeepGuard - 공통 유틸리티
   모든 페이지(upload / loading / dashboard)에서 공유합니다.
   ========================================================= */

const DG = (() => {
  const STORAGE_KEYS = {
    FILE_META: "dg_file_meta", // 업로드한 영상의 메타데이터 (이름/크기/길이/썸네일)
    RESULT: "dg_analysis_result", // 분석(더미) 결과
  };

  /** 바이트 -> "12.3 MB" 형태로 변환 */
  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return "-";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(
      units.length - 1,
      Math.floor(Math.log(bytes) / Math.log(1024))
    );
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  /** 초 -> "01:23" 형태로 변환 */
  function formatDuration(sec) {
    if (!isFinite(sec) || sec <= 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  /** min ~ max 사이의 난수 (소수) */
  function randRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  /** 값 범위 제한 */
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /** 지정한 ms 만큼 대기하는 Promise */
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getFileMeta() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.FILE_META);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setFileMeta(meta) {
    sessionStorage.setItem(STORAGE_KEYS.FILE_META, JSON.stringify(meta));
  }

  function getResult() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.RESULT);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setResult(result) {
    sessionStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(result));
  }

  function clearAll() {
    sessionStorage.removeItem(STORAGE_KEYS.FILE_META);
    sessionStorage.removeItem(STORAGE_KEYS.RESULT);
  }

  /** 점수(0~100)에 따른 상태 색상 반환 */
  function colorForScore(score) {
    if (score >= 70) return "var(--danger)";
    if (score >= 40) return "var(--warning)";
    return "var(--success)";
  }

  function colorForScoreHex(score) {
    if (score >= 70) return "#ff5470";
    if (score >= 40) return "#ffb454";
    return "#2dd4a7";
  }

  return {
    STORAGE_KEYS,
    formatBytes,
    formatDuration,
    randRange,
    clamp,
    delay,
    getFileMeta,
    setFileMeta,
    getResult,
    setResult,
    clearAll,
    colorForScore,
    colorForScoreHex,
  };
})();
