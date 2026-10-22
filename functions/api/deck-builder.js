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
  var q = "";

  var $ = function (id) {
    return document.getElementById(id);
  };

  var champions = [
    "Mighty Miner",
    "Skeleton King",
    "Archer Queen",
    "Golden Knight",
    "Monk",
    "Little Prince",
    "Goblinstein",
    "Boss Bandit"
  ];

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch];
    });
  }

  function normalize(c) {
    var id = Number(c.id);
    var name = c.n || c.name || "";
    var icons = c.iconUrls || {};

    var cardType = c.t || (
      String(id).indexOf("27") === 0 ? "B" :
      String(id).indexOf("28") === 0 ? "S" : "T"
    );

    var cardRarity = String(
      c.r ||
      c.rarity ||
      (champions.indexOf(name) >= 0 ? "champion" : "")
    ).toLowerCase();

    var evoImage =
      c.evoImage ||
      c.evolutionImage ||
      c.ei ||
      icons.evolutionMedium ||
      "";

    var heroImage =
      c.heroImage ||
      c.hi ||
      icons.heroMedium ||
      "";

    return {
      id: id,
      n: name,
      e: Number(c.e != null ? c.e : c.elixirCost || 0),
      t: cardType,
      i: c.i || icons.medium || "",
      r: cardRarity,
      evoImage: evoImage,
      heroImage: heroImage,
      evo: Boolean(
        c.evo ||
        evoImage ||
        Number(c.maxEvolutionLevel) > 0
      ),
      hero: Boolean(c.hero || heroImage),
      u: Boolean(c.u)
    };
  }

  function loadCards(list) {
    if (!Array.isArray(list)) return;

    var merged = {};

    cards.forEach(function (c) {
      merged[c.id] = c;
    });

    list.forEach(function (raw) {
      var id = Number(raw.id);
      var previous = merged[id] || {};
      var combined = Object.assign({}, previous, raw);
      var c = normalize(combined);

      if (Number.isFinite(c.id) && c.n) {
        merged[c.id] = c;
      }
    });

    cards = Object.keys(merged).map(function (id) {
      return merged[id];
    });

    byId = {};

    cards.forEach(function (c) {
      byId[c.id] = c;
    });

    render();
  }

  function parse(s) {
    try {
      s = decodeURIComponent(s);
    } catch (e) {}

    var m = s.match(/deck=([0-9;,]+)/);
    var raw = m ? m[1] : s;
    var out = [];

    raw.split(/[;,\s]+/).forEach(function (x) {
      var n = Number(x);

      if (
        n >= 26000000 &&
        n < 29000000 &&
        out.indexOf(n) < 0
      ) {
        out.push(n);
      }
    });

    return out.slice(0, MAX);
  }

  var initialDeck = new URLSearchParams(
    location.search
  ).get("deck");

  if (initialDeck) {
    deck = parse(initialDeck).map(function (id) {
      return {
        id: id,
        variant: ""
      };
    });
  }

  function link() {
    return LINK + deck.map(function (item) {
      return item.id;
    }).join(";");
  }

  function say(text) {
    if ($("msg")) {
      $("msg").textContent = text;
    }
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

  function imageHTML(src) {
    if (!src) return "";

    return '<img src="' +
      escapeHTML(src) +
      '" alt="" loading="lazy" width="56">';
  }

  function renderSlots() {
    var html = "";

    for (var i = 0; i < MAX; i++) {
      var item = deck[i];

      if (!item) {
        html +=
          '<div class="slot" aria-label="Empty slot">+</div>';
        continue;
      }

      var c = byId[item.id];
      var name = c ? c.n : "Card #" + item.id;

      if (item.variant) {
        name = item.variant + " " + name;
      }

      html +=
        '<button class="slot filled" type="button" ' +
        'data-remove="' + i + '" ' +
        'aria-label="Remove ' + escapeHTML(name) + '">' +

        (c
          ? '<span class="elixir">' + c.e + '</span>'
          : '') +

        (c
          ? imageHTML(imageFor(c, item.variant))
          : '') +

        '<span>' + escapeHTML(name) + '</span>' +
        '</button>';
    }

    $("slots").innerHTML = html;
  }

  function renderStats() {
    var sum = 0;
    var known = 0;
    var costs = [];
    var unsure = false;

    deck.forEach(function (item) {
      var c = byId[item.id];

      if (c) {
        sum += c.e;
        known++;
        costs.push(c.e);

        if (c.u) unsure = true;
      }
    });

    var full = deck.length === MAX;

    $("count").textContent = deck.length + " / " + MAX;

    $("avg").textContent = known
      ? (sum / known).toFixed(1)
      : "–";

    costs.sort(function (a, b) {
      return a - b;
    });

    $("cycle").textContent =
      full && known === MAX
        ? costs.slice(0, 4).reduce(function (a, b) {
            return a + b;
          }, 0)
        : "–";

    var open = $("openBtn");

    open.href = full ? link() : "#";
    open.setAttribute(
      "aria-disabled",
      full ? "false" : "true"
    );

    open.classList.toggle("is-disabled", !full);

    $("copyBtn").disabled = !full;

    if (unsure) {
      say("Some card IDs may need verification.");
    } else if (!full) {
      var remaining = MAX - deck.length;

      say(
        "Pick " + remaining + " more card" +
        (remaining === 1 ? "" : "s") +
        " to finish your deck."
      );
    } else {
      say("");
    }
  }

  function availableCards() {
    if (special === "EVO") {
      return cards
        .filter(function (c) {
          return c.evo && c.evoImage;
        })
        .map(function (c) {
          return { card: c, variant: "EVO" };
        });
    }

    if (special === "HERO") {
      return cards
        .filter(function (c) {
          return c.hero && c.heroImage;
        })
        .map(function (c) {
          return { card: c, variant: "HERO" };
        });
    }

    if (special === "CHAMPION") {
      return cards
        .filter(function (c) {
          return c.r === "champion";
        })
        .map(function (c) {
          return { card: c, variant: "" };
        });
    }

    return cards.map(function (c) {
      return {
        card: c,
        variant: ""
      };
    });
  }

  function renderPicker() {
    var full = deck.length === MAX;

    var list = availableCards().filter(function (item) {
      var c = item.card;

      return (
        (type === "ALL" || c.t === type) &&
        (rarity === "ALL" || c.r === rarity) &&
        c.n.toLowerCase().indexOf(q) >= 0
      );
    });

    list.sort(function (a, b) {
      return (
        a.card.e - b.card.e ||
        a.card.n.localeCompare(b.card.n)
      );
    });

    var html = list.map(function (item) {
      var c = item.card;

      var inDeck = deck.some(function (d) {
        return d.id === c.id;
      });

      var name = item.variant
        ? item.variant + " " + c.n
        : c.n;

      var image = imageFor(c, item.variant);

      return (
        '<button class="tile" type="button" ' +
        'data-add="' + c.id + '" ' +
        'data-variant="' + item.variant + '" ' +
        'data-type="' + c.t + '" ' +

        ((inDeck || full) ? "disabled " : "") +

        'aria-label="Add ' + escapeHTML(name) + '">' +

        '<span class="elixir">' + c.e + '</span>' +

        imageHTML(image) +

        '<span>' + escapeHTML(name) + '</span>' +

        (c.u ? " *" : "") +

        '</button>'
      );
    }).join("");

    $("picker").innerHTML =
      html || '<p class="note">No cards match this filter.</p>';
  }

  function render() {
    renderSlots();
    renderStats();
    renderPicker();

    var ids = deck.map(function (item) {
      return item.id;
    });

    var url = new URL(location.href);

    if (ids.length) {
      url.searchParams.set("deck", ids.join(";"));
    } else {
      url.searchParams.delete("deck");
    }

    history.replaceState(
      null,
      "",
      url.pathname + url.search + url.hash
    );
  }

  function addCard(id, variant) {
    id = Number(id);
    variant = variant || "";

    var c = byId[id];

    if (!c) return;

    if (deck.length >= MAX) {
      say("Your deck is already full.");
      return;
    }

    var exists = deck.some(function (item) {
      return item.id === id;
    });

    if (exists) {
      say("That card is already in your deck.");
      return;
    }

    if (variant === "EVO") {
      var evoCount = deck.filter(function (item) {
        return item.variant === "EVO";
      }).length;

      if (evoCount >= 2) {
        say("You can select up to two Evolutions.");
        return;
      }
    }

    if (variant === "HERO") {
      var hasHero = deck.some(function (item) {
        return item.variant === "HERO";
      });

      if (hasHero) {
        say("Only one Hero can be selected.");
        return;
      }
    }

    deck.push({
      id: id,
      variant: variant
    });

    render();
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest(
      "[data-add],[data-remove],[data-type-btn],[data-special-btn]"
    );

    if (!t) return;

    if (t.hasAttribute("data-add")) {
      addCard(
        t.dataset.add,
        t.dataset.variant || ""
      );

      return;
    }

    if (t.hasAttribute("data-remove")) {
      deck.splice(Number(t.dataset.remove), 1);
      render();
      return;
    }

    if (t.hasAttribute("data-type-btn")) {
      type = t.dataset.typeBtn;
      special = "";

      document.querySelectorAll(
        "[data-type-btn]"
      ).forEach(function (b) {
        b.setAttribute(
          "aria-pressed",
          String(b === t)
        );
      });

      document.querySelectorAll(
        "[data-special-btn]"
      ).forEach(function (b) {
        b.setAttribute("aria-pressed", "false");
      });

      renderPicker();
      return;
    }

    if (t.hasAttribute("data-special-btn")) {
      var chosen = t.dataset.specialBtn;

      special = special === chosen ? "" : chosen;
      type = "ALL";

      document.querySelectorAll(
        "[data-type-btn]"
      ).forEach(function (b) {
        b.setAttribute(
          "aria-pressed",
          String(!special && b.dataset.typeBtn === "ALL")
        );
      });

      document.querySelectorAll(
        "[data-special-btn]"
      ).forEach(function (b) {
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.specialBtn === special)
        );
      });

      renderPicker();
    }
  });

  if ($("search")) {
    $("search").addEventListener("input", function (e) {
      q = e.target.value.trim().toLowerCase();
      renderPicker();
    });
  }

  if ($("rarity")) {
    $("rarity").addEventListener("change", function (e) {
      rarity = String(e.target.value).toLowerCase();

      if (rarity === "all" || !rarity) {
        rarity = "ALL";
      }

      renderPicker();
    });
  }

  $("clearBtn").addEventListener("click", function () {
    deck = [];
    render();
    say("Deck cleared.");
  });

  $("openBtn").addEventListener("click", function (e) {
    if (deck.length !== MAX) {
      e.preventDefault();
    }
  });

  $("copyBtn").addEventListener("click", function () {
    if (deck.length !== MAX) return;

    var url = link();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        function () {
          say("Deck link copied!");
        },
        function () {
          prompt("Copy this link:", url);
        }
      );
    } else {
      prompt("Copy this link:", url);
    }
  });

  $("impBtn").addEventListener("click", function () {
    var imported = parse($("imp").value);

    if (!imported.length) {
      say(
        "No deck found. Paste a Clash Royale deck link."
      );
      return;
    }

    deck = imported.map(function (id) {
      return {
        id: id,
        variant: ""
      };
    });

    $("imp").value = "";

    render();
    say("Deck imported successfully.");
  });

  // Load built-in cards first.
  if (
    typeof CARDS !== "undefined" &&
    Array.isArray(CARDS)
  ) {
    loadCards(CARDS);
  } else {
    render();
  }

  // Load the latest cards from the website API.
  fetch("/api/cards")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Card API unavailable");
      }

      return response.json();
    })
    .then(function (data) {
      var list = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.items)
            ? data.items
            : []);

      if (!list.length) return;

      loadCards(list);

      var note = $("cardnote");

      if (note) {
        note.textContent =
          "Card list loaded. Special artwork appears when available in the card data.";
      }
    })
    .catch(function () {
      var note = $("cardnote");

      if (note) {
        note.textContent =
          "Live card data is unavailable. Using built-in cards.";
      }
    });
})();
