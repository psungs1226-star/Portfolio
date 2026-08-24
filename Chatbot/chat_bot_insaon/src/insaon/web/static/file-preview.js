(() => {
  "use strict";

  const isLocalFile = globalThis.location.protocol === "file:";
  const isStaticPreview = new URLSearchParams(globalThis.location.search).has("preview");

  if (isLocalFile || isStaticPreview) {
    document.documentElement.classList.add("is-file-preview");

    document.addEventListener("DOMContentLoaded", () => {
      const launchButton = document.querySelector("#dashboard-launch");
      const status = document.querySelector("#launcher-status");
      const fallback = document.querySelector("#launcher-fallback");
      if (!(launchButton instanceof HTMLAnchorElement)) return;

      launchButton.addEventListener("click", () => {
        launchButton.classList.add("is-launching");
        launchButton.querySelector("span:first-child").textContent = "대시보드 여는 중";
        if (status) status.textContent = "Ollama와 local 모델을 확인하고 있어요. 잠시 뒤 챗봇이 열려요.";
        globalThis.setTimeout(() => {
          if (fallback) fallback.hidden = false;
        }, 4500);
      });
    });
  }
})();
