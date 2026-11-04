
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
    {
      label: "Organization",
      pages: [
        ["about", "About Us", "about.html"],
        ["clans", "Our Clans", "clans.html"],
        ["team", "Our Team", "team.html"],
        ["join", "Join the Organization", "join.html"],
        ["sponsors", "Sponsors & Advertising", "sponsors.html"]
      ]
    },
    {
      label: "Compete",
      pages: [
        ["leaderboard", "Player Leaderboard", "leaderboard.html"],
        ["tournaments", "Tournaments", "tournaments.html"],
        ["events", "Events Calendar", "events.html"],
        ["decks", "Pro Decks", "decks.html"],
        ["deck-builder", "Deck Builder", "deck-builder.html"],
        ["coaching", "Coaching", "coaching.html"],
        ["balance-changes", "Balance Changes", "balance-changes.html"]
      ]
    },
    {
      label: "Community",
      pages: [
        ["streams", "Streams & Creators", "streams.html"],
        ["news", "News & Announcements", "news.html"],
        ["faq", "FAQ & Help", "faq.html"]
      ]
    }
  ];

  function link(key, label, href, className) {
    var active = current === key ? ' aria-current="page"' : "";

    return '<a class="' + (className || "") +
      '" href="' + href + '"' + active + ">" + label + "</a>";
  }

  var html =
    '<button class="nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="main-nav-menu">☰</button>';

  html += '<div class="nav-menu" id="main-nav-menu">';
  html += link("index", "Home", "index.html", "nav-home");

  groups.forEach(function (group, index) {
    var isCurrent = group.pages.some(function (item) {
      return item[0] === current;
    });

    html += '<div class="nav-group' +
      (isCurrent ? " is-current" : "") + '">';

    html += '<button class="nav-group-toggle" type="button" aria-expanded="false" aria-controls="nav-group-' +
      index + '">' + group.label + "</button>";

    html += '<div class="nav-dropdown" id="nav-group-' + index + '">';

    group.pages.forEach(function (item) {
      html += link(item[0], item[1], item[2], "");
    });

    html += "</div></div>";
  });

  html += '<a class="btn btn-discord btn-sm nav-discord" href="https://discord.gg/nFxd48maEg" target="_blank" rel="noopener noreferrer">Join Discord</a>';

  html += "</div>";
  nav.innerHTML = html;

  var toggle = nav.querySelector(".nav-toggle");
  var menu = nav.querySelector(".nav-menu");

  var groupButtons = Array.prototype.slice.call(
    nav.querySelectorAll(".nav-group-toggle")
  );

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
    toggle.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation"
    );

    toggle.textContent = open ? "×" : "☰";

    if (!open) closeGroups();
  });

  groupButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.stopPropagation();

      var willOpen =
        button.getAttribute("aria-expanded") !== "true";

      closeGroups(button);

      button.setAttribute("aria-expanded", String(willOpen));
      button.parentElement.classList.toggle("open", willOpen);
    });
  });

  menu.addEventListener("click", function (event) {
    if (
      event.target.closest("a") &&
      window.matchMedia("(max-width: 768px)").matches
    ) {
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


  /* Ensure footer layout CSS refreshes alongside the navigation script. */
  var footerStyles = document.createElement("link");
  footerStyles.rel = "stylesheet";
  footerStyles.href = "style.css?v=32";
  document.head.appendChild(footerStyles);

  var footerFix = document.createElement("style");
  footerFix.textContent = '.site-footer{display:block!important;text-align:left!important;padding:0 24px!important;box-sizing:border-box!important}.site-footer .footer-inner{display:block!important;max-width:1180px!important;margin:0 auto!important;padding:52px 0 24px!important}.site-footer .footer-top{display:grid!important;grid-template-columns:minmax(200px,1fr) minmax(0,2.5fr)!important;gap:42px!important;align-items:start!important}.site-footer .footer-identity{text-align:left!important}.site-footer .footer-columns{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:22px!important;text-align:left!important}.site-footer .footer-columns>div{display:flex!important;flex-direction:column!important;align-items:flex-start!important;min-width:0!important}.site-footer .footer-columns h2{display:block!important;margin:0 0 14px!important;font-size:16px!important;line-height:1.4!important}.site-footer .footer-columns a{display:block!important;margin:0 0 12px!important;padding:0!important;font-size:14px!important;line-height:1.5!important;white-space:normal!important;overflow-wrap:anywhere!important;color:#c4c8d2!important;text-decoration:none!important}.site-footer .footer-bottom{display:flex!important;justify-content:space-between!important;gap:24px!important;flex-wrap:wrap!important;margin-top:34px!important;padding-top:22px!important;border-top:1px solid #444!important;text-align:left!important}.site-footer .footer-bottom span{display:block!important;max-width:520px!important;font-size:12px!important;line-height:1.6!important;text-align:left!important}@media(max-width:950px){.site-footer .footer-top{grid-template-columns:1fr!important}.site-footer .footer-columns{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:480px){.site-footer{padding:0 18px!important}.site-footer .footer-columns{gap:20px!important}}';
  document.head.appendChild(footerFix);

  /* Shared footer for every page using the site navigation script. */
  var footer = document.querySelector(".site-footer");
  if (footer) {
    footer.innerHTML =
      '<div class="footer-inner">' +
        '<div class="footer-top">' +
          '<div class="footer-identity"><div class="footer-brand">♛ THE ROYALE ORGANIZATION</div><p>COMPETE • UNITE • CONQUER</p><p>Connecting Clash Royale clans, players, and creators.</p></div>' +
          '<div class="footer-columns">' +
            '<div><h2>Organization</h2><a href="about.html">About Us</a><a href="clans.html">Our Clans</a><a href="team.html">Our Team</a><a href="join.html">Join TRO</a></div>' +
            '<div><h2>Competition</h2><a href="tournaments.html">Tournaments</a><a href="leaderboard.html">Leaderboard</a><a href="coaching.html">Coaching</a><a href="deck-builder.html">Deck Builder</a></div>' +
            '<div><h2>Community</h2><a href="news.html">News</a><a href="streams.html">Creators</a><a href="https://discord.gg/nFxd48maEg" target="_blank" rel="noopener noreferrer">Discord</a></div>' +
            '<div><h2>Business</h2><a href="sponsors.html">Sponsorships &amp; Advertising</a><a href="sponsor-apply.html">Sponsor Inquiry</a><a href="join.html">Get Involved</a></div>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom"><span>© 2026 The Royale Organization. All rights reserved.</span><span>Independent fan organization. Not affiliated with, endorsed, or sponsored by Supercell. Clash Royale is a trademark of Supercell.</span></div>' +
      '</div>';
  }

  /* BACK TO TOP */

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

  window.addEventListener(
    "scroll",
    updateTopButton,
    { passive: true }
  );

  updateTopButton();

  topButton.addEventListener("click", function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  /* PROGRESSIVE REVEAL ANIMATIONS */

  var revealTargets = Array.prototype.slice.call(
    document.querySelectorAll(
      ".section > .label, .section > h2, .section > .lead, .grid > *, " +
      ".home-feature-grid > *, .home-clan-grid > *, .creator-grid > *, " +
      ".leadership-grid > *, .join-path-grid > *, .join-clan-grid > *, " +
      ".tournament-hub-grid > *, .home-split, .home-creator-feature"
    )
  );

  if (revealTargets.length) {
    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    revealTargets.forEach(function (element, index) {
      element.classList.add("reveal-item");

      if (index % 3 === 1) {
        element.classList.add("reveal-delay-1");
      }

      if (index % 3 === 2) {
        element.classList.add("reveal-delay-2");
      }
    });

    if (
      reduceMotion ||
      !("IntersectionObserver" in window)
    ) {
      revealTargets.forEach(function (element) {
        element.classList.add("is-visible");
      });
    } else {
      var revealObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.08,
          rootMargin: "0px 0px -30px 0px"
        }
      );

      revealTargets.forEach(function (element) {
        revealObserver.observe(element);
      });
    }
  }
})();
