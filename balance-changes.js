(function () {
  "use strict";

  var KNOWN_OFFICIAL_URL =
    "https://supercell.com/en/games/clashroyale/blog/release-notes/october-balance-changes-2026/";

  var changes = [
    {
      name: "Cannon Cart",
      type: "NERF",
      stats: ["Damage: 212 → 202 (-5%)", "Mass: 3 → 6 (+100%)"],
      note: "Lower damage reduces its defensive pressure, while the mass change stops Goblins from pushing it around."
    },
    {
      name: "Dart Goblin",
      type: "NERF",
      stats: ["Damage: 151 → 143 (-5%)"],
      note: "A damage reduction targets Dart Goblin's strength in spell-bait decks."
    },
    {
      name: "Minion Giant",
      type: "NERF",
      stats: ["Damage: 168 → 153 (-9%)"],
      note: "Its fast offensive pressure is being reduced with another damage cut."
    },
    {
      name: "Rune Giant",
      type: "NERF",
      stats: ["Enchantment linger: 5s → 0.5s (-90%)"],
      note: "Enchantments now disappear almost immediately after Rune Giant is defeated."
    },
    {
      name: "Hero Electro Wizard",
      base: "Electro Wizard",
      variant: "HERO",
      type: "BUFF",
      stats: ["Attack delay after ability: Removed"],
      note: "The ability should feel more responsive because the post-ability attack delay is gone."
    },
    {
      name: "Electro Dragon",
      type: "BUFF",
      stats: ["First hit: 0.7s → 0.5s (-29%)"],
      note: "A faster first attack improves its defensive responsiveness."
    },
    {
      name: "Flying Machine",
      type: "BUFF",
      stats: ["Damage: 171 → 179 (+4%)"],
      note: "The ranged flying support card receives a small damage increase."
    },
    {
      name: "Void",
      type: "BUFF",
      stats: ["2–4 target damage: 296 → 307 (+3%)"],
      note: "The middle damage tier is stronger, improving key interactions against ranged troops."
    },
    {
      name: "Skeleton Barrel Evolution",
      base: "Skeleton Barrel",
      variant: "EVO",
      type: "REWORK",
      stats: ["Death damage: 192 → 163 (-15%)"],
      note: "The Evolution loses death damage as its base version is brought closer to it."
    },
    {
      name: "Skeleton Barrel",
      type: "REWORK",
      stats: ["Death damage: 145 → 163 (+12%)"],
      note: "Base Skeleton Barrel gains death damage to narrow the gap with its Evolution."
    },
    {
      name: "Skeletons",
      type: "REWORK",
      stats: ["Spawn spread: 0.4 → 0.5 tiles (+25%)"],
      note: "The wider spread makes middle-tile splits consistent."
    }
  ];

  var cardMap = {};
  var activeFilter = "ALL";

  function safe(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function typeLabel(type) {
    if (type === "NERF") return "Nerf ↓";
    if (type === "BUFF") return "Buff ↑";
    return "Rework ↻";
  }

  function artwork(change) {
    var card = cardMap[(change.base || change.name).toLowerCase()];
    if (!card) return "";

    if (change.variant === "HERO") {
      return card.heroImage || card.i || "";
    }

    if (change.variant === "EVO") {
      return card.evoImage || card.i || "";
    }

    return card.i || "";
  }

  function renderChanges() {
    var grid = document.getElementById("balanceGrid");
    if (!grid) return;

    var visible = changes.filter(function (change) {
      return activeFilter === "ALL" || change.type === activeFilter;
    });

    grid.innerHTML = visible.map(function (change) {
      var image = artwork(change);
      var stats = change.stats.map(function (stat) {
        return "<li>" + safe(stat) + "</li>";
      }).join("");

      return '<article class="balance-card balance-' +
        change.type.toLowerCase() + '">' +
        '<div class="balance-card-top">' +
          (image
            ? '<img src="' + safe(image) + '" alt="" loading="lazy">'
            : '<div class="balance-art-placeholder" aria-hidden="true">♛</div>') +
          '<div>' +
            '<span class="balance-type">' + safe(typeLabel(change.type)) + '</span>' +
            '<h3>' + safe(change.name) + '</h3>' +
          '</div>' +
        '</div>' +
        '<ul class="balance-stats">' + stats + '</ul>' +
        '<p>' + safe(change.note) + '</p>' +
      '</article>';
    }).join("");
  }

  function setupFilters() {
    var buttons = document.querySelectorAll("[data-balance-filter]");
    if (!buttons.length) return;

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        activeFilter = button.dataset.balanceFilter || "ALL";

        buttons.forEach(function (item) {
          var selected = item === button;
          item.classList.toggle("active", selected);
          item.setAttribute("aria-pressed", String(selected));
        });

        renderChanges();
      });
    });
  }

  function loadCardArt() {
    if (!document.getElementById("balanceGrid")) return;

    fetch("/api/cards?v=2", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Card API " + response.status);
        return response.json();
      })
      .then(function (data) {
        var list = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.items) ? data.items : []);

        list.forEach(function (card) {
          if (card && card.n) {
            cardMap[String(card.n).toLowerCase()] = card;
          }
        });

        renderChanges();
      })
      .catch(function () {
        renderChanges();
      });
  }

  function setText(id, value) {
    var element = document.getElementById(id);
    if (element && value) element.textContent = value;
  }

  function monitorOfficialSource() {
    fetch("/api/balance-changes", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Balance monitor " + response.status);
        return response.json();
      })
      .then(function (data) {
        if (!data || !data.url) throw new Error("Missing source");

        var isKnown = data.url === KNOWN_OFFICIAL_URL;
        var updateText = data.latestUpdateLabel
          ? "Latest gameplay update: " + data.latestUpdateLabel
          : "Latest official Supercell balance article";

        setText("officialTitle", data.title);
        setText("officialMeta", updateText);
        setText("homeBalanceTitle", data.title);
        setText("homeBalanceMeta", updateText);

        var links = [
          document.getElementById("officialLink"),
          document.getElementById("homeBalanceSource")
        ];

        links.forEach(function (link) {
          if (link) link.href = data.url;
        });

        var status = document.getElementById("officialStatus");
        if (status) {
          status.textContent = isKnown
            ? "Synced with the latest official Supercell balance article."
            : "A newer official Supercell balance article was detected.";
        }

        var alert = document.getElementById("newUpdateAlert");
        if (alert) alert.hidden = isKnown;

        var homeBadge = document.getElementById("homeBalanceBadge");
        if (homeBadge) {
          homeBadge.textContent = isKnown ? "LIVE" : "NEW UPDATE";
          homeBadge.classList.toggle("new", !isKnown);
        }
      })
      .catch(function () {
        var status = document.getElementById("officialStatus");
        if (status) {
          status.textContent =
            "Live source check unavailable. Showing the latest verified update.";
        }
        setText("homeBalanceMeta", "Latest verified update: October 19, 2026");
      });
  }

  setupFilters();
  renderChanges();
  loadCardArt();
  monitorOfficialSource();
})();
