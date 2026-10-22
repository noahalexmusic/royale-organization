(function () {
  "use strict";

  var CLASH_LINK = "https://link.clashroyale.com/deck/en?deck=";

  var decks = [
    {
      name: "Hog 2.6 Cycle",
      category: "CYCLE",
      label: "Classic Cycle",
      description: "Fast rotations, efficient defense, and constant Hog Rider pressure.",
      strategy: "Defend for as little elixir as possible, outcycle the opponent's Hog counter, and keep forcing single-lane pressure.",
      cards: ["Hog Rider", "Ice Golem", "Musketeer", "Skeletons", "Ice Spirit", "Cannon", "Fireball", "The Log"]
    },
    {
      name: "P.E.K.K.A Bridge Spam",
      category: "BRIDGE",
      label: "Bridge Spam",
      description: "Heavy defense that turns surviving troops into dangerous counterpushes.",
      strategy: "Use P.E.K.K.A to erase tanks, then pressure the bridge with Battle Ram, Bandit, and Royal Ghost while supporting with ranged troops.",
      cards: ["P.E.K.K.A", "Battle Ram", "Bandit", "Royal Ghost", "Electro Wizard", "Magic Archer", "Poison", "Zap"]
    },
    {
      name: "Royal Giant Cycle",
      category: "CONTROL",
      label: "Control / Cycle",
      description: "Efficient defense backed by repeat Royal Giant pressure.",
      strategy: "Use Fisherman and Hunter to break apart pushes, then place Royal Giant when you have an elixir or troop advantage.",
      cards: ["Royal Giant", "Fisherman", "Hunter", "Royal Ghost", "Skeletons", "Electro Spirit", "Fireball", "The Log"]
    },
    {
      name: "LavaLoon",
      category: "BEATDOWN",
      label: "Air Beatdown",
      description: "Build a huge aerial push with Lava Hound tanking for Balloon and support troops.",
      strategy: "Absorb pressure efficiently, start Lava Hound when safe, then stack Balloon and air support while spells clear defenders.",
      cards: ["Lava Hound", "Balloon", "Mega Minion", "Skeleton Dragons", "Tombstone", "Barbarians", "Fireball", "Arrows"]
    },
    {
      name: "Hog Exe-Nado",
      category: "CONTROL",
      label: "Control / Splash",
      description: "Executioner and Tornado control pushes while Hog Rider provides the win condition.",
      strategy: "Activate and protect your King Tower when possible, group troops with Tornado for Executioner, then counterpressure with Hog Rider.",
      cards: ["Hog Rider", "Executioner", "Valkyrie", "Goblin Cage", "Ice Spirit", "Tornado", "Rocket", "The Log"]
    },
    {
      name: "Miner Balloon",
      category: "CONTROL",
      label: "Control / Air Pressure",
      description: "Miner chip damage and Balloon pressure backed by compact defensive tools.",
      strategy: "Use Miner for safe chip and tanking, defend with Bomb Tower and Musketeer, then pair Miner with Balloon when the opponent is low on answers.",
      cards: ["Miner", "Balloon", "Musketeer", "Bomb Tower", "Skeletons", "Ice Golem", "Giant Snowball", "Fireball"]
    },
    {
      name: "Giant Graveyard",
      category: "BEATDOWN",
      label: "Beatdown / Graveyard",
      description: "A sturdy counterpush deck that lets Giant tank for Graveyard.",
      strategy: "Defend with splash and air support, place Giant in front of surviving troops, then use Graveyard and Poison once the tower is distracted.",
      cards: ["Giant", "Graveyard", "Bowler", "Baby Dragon", "Phoenix", "Tombstone", "Poison", "Arrows"]
    },
    {
      name: "Goblin Drill Cycle",
      category: "CYCLE",
      label: "Cycle / Control",
      description: "Repeated Goblin Drill pressure with quick defensive rotations.",
      strategy: "Vary Drill placements, force awkward responses with Wall Breakers, and use cheap defense to return to your pressure cards quickly.",
      cards: ["Goblin Drill", "Wall Breakers", "Valkyrie", "Firecracker", "Bomb Tower", "Skeletons", "Poison", "The Log"]
    },
    {
      name: "Mortar Bait",
      category: "BAIT",
      label: "Siege / Bait",
      description: "Mortar pressure mixed with bait cards and Miner chip damage.",
      strategy: "Force out small spells with your bait cards, protect offensive Mortars when the matchup allows it, and use Miner to finish damage.",
      cards: ["Mortar", "Skeleton Barrel", "Miner", "Cannon Cart", "Goblin Gang", "Minions", "Fireball", "Barbarian Barrel"]
    },
    {
      name: "Electro Giant",
      category: "BEATDOWN",
      label: "Beatdown / Control",
      description: "Control the board, then punish with a supported Electro Giant push.",
      strategy: "Defend first, use Tornado to maximize splash and reflected damage, then commit Electro Giant when the opponent's best counters are out of cycle.",
      cards: ["Electro Giant", "Bomber", "Phoenix", "Dark Prince", "Tornado", "Lightning", "Barbarian Barrel", "Goblin Cage"]
    }
  ];

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

    return '<article class="pro-deck-panel" data-category="' + safe(deck.category) + '">' +
      '<div class="pro-deck-panel-head">' +
        '<div>' +
          '<span class="label">' + safe(deck.label) + '</span>' +
          '<h3>' + safe(deck.name) + '</h3>' +
        '</div>' +
        '<div class="pro-deck-cost"><strong>' + safe(averageElixir(deck)) + '</strong><span>Avg elixir</span></div>' +
      '</div>' +
      '<p class="pro-deck-description">' + safe(deck.description) + '</p>' +
      '<ul class="pro-deck-cards" aria-label="' + safe(deck.name) + ' cards">' + cardsHTML + '</ul>' +
      '<div class="pro-deck-strategy"><strong>Game plan</strong><p>' + safe(deck.strategy) + '</p></div>' +
      '<div class="pro-deck-actions">' +
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
      deck.strategy
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
  loadCards();
})();
