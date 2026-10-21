(function () {
  var cfg = window.PV_CONFIG || {};
  var params = new URLSearchParams(location.search);
  var embedded = window.self !== window.top || params.get("pv") === "frame";
  if (embedded) document.documentElement.classList.add("pv-embedded");
  var html = document.documentElement;

  // Fixed elements are placed against the window, not the page, so the room the page keeps for the tray
  // doesn't reach them: pull each one that runs under the tray clear of it (a full-width header gets
  // narrower, a corner button moves over). Measured afresh whenever the page changes or resizes.
  var fitted = [];
  function keep(el, prop, value) {
    fitted.push({ el: el, prop: prop, value: el.style.getPropertyValue(prop), priority: el.style.getPropertyPriority(prop) });
    el.style.setProperty(prop, value, "important");
  }
  function fitFixed() {
    fitted.forEach(function (f) { if (f.value) f.el.style.setProperty(f.prop, f.value, f.priority); else f.el.style.removeProperty(f.prop); });
    fitted = [];
    var bar = document.querySelector("body > .pv-bar");
    if (!bar || embedded || html.classList.contains("pv-embedded")) return;
    var t = bar.getBoundingClientRect();
    if (!t.width || !t.height) return;
    var side = t.height >= innerHeight - 1 ? "right" : "bottom";
    var room = side === "right" ? t.width : t.height;
    var limit = (side === "right" ? innerWidth : innerHeight) - room;
    var all = document.body.getElementsByTagName("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (bar.contains(el) || el.closest(".pv-frame, dialog")) continue;
      var cs = getComputedStyle(el);
      if (cs.position !== "fixed") continue;
      var r = el.getBoundingClientRect();
      var start = side === "right" ? r.left : r.top, end = side === "right" ? r.right : r.bottom;
      // Nothing to do when it's clear of the tray, hidden, or parked off-screen (a closed slide-in menu).
      if (!r.width || !r.height || end <= limit + 0.5 || start >= limit) continue;
      var span = side === "right" ? "width" : "height";
      keep(el, side, ((parseFloat(cs[side]) || 0) + room) + "px");
      // A full-width bar sized with width:100% ignores "right": cap its size too.
      if (r[span] > limit / 2) keep(el, "max-" + span, Math.max(0, limit - Math.max(0, start)) + "px");
    }
  }
  var fitQueued = 0;
  function queueFit() { if (!fitQueued) fitQueued = requestAnimationFrame(function () { fitQueued = 0; fitFixed(); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fitFixed); else fitFixed();
  window.addEventListener("load", queueFit);
  window.addEventListener("resize", queueFit);
  document.addEventListener("transitionend", queueFit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);
  // A header that turns fixed once scrolled, a menu that opens, the checks removing the tray.
  new MutationObserver(queueFit).observe(html, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden", "open"] });

  // Generated images are illustrative stand-ins: say so on each one, without touching the page's layout.
  // (Left off in automated checks, which judge the design itself.)
  function markIllustrative() {
    if (navigator.webdriver) return;
    document.querySelectorAll(".pv-illustrative").forEach(function (b) { b.remove(); });
    document.querySelectorAll('img[data-provenance="generated"]').forEach(function (img) {
      var r = img.getBoundingClientRect();
      if (r.width < 60 || r.height < 40) return;
      var b = document.createElement("span");
      b.className = "pv-illustrative";
      b.textContent = "Illustrative image";
      b.style.left = (r.left + window.scrollX + 10) + "px";
      b.style.top = (r.top + window.scrollY + 10) + "px";
      document.body.appendChild(b);
    });
  }
  window.addEventListener("load", markIllustrative);
  window.addEventListener("resize", markIllustrative);

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }

  // Structure preview: greyscale, no imagery. Remembered for this visit.
  var structure = params.get("structure") === "1";
  try { structure = structure || sessionStorage.getItem("pv-structure") === "1"; } catch (e) {}
  if (params.get("structure") === "0") structure = false;
  function setStructure(on) {
    structure = on; document.documentElement.classList.toggle("structure", on);
    try { sessionStorage.setItem("pv-structure", on ? "1" : "0"); } catch (e) {}
    var b = document.getElementById("pv-structure"); if (b) b.setAttribute("aria-pressed", String(on));
  }
  setStructure(structure);

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-unbuilt]");
    if (a) { e.preventDefault(); toast("That page isn't part of this concept round."); }
  });
  document.querySelectorAll("form[data-demo]").forEach(function (f) {
    f.addEventListener("submit", function (e) { e.preventDefault(); toast("Forms are for show in the concept."); });
  });
  var menu = document.querySelector(".menu-btn");
  if (menu) menu.addEventListener("click", function () {
    var nav = document.getElementById(menu.getAttribute("aria-controls"));
    var open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open)); if (nav) nav.classList.toggle("open", open);
  });

  // The page list: opens beside the tray, closes on Escape or a click elsewhere.
  var pagesBtn = document.getElementById("pv-pages");
  var pagesMenu = document.getElementById("pv-pages-menu");
  function setPages(open, refocus) {
    if (!pagesBtn || !pagesMenu) return;
    pagesBtn.setAttribute("aria-expanded", String(open)); pagesMenu.hidden = !open;
    if (open) { var cur = pagesMenu.querySelector("[aria-current]") || pagesMenu.querySelector("a"); if (cur) { cur.scrollIntoView({ block: "nearest" }); cur.focus(); } }
    else if (refocus) pagesBtn.focus();
  }
  if (pagesBtn && pagesMenu) {
    pagesBtn.addEventListener("click", function () { setPages(pagesMenu.hidden); });
    document.addEventListener("click", function (e) { if (!pagesMenu.hidden && !pagesMenu.contains(e.target) && !pagesBtn.contains(e.target)) setPages(false); });
    pagesMenu.addEventListener("keydown", function (e) {
      var links = [].slice.call(pagesMenu.querySelectorAll("a")), i = links.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); var n = links[(i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length]; if (n) n.focus(); }
    });
  }

  // The arrow keys step through the pages, except while typing, in a menu or dialog, or on a control that uses them.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pagesMenu && !pagesMenu.hidden) { setPages(false, true); return; }
    if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable=""], [contenteditable=true], dialog, .pv-menu, [role=slider], [role=tablist], [role=tab], [role=listbox], [role=menu], [role=menubar], [role=radiogroup], [role=grid], [role=tree]')) return;
    if (document.querySelector("dialog[open]")) return;
    var a = document.querySelector('.pv-bar a[rel~="' + (e.key === "ArrowLeft" ? "prev" : "next") + '"]');
    if (!a) return;
    e.preventDefault();
    // In the phone-width frame, the whole preview moves on (and opens the next page in the frame again).
    try { if (embedded && window.top !== window.self) { window.top.location.href = a.href; return; } } catch (err) {}
    location.href = a.href;
  });

  var st = document.getElementById("pv-structure");
  if (st) st.addEventListener("click", function () { setStructure(!structure); });

  // Mobile width: the page in a phone-sized frame, so its own breakpoints apply.
  var mob = document.getElementById("pv-mobile");
  function openFrame() {
    var wrap = document.createElement("div"); wrap.className = "pv-frame"; wrap.id = "pv-frame";
    var close = document.createElement("button"); close.className = "pv-btn"; close.type = "button"; close.textContent = "Back to desktop width";
    var frame = document.createElement("iframe"); frame.title = "This page at phone width";
    var u = new URL(location.href); u.searchParams.set("pv", "frame"); frame.src = u.toString();
    close.addEventListener("click", function () { wrap.remove(); mob && mob.setAttribute("aria-pressed", "false"); try { sessionStorage.setItem("pv-mobile", "0"); } catch (e) {} });
    wrap.appendChild(close); wrap.appendChild(frame); document.body.appendChild(wrap); close.focus();
    mob && mob.setAttribute("aria-pressed", "true");
    try { sessionStorage.setItem("pv-mobile", "1"); } catch (e) {}
  }
  if (mob && !embedded) {
    mob.addEventListener("click", function () { var f = document.getElementById("pv-frame"); if (f) { f.querySelector("button").click(); } else openFrame(); });
    try { if (sessionStorage.getItem("pv-mobile") === "1") openFrame(); } catch (e) {}
  }

  // Approve this version: name, optional note, sent to the agency's Blueprint.
  var ap = document.getElementById("pv-approve");
  if (ap && cfg.approveUrl) {
    ap.addEventListener("click", function () {
      var d = document.createElement("dialog"); d.className = "pv-dialog"; d.setAttribute("aria-labelledby", "pv-ap-h");
      d.innerHTML = '<form method="dialog"><h2 id="pv-ap-h">Approve version ' + cfg.version + '</h2><p>This tells ' + (cfg.agency || "your agency") + ' you approve this design concept.</p><label for="pv-ap-name">Your name</label><input id="pv-ap-name" required autocomplete="name"><label for="pv-ap-note">Note (optional)</label><textarea id="pv-ap-note" rows="3"></textarea><p id="pv-ap-msg" role="status"></p><div class="pv-row"><button type="button" value="cancel">Cancel</button><button type="submit">Approve</button></div></form>';
      document.body.appendChild(d); d.showModal();
      d.querySelector("button[value=cancel]").addEventListener("click", function () { d.close(); d.remove(); });
      d.querySelector("form").addEventListener("submit", function (e) {
        e.preventDefault();
        var name = d.querySelector("#pv-ap-name").value.trim(); if (!name) return;
        var msg = d.querySelector("#pv-ap-msg"); msg.textContent = "Sending…";
        fetch(cfg.approveUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: cfg.token, version: cfg.version, name: name, note: d.querySelector("#pv-ap-note").value }) })
          .then(function (r) { if (!r.ok) throw new Error(); msg.textContent = "Thank you. Your approval of version " + cfg.version + " is recorded."; d.querySelector("button[type=submit]").remove(); })
          .catch(function () { msg.textContent = "That didn't go through. Please let " + (cfg.agency || "your agency") + " know directly."; });
      });
    });
  } else if (ap) { ap.remove(); }

  // The agency's feedback widget, tagged with this concept version.
  if (cfg.feedback && cfg.feedback.loader && cfg.feedback.siteKey && !embedded) {
    var s = document.createElement("script"); s.async = true; s.src = cfg.feedback.loader; s.setAttribute("data-site-key", cfg.feedback.siteKey);
    s.onload = function () { if (window.LFTFeedback && window.LFTFeedback.setMetadata) window.LFTFeedback.setMetadata({ deploymentId: cfg.deploymentId, environment: "blueprint-concept", page: cfg.page }); };
    document.head.appendChild(s);
  }
})();
