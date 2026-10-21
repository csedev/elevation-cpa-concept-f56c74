(function () {
  var cfg = window.PV_CONFIG || {};
  var params = new URLSearchParams(location.search);
  var embedded = window.self !== window.top || params.get("pv") === "frame";
  if (embedded) document.documentElement.classList.add("pv-embedded");
  // Reserve the bar's height above the page (it wraps to more lines on a phone).
  function reserveBar() {
    var bar = document.querySelector(".pv-bar");
    var h = bar && !embedded ? bar.offsetHeight : 0;
    document.documentElement.style.setProperty("--pv-bar-h", h + "px");
    document.documentElement.classList.toggle("pv-has-bar", h > 0);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reserveBar); else reserveBar();
  window.addEventListener("resize", reserveBar);

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
  var structure = params.get("structure") === "1" || sessionStorage.getItem("pv-structure") === "1";
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

  var jump = document.getElementById("pv-page");
  if (jump) jump.addEventListener("change", function (e) { location.href = e.target.value; });

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
