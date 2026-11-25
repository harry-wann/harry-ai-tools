(() => {
  const input = document.querySelector("#search-input");
  const categoryFilter = document.querySelector("#category-filter");
  const list = document.querySelector("#resource-list");
  const count = document.querySelector("#result-count");
  const emptyState = document.querySelector("#empty-state");
  const loadError = document.querySelector("#load-error");
  const clearButton = document.querySelector("#clear-filters");

  let items = [];
  input.disabled = categoryFilter.disabled = true;

  const normalize = (value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("zh-Hant").trim();

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function makeCard(resource) {
    const card = document.createElement("article");
    card.className = "resource-card";

    const meta = document.createElement("div");
    meta.className = "card-meta";
    const category = document.createElement("span");
    category.className = "category-pill";
    category.textContent = resource.category || "未分類";
    meta.append(category);

    const heading = document.createElement("h3");
    heading.textContent = resource.name || "未命名資源";
    const summary = document.createElement("p");
    summary.className = "card-summary";
    summary.textContent = resource.summary || "";
    card.append(meta, heading, summary);

    if (Array.isArray(resource.tags) && resource.tags.length) {
      const tags = document.createElement("ul");
      tags.className = "tag-list";
      tags.setAttribute("aria-label", "標籤");
      resource.tags.forEach((tag) => {
        const item = document.createElement("li");
        item.textContent = tag;
        tags.append(item);
      });
      card.append(tags);
    }

    const body = String(resource.body ?? "").trim();
    const source = safeUrl(resource.url);
    if (body || source) {
      const details = document.createElement("details");
      details.className = "card-details";
      const toggle = document.createElement("summary");
      toggle.textContent = source ? "查看筆記與來源" : "查看筆記";
      details.append(toggle);
      if (body) {
        const note = document.createElement("p");
        note.className = "card-body";
        note.textContent = body;
        details.append(note);
      }
      if (source) {
        const link = document.createElement("a");
        link.className = "source-link";
        link.href = source;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "開啟相關來源";
        details.append(link);
      }
      card.append(details);
    }

    return card;
  }

  function update(resources) {
    const query = normalize(input.value);
    const category = categoryFilter.value;
    const filtered = resources.filter((resource) => {
      if (category && resource.category !== category) return false;
      if (!query) return true;
      const searchable = normalize([
        resource.name,
        resource.summary,
        resource.category,
        ...(Array.isArray(resource.tags) ? resource.tags : []),
        resource.body,
      ].join(" "));
      return searchable.includes(query);
    });

    list.replaceChildren(...filtered.map(makeCard));
    list.setAttribute("aria-busy", "false");
    count.textContent = `共 ${filtered.length} 筆資源`;
    emptyState.hidden = filtered.length > 0;
  }

  input.addEventListener("input", () => update(items));
  categoryFilter.addEventListener("change", () => update(items));
  clearButton.addEventListener("click", () => {
    input.value = "";
    categoryFilter.value = "";
    input.focus();
    update(items);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      input.focus();
    }
  });

  fetch(new URL("resources.json", document.baseURI))
    .then((response) => {
      if (!response.ok) throw new Error("Could not load resources");
      return response.json();
    })
    .then((resources) => {
      if (!Array.isArray(resources)) throw new Error("Invalid resource data");
      items = resources;
      input.disabled = categoryFilter.disabled = false;
      const categories = [...new Set(resources.map((resource) => resource.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "zh-Hant"));
      categories.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        categoryFilter.append(option);
      });
      update(resources);
    })
    .catch(() => {
      list.setAttribute("aria-busy", "false");
      list.hidden = true;
      count.textContent = "";
      loadError.hidden = false;
    });
})();
