(function () {
  "use strict";

  var clans = [
    { tag: "GRU222VR", key: "crownbound" },
    { tag: "J82QJ2QY", key: "mojo" },
    { tag: "JY298RRC", key: "mk" },
    { tag: "8PRRGLP8C", key: "lia" }
  ];

  function fmt(value) {
    return typeof value === "number" ? value.toLocaleString("en-US") : "—";
  }

  function setText(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setClanField(key, field, value) {
    var element = document.querySelector(
      '[data-home-clan="' + key + '"] [data-home-field="' + field + '"]'
    );
    if (element) element.textContent = value;
  }

  function loadClan(clan) {
    return fetch("/api/clan?tag=" + encodeURIComponent(clan.tag), {
      cache: "no-store"
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Clan API " + response.status);
        return response.json();
      })
      .then(function (data) {
        setClanField(clan.key, "members", fmt(data.members) + "/50");
        setClanField(clan.key, "required", fmt(data.requiredTrophies));
        return typeof data.members === "number" ? data.members : 0;
      })
      .catch(function () {
        return 0;
      });
  }

  Promise.all(clans.map(loadClan)).then(function (members) {
    var total = members.reduce(function (sum, value) { return sum + value; }, 0);
    setText("homeOfficialClans", String(clans.length));
    setText("homeLiveMembers", total ? fmt(total) : "Live");
  });

  var tournament = window.ROYALE_TOURNAMENT || {};
  setText("homeTournamentName", tournament.name || "Next Royale Championship");
  setText("homeTournamentPrize", tournament.prize || "To be announced");
  setText("homeTournamentFormat", tournament.format || "To be announced");

  if (tournament.dateISO) {
    var eventDate = new Date(tournament.dateISO);
    setText("homeTournamentDate", eventDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }));
    setText(
      "homeTournamentStatus",
      tournament.registrationOpen ? "Registration open" : "Event announced"
    );
  } else {
    setText("homeTournamentDate", "To be announced");
    setText("homeTournamentStatus", "Awaiting announcement");
  }
})();
