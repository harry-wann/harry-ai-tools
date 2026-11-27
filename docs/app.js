(() => {
  const input = document.querySelector("#search-input");
  const categoryFilter = document.querySelector("#category-filter");
  const list = document.querySelector("#resource-list");
  const count = document.querySelector("#result-count");
  const checkedDate = document.querySelector("#checked-date");
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

  function resourceType(resource) {
    return String(resource.type || resource.category || "未分類").trim() || "未分類";
  }

  function makeCard(resource) {
    const card = document.createElement("article");
    card.className = "resource-card";

    const heading = document.createElement("h3");
    heading.textContent = resource.name || "未命名資源";
    const summary = document.createElement("p");
    summary.className = "card-summary";
    summary.textContent = resource.summary || "";
    card.append(heading, summary);

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

    const fields = document.createElement("dl");
    fields.className = "resource-fields";
    const github = safeUrl(resource.github);
    if (github) {
      appendLinkField(fields, "GitHub", new URL(github).pathname.split("/").slice(1, 3).join("/"), github);
    } else {
      appendTextField(fields, "GitHub", "未收錄", false);
    }
    const install = String(resource.install ?? "").trim();
    if (install) appendTextField(fields, isInstallType(resource) ? "安裝方式" : "使用方式", install, true);
    const isGitHubRepo = Boolean(github || isGitHubUrl(resource.url));
    if (github && resource.version && !["無正式 Release", "未提供"].includes(resource.version)) {
      const repoPath = new URL(github).pathname.split("/").slice(1, 3).join("/");
      const releaseUrl = "https://github.com/" + repoPath + "/releases/tag/" + encodeURIComponent(resource.version);
      appendLinkField(fields, "最新版本（Repo）", resource.version, releaseUrl);
    } else {
      appendTextField(fields, isGitHubRepo ? "最新版本（Repo）" : "版本", resource.version || "未提供", false);
    }
    appendTextField(fields, isGitHubRepo ? "最後更新（Repo）" : "最後更新", resource.updated || "未提供", false);

    const notes = String(resource.notes ?? resource.body ?? "").trim();

    const source = safeUrl(resource.url);
    if (source && source !== github) appendLinkField(fields, "來源", "查看原始來源", source);
    if (fields.childElementCount) card.append(fields);

    if (notes) {
      const details = document.createElement("details");
      details.className = "card-details";
      const toggle = document.createElement("summary");
      toggle.textContent = "查看筆記";
      const note = document.createElement("p");
      note.className = "card-body";
      note.textContent = notes;
      details.append(toggle, note);
      card.append(details);
    }
    return card;
  }

  function isGitHubUrl(value) {
    const url = safeUrl(value);
    return Boolean(url && new URL(url).hostname.toLowerCase() === "github.com");
  }

  function appendTextField(container, label, value, preserveLines) {
    const field = document.createElement("div");
    field.className = "resource-field";
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.className = preserveLines ? "field-value preserve-lines" : "field-value";
    description.textContent = value;
    field.append(term, description);
    container.append(field);
  }

  function appendLinkField(container, label, text, url) {
    const field = document.createElement("div");
    field.className = "resource-field";
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    const link = document.createElement("a");
    link.className = "source-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = text;
    description.append(link);
    field.append(term, description);
    container.append(field);
  }

  function isInstallType(resource) {
    return ["MCP", "Skills", "外掛", "CLI", "應用工具"].includes(resourceType(resource));
  }

  function typePriority(type) {
    if (/^mcp\b/i.test(type)) return 0;
    if (/^skills?\b/i.test(type)) return 1;
    return 2;
  }

  function update(resources) {
    const query = normalize(input.value);
    const category = categoryFilter.value;
    const filtered = resources.filter((resource) => {
      const type = resourceType(resource);
      if (category && type !== category) return false;
      if (!query) return true;
      const searchable = normalize([
        resource.name,
        resource.summary,
        type,
        ...(Array.isArray(resource.tags) ? resource.tags : []),
        resource.category,
        resource.notes,
        resource.body,
        resource.install,
        resource.github,
        resource.url,
      ].join(" "));
      return searchable.includes(query);
    });

    const groups = new Map();
    filtered.forEach((resource) => {
      const type = resourceType(resource);
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type).push(resource);
    });
    const sortedTypes = [...groups.keys()].sort((a, b) => typePriority(a) - typePriority(b) || a.localeCompare(b, "zh-Hant"));
    const content = document.createDocumentFragment();
    sortedTypes.forEach((type) => {
      const section = document.createElement("section");
      section.className = "resource-group";
      section.setAttribute("aria-label", type);
      const heading = document.createElement("h3");
      heading.className = "group-heading";
      heading.textContent = type;
      const cards = document.createElement("div");
      cards.className = "resource-list";
      groups.get(type).forEach((resource) => cards.append(makeCard(resource)));
      section.append(heading, cards);
      content.append(section);
    });
    list.replaceChildren(content);
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
      const checkedDates = resources.map((resource) => resource.checked).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date || ""));
      const latestCheck = checkedDates.sort().at(-1);
      checkedDate.textContent = latestCheck ? `全站查核日期 ${latestCheck}` : "全站查核日期未提供";
      const types = [...new Set(resources.map(resourceType))]
        .sort((a, b) => typePriority(a) - typePriority(b) || a.localeCompare(b, "zh-Hant"));
      types.forEach((name) => {
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
