(function () {
  "use strict";
  var nav = document.querySelector(".site-nav");
  if (!nav) return;

  function pageKey() {
    var path = window.location.pathname.replace(/\/+$/, "");
    var last = path.split("/").pop() || "index";
    return last.replace(/\.html$/i, "") || "index";
  }

  var current = pageKey();
  var groups = [
    { label: "Organization", pages: [
      ["about", "About Us", "about.html"],
      ["clans", "Our Clans", "clans.html"],
      ["team", "Team", "team.html"]
    ]},
    { label: "Compete", pages: [
      ["tournaments", "Tournaments", "tournaments.html"],
      ["decks", "Pro Decks", "decks.html"],
      ["deck-builder", "Deck Builder", "deck-builder.html"],
      ["balance-changes", "Balance Changes", "balance-changes.html"]
    ]},
    { label: "Community", pages: [
      ["streams", "Streams & Creators", "streams.html"],
      ["join", "Join Us", "join.html"]
    ]}
  ];

  function link(key, label, href, className) {
    var active = current === key ? ' aria-current="page"' : "";
    return '<a class="' + (className || "") + '" href="' + href + '"' + active + ">" + label + "</a>";
  }

  var html = '<button class="nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="main-nav-menu">☰</button>';
  html += '<div class="nav-menu" id="main-nav-menu">';
  html += link("index", "Home", "index.html", "nav-home");

  groups.forEach(function (group, index) {
    var isCurrent = group.pages.some(function (item) { return item[0] === current; });
    html += '<div class="nav-group' + (isCurrent ? " is-current" : "") + '">';
    html += '<button class="nav-group-toggle" type="button" aria-expanded="false" aria-controls="nav-group-' + index + '">' + group.label + "</button>";
    html += '<div class="nav-dropdown" id="nav-group-' + index + '">';
    group.pages.forEach(function (item) { html += link(item[0], item[1], item[2], ""); });
    html += "</div></div>";
  });

  html += '<a class="btn btn-discord btn-sm nav-discord" href="https://discord.gg/nFxd48maEg" target="_blank" rel="noopener noreferrer">Join Discord</a>';
  html += "</div>";
  nav.innerHTML = html;

  var toggle = nav.querySelector(".nav-toggle");
  var menu = nav.querySelector(".nav-menu");
  var groupButtons = Array.prototype.slice.call(nav.querySelectorAll(".nav-group-toggle"));

  function closeGroups(except) {
    groupButtons.forEach(function (button) {
      if (button === except) return;
      button.setAttribute("aria-expanded", "false");
      button.parentElement.classList.remove("open");
    });
  }

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    toggle.textContent = open ? "×" : "☰";
    if (!open) closeGroups();
  });

  groupButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      var willOpen = button.getAttribute("aria-expanded") !== "true";
      closeGroups(button);
      button.setAttribute("aria-expanded", String(willOpen));
      button.parentElement.classList.toggle("open", willOpen);
    });
  });

  menu.addEventListener("click", function (event) {
    if (event.target.closest("a") && window.matchMedia("(max-width: 768px)").matches) {
      nav.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
      toggle.textContent = "☰";
      closeGroups();
    }
  });

  document.addEventListener("click", function (event) {
    if (!nav.contains(event.target)) closeGroups();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeGroups();
    nav.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    toggle.textContent = "☰";
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 768) {
      nav.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
      toggle.textContent = "☰";
    }
  });

  var topButton = document.createElement("button");
  topButton.className = "back-to-top";
  topButton.type = "button";
  topButton.setAttribute("aria-label", "Back to top");
  topButton.title = "Back to top";
  topButton.textContent = "↑";
  document.body.appendChild(topButton);

  function updateTopButton() {
    topButton.classList.toggle("visible", window.scrollY > 500);
  }
  window.addEventListener("scroll", updateTopButton, { passive: true });
  updateTopButton();
  topButton.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();