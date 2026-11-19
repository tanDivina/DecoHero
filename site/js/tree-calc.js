// Christmas tree size calculator on the guide pages. Same rule as the app (mobile/src/treeSize.ts):
// the tallest tree is the ceiling height minus 12 in (feet) or 30 cm (metres). Full firs are about two
// thirds as wide as they are tall. Without this script the chart on the page gives the same answers.
(function () {
  "use strict";
  var box = document.querySelector(".calc");
  if (!box) return;
  var es = box.getAttribute("data-lang") === "es";
  var input = box.querySelector("#ceiling");
  var out = box.querySelector(".calc-out");
  var radios = box.querySelectorAll('input[name="unit"]');
  var FT = 30.48;
  var SOLD = [2, 3, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12];
  var RANGE = { ft: [6, 20], m: [1.8, 6] };

  function num(n, d) {
    var s = String(Number(n.toFixed(d)));
    return es ? s.replace(".", ",") : s;
  }
  function ftIn(cm) {
    var inch = Math.round(cm / 2.54);
    var f = Math.floor(inch / 12), i = inch % 12;
    return i ? f + " ft " + i + " in" : f + " ft";
  }
  function unit() {
    for (var i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].value;
    return "ft";
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function render() {
    var u = unit();
    var v = Number(String(input.value).replace(",", "."));
    out.textContent = "";
    if (!isFinite(v) || v < RANGE[u][0] || v > RANGE[u][1]) {
      out.appendChild(el("p", "calc-hint", es
        ? "Escribe una altura entre " + num(RANGE[u][0], 1) + " y " + num(RANGE[u][1], 1) + (u === "ft" ? " pies." : " m.")
        : "Enter a height from " + RANGE[u][0] + " to " + RANGE[u][1] + (u === "ft" ? " ft." : " m.")));
      return;
    }
    var ceilCm = u === "ft" ? v * FT : v * 100;
    var treeCm = u === "ft" ? ceilCm - 12 * 2.54 : ceilCm - 30;
    var sold = null;
    for (var i = SOLD.length - 1; i >= 0; i--) if (SOLD[i] * FT <= treeCm + 0.01) { sold = SOLD[i]; break; }
    var widthCm = treeCm * 2 / 3;
    var big, lines = [];
    if (u === "ft") {
      big = num(treeCm / FT, 1) + (es ? " pies" : " ft");
      lines.push(es ? "Unos " + num(treeCm / 100, 2) + " m." : "That is " + num(treeCm / 100, 2) + " m.");
    } else {
      big = num(treeCm / 100, 2) + " m";
      lines.push(es ? "Unos " + num(treeCm / FT, 1) + " pies." : "About " + num(treeCm / FT, 1) + " ft.");
    }
    if (sold) {
      lines.push(es
        ? "Si se vende en pies: uno de " + num(sold, 1) + " pies (" + num(sold * FT / 100, 2) + " m) o menos. En los rangos, como 6-7 pies, cuenta el número más alto."
        : "Buy a tree sold as " + num(sold, 1) + " ft or smaller. For a range like 6-7 ft, go by the top number.");
    }
    if (sold && sold < 4) {
      lines.push(es ? "Con este techo conviene un árbol de mesa." : "With this ceiling, a tabletop tree on a side table fits best.");
    }
    lines.push(es
      ? "Un abeto frondoso de esa altura ocupa un círculo de unos " + num(widthCm / 100, 2) + " m en el piso. Uno delgado, mucho menos."
      : "A full fir that tall needs a circle of floor about " + ftIn(widthCm) + " (" + num(widthCm / 100, 2) + " m) across. A slim tree needs much less.");
    out.appendChild(el("p", "calc-label", es ? "Árbol más alto para tu techo" : "Tallest tree for your ceiling"));
    out.appendChild(el("p", "calc-big", big));
    for (var j = 0; j < lines.length; j++) out.appendChild(el("p", "calc-line", lines[j]));
  }

  for (var r = 0; r < radios.length; r++) {
    radios[r].addEventListener("change", function () {
      // Convert what is typed into the new unit so the answer stays the same.
      var v = Number(String(input.value).replace(",", "."));
      var u = unit();
      if (isFinite(v) && v > 0) input.value = u === "m" ? (Math.round(v * 0.3048 * 100) / 100) : (Math.round(v / 0.3048 * 2) / 2);
      input.min = RANGE[u][0]; input.max = RANGE[u][1]; input.step = u === "m" ? 0.05 : 0.5;
      render();
    });
  }
  input.addEventListener("input", render);
  box.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); render(); });
  render();
})();
