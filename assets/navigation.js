document.querySelectorAll("[data-site-nav]").forEach((nav) => {
  const toggle = nav.querySelector(".nav-toggle");
  const menu = nav.querySelector(".site-nav-links");
  if (!toggle || !menu) return;

  const mobile = window.matchMedia("(max-width: 780px)");
  const floatingStoreCta = document.querySelector("[data-mobile-store-cta]");
  const hero = document.querySelector("main > section");
  const heroStoreCta = hero?.querySelector(".download-store-badge");
  const download = document.getElementById("download");
  let floatingFrame = 0;

  function updateFloatingStoreCta() {
    if (!floatingStoreCta || !heroStoreCta || !download) return;
    // 상단 스토어 버튼이 고정 헤더에 가려지기 시작하면 표시합니다.
    floatingStoreCta.hidden =
      !mobile.matches ||
      heroStoreCta.getBoundingClientRect().top >= nav.getBoundingClientRect().bottom ||
      download.getBoundingClientRect().top <= window.innerHeight;
  }

  function scheduleFloatingStoreCta() {
    if (floatingFrame) return;
    floatingFrame = requestAnimationFrame(() => {
      floatingFrame = 0;
      updateFloatingStoreCta();
    });
  }

  function setOpen(open, restoreFocus = false) {
    nav.dataset.menuOpen = String(open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    updateFloatingStoreCta();
    if (restoreFocus) toggle.focus();
  }

  setOpen(false);
  nav.dataset.navReady = "true";
  toggle.hidden = false;

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(open);
    if (open) menu.querySelector("a")?.focus();
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.dataset.menuOpen === "true") {
      setOpen(false, true);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!nav.contains(event.target)) setOpen(false);
  });

  document.addEventListener("focusin", (event) => {
    if (!nav.contains(event.target)) setOpen(false);
  });

  mobile.addEventListener("change", () => setOpen(false));

  if (floatingStoreCta && heroStoreCta && download) {
    window.addEventListener("scroll", scheduleFloatingStoreCta, { passive: true });
    window.addEventListener("resize", scheduleFloatingStoreCta);
    window.addEventListener("load", scheduleFloatingStoreCta);
    if ("ResizeObserver" in window) {
      new ResizeObserver(scheduleFloatingStoreCta).observe(hero.parentElement);
    }
  }
});
