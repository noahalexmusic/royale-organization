(function () {
  "use strict";

  var MAX = 8;
  var LINK = "https://link.clashroyale.com/deck/en?deck=";
  var cards = [];
  var byId = {};
  var deck = [];

  var type = "ALL";
  var special = "";
  var rarity = "ALL";
  var elixir = "ALL";
  var query = "";

  var $ = function (id) {
    return document.getElementById(id);
  };

  var championNames = [
    "Mighty Miner", "Skeleton King", "Archer Queen",
    "Golden Knight", "Monk", "Little Prince",
    "Goblinstein", "Boss Bandit"
  ];

  function safe(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalize(raw) {
    var id = Number(raw.id);
    var name = String(raw.n || raw.name || "");
    var icons = raw.iconUrls || {};

    var cardType = raw.t || (
      id >= 28000000 ? "S" :
      id >= 27000000 ? "B" : "T"
    );

    // Overrides for cards whose current classification differs
    // from the API ID prefix.
    if (name === "Furnace" || name === "Spirit Empress" ||
        name === "Heal Spirit") {
      cardType = "T";
    }

    var evoImage = raw.evoImage ||
      raw.evolutionImage ||
      icons.evolutionMedium || "";

    var heroImage = raw.heroImage ||
      icons.heroMedium || "";

    var cardRarity = String(
      raw.r || raw.rarity ||
      (championNames.indexOf(name) !== -1 ? "champion" : "")
    ).toLowerCase();

    return {
      id: id,
      n: name,
      e: Number(raw.e != null ? raw.e : raw.elixirCost),
      t: cardType,
      i: raw.i || icons.medium || "",
      r: cardRarity,
      evoImage: evoImage,
      heroImage: heroImage,
      evo: Boolean(raw.evo || evoImage ||
        Number(raw.maxEvolutionLevel) > 0),
      hero: Boolean(raw.hero || heroImage),
      u: Boolean(raw.u)
    };
  }

  function mergeCards(list) {
    if (!Array.isArray(list)) return;

    var merged = {};

    cards.forEach(function (card) {
      merged[card.id] = card;
    });

    list.forEach(function (raw) {
      var id = Number(raw.id);
      if (!Number.isFinite(id)) return;

      var previous = merged[id] || {};
      var combined = Object.assign({}, previous, raw);

      // Preserve optional metadata if the live API omits it.
      if (!raw.r && !raw.rarity && previous.r) {
        combined.r = previous.r;
      }

      var card = normalize(combined);

      if (card.n && Number.isFinite(card.e)) {
        merged[id] = card;
      }
    });

    cards = Object.keys(merged).map(function (id) {
      return merged[id];
    });

    byId = {};
    cards.forEach(function (card) {
      byId[card.id] = card;
    });

    render();
  }

  function parseDeck(text) {
    var raw = String(text || "");

    try {
      var url = new URL(raw);
      raw = url.searchParams.get("deck") || raw;
    } catch (error) {
      var match = raw.match(/[?&]deck=([^&#]+)/);
      if (match) raw = match[1];
    }

    try {
      raw = decodeURIComponent(raw);
    } catch (error) {}

    var ids = [];

    raw.split(/[;,\s]+/).forEach(function (part) {
      var id = Number(part);

      if (
        id >= 26000000 &&
        id < 29000000 &&
        ids.indexOf(id) === -1
      ) {
        ids.push(id);
      }
    });

    return ids.slice(0, MAX);
  }

  function say(message) {
    if ($("msg")) $("msg").textContent = message;
  }

  function imageFor(card, variant) {
    if (variant === "EVO") {
      return card.evoImage || card.i;
    }
    if (variant === "HERO") {
      return card.heroImage || card.i;
    }
    return card.i;
  }

  function imageHTML(url) {
    if (!url) return "";

    return '<img src="' + safe(url) +
      '" alt="" loading="lazy">';
  }

  function deckLink() {
    return LINK + deck.map(function (item) {
      return item.id;
    }).join(";");
  }

  function renderSlots() {
    var html = "";

    for (var i = 0; i < MAX; i++) {
      var item = deck[i];

      if (!item) {
        html += '<div class="slot" aria-label="Empty slot">+</div>';
        continue;
      }

      var card = byId[item.id];
      var name = card ? card.n : "Card #" + item.id;

      if (item.variant) {
        name = item.variant + " " + name;
      }

      html += '<button class="slot filled" type="button" ' +
        'data-remove="' + i + '" ' +
        'aria-label="Remove ' + safe(name) + '">' +
        (card ? '<span class="elixir">' + card.e + '</span>' : '') +
        (card ? imageHTML(imageFor(card, item.variant)) : '') +
        '<span>' + safe(name) + '</span>' +
        '</button>';
    }

    $("slots").innerHTML = html;
  }

  function renderStats() {
    var costs = [];
    var missing = false;

    deck.forEach(function (item) {
      var card = byId[item.id];

      if (card) {
        costs.push(card.e);
      } else {
        missing = true;
      }
    });

    var full = deck.length === MAX;
    var valid = full && !missing;
    var sum = costs.reduce(function (a, b) {
      return a + b;
    }, 0);

    $("count").textContent = deck.length + " / " + MAX;

    $("avg").textContent = costs.length
      ? (sum / costs.length).toFixed(1)
      : "–";

    costs.sort(function (a, b) {
      return a - b;
    });

    $("cycle").textContent = valid
      ? costs.slice(0, 4).reduce(function (a, b) {
          return a + b;
        }, 0)
      : "–";

    $("openBtn").href = valid ? deckLink() : "#";
    $("openBtn").classList.toggle("is-disabled", !valid);
    $("openBtn").setAttribute("aria-disabled", String(!valid));
    $("copyBtn").disabled = !valid;

    if (missing) {
      say("Some deck cards are not in the loaded card list.");
    } else if (!full) {
      say("Choose " + (MAX - deck.length) + " more cards.");
    } else {
      say("");
    }
  }

  function variants() {
    if (special === "EVO") {
      return cards.filter(function (card) {
return Boolean(card.evoImage && card.evoImage.includes("/cardevolutions/"));
      }).map(function (card) {
        return { card: card, variant: "EVO" };
      });
    }

    if (special === "HERO") {
      return cards.filter(function (card) {
return Boolean(card.heroImage && card.heroImage.includes("/cardheroes/"));
      }).map(function (card) {
        return { card: card, variant: "HERO" };
      });
    }

    if (special === "CHAMPION") {
      return cards.filter(function (card) {
        return card.r === "champion";
      }).map(function (card) {
        return { card: card, variant: "" };
      });
    }

    return cards.map(function (card) {
      return { card: card, variant: "" };
    });
  }

  function renderPicker() {
    var full = deck.length >= MAX;

    var list = variants().filter(function (item) {
      var card = item.card;

      return (
        (type === "ALL" || card.t === type) &&
        (rarity === "ALL" || card.r === rarity) &&
        (elixir === "ALL" || card.e === Number(elixir)) &&
        card.n.toLowerCase().includes(query)
      );
    });

    list.sort(function (a, b) {
      return a.card.e - b.card.e ||
        a.card.n.localeCompare(b.card.n);
    });

    $("picker").innerHTML = list.map(function (item) {
      var card = item.card;
      var selected = deck.some(function (entry) {
        return entry.id === card.id;
      });

      var label = item.variant
        ? item.variant + " " + card.n
        : card.n;

      return '<button class="tile" type="button" ' +
        'data-add="' + card.id + '" ' +
        'data-variant="' + safe(item.variant) + '" ' +
        'data-type="' + safe(card.t) + '" ' +
        ((selected || full) ? 'disabled ' : '') +
        'aria-label="Add ' + safe(label) + '">' +
        '<span class="elixir">' + card.e + ' elixir</span>' +
        imageHTML(imageFor(card, item.variant)) +
        '<span>' + safe(label) + '</span>' +
        '</button>';
    }).join("") || '<p class="note">No cards match this filter.</p>';

    var status = $("loadStatus");
    if (status && cards.length) {
      status.textContent = cards.length +
        " cards loaded. Choose your cards below.";
    }
  }

  function render() {
    renderSlots();
    renderStats();
    renderPicker();

    var url = new URL(location.href);

    if (deck.length) {
      url.searchParams.set(
        "deck",
        deck.map(function (item) {
          return item.id;
        }).join(";")
      );
    } else {
      url.searchParams.delete("deck");
    }

    history.replaceState(
      null, "", url.pathname + url.search + url.hash
    );
  }

  function addCard(id, variant) {
    id = Number(id);
    variant = variant || "";

    if (!byId[id] || deck.length >= MAX) return;

    if (deck.some(function (item) {
      return item.id === id;
    })) return;

    if (variant === "EVO") {
      var evoCount = deck.filter(function (item) {
        return item.variant === "EVO";
      }).length;

      if (evoCount >= 2) {
        say("Maximum of two Evolutions.");
        return;
      }
    }

    if (variant === "HERO" && deck.some(function (item) {
      return item.variant === "HERO";
    })) {
      say("Only one Hero can be selected.");
      return;
    }

    deck.push({ id: id, variant: variant });
    render();
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest(
      "[data-add],[data-remove],[data-type-btn],[data-special-btn]"
    );

    if (!button) return;

    if (button.hasAttribute("data-add")) {
      addCard(button.dataset.add, button.dataset.variant);
      return;
    }

    if (button.hasAttribute("data-remove")) {
      deck.splice(Number(button.dataset.remove), 1);
      render();
      return;
    }

    if (button.hasAttribute("data-type-btn")) {
      type = button.dataset.typeBtn;
      special = "";

      document.querySelectorAll("[data-type-btn]")
        .forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === button));
        });

      document.querySelectorAll("[data-special-btn]")
        .forEach(function (b) {
          b.setAttribute("aria-pressed", "false");
        });

      renderPicker();
      return;
    }

    if (button.hasAttribute("data-special-btn")) {
      var next = button.dataset.specialBtn;
      special = special === next ? "" : next;
      type = "ALL";

      document.querySelectorAll("[data-type-btn]")
        .forEach(function (b) {
          b.setAttribute(
            "aria-pressed",
            String(!special && b.dataset.typeBtn === "ALL")
          );
        });

      document.querySelectorAll("[data-special-btn]")
        .forEach(function (b) {
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.specialBtn === special)
          );
        });

      renderPicker();
    }
  });

  $("search").addEventListener("input", function (event) {
    query = event.target.value.trim().toLowerCase();
    renderPicker();
  });

  $("rarity").addEventListener("change", function (event) {
    rarity = event.target.value;
    renderPicker();
  });

  $("elixirFilter").addEventListener("change", function (event) {
    elixir = event.target.value;
    renderPicker();
  });

  $("clearBtn").addEventListener("click", function () {
    deck = [];
    render();
  });

  $("openBtn").addEventListener("click", function (event) {
    if (deck.length !== MAX ||
        deck.some(function (item) { return !byId[item.id]; })) {
      event.preventDefault();
    }
  });

  $("copyBtn").addEventListener("click", function () {
    if (deck.length !== MAX) return;

    var url = deckLink();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        say("Deck link copied!");
      }).catch(function () {
        prompt("Copy your deck link:", url);
      });
    } else {
      prompt("Copy your deck link:", url);
    }
  });

  $("impBtn").addEventListener("click", function () {
    var ids = parseDeck($("imp").value);

    if (!ids.length) {
      say("Please paste a valid deck link.");
      return;
    }

    deck = ids.map(function (id) {
      return { id: id, variant: "" };
    });

    $("imp").value = "";
    render();
    say("Deck imported.");
  });

  // Read deck links from the URL.
  var initial = new URLSearchParams(location.search).get("deck");

  if (initial) {
    deck = parseDeck(initial).map(function (id) {
      return { id: id, variant: "" };
    });
  }

  // Load fallback data without assuming CARDS exists.
  var fallback = [];

  try {
    if (typeof CARDS !== "undefined" && Array.isArray(CARDS)) {
      fallback = CARDS;
    }
  } catch (error) {}

  if (Array.isArray(window.CARDS) && window.CARDS.length) {
    fallback = window.CARDS;
  }

  if (fallback.length) {
    mergeCards(fallback);
  } else {
    render();
  }

  // Always request the live card list.
 fetch("/api/cards?v=2", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      var list = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.items) ? data.items : []);

      if (!list.length) {
        throw new Error("Card list is empty");
      }

      mergeCards(list);

      $("loadStatus").textContent =
        "Loaded " + cards.length + " Clash Royale cards.";
    })
    .catch(function (error) {
      $("loadStatus").textContent = cards.length
        ? "Using saved card data. Live updates are unavailable."
        : "Cards could not load. Check /api/cards and your Cloudflare deployment.";

      console.error("Deck Builder card loading error:", error);
    });
})();
