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

    renderGeneratorCards();
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


  var generatorPools = {
    win: [
      "Hog Rider", "Royal Giant", "Giant", "Goblin Giant", "Electro Giant",
      "Golem", "Lava Hound", "Balloon", "Miner", "Graveyard", "Goblin Drill",
      "Goblin Barrel", "Royal Hogs", "Battle Ram", "Ram Rider", "Mortar",
      "X-Bow", "Wall Breakers", "Skeleton Barrel", "Rune Giant", "Minion Giant"
    ],
    winLight: [
      "Hog Rider", "Miner", "Goblin Drill", "Mortar", "X-Bow",
      "Royal Hogs", "Goblin Barrel", "Wall Breakers", "Battle Ram", "Ram Rider"
    ],
    winHeavy: [
      "Giant", "Golem", "Electro Giant", "Goblin Giant", "Royal Giant",
      "Lava Hound", "Rune Giant", "Minion Giant", "P.E.K.K.A", "Mega Knight"
    ],
    winControl: [
      "Miner", "Graveyard", "Goblin Drill", "Mortar", "Royal Giant",
      "Hog Rider", "Wall Breakers", "Balloon"
    ],
    bridgeWin: [
      "Battle Ram", "Ram Rider", "Royal Hogs", "P.E.K.K.A",
      "Mega Knight", "Goblin Drill"
    ],
    baitWin: [
      "Goblin Barrel", "Skeleton Barrel", "Wall Breakers",
      "Goblin Drill", "Mortar"
    ],
    airWin: ["Lava Hound", "Balloon", "Minion Giant"],
    support: [
      "Musketeer", "Electro Wizard", "Magic Archer", "Firecracker",
      "Archers", "Wizard", "Baby Dragon", "Phoenix", "Executioner",
      "Hunter", "Ice Wizard", "Flying Machine", "Electro Dragon",
      "Witch", "Little Prince", "Cannon Cart", "Zappies"
    ],
    air: [
      "Musketeer", "Electro Wizard", "Firecracker", "Archers", "Baby Dragon",
      "Phoenix", "Executioner", "Hunter", "Ice Wizard", "Flying Machine",
      "Electro Dragon", "Mega Minion", "Minions", "Skeleton Dragons"
    ],
    airSupport: [
      "Mega Minion", "Minions", "Skeleton Dragons", "Baby Dragon",
      "Inferno Dragon", "Phoenix", "Flying Machine", "Electro Dragon",
      "Musketeer", "Hunter"
    ],
    tankKiller: [
      "P.E.K.K.A", "Mini P.E.K.K.A", "Inferno Dragon", "Hunter",
      "Prince", "Mighty Miner", "Inferno Tower", "Lumberjack", "Ronin"
    ],
    defense: [
      "Cannon", "Tesla", "Bomb Tower", "Inferno Tower", "Goblin Cage",
      "Tombstone", "Furnace", "Goblin Hut", "Barbarian Hut"
    ],
    smallSpell: [
      "The Log", "Barbarian Barrel", "Zap", "Giant Snowball",
      "Arrows", "Royal Delivery"
    ],
    bigSpell: [
      "Fireball", "Poison", "Lightning", "Rocket",
      "Earthquake", "Void", "Freeze"
    ],
    cycle: [
      "Skeletons", "Ice Spirit", "Electro Spirit", "Fire Spirit",
      "Goblins", "Spear Goblins", "Bats", "Heal Spirit",
      "Ice Golem", "Bomber"
    ],
    bait: [
      "Princess", "Dart Goblin", "Goblin Gang", "Skeleton Army",
      "Guards", "Rascals", "Spear Goblins", "Firecracker",
      "Suspicious Bush"
    ],
    bridge: [
      "Bandit", "Royal Ghost", "Dark Prince", "Prince", "Magic Archer",
      "Cannon Cart", "Elite Barbarians", "Battle Ram", "Ram Rider",
      "P.E.K.K.A", "Mega Knight"
    ]
  };

  var generatorTemplates = {
    BALANCED: [
      "win", "support", "defense", "smallSpell",
      "bigSpell", "air", "tankKiller", "cycle"
    ],
    CYCLE: [
      "winLight", "defense", "smallSpell", "bigSpell",
      "cycle", "cycle", "support", "air"
    ],
    BEATDOWN: [
      "winHeavy", "support", "airSupport", "bigSpell",
      "smallSpell", "tankKiller", "cycle", "support"
    ],
    CONTROL: [
      "winControl", "defense", "tankKiller", "smallSpell",
      "bigSpell", "support", "air", "cycle"
    ],
    BRIDGE: [
      "bridgeWin", "bridge", "bridge", "smallSpell",
      "bigSpell", "tankKiller", "air", "support"
    ],
    BAIT: [
      "baitWin", "bait", "bait", "defense",
      "smallSpell", "bigSpell", "air", "cycle"
    ],
    AIR: [
      "airWin", "airSupport", "airSupport", "smallSpell",
      "bigSpell", "defense", "cycle", "support"
    ]
  };

  function shuffled(list) {
    var copy = list.slice();

    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }

    return copy;
  }

  function generatorCardByName(name) {
    var wanted = String(name || "").trim().toLowerCase();
    if (!wanted) return null;

    var exact = cards.find(function (card) {
      return card.n.toLowerCase() === wanted;
    });
    if (exact) return exact;

    var starts = cards.find(function (card) {
      return card.n.toLowerCase().indexOf(wanted) === 0;
    });
    if (starts) return starts;

    return cards.find(function (card) {
      return card.n.toLowerCase().includes(wanted);
    }) || null;
  }

  function generatorHasName(card, poolName) {
    var pool = generatorPools[poolName] || [];
    return pool.some(function (name) {
      return name.toLowerCase() === card.n.toLowerCase();
    });
  }

  function generatorUsed(id) {
    return deck.some(function (item) {
      return item.id === id;
    });
  }

  function generatorPick(poolName) {
    var pool = shuffled(generatorPools[poolName] || []);

    for (var i = 0; i < pool.length; i++) {
      var card = generatorCardByName(pool[i]);
      if (card && !generatorUsed(card.id)) return card;
    }

    var fallback = cards.filter(function (card) {
      if (generatorUsed(card.id)) return false;

      if (poolName === "smallSpell") {
        return card.t === "S" && card.e <= 3;
      }
      if (poolName === "bigSpell") {
        return card.t === "S" && card.e >= 4;
      }
      if (poolName === "defense") {
        return card.t === "B";
      }
      if (poolName === "cycle") {
        return card.e <= 2;
      }

      return card.t === "T";
    });

    if (!fallback.length) {
      fallback = cards.filter(function (card) {
        return !generatorUsed(card.id);
      });
    }

    if (!fallback.length) return null;

    if (poolName === "cycle") {
      fallback.sort(function (a, b) {
        return a.e - b.e;
      });
      fallback = fallback.slice(0, Math.min(12, fallback.length));
    }

    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  function generatorAdd(card) {
    if (!card || generatorUsed(card.id) || deck.length >= MAX) return false;
    deck.push({ id: card.id, variant: "" });
    return true;
  }

  function generatorAdjustRoles(roles, favorite) {
    if (!favorite) return roles;

    var adjusted = roles.slice();
    var winRoles = [
      "win", "winLight", "winHeavy", "winControl",
      "bridgeWin", "baitWin", "airWin"
    ];

    if (generatorHasName(favorite, "win")) {
      for (var i = 0; i < adjusted.length; i++) {
        if (winRoles.indexOf(adjusted[i]) !== -1) {
          adjusted.splice(i, 1);
          adjusted.push("cycle");
          return adjusted;
        }
      }
    }

    if (favorite.t === "B") {
      var defenseIndex = adjusted.indexOf("defense");
      if (defenseIndex !== -1) {
        adjusted.splice(defenseIndex, 1);
        adjusted.push("support");
      }
      return adjusted;
    }

    if (favorite.t === "S") {
      var spellRole = favorite.e <= 3 ? "smallSpell" : "bigSpell";
      var spellIndex = adjusted.indexOf(spellRole);
      if (spellIndex !== -1) {
        adjusted.splice(spellIndex, 1);
        adjusted.push("cycle");
      }
    }

    return adjusted;
  }

  function hasEvoArtwork(card) {
    return Boolean(
      card && card.evoImage &&
      card.evoImage.includes("/cardevolutions/")
    );
  }

  function hasHeroArtwork(card) {
    return Boolean(
      card && card.heroImage &&
      card.heroImage.includes("/cardheroes/")
    );
  }

  function generatorReplaceForSpecial(kind, protectedId) {
    var supports = kind === "HERO" ? hasHeroArtwork : hasEvoArtwork;
    var candidates = shuffled(cards.filter(function (card) {
      return supports(card) && !generatorUsed(card.id);
    }));

    if (!candidates.length) return null;

    var replaceIndex = -1;

    for (var i = deck.length - 1; i >= 0; i--) {
      var item = deck[i];
      var current = byId[item.id];

      if (
        item.id !== protectedId &&
        !item.variant &&
        current &&
        current.t === candidates[0].t
      ) {
        replaceIndex = i;
        break;
      }
    }

    if (replaceIndex === -1) {
      for (var j = deck.length - 1; j >= 0; j--) {
        if (deck[j].id !== protectedId && !deck[j].variant) {
          replaceIndex = j;
          break;
        }
      }
    }

    if (replaceIndex === -1) return null;

    var replacement = candidates.find(function (candidate) {
      var oldCard = byId[deck[replaceIndex].id];
      return oldCard && candidate.t === oldCard.t;
    }) || candidates[0];

    deck[replaceIndex] = {
      id: replacement.id,
      variant: kind
    };

    return replacement;
  }

  function generatorApplySpecials(protectedId) {
    deck.forEach(function (item) {
      item.variant = "";
    });

    var heroSetting = $("genHero").value;
    var evoSetting = $("genEvos").value;

    var heroCandidates = deck.filter(function (item) {
      return hasHeroArtwork(byId[item.id]);
    });

    var heroTarget = heroSetting === "1"
      ? 1
      : (heroSetting === "AUTO" && heroCandidates.length ? 1 : 0);

    if (heroTarget && !heroCandidates.length) {
      generatorReplaceForSpecial("HERO", protectedId);
      heroCandidates = deck.filter(function (item) {
        return hasHeroArtwork(byId[item.id]);
      });
    }

    if (heroTarget && heroCandidates.length) {
      var heroChoice = heroCandidates[
        Math.floor(Math.random() * heroCandidates.length)
      ];
      heroChoice.variant = "HERO";
    }

    var evoCandidates = deck.filter(function (item) {
      return !item.variant && hasEvoArtwork(byId[item.id]);
    });

    var evoTarget = 0;
    if (evoSetting === "1") evoTarget = 1;
    if (evoSetting === "2") evoTarget = 2;
    if (evoSetting === "AUTO") {
      evoTarget = Math.min(2, evoCandidates.length);
    }

    while (evoCandidates.length < evoTarget) {
      var replacement = generatorReplaceForSpecial("EVO", protectedId);
      if (!replacement) break;

      evoCandidates = deck.filter(function (item) {
        return !item.variant && hasEvoArtwork(byId[item.id]);
      });
    }

    shuffled(evoCandidates).slice(0, evoTarget).forEach(function (item) {
      item.variant = "EVO";
    });

    return {
      heroes: deck.filter(function (item) {
        return item.variant === "HERO";
      }).length,
      evos: deck.filter(function (item) {
        return item.variant === "EVO";
      }).length
    };
  }

  function renderGeneratorCards() {
    var list = $("generatorCards");
    if (!list) return;

    list.innerHTML = cards
      .slice()
      .sort(function (a, b) {
        return a.n.localeCompare(b.n);
      })
      .map(function (card) {
        return '<option value="' + safe(card.n) + '"></option>';
      })
      .join("");
  }

  function generateDeck() {
    if (!cards.length) {
      $("generatorStatus").textContent =
        "Cards are still loading. Try again in a moment.";
      return;
    }

    var style = $("genArchetype").value;
    var favoriteText = $("genFavorite").value.trim();
    var favorite = favoriteText ? generatorCardByName(favoriteText) : null;

    if (favoriteText && !favorite) {
      $("generatorStatus").textContent =
        'Could not find "' + favoriteText + '". Choose a card from the list.';
      return;
    }

    deck = [];

    if (favorite) {
      generatorAdd(favorite);
      $("genFavorite").value = favorite.n;
    }

    var roles = generatorAdjustRoles(
      generatorTemplates[style] || generatorTemplates.BALANCED,
      favorite
    );

    roles.forEach(function (role) {
      if (deck.length < MAX) generatorAdd(generatorPick(role));
    });

    while (deck.length < MAX) {
      var extra = generatorPick("support");
      if (!extra || !generatorAdd(extra)) break;
    }

    if (deck.length < MAX) {
      shuffled(cards).some(function (card) {
        generatorAdd(card);
        return deck.length === MAX;
      });
    }

    var specials = generatorApplySpecials(favorite ? favorite.id : null);

    render();

    var styleLabel = $("genArchetype")
      .options[$("genArchetype").selectedIndex].text;

    var message = styleLabel + " deck generated";
    if (favorite) message += " with " + favorite.n;
    message += ". " + specials.evos + " Evolution" +
      (specials.evos === 1 ? "" : "s") + ", " +
      specials.heroes + " Hero" +
      (specials.heroes === 1 ? "" : "es") + ".";

    $("generatorStatus").textContent = message;
    say("Generated deck ready. You can swap any card below.");
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

  $("generateBtn").addEventListener("click", generateDeck);
  $("regenerateBtn").addEventListener("click", generateDeck);

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
