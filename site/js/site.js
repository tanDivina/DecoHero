// DecoHero landing: before/after comparison with the Rooms / Christmas samples, and the Android waitlist form (Hero Inbox). No tracking.
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

    // ---- Rooms / Christmas: swaps the pair of pictures in the comparison. The stage keeps its size. ----
    var toggle = compare.querySelector(".ba-toggle");
    if (toggle) {
      var buttons = toggle.querySelectorAll("button");
      var imgs = compare.querySelectorAll(".ba-pane img");
      var afterTag = compare.querySelector(".ba-tag-after");
      var data = compare.dataset;
      var pairs = {
        rooms: { before: imgs[0].getAttribute("src"), after: imgs[1].getAttribute("src"), beforeAlt: imgs[0].alt, afterAlt: imgs[1].alt, tag: afterTag.textContent },
        xmas: { before: data.xmasBefore, after: data.xmasAfter, beforeAlt: data.xmasBeforeAlt, afterAlt: data.xmasAfterAlt, tag: data.xmasTag }
      };
      var wanted = "rooms";
      var load = function (src) {
        return new Promise(function (resolve) {
          var im = new Image();
          im.onload = im.onerror = resolve;
          im.src = src;
        });
      };
      var warm = function () { load(pairs.xmas.before); load(pairs.xmas.after); };
      var show = function (name) {
        if (!pairs[name] || name === wanted) return;
        wanted = name;
        Array.prototype.forEach.call(buttons, function (b) {
          b.setAttribute("aria-pressed", b.dataset.pair === name ? "true" : "false");
        });
        var p = pairs[name];
        // Swap only once both pictures are in, so the stage never shows half a pair.
        Promise.all([load(p.before), load(p.after)]).then(function () {
          if (wanted !== name) return;
          imgs[0].src = p.before; imgs[0].alt = p.beforeAlt;
          imgs[1].src = p.after; imgs[1].alt = p.afterAlt;
          afterTag.textContent = p.tag;
          compare.classList.toggle("ba-xmas", name === "xmas");
          // The tree stands mid-picture, so start the divider left of it; the room pairs start in the middle.
          range.value = name === "xmas" ? 28 : 50;
          setPos();
        });
      };
      Array.prototype.forEach.call(buttons, function (b) {
        b.addEventListener("click", function () { show(b.dataset.pair); });
        if (b.dataset.pair === "xmas") {
          b.addEventListener("pointerenter", warm, { once: true });
          b.addEventListener("focus", warm, { once: true });
        }
      });
    }
  }

  // ---- styles: show all 12 styles on another sample room ----
  var rooms = document.getElementById("rooms");
  var grid = document.getElementById("style-grid");
  if (rooms && grid) {
    var chips = rooms.querySelectorAll(".room-chip");
    var pics = grid.querySelectorAll("img[data-style]");
    var current = 0;
    var pick = function (chip) {
      var room = chip.dataset.room;
      var turn = ++current;
      for (var i = 0; i < chips.length; i++) chips[i].setAttribute("aria-pressed", String(chips[i] === chip));
      grid.classList.add("swapping");
      // Load the new room's 12 pictures first, so tiles never flash empty, then swap them in together.
      var left = pics.length;
      var swap = function () {
        if (--left > 0 || turn !== current) return;
        for (var k = 0; k < pics.length; k++) {
          var img = pics[k];
          img.src = "/img/rooms/thumb-" + room + "-" + img.dataset.style + ".webp";
          img.alt = grid.dataset.alt.replace("{room}", chip.dataset.alt).replace("{style}", img.dataset.name);
        }
        grid.classList.remove("swapping");
      };
      for (var n = 0; n < pics.length; n++) {
        var pre = new Image();
        pre.onload = pre.onerror = swap;
        pre.src = "/img/rooms/thumb-" + room + "-" + pics[n].dataset.style + ".webp";
      }
    };
    for (var c = 0; c < chips.length; c++) {
      chips[c].addEventListener("click", function () { pick(this); });
    }
    rooms.hidden = false;
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
