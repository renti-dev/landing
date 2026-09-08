const form = document.getElementById("signupForm");
const contactInput = document.getElementById("contactInput");
const submitButton = document.getElementById("submitButton");
const submitButtonLabel = submitButton
  ? submitButton.querySelector("[data-submit-label]")
  : null;
const formMessage = document.getElementById("formMessage");
const defaultMessage = formMessage ? formMessage.textContent : "";
const signupSource = (form && form.dataset.source) || "rent";
const campaignGoal = (form && form.dataset.campaignGoal) || "demand_validation";
const phonePattern = /^01[016789]-?[0-9]{3,4}-?[0-9]{4}$/;
const featureInterestAliases = {
  collection: "rent_collection",
  inquiry: "tenant_inquiry_automation",
  inquery: "tenant_inquiry_automation",
  move_out_dispute: "moveout_dispute_record",
  moveout_dispute: "moveout_dispute_record",
  rent: "rent_collection",
  rent_collection: "rent_collection",
  tenant_inquiry: "tenant_inquiry_automation",
  tenant_inquiry_automation: "tenant_inquiry_automation",
  tenant_inquiry_response: "tenant_inquiry_automation",
};
let contactInputStarted = false;
let contactFormViewed = false;
let pendingContactFormEntryPoint = "scroll";
const notificationFlows = document.querySelectorAll("[data-notification-flow]");
const previewVideos = document.querySelectorAll("video[data-lazy-video]");

function normalizeFeatureInterest(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  return featureInterestAliases[normalized] || "";
}

function getSearchParam(...names) {
  const searchParams = new URLSearchParams(window.location.search);
  for (const name of names) {
    const value = searchParams.get(name);
    if (value) return value;
  }
  return "";
}

const featureInterest =
  normalizeFeatureInterest(
    getSearchParam("feature_interest", "feature", "use_case", "utm_content"),
  ) ||
  normalizeFeatureInterest(form ? form.dataset.featureInterest : "") ||
  normalizeFeatureInterest(signupSource) ||
  "unknown";

function sendAnalyticsEvent(eventName, params = {}) {
  if (typeof gtag !== "function") return;
  gtag("event", eventName, {
    campaign_goal: campaignGoal,
    feature_interest: featureInterest,
    ...params,
  });
}

function sendContactFormView(entryPoint = "scroll") {
  if (contactFormViewed) return;
  contactFormViewed = true;
  sendAnalyticsEvent("beta_contact_form_view", {
    entry_point: entryPoint,
    source: signupSource,
  });
}

function setFormMessage(type, message) {
  if (!formMessage) return;
  formMessage.className = "form-message";
  if (type) formMessage.classList.add(type);
  formMessage.textContent = message;
}

function setSubmitButtonText(message) {
  if (submitButtonLabel) {
    submitButtonLabel.textContent = message;
  } else if (submitButton) {
    submitButton.textContent = message;
  }
}

function getContactPayload(contact) {
  if (phonePattern.test(contact)) {
    return {
      method: "phone",
      phone: contact,
    };
  }

  return null;
}

function startNotificationFlow(flow) {
  if (flow.dataset.flowStarted === "true") return;
  flow.dataset.flowStarted = "true";

  const amountEl = flow.querySelector("[data-countup]");
  if (!amountEl) return;

  const target = Number(amountEl.dataset.countup || 0);
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let countFrame = 0;
  let countTimer = 0;
  let replayTimer = 0;

  function setAmount(value) {
    amountEl.textContent = Math.round(value).toLocaleString("ko-KR");
  }

  function animateAmount() {
    cancelAnimationFrame(countFrame);
    const startedAt = performance.now();
    const duration = 700;

    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setAmount(target * eased);
      if (progress < 1) countFrame = requestAnimationFrame(tick);
    }

    countFrame = requestAnimationFrame(tick);
  }

  function replay() {
    clearTimeout(countTimer);
    clearTimeout(replayTimer);
    cancelAnimationFrame(countFrame);
    setAmount(reduceMotion ? target : 0);
    flow.classList.remove("flow-running");
    void flow.offsetWidth;
    flow.classList.add("flow-running");

    if (!reduceMotion) {
      countTimer = setTimeout(animateAmount, 1000);
      replayTimer = setTimeout(replay, 3700);
    }
  }

  replay();
}

function setupNotificationFlowStart(flow) {
  const amountEl = flow.querySelector("[data-countup]");
  if (amountEl) amountEl.textContent = "0";

  if (!("IntersectionObserver" in window)) {
    startNotificationFlow(flow);
    return;
  }

  const flowObserver = new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      startNotificationFlow(flow);
      observer.disconnect();
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.28,
    },
  );

  flowObserver.observe(flow);
}

