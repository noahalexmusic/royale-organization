(function () {
  "use strict";

  var CLASH_LINK = "https://link.clashroyale.com/deck/en?deck=";

  var decks = [
    {
      "name": "Hunter — Ice Bow",
      "creator": "Hunter",
      "category": "CONTROL",
      "label": "Creator-inspired · unverified",
      "description": "A recognizable Ice Bow archetype associated with Hunter. This lineup is illustrative, not a verified November most-used deck.",
      "strategy": "Review the eight cards and adapt to the current balance changes. The exact current-season usage ranking has not been verified.",
      "cards": [
        "X-Bow",
        "Ice Wizard",
        "Tesla",
        "Knight",
        "Skeletons",
        "Tornado",
        "Rocket",
        "The Log"
      ],
      "verifiedMostUsed": false
    },
    {
      "name": "Ryley — Log Bait",
      "creator": "Ryley",
      "category": "BAIT",
      "label": "Creator-inspired · unverified",
      "description": "A recognizable Log Bait archetype associated with Ryley. This lineup is illustrative, not a verified November most-used deck.",
      "strategy": "Review the eight cards and adapt to the current balance changes. The exact current-season usage ranking has not been verified.",
      "cards": [
        "Goblin Barrel",
        "Princess",
        "Mighty Miner",
        "Tesla",
        "Skeletons",
        "Ice Spirit",
        "Rocket",
        "The Log"
      ],
      "verifiedMostUsed": false
    },
    {
      "name": "Jynxzi — Giant Graveyard",
      "creator": "Jynxzi",
      "category": "BEATDOWN",
      "label": "Creator-inspired · unverified",
      "description": "A recognizable Giant Graveyard archetype associated with Jynxzi. This lineup is illustrative, not a verified November most-used deck.",
      "strategy": "Review the eight cards and adapt to the current balance changes. The exact current-season usage ranking has not been verified.",
      "cards": [
        "Giant",
        "Graveyard",
        "Witch",
        "Bowler",
        "Zappies",
        "Guards",
        "Arrows",
        "Giant Snowball"
      ],
      "verifiedMostUsed": false
    },
    {
      "name": "Yerson — Hog 2.6",
      "creator": "Yerson",
      "category": "CYCLE",
      "label": "Creator-inspired · unverified",
      "description": "A recognizable Hog 2.6 archetype associated with Yerson. This lineup is illustrative, not a verified November most-used deck.",
      "strategy": "Review the eight cards and adapt to the current balance changes. The exact current-season usage ranking has not been verified.",
      "cards": [
        "Hog Rider",
        "Musketeer",
        "Ice Golem",
        "Cannon",
        "Skeletons",
        "Ice Spirit",
        "Fireball",
        "The Log"
      ],
      "verifiedMostUsed": false
    },
    {
      "name": "Eragon — X-Bow Cycle",
      "creator": "Eragon",
      "category": "CONTROL",
      "label": "Creator-inspired · unverified",
      "description": "A recognizable X-Bow Cycle archetype associated with Eragon. This lineup is illustrative, not a verified November most-used deck.",
      "strategy": "Review the eight cards and adapt to the current balance changes. The exact current-season usage ranking has not been verified.",
      "cards": [
        "X-Bow",
        "Tesla",
        "Knight",
        "Archers",
        "Skeletons",
        "Electro Spirit",
        "Fireball",
        "The Log"
      ],
      "verifiedMostUsed": false
    },
    {
      "name": "Surgical Goblin — Bridge Spam",
      "creator": "Surgical Goblin",
      "category": "BRIDGE",
      "label": "Creator-inspired · unverified",
      "description": "A recognizable Bridge Spam archetype associated with Surgical Goblin. This lineup is illustrative, not a verified November most-used deck.",
      "strategy": "Review the eight cards and adapt to the current balance changes. The exact current-season usage ranking has not been verified.",
      "cards": [
        "P.E.K.K.A",
        "Battle Ram",
        "Bandit",
        "Royal Ghost",
        "Electro Wizard",
        "Magic Archer",
        "Poison",
        "Zap"
      ],
      "verifiedMostUsed": false
    }
  ];
  var seasonLabel = "November 2026";

  var cards = [];
  var cardMap = {};
  var activeFilter = "ALL";
  var query = "";

  function $(id) {
    return document.getElementById(id);
  }

  function safe(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function key(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "");
  }

  function buildCardMap(list) {
    cardMap = {};
    cards = list.slice();

    cards.forEach(function (card) {
      if (!card || !card.n) return;
      cardMap[key(card.n)] = card;
    });
  }

  function resolveCard(name) {
    var direct = cardMap[key(name)];
    if (direct) return direct;

    var wanted = key(name);
    return cards.find(function (card) {
      var candidate = key(card.n);
      return candidate.indexOf(wanted) !== -1 ||
        wanted.indexOf(candidate) !== -1;
    }) || null;
  }

  function resolvedDeck(deck) {
    return deck.cards.map(resolveCard);
  }

  function deckIds(deck) {
    var resolved = resolvedDeck(deck);
    if (resolved.some(function (card) { return !card; })) return [];
    return resolved.map(function (card) { return Number(card.id); });
  }

  function averageElixir(deck) {
    var resolved = resolvedDeck(deck);
    if (!resolved.length || resolved.some(function (card) {
      return !card || !Number.isFinite(Number(card.e));
    })) return "—";

    var total = resolved.reduce(function (sum, card) {
      return sum + Number(card.e);
    }, 0);

    return (total / resolved.length).toFixed(1);
  }

  function clashUrl(deck) {
    var ids = deckIds(deck);
    return ids.length === 8 ? CLASH_LINK + ids.join(";") : "";
  }

  function builderUrl(deck) {
    var ids = deckIds(deck);
    return ids.length === 8
      ? "deck-builder.html?deck=" + ids.join(";")
      : "deck-builder.html";
  }

  function cardHTML(name) {
    var card = resolveCard(name);

    if (!card) {
      return '<li class="pro-deck-card missing">' +
        '<div class="pro-deck-card-placeholder" aria-hidden="true">?</div>' +
        '<span>' + safe(name) + '</span>' +
      '</li>';
    }

    return '<li class="pro-deck-card">' +
      '<div class="pro-deck-card-art">' +
        (card.i ? '<img src="' + safe(card.i) + '" alt="" loading="lazy">' : "") +
        '<span class="pro-deck-elixir" aria-label="' + safe(card.e) + ' elixir">' + safe(card.e) + '</span>' +
      '</div>' +
      '<span>' + safe(card.n) + '</span>' +
    '</li>';
  }

  function deckHTML(deck, index) {
    var url = clashUrl(deck);
    var ready = Boolean(url);
    var cardsHTML = deck.cards.map(cardHTML).join("");
    var externalOnly = deck.cards.length !== 8;

    return '<article class="pro-deck-panel" data-category="' + safe(deck.category) + '">' +
      '<div class="pro-deck-panel-head">' +
        '<div>' +
          '<span class="label">' + safe(deck.label) + '</span>' +
          '<h3>' + safe(deck.name) + '</h3>' +
        '</div>' +
        '<div class="pro-deck-cost"><strong>' + safe(averageElixir(deck)) + '</strong><span>Avg elixir</span></div>' +
      '</div>' +
      '<p class="pro-deck-description">' + safe(deck.description) + '</p>' +
      (externalOnly ? '<p class="pro-deck-description">Verified current-season deck data is pending.</p>' : '<ul class="pro-deck-cards" aria-label="' + safe(deck.name) + ' cards">' + cardsHTML + '</ul>') +
      '<div class="pro-deck-strategy"><strong>Game plan</strong><p>' + safe(deck.strategy) + '</p></div>' +
      '<div class="pro-deck-actions">' +
        (externalOnly && deck.source ? '<a class="btn btn-primary btn-sm" href="' + safe(deck.source) + '" target="_blank" rel="noopener noreferrer">View Tracker</a>' : '') +
        (ready
          ? '<a class="btn btn-primary btn-sm" href="' + safe(url) + '" target="_blank" rel="noopener noreferrer">Open in Clash Royale</a>'
          : '<button class="btn btn-primary btn-sm" type="button" disabled>Deck Link Loading</button>') +
        '<button class="btn btn-outline btn-sm copy-deck-btn" type="button" data-deck-index="' + index + '"' +
          (ready ? "" : " disabled") + '>Copy Deck Link</button>' +
        '<a class="btn btn-outline btn-sm" href="' + safe(builderUrl(deck)) + '">Edit in Builder</a>' +
      '</div>' +
    '</article>';
  }

  function matches(deck) {
    if (activeFilter !== "ALL" && deck.category !== activeFilter) return false;
    if (!query) return true;

    var haystack = [
      deck.name,
      deck.label,
      deck.description,
      deck.strategy,
      deck.creator
    ].concat(deck.cards).join(" ").toLowerCase();

    return haystack.indexOf(query) !== -1;
  }

  function render() {
    var grid = $("proDeckGrid");
    if (!grid) return;

    var visible = [];
    decks.forEach(function (deck, index) {
      if (matches(deck)) visible.push({ deck: deck, index: index });
    });

    grid.innerHTML = visible.map(function (item) {
      return deckHTML(item.deck, item.index);
    }).join("");

    $("deckCount").textContent =
      visible.length + (visible.length === 1 ? " deck" : " decks");

    $("deckEmpty").hidden = visible.length !== 0;
  }

  function toast(message) {
    var element = $("deckToast");
    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      element.classList.remove("show");
    }, 2200);
  }

  function copyDeck(index) {
    var deck = decks[index];
    if (!deck) return;

    var url = clashUrl(deck);
    if (!url) {
      toast("Deck link is still loading.");
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        toast(deck.name + " link copied.");
      }).catch(function () {
        window.prompt("Copy this deck link:", url);
      });
    } else {
      window.prompt("Copy this deck link:", url);
    }
  }

  function setupControls() {
    var filters = document.querySelectorAll("[data-deck-filter]");

    filters.forEach(function (button) {
      button.addEventListener("click", function () {
        activeFilter = button.dataset.deckFilter || "ALL";

        filters.forEach(function (item) {
          var selected = item === button;
          item.classList.toggle("active", selected);
          item.setAttribute("aria-pressed", String(selected));
        });

        render();
      });
    });

    $("deckSearch").addEventListener("input", function () {
      query = this.value.trim().toLowerCase();
      render();
    });

    document.addEventListener("click", function (event) {
      var button = event.target.closest(".copy-deck-btn");
      if (!button) return;
      copyDeck(Number(button.dataset.deckIndex));
    });
  }

  function loadSeasonDecks() {
    return fetch("/creator-decks-season.json", { cache: "no-store" })
      .then(function (response) { if (!response.ok) throw new Error("No seasonal data"); return response.json(); })
      .then(function (data) {
        if (!data || !Array.isArray(data.decks) || !data.decks.length) return;
        seasonLabel = String(data.season || seasonLabel);
        decks = data.decks.filter(function (item) {
          return item && Array.isArray(item.cards) && item.name;
        });
        var label = $("seasonLabel");
        if (label) label.textContent = seasonLabel + " · " + (data.status || "Curated creator decks");
        render();
      }).catch(function () {});
  }

  function loadCards() {
    render();

    fetch("/api/cards?v=2", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Card API " + response.status);
        return response.json();
      })
      .then(function (data) {
        var list = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.items) ? data.items : []);

        if (!list.length) throw new Error("No cards returned");

        buildCardMap(list);
        $("deckDataStatus").textContent =
          "Live card data loaded • " + list.length + " cards available";
        render();
      })
      .catch(function () {
        $("deckDataStatus").textContent =
          "Live card data unavailable • deck names and strategy still available";
        render();
      });
  }

  setupControls();
  loadSeasonDecks();
  loadCards();
})();
