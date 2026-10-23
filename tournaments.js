(function () {
  "use strict";

  // Shared event data lives in tournament-data.js so the homepage and
  // tournament hub always show the same confirmed information.
  var tournament = window.ROYALE_TOURNAMENT || {
    name: "Next Royale Championship",
    dateISO: "",
    entry: "To be announced",
    prize: "To be announced",
    format: "To be announced",
    registrationOpen: false
  };

  function set(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  set("event-name", tournament.name);
  set("event-entry", tournament.entry);
  set("event-prize", tournament.prize);
  set("event-format", tournament.format);

  var registerButton = document.getElementById("tournament-register-btn");
  var status = document.getElementById("event-status");
  var countdown = document.getElementById("tournament-countdown");

  if (!tournament.dateISO) {
    set("event-date", "To be announced");
    set("event-status", "Awaiting announcement");
    if (countdown) {
      countdown.innerHTML =
        '<div class="countdown-tba"><strong>Next event loading...</strong><span>Date and registration details will appear here once they are confirmed.</span></div>';
    }
    if (registerButton) {
      registerButton.textContent = "Registration Not Open Yet";
      registerButton.setAttribute("aria-disabled", "true");
      registerButton.classList.add("is-disabled");
    }
    return;
  }

  var eventDate = new Date(tournament.dateISO);
  set("event-date", eventDate.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }));

  function updateCountdown() {
    var remaining = eventDate.getTime() - Date.now();

    if (remaining <= 0) {
      if (countdown) {
        countdown.innerHTML =
          '<div class="countdown-tba"><strong>The arena is live.</strong><span>Check Discord for current match instructions and results.</span></div>';
      }
      if (status) status.textContent = "Event live / results pending";
      return;
    }

    var days = Math.floor(remaining / 86400000);
    var hours = Math.floor((remaining % 86400000) / 3600000);
    var minutes = Math.floor((remaining % 3600000) / 60000);
    var seconds = Math.floor((remaining % 60000) / 1000);

    if (countdown) {
      countdown.innerHTML =
        '<div><strong>' + days + '</strong><span>Days</span></div>' +
        '<div><strong>' + hours + '</strong><span>Hours</span></div>' +
        '<div><strong>' + minutes + '</strong><span>Minutes</span></div>' +
        '<div><strong>' + seconds + '</strong><span>Seconds</span></div>';
    }
  }

  if (tournament.registrationOpen) {
    set("event-status", "Registration open");
    if (registerButton) {
      registerButton.textContent = "Register in Discord";
      registerButton.removeAttribute("aria-disabled");
      registerButton.classList.remove("is-disabled");
    }
  } else {
    set("event-status", "Registration not open");
    if (registerButton) {
      registerButton.textContent = "Registration Not Open Yet";
      registerButton.setAttribute("aria-disabled", "true");
      registerButton.classList.add("is-disabled");
    }
  }

  updateCountdown();
  window.setInterval(updateCountdown, 1000);
})();
