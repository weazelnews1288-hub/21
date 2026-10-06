/* ==========================================================
   ЛОГИКА САЙТА (рисует шапку, подвал, список новостей, статью).
   Если вы не программист — этот файл можно НЕ ТРОГАТЬ.
   Всё содержимое сайта меняется в js/config.js и js/articles.js
   ========================================================== */

(function () {

  /* ---------- Вспомогательные функции ---------- */

  // Защита: превращает символы < > & " в безопасный текст
  function esc(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // "2026-10-05" → "5 октября 2026 г."
  function formatDate(iso) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }

  // Жирный текст и ссылки внутри строки
  function inline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  // Превращает текст из articles.js (поле content) в HTML
  function renderContent(text) {
    return text.trim().split(/\n\s*\n/).map(function (block) {
      block = block.trim();
      var m;

      // Фото:  ![подпись](images/foto.jpg)
      m = block.match(/^!\[(.*?)\]\((.+?)\)$/);
      if (m) {
        return '<figure><img src="' + esc(m[2]) + '" alt="' + esc(m[1]) + '" loading="lazy">' +
               (m[1] ? "<figcaption>" + esc(m[1]) + "</figcaption>" : "") + "</figure>";
      }

      // Подзаголовок:  ## Текст
      if (block.indexOf("## ") === 0) return "<h2>" + inline(block.slice(3)) + "</h2>";

      // Цитата:  > Текст
      if (block.indexOf("> ") === 0) return "<blockquote>" + inline(block.slice(2)) + "</blockquote>";

      // Список:  - пункт
      var lines = block.split("\n");
      if (lines.every(function (l) { return l.trim().indexOf("- ") === 0; })) {
        return "<ul>" + lines.map(function (l) {
          return "<li>" + inline(l.trim().slice(2)) + "</li>";
        }).join("") + "</ul>";
      }

      // Обычный абзац
      return "<p>" + inline(block).replace(/\n/g, "<br>") + "</p>";
    }).join("\n");
  }

  // Новости от свежих к старым
  function sortedArticles() {
    if (typeof ARTICLES === "undefined") return [];
    return ARTICLES.slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });
  }

  // HTML одной карточки новости
  function cardHTML(a) {
    var img = a.image || SITE.defaultImage;
    return '<article class="card">' +
      '<a href="article.html?id=' + encodeURIComponent(a.id) + '">' +
        '<img src="' + esc(img) + '" alt="' + esc(a.title) + '" loading="lazy">' +
        '<div class="card-body">' +
          '<span class="tag">' + esc(a.category || "Новости") + "</span>" +
          "<h3>" + esc(a.title) + "</h3>" +
          "<p>" + esc(a.summary || "") + "</p>" +
          "<time>" + formatDate(a.date) + "</time>" +
        "</div>" +
      "</a></article>";
  }

  /* ---------- Шапка и подвал ---------- */

  function renderHeaderFooter() {
    var current = location.pathname.split("/").pop() || "index.html";

    var header = document.getElementById("site-header");
    if (header) {
      header.innerHTML =
        '<header class="header"><div class="container header-inner">' +
          '<a class="logo" href="index.html">' + esc(SITE.name) + "</a>" +
          '<nav class="nav">' +
            SITE.menu.map(function (item) {
              var active = item.url === current ? ' class="active"' : "";
              return '<a href="' + esc(item.url) + '"' + active + ">" + esc(item.title) + "</a>";
            }).join("") +
          "</nav>" +
        "</div></header>";
    }

    var footer = document.getElementById("site-footer");
    if (footer) {
      footer.innerHTML = '<footer class="footer"><div class="container">' + esc(SITE.footer) + "</div></footer>";
    }
  }

  /* ---------- Главная: список новостей, поиск, категории ---------- */

  function renderHome() {
    var list = document.getElementById("news-list");
    if (!list) return;

    var slogan = document.getElementById("site-slogan");
    if (slogan) slogan.textContent = SITE.slogan;
    document.title = SITE.name;

    var all = sortedArticles();
    var filterBox = document.getElementById("category-filter");
    var searchBox = document.getElementById("search");
    var emptyMsg = document.getElementById("empty");
    var currentCategory = "Все";

    // Категории берутся из новостей автоматически
    var categories = ["Все"];
    all.forEach(function (a) {
      if (a.category && categories.indexOf(a.category) === -1) categories.push(a.category);
    });

    function draw() {
      var query = searchBox.value.trim().toLowerCase();
      var shown = all.filter(function (a) {
        var okCat = currentCategory === "Все" || a.category === currentCategory;
        var text = (a.title + " " + (a.summary || "")).toLowerCase();
        return okCat && (!query || text.indexOf(query) !== -1);
      });
      list.innerHTML = shown.map(cardHTML).join("");
      emptyMsg.hidden = shown.length > 0;
    }

    function drawFilters() {
      filterBox.innerHTML = categories.map(function (c) {
        return '<button type="button" class="filter' + (c === currentCategory ? " active" : "") +
               '" data-cat="' + esc(c) + '">' + esc(c) + "</button>";
      }).join("");
    }

    filterBox.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      currentCategory = btn.getAttribute("data-cat");
      drawFilters();
      draw();
    });
    searchBox.addEventListener("input", draw);

    drawFilters();
    draw();
  }

  /* ---------- Страница новости ---------- */

  function renderArticle() {
    var box = document.getElementById("article");
    if (!box) return;

    var id = new URLSearchParams(location.search).get("id");
    var all = sortedArticles();
    var a = all.filter(function (x) { return x.id === id; })[0];

    if (!a) {
      document.title = "Новость не найдена — " + SITE.name;
      box.innerHTML = '<h1>Новость не найдена</h1><p><a href="index.html">← На главную</a></p>';
      return;
    }

    document.title = a.title + " — " + SITE.name;

    box.innerHTML =
      '<p class="back"><a href="index.html">← Все новости</a></p>' +
      '<span class="tag">' + esc(a.category || "Новости") + "</span>" +
      "<h1>" + esc(a.title) + "</h1>" +
      '<time class="date">' + formatDate(a.date) + "</time>" +
      (a.image ? '<img class="cover" src="' + esc(a.image) + '" alt="' + esc(a.title) + '">' : "") +
      '<div class="text">' + renderContent(a.content || "") + "</div>";

    // «Читайте также» — до 3 других новостей
    var others = all.filter(function (x) { return x.id !== a.id; }).slice(0, 3);
    if (others.length) {
      document.getElementById("more").innerHTML = others.map(cardHTML).join("");
      document.getElementById("more-section").hidden = false;
    }
  }

  /* ---------- Запуск ---------- */

  renderHeaderFooter();
  renderHome();
  renderArticle();

  // На обычных страницах (О нас и т.п.) добавляем название сайта к заголовку вкладки
  if (!document.getElementById("news-list") && !document.getElementById("article")) {
    document.title = document.title + " — " + SITE.name;
  }

})();
