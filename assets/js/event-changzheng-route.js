(function () {
  "use strict";
  var body = document.querySelector(".cz-route-body");
  if (!body) return;
  var pairs = {};
  var nodes = body.querySelectorAll("[data-id]");
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    var id = el.getAttribute("data-id");
    if (!pairs[id]) pairs[id] = [];
    pairs[id].push(el);
  }
  Object.keys(pairs).forEach(function (id) {
    var els = pairs[id];
    els.forEach(function (a) {
      a.addEventListener("mouseenter", function () {
        els.forEach(function (b) { b.classList.add("active"); });
      });
      a.addEventListener("mouseleave", function () {
        els.forEach(function (b) { b.classList.remove("active"); });
      });
    });
  });
})();