notificationFlows.forEach(setupNotificationFlowStart);

function loadPreviewVideo(video) {
  if (video.dataset.videoLoaded === "true") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const sources = video.querySelectorAll("source[data-src]");
  if (!sources.length) return;

  sources.forEach((source) => {
    source.src = source.dataset.src;
    source.removeAttribute("data-src");
  });
  video.dataset.videoLoaded = "true";
  video.load();

  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {});
  }
}

if (previewVideos.length) {
  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          loadPreviewVideo(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "320px 0px", threshold: 0.01 },
    );

    previewVideos.forEach((video) => videoObserver.observe(video));
  } else {
    previewVideos.forEach(loadPreviewVideo);
  }
}

document.querySelectorAll("[data-beta-location]").forEach((link) => {
  link.addEventListener("click", () => {
    const buttonLocation = link.dataset.betaLocation || "unknown";
    pendingContactFormEntryPoint = buttonLocation;
    sendAnalyticsEvent("beta_apply_click", {
      button_location: buttonLocation,
      source: signupSource,
    });

    // 기존 피처 페이지는 URL로 판별하고, 신규 배지는 명시된 스토어를 우선합니다.
    const href = link.getAttribute("href") || "";
    const store =
      link.dataset.store ||
      (/^https:\/\/play\.google\.com(?:\/|$)/.test(href)
        ? "google-play"
        : /^https:\/\/apps\.apple\.com(?:\/|$)/.test(href)
          ? "app-store"
          : "");
    const storeEvent =
      store === "google-play"
        ? "google_play_click"
        : store === "app-store"
          ? "app_store_click"
          : null;
    if (!storeEvent) return;

    const storeParams = {
      button_location: buttonLocation,
      source: signupSource,
    };
    sendAnalyticsEvent(storeEvent, storeParams);
    if (typeof window.trackAmplitude === "function") {
      window.trackAmplitude(storeEvent, storeParams);
    }
  });
});

if (form) {
  if ("IntersectionObserver" in window) {
    const betaObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          sendContactFormView(pendingContactFormEntryPoint);
          betaObserver.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    betaObserver.observe(form);
  } else {
    sendContactFormView("fallback");
  }
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const contact = contactInput.value.trim();

    if (!contact) {
      sendAnalyticsEvent("beta_apply_fail", {
        reason: "missing_contact",
        source: signupSource,
      });
      setFormMessage("error", "전화번호를 입력해주세요.");
      contactInput.focus();
      return;
    }

    const contactPayload = getContactPayload(contact);

    if (!contactPayload) {
      sendAnalyticsEvent("beta_apply_fail", {
        reason: "validation_error",
        source: signupSource,
      });
      setFormMessage("error", "전화번호 형식을 확인해주세요.");
      contactInput.focus();
      return;
    }

    submitButton.disabled = true;
    setSubmitButtonText("신청 중");
    setFormMessage("", "신청 정보를 전송하고 있습니다.");
    sendAnalyticsEvent("beta_apply_submit", {
      method: contactPayload.method,
      source: signupSource,
    });

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: JSON.stringify({
          phone: contactPayload.phone,
          source: signupSource,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Beta signup failed");

      form.reset();
      contactInputStarted = false;
      contactInput.disabled = true;
      submitButton.disabled = true;
      sendAnalyticsEvent("beta_apply_success", {
        method: contactPayload.method,
        source: signupSource,
      });
      sendAnalyticsEvent("generate_lead", {
        method: contactPayload.method,
        source: signupSource,
      });
      setFormMessage(
        "success",
        "베타 신청이 완료되었습니다. 안내 연락을 드리겠습니다.",
      );
    } catch (error) {
      sendAnalyticsEvent("beta_apply_fail", {
        reason: "api_error",
        source: signupSource,
      });
      setFormMessage(
        "error",
        "신청을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      if (!formMessage.classList.contains("success")) {
        submitButton.disabled = false;
        setSubmitButtonText("신청하기");
      }
    }
  });

  contactInput.addEventListener("input", () => {
    if (!contactInputStarted) {
      contactInputStarted = true;
      sendAnalyticsEvent("beta_contact_input_start", {
        field_name: "phone",
        source: signupSource,
      });
    }

    if (!formMessage.classList.contains("success")) {
      setFormMessage("", defaultMessage);
    }
  });
}
