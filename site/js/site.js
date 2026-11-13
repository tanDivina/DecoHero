// DecoHero landing: promo video control and the Android waitlist form (Hero Inbox). No tracking.
(function () {
  "use strict";

  // ---- promo video: plays muted while visible, never for visitors who asked for reduced motion ----
  var video = document.getElementById("promo");
  var toggle = document.getElementById("promo-toggle");
  if (video && toggle) {
    var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var userPaused = calm;
    video.controls = false;
    toggle.hidden = false;
    var label = function () {
      toggle.textContent = video.paused ? toggle.dataset.play : toggle.dataset.pause;
    };
    var play = function () {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    };
    toggle.addEventListener("click", function () {
      if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
    });
    video.addEventListener("play", label);
    video.addEventListener("pause", label);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !userPaused) play();
          else if (!e.isIntersecting) video.pause();
        });
      }, { threshold: 0.35 }).observe(video);
    } else if (!userPaused) {
      play();
    }
    label();
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
