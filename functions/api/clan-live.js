(function () {
  var tag = window.CLAN_TAG;
  if (!tag) return;
  var ROLES = { leader: "Leader", coLeader: "Co-leader", elder: "Elder", member: "Member" };
  var fmt = function (n) { return typeof n === "number" ? n.toLocaleString("en-US") : "—"; };
  var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };

  fetch("/api/clan?tag=" + encodeURIComponent(tag))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      set("member-count", fmt(d.members));
      set("clan-score", fmt(d.clanScore));
      set("clan-trophies", fmt(d.clanWarTrophies));
      var box = document.querySelector(".roster");
      var empty = box && box.querySelector(".roster-empty");
      if (!box || !d.memberList || !d.memberList.length) return;
      if (empty) empty.remove();
      d.memberList.forEach(function (m) {
        var row = document.createElement("div");
        row.className = "roster-row";
        [m.name, ROLES[m.role] || m.role, fmt(m.trophies)].forEach(function (t) {
          var s = document.createElement("span"); s.textContent = t; row.appendChild(s);
        });
        var a = document.createElement("a");
        a.href = "https://royaleapi.com/player/" + String(m.tag || "").replace("#", "");
        a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "View";
        var cell = document.createElement("span"); cell.appendChild(a); row.appendChild(cell);
        box.appendChild(row);
      });
    })
    .catch(function () {
      var n = document.querySelector("[data-live-note]");
      if (n) n.textContent = "Live stats are unavailable right now. Please check back soon.";
      var e = document.querySelector(".roster-empty");
      if (e) e.textContent = "Roster unavailable right now.";
    });
})();