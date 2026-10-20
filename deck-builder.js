(function () {
  var MAX = 8, LINK = "https://link.clashroyale.com/deck/en?deck=";
  var byId = {}; CARDS.forEach(function (c) { byId[c.id] = c; });
  var deck = [], type = "ALL", q = "";
  var $ = function (id) { return document.getElementById(id); };

  function parse(s) {
    try { s = decodeURIComponent(s); } catch (e) {}
    var m = s.match(/deck=([0-9;,]+)/), raw = m ? m[1] : s;
    var out = [];
    raw.split(/[;,\s]+/).forEach(function (x) {
      var n = Number(x);
      if (n >= 26000000 && n < 29000000 && out.indexOf(n) < 0) out.push(n);
    });
    return out.slice(0, MAX);
  }
  var p = new URLSearchParams(location.search).get("deck");
  if (p) deck = parse(p);

  function link() { return LINK + deck.join(";"); }
  function say(t) { $("msg").textContent = t; }

  function render() {
    var slots = "", sum = 0, known = 0, costs = [], unsure = false;
    for (var i = 0; i < MAX; i++) {
      var id = deck[i], c = id ? byId[id] : null;
      if (!id) { slots += '<div class="slot" aria-label="Empty slot">+</div>'; continue; }
      var name = c ? c.n : "Card #" + id;
      if (c) { sum += c.e; known++; costs.push(c.e); if (c.u) unsure = true; }
      slots += '<button class="slot filled" data-remove="' + id + '" aria-label="Remove ' + name + '">' +
        (c ? '<span class="elixir">' + c.e + '</span>' : '') + (c && c.i ? '<img src="' + c.i + '" alt="" width="48">' : '') + '<span>' + name + '</span></button>';
    }
    $("slots").innerHTML = slots;
    var full = deck.length === MAX;
    $("count").textContent = deck.length + " / " + MAX;
    $("avg").textContent = known ? (sum / known).toFixed(1) : "–";
    costs.sort(function (a, b) { return a - b; });
    $("cycle").textContent = (full && known === MAX) ? costs.slice(0, 4).reduce(function (a, b) { return a + b; }, 0) : "–";
    var open = $("openBtn");
    open.href = full ? link() : "#";
    open.setAttribute("aria-disabled", full ? "false" : "true");
    open.classList.toggle("is-disabled", !full);
    $("copyBtn").disabled = !full;
    say(unsure ? "This deck has a card whose ID I could not confirm. Open it in the game to check it's right." :
      (full ? "" : "Pick " + (MAX - deck.length) + " more card" + (MAX - deck.length === 1 ? "" : "s") + " to finish your deck."));
    history.replaceState(null, "", deck.length ? "?deck=" + deck.join(";") : location.pathname);

    var list = CARDS.filter(function (c) {
      return (type === "ALL" || c.t === type) && c.n.toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return a.e - b.e || a.n.localeCompare(b.n); });
    $("picker").innerHTML = list.map(function (c) {
      var inDeck = deck.indexOf(c.id) >= 0;
      return '<button class="tile" data-type="' + c.t + '" data-add="' + c.id + '"' +
        ((inDeck || full) ? ' disabled' : '') + '><span class="elixir">' + c.e + '</span>' + (c.i ? '<img src="' + c.i + '" alt="" loading="lazy" width="56">' : '') + c.n + (c.u ? " *" : "") + '</button>';
    }).join("") || "<p>No cards match.</p>";
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-add],[data-remove],[data-type-btn]");
    if (!t) return;
    if (t.dataset.add) { if (deck.length < MAX) deck.push(Number(t.dataset.add)); }
    else if (t.dataset.remove) { deck = deck.filter(function (x) { return x !== Number(t.dataset.remove); }); }
    else if (t.dataset.typeBtn) {
      type = t.dataset.typeBtn;
      document.querySelectorAll("[data-type-btn]").forEach(function (b) { b.setAttribute("aria-pressed", b === t); });
    }
    render();
  });
  $("search").addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); render(); });
  $("clearBtn").addEventListener("click", function () { deck = []; render(); });
  $("openBtn").addEventListener("click", function (e) { if (deck.length !== MAX) e.preventDefault(); });
  $("copyBtn").addEventListener("click", function () {
    var url = link();
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { say("Link copied."); }, function () { prompt("Copy this link:", url); });
    else prompt("Copy this link:", url);
  });
  $("impBtn").addEventListener("click", function () {
    var d = parse($("imp").value);
    if (d.length) { deck = d; $("imp").value = ""; render(); } else say("No deck found in that text. Paste a deck link from the game.");
  });
  render();
  fetch("/api/cards").then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (list) {
    if (!list || !list.length) return;
    CARDS.length = 0; list.forEach(function (c) { CARDS.push(c); });
    byId = {}; CARDS.forEach(function (c) { byId[c.id] = c; });
    var n = document.getElementById("cardnote"); if (n) n.textContent = "Card list loaded live from the official Clash Royale API.";
    render();
  }).catch(function () {});
})();