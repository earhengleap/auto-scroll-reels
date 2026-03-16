(() => {
  if (window.__igAutoNextLoaded) return;
  window.__igAutoNextLoaded = true;

  const SECURITY = {
    allowedExtensionIds: "__ALLOWED_EXTENSION_IDS__",
    enableDebugLogs: "__ENABLE_DEBUG_LOGS__"
  };

  const ENABLE_DEBUG_LOGS = SECURITY.enableDebugLogs === "true";

  function parseAllowedExtensionIds() {
    try {
      const parsed = JSON.parse(SECURITY.allowedExtensionIds);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function isAuthorizedExtension() {
    const allowedIds = parseAllowedExtensionIds();
    if (allowedIds.length === 0) return true;
    return allowedIds.includes(chrome.runtime.id);
  }

  if (!isAuthorizedExtension()) {
    console.warn("[IG Auto Next] Unauthorized extension runtime.");
    return;
  }

  let currentVideo = null;
  let observer = null;
  let attachInterval = null;
  let isHandlingEnd = false;
  let lastVideoKey = null;
  let enabled = false;
  const NEAR_END_THRESHOLD_SECONDS = 0.2;
  const END_COOLDOWN_MS = 2200;
  let refreshScheduled = false;

  function log(...args) {
    if (!ENABLE_DEBUG_LOGS) return;
    console.log("[IG Auto Next]", ...args);
  }

  function getVisibleVideo() {
    const videos = [...document.querySelectorAll("video")];
    let bestVideo = null;
    let bestArea = 0;

    for (const video of videos) {
      const rect = video.getBoundingClientRect();

      const visibleWidth = Math.max(
        0,
        Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
      );
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
      );
      const visibleArea = visibleWidth * visibleHeight;

      if (visibleArea > bestArea) {
        bestArea = visibleArea;
        bestVideo = video;
      }
    }

    return bestVideo;
  }

  function getVideoKey(video) {
    if (!video) return null;

    const rect = video.getBoundingClientRect();
    return [
      video.currentSrc || video.src || "no-src",
      Math.round(rect.top),
      Math.round(rect.left),
      Math.round(rect.width),
      Math.round(rect.height)
    ].join("|");
  }

  function getScrollableParent(el) {
    let node = el;

    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      const overflowY = style.overflowY;
      const canScroll = node.scrollHeight > node.clientHeight + 5;

      if (canScroll && (overflowY === "auto" || overflowY === "scroll")) {
        return node;
      }

      node = node.parentElement;
    }

    return document.scrollingElement || document.documentElement;
  }

  function moveToNextReel() {
    if (!enabled || document.hidden) return;

    const video = getVisibleVideo();
    if (!video) {
      log("No visible video found");
      return;
    }

    const reelContainer =
      video.closest("article") ||
      video.closest('[role="presentation"]') ||
      video.parentElement ||
      video;

    const scrollParent = getScrollableParent(reelContainer);
    const reelHeight = reelContainer.getBoundingClientRect().height || 0;
    const amount = Math.max(reelHeight * 0.92, window.innerHeight * 0.9, 650);

    if (typeof scrollParent.scrollBy === "function") {
      scrollParent.scrollBy({
        top: amount,
        behavior: "smooth"
      });
    } else {
      scrollParent.scrollTop += amount;
    }

    log("Scrolled to next reel");

    setTimeout(() => {
      refreshActiveVideo(true);
    }, 700);
  }

  function handleVideoEnd(reason) {
    if (!enabled || isHandlingEnd || document.hidden) return;

    isHandlingEnd = true;
    log(`Video ${reason}. Moving to next reel...`);
    moveToNextReel();

    setTimeout(() => {
      isHandlingEnd = false;
    }, END_COOLDOWN_MS);
  }

  function onEnded() {
    handleVideoEnd("ended");
  }

  function onTimeUpdate(event) {
    const video = event.currentTarget;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const remaining = video.duration - video.currentTime;
    if (remaining <= NEAR_END_THRESHOLD_SECONDS) {
      handleVideoEnd("near-end");
    }
  }

  function attachToVideo(video, force = false) {
    if (!video) return;

    const newKey = getVideoKey(video);

    if (!force && currentVideo === video && lastVideoKey === newKey) {
      return;
    }

    if (currentVideo) {
      currentVideo.removeEventListener("ended", onEnded);
      currentVideo.removeEventListener("timeupdate", onTimeUpdate);
    }

    currentVideo = video;
    lastVideoKey = newKey;
    currentVideo.addEventListener("ended", onEnded);
    currentVideo.addEventListener("timeupdate", onTimeUpdate);

    log("Attached to active video:", lastVideoKey);
  }

  function refreshActiveVideo(force = false) {
    if (!enabled) return;

    const visibleVideo = getVisibleVideo();
    if (!visibleVideo) return;

    const newKey = getVideoKey(visibleVideo);

    if (force || newKey !== lastVideoKey) {
      attachToVideo(visibleVideo, true);
    }
  }

  function scheduleRefreshActiveVideo(force = false) {
    if (force) {
      refreshActiveVideo(true);
      return;
    }

    if (refreshScheduled) return;
    refreshScheduled = true;

    requestAnimationFrame(() => {
      refreshScheduled = false;
      refreshActiveVideo();
    });
  }

  function start() {
    if (enabled) return;
    enabled = true;

    if (!observer) {
      observer = new MutationObserver(() => {
        scheduleRefreshActiveVideo();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    if (!attachInterval) {
      attachInterval = setInterval(() => {
        refreshActiveVideo();
      }, 1000);
    }

    refreshActiveVideo(true);
    log("Started");
  }

  function stop() {
    enabled = false;

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (attachInterval) {
      clearInterval(attachInterval);
      attachInterval = null;
    }

    if (currentVideo) {
      currentVideo.removeEventListener("ended", onEnded);
      currentVideo.removeEventListener("timeupdate", onTimeUpdate);
    }

    currentVideo = null;
    lastVideoKey = null;
    isHandlingEnd = false;

    log("Stopped");
  }

  chrome.storage.sync.get(["igAutoNextEnabled"], (result) => {
    if (result.igAutoNextEnabled) {
      start();
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== "IG_AUTO_NEXT_TOGGLE") return;

    if (message.enabled) {
      start();
    } else {
      stop();
    }

    sendResponse({ ok: true, enabled });
  });
})();
