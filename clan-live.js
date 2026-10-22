(function () {
  "use strict";

  var tag = window.CLAN_TAG;
  if (!tag) return;

  var ROLES = {
    leader: "Leader",
    coLeader: "Co-leader",
    elder: "Elder",
    member: "Member"
  };

  function fmt(value) {
    return typeof value === "number"
      ? value.toLocaleString("en-US")
      : "—";
  }

  function prettyType(value) {
    var types = {
      open: "Open",
      inviteOnly: "Invite only",
      closed: "Closed"
    };
    return types[value] || "—";
  }

  function set(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function renderRoster(members) {
    var box = document.querySelector(".roster");
    var empty = box && box.querySelector(".roster-empty");

    if (!box) return;

    if (!Array.isArray(members) || !members.length) {
      if (empty) empty.textContent = "No roster data is available right now.";
      return;
    }

    if (empty) empty.remove();

    members.forEach(function (member, index) {
      var row = document.createElement("div");
      row.className = "roster-row";

      var player = document.createElement("span");
      player.className = "roster-player";
      var rank = document.createElement("small");
      rank.textContent = "#" + (index + 1);
      var name = document.createElement("strong");
      name.textContent = member.name || "Unknown player";
      player.appendChild(rank);
      player.appendChild(name);

      var role = document.createElement("span");
      role.className = "roster-role";
      role.textContent = ROLES[member.role] || member.role || "Member";

      var trophies = document.createElement("span");
      trophies.className = "roster-trophies";
      trophies.textContent = fmt(member.trophies);

      var profile = document.createElement("span");
      profile.className = "roster-profile";

      var link = document.createElement("a");
      link.className = "roster-profile-link";
      link.href = "https://royaleapi.com/player/" +
        String(member.tag || "").replace("#", "");
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View";
      profile.appendChild(link);

      row.appendChild(player);
      row.appendChild(role);
      row.appendChild(trophies);
      row.appendChild(profile);
      box.appendChild(row);
    });
  }

  fetch("/api/clan?tag=" + encodeURIComponent(tag), {
    cache: "no-store"
  })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      set("member-count", fmt(data.members) + " / 50");
      set("clan-score", fmt(data.clanScore));
      set("clan-trophies", fmt(data.clanWarTrophies));
      set("required-trophies", fmt(data.requiredTrophies));
      set("clan-type", prettyType(data.type));
      set("clan-location", data.location || "International");

      renderRoster(data.memberList);

      var note = document.querySelector("[data-live-note]");
      if (note) {
        note.textContent = "Live Clash Royale clan data loaded successfully.";
        note.classList.add("live-ok");
      }
    })
    .catch(function () {
      var note = document.querySelector("[data-live-note]");
      if (note) {
        note.textContent =
          "Live stats are unavailable right now. Please check back soon.";
      }

      var empty = document.querySelector(".roster-empty");
      if (empty) empty.textContent = "Roster unavailable right now.";
    });
})();
