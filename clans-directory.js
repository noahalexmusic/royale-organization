
(function () {
  "use strict";

  var CLANS = {
    crownbound: "GRU222VR",
    mojo: "J82QJ2QY",
    mk: "JY298RRC",
    lia: "JYPLU0QV"
  };

  var status = document.getElementById("clans-live-status");
  var completed = 0;
  var successful = 0;
  var total = Object.keys(CLANS).length;

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

  function updateClan(id, data) {
    var card = document.querySelector(
      '[data-clan="' + id + '"]'
    );

    if (!card) return;

    var fields = {
      members: fmt(data.members),
      score: fmt(data.clanScore),
      war: fmt(data.clanWarTrophies),
      required: fmt(data.requiredTrophies),
      type: prettyType(data.type)
    };

    Object.keys(fields).forEach(function (field) {
      var element = card.querySelector(
        '[data-clan-field="' + field + '"]'
      );

      if (element) {
        element.textContent = fields[field];
      }
    });
  }

  function finish() {
    completed++;

    if (completed !== total || !status) return;

    if (successful === total) {
      status.textContent =
        "Live Clash Royale statistics loaded successfully.";
    } else if (successful > 0) {
      status.textContent =
        "Some clan statistics are temporarily unavailable.";
    } else {
      status.textContent =
        "Live clan statistics are currently unavailable.";
    }
  }

  Object.keys(CLANS).forEach(function (id) {
    var tag = CLANS[id];

    fetch("/api/clan?tag=" + encodeURIComponent(tag), {
      cache: "no-store"
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        updateClan(id, data);
        successful++;
      })
      .catch(function (error) {
        console.error(
          "Failed to load clan " + id + ":",
          error
        );
      })
      .then(finish);
  });
})();
