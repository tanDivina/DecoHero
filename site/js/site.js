// DecoHero landing: before/after comparison and the Android waitlist form (Hero Inbox). No tracking.
(function () {
  "use strict";

  // ---- before/after comparison. Without this script the two pictures simply sit side by side. ----
  // A native range input does the work, so dragging, touch and the arrow keys all behave as usual.
  var compare = document.getElementById("compare");
  if (compare) {
    var stage = compare.querySelector(".ba-stage");
    var range = compare.querySelector(".ba-range");
    var handle = compare.querySelector(".ba-handle");
    var setPos = function () {
      stage.style.setProperty("--pos", range.value + "%");
      range.setAttribute("aria-valuetext", range.value + "%");
    };
    compare.classList.add("ba-on");
    range.hidden = false;
    handle.hidden = false;
    range.addEventListener("input", setPos);
    range.addEventListener("change", setPos);
    setPos();
  }

  // ---- Android waitlist -> Hero Inbox ----
  var form = document.getElementById("waitlist");
  var thanks = document.getElementById("waitlist-thanks");
  if (!form || !thanks) return;
  var msg = document.getElementById("wl-msg");
  var button = form.querySelector("button[type=submit]");
  var buttonText = button.textContent;

  function done() {
    form.hidden = true;
    thanks.hidden = false;
    thanks.focus();
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    msg.textContent = "";
    // Honeypot: people never see this field. Bots that fill it get the thank-you and nothing is sent.
    if (form.elements.company.value) { done(); return; }
    var email = form.elements.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      msg.textContent = form.dataset.invalid;
      form.elements.email.focus();
      return;
    }
    if (!window.HeroInbox) { msg.textContent = form.dataset.error; return; }
    button.disabled = true;
    button.textContent = form.dataset.sending;
    window.HeroInbox.submit({
      site: "deco.hero-apps.com",
      form: "android-waitlist",
      email: email,
      lang: form.dataset.lang
    }).then(function (ok) {
      if (ok) { done(); return; }
      throw new Error("not stored");
    }).catch(function () {
      button.disabled = false;
      button.textContent = buttonText;
      msg.textContent = form.dataset.error;
    });
  });
})();
