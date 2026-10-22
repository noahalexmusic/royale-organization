(function () {
  "use strict";

  var clans = [
    { tag: "GRU222VR", key: "crownbound" },
    { tag: "J82QJ2QY", key: "mojo" },
    { tag: "JY298RRC", key: "mk" }
  ];

  function fmt(value) {
    return typeof value === "number"
      ? value.toLocaleString("en-US")
      : "—";
  }

  function prettyType(value) {
    var map = {
      open: "Open",
      inviteOnly: "Invite only",
      closed: "Closed"
    };
    return map[value] || "—";
  }

  function set(key, field, value) {
    var element = document.querySelector(
      '[data-clan="' + key + '"] [data-clan-field="' + field + '"]'
    );
    if (element) element.textContent = value;
  }

  function loadClan(clan) {
    return fetch("/api/clan?tag=" + encodeURIComponent(clan.tag), {
      cache: "no-store"
    })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        set(clan.key, "members", fmt(data.members) + "/50");
        set(clan.key, "score", fmt(data.clanScore));
        set(clan.key, "war", fmt(data.clanWarTrophies));
        set(clan.key, "required", fmt(data.requiredTrophies));
        set(clan.key, "type", prettyType(data.type));

        var card = document.querySelector('[data-clan="' + clan.key + '"]');
        if (card) card.classList.add("live-ready");
      })
      .catch(function () {
        var card = document.querySelector('[data-clan="' + clan.key + '"]');
        if (card) card.classList.add("live-unavailable");
      });
  }

  Promise.all(clans.map(loadClan)).then(function () {
    var status = document.getElementById("clans-live-status");
    if (!status) return;

    var ready = document.querySelectorAll(".clan-showcase.live-ready").length;
    status.textContent = ready
      ? "Live Clash Royale data loaded for " + ready + " of " + clans.length + " clans."
      : "Live clan data is temporarily unavailable.";
  });
})();
