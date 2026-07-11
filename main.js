const APP_CONFIG = {
  languageStorageKey: "goodsonstudio.language",
  youtubeOEmbedEndpoint: "https://www.youtube.com/oembed",
  youtubeApiScript: "https://www.youtube.com/iframe_api",
  youtubeEmbedBase: "https://www.youtube.com/embed/",
  youtubeParams: "autoplay=1&rel=0&modestbranding=1&playsinline=1",
  instagramEmbedScript: "https://www.instagram.com/embed.js",
  compactMenuBreakpoint: 1100,
  clickEffectDuration: 720,
  dragScrollThreshold: 6,
  dragScrollSpeed: 1,
  pageHeroPages: ["videos", "games", "photography", "partners"],
  gridBounds: {
    min: 1,
    max: 6
  },
  pageVisibility: {
    home: ["home", "philosophy"],
    videos: ["videos"],
    games: ["games"],
    photography: ["photography"],
    partners: ["partners"],
    contact: ["contact"]
  }
};

const dom = {
  brandLink: document.getElementById("brand-link"),
  siteNav: document.querySelector(".site-nav"),
  menuToggle: document.getElementById("menu-toggle"),
  navList: document.getElementById("nav-list"),
  langSwitch: document.getElementById("lang-switch"),
  heroSection: document.getElementById("home"),
  heroVideo: document.getElementById("hero-video"),
  heroLogo: document.getElementById("hero-logo"),
  heroHeadline: document.getElementById("hero-headline"),
  heroDescription: document.getElementById("hero-description"),
  scrollHint: document.getElementById("scroll-hint"),
  philosophySection: document.getElementById("philosophy"),
  videosSection: document.getElementById("videos"),
  gamesSection: document.getElementById("games"),
  photographySection: document.getElementById("photography"),
  partnersSection: document.getElementById("partners"),
  contactSection: document.getElementById("contact"),
  philosophyTitle: document.getElementById("philosophy-title"),
  videosTitle: document.getElementById("videos-title"),
  gamesTitle: document.getElementById("games-title"),
  photographyTitle: document.getElementById("photography-title"),
  partnersTitle: document.getElementById("partners-title"),
  contactTitle: document.getElementById("contact-title"),
  philosophyGrid: document.getElementById("philosophy-grid"),
  videosGrid: document.getElementById("videos-grid"),
  gamesGrid: document.getElementById("games-grid"),
  photographyGrid: document.getElementById("photography-grid"),
  partnersGrid: document.getElementById("partners-grid"),
  contactPanel: document.querySelector(".contact-panel"),
  lineQr: document.getElementById("line-qr"),
  lineLink: document.getElementById("line-link"),
  emailLink: document.getElementById("email-link"),
  footerText: document.getElementById("footer-text"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  modalClose: document.getElementById("modal-close")
};

const appState = {
  settings: null,
  labels: {},
  language: "zh",
  rootPath: document.body.dataset.rootPath || "./",
  settingsPath: document.body.dataset.settingsPath || "./setting.json",
  currentPage: (document.body.dataset.page || "home").toLowerCase(),
  menuOpen: false,
  oembedCache: new Map(),
  visibleSections: new Set(),
  modalImageToken: 0,
  modalStateToken: 0,
  dragScroll: null,
  lastFocusedElement: null,
  ytApiReadyPromise: null,
  activePlayer: null
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindGlobalEvents();
  prepareModalLayer();

  try {
    appState.settings = await loadSettings(appState.settingsPath);
    if (shouldHydrateVideoData()) {
      await hydrateMediaDataFromOEmbed();
    }
    initLanguage();
    renderSite();
  } catch (error) {
    console.error("Failed to load setting.json:", error);
    document.body.insertAdjacentHTML(
      "beforeend",
      "<p class=\"load-failure\">Unable to load content from setting.json.</p>"
    );
  }
}

async function loadSettings(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function initLanguage() {
  const siteConfig = appState.settings.site_config || {};
  const availableLanguages = siteConfig.available_languages || ["zh", "en"];
  const defaultLanguage = siteConfig.default_language || "zh";
  const savedLanguage = localStorage.getItem(APP_CONFIG.languageStorageKey);

  if (savedLanguage && availableLanguages.includes(savedLanguage)) {
    appState.language = savedLanguage;
    return;
  }

  appState.language = availableLanguages.includes(defaultLanguage) ? defaultLanguage : "zh";
}

function renderSite() {
  const settings = appState.settings || {};
  const siteConfig = settings.site_config || {};
  const sectionTitles = siteConfig.section_titles || {};
  const labels = localizeLabelSet(siteConfig.labels || {});
  const visibleSections = getVisibleSections();

  appState.labels = labels;
  appState.visibleSections = visibleSections;
  if (dom.siteNav) {
    dom.siteNav.setAttribute("aria-label", labels.nav_aria || "");
  }

  applyDocumentMeta(siteConfig);
  applyTheme(siteConfig.theme_colors || []);
  applyResponsiveGrid(siteConfig.responsive_grid || {});
  applyPageVisibility(visibleSections);
  renderNavigation(siteConfig.navigation || []);
  renderLanguageSwitcher(siteConfig);
  syncResponsiveMenu();
  renderPageHero(settings.page_heroes || {});
  renderHero(settings.home || {});
  renderSectionTitles(sectionTitles);
  if (visibleSections.has("philosophy")) {
    renderPhilosophy(settings.philosophy || []);
  }
  if (visibleSections.has("videos")) {
    if (settings.videos_page) {
      renderCategorizedMediaPage(dom.videosGrid, settings.videos_page, labels.play_video || "", {
        removeInstagramBlock: true
      });
    } else {
      renderVideoLikeGrid(dom.videosGrid, settings.videos || [], labels.play_video || "");
      renderVideosInstagramPosts(settings.videos_instagram_posts || []);
    }
  }
  if (visibleSections.has("games")) {
    if (settings.games_page) {
      renderCategorizedMediaPage(dom.gamesGrid, settings.games_page, labels.play_video || "");
    } else {
      renderVideoLikeGrid(dom.gamesGrid, settings.games || [], labels.play_video || "");
    }
  }
  if (visibleSections.has("photography")) {
    renderPhotography(settings.photography || [], settings.photography_page?.offer_blocks || []);
  }
  if (visibleSections.has("partners")) {
    renderPartners(settings.partners || []);
  }
  if (visibleSections.has("contact")) {
    renderContact(settings.contact || {});
  }
  renderFooter(siteConfig.footer_text || "");
  applyModalLabels();
}

function applyDocumentMeta(siteConfig) {
  const siteTitle = pickLocalized(siteConfig.site_title);
  if (siteTitle && dom.brandLink) {
    document.title = siteTitle;
    dom.brandLink.textContent = siteTitle;
    dom.brandLink.setAttribute("aria-label", siteTitle);
  }
  if (dom.brandLink) {
    dom.brandLink.href = buildRouteHref("home");
  }

  const languageTag = pickLocalized(siteConfig.language_tag);
  document.documentElement.lang = languageTag || appState.language;
}

function applyTheme(themeColors) {
  if (!Array.isArray(themeColors) || themeColors.length < 2) {
    return;
  }
  document.documentElement.style.setProperty("--color-base", themeColors[0]);
  document.documentElement.style.setProperty("--color-deep", themeColors[1]);
}

function applyResponsiveGrid(gridConfig) {
  const desktop = clampNumber(gridConfig.desktop, APP_CONFIG.gridBounds.min, APP_CONFIG.gridBounds.max, 3);
  const tablet = clampNumber(gridConfig.tablet, APP_CONFIG.gridBounds.min, APP_CONFIG.gridBounds.max, 2);
  const mobile = clampNumber(gridConfig.mobile, APP_CONFIG.gridBounds.min, APP_CONFIG.gridBounds.max, 1);

  document.documentElement.style.setProperty("--media-cols-desktop", desktop);
  document.documentElement.style.setProperty("--media-cols-tablet", tablet);
  document.documentElement.style.setProperty("--media-cols-mobile", mobile);
}

function getVisibleSections() {
  const visibleSectionList = APP_CONFIG.pageVisibility[appState.currentPage] || APP_CONFIG.pageVisibility.home;
  return new Set(visibleSectionList);
}

function applyPageVisibility(visibleSections) {
  const sectionSet = visibleSections || getVisibleSections();

  setHidden(dom.heroSection, !sectionSet.has("home"));
  setHidden(dom.philosophySection, !sectionSet.has("philosophy"));
  setHidden(dom.videosSection, !sectionSet.has("videos"));
  setHidden(dom.gamesSection, !sectionSet.has("games"));
  setHidden(dom.photographySection, !sectionSet.has("photography"));
  setHidden(dom.partnersSection, !sectionSet.has("partners"));
  setHidden(dom.contactSection, !sectionSet.has("contact"));

  document.body.classList.toggle("route-page", appState.currentPage !== "home");
}

function renderPageHero(pageHeroes) {
  let hero = document.querySelector(".page-hero");
  const heroConfig = pageHeroes[appState.currentPage];
  const shouldRender = APP_CONFIG.pageHeroPages.includes(appState.currentPage) && heroConfig;

  document.body.classList.toggle("has-page-hero", Boolean(shouldRender));

  if (!shouldRender) {
    hero?.remove();
    return;
  }

  if (!hero) {
    hero = document.createElement("section");
    hero.className = "page-hero";
    const main = document.querySelector("main");
    main?.before(hero);
  }

  const backgroundImage = resolveAssetPath(heroConfig.background_image || "");
  hero.style.backgroundImage = backgroundImage ? `url("${backgroundImage}")` : "";
  hero.setAttribute("aria-label", pickLocalized(heroConfig.image_alt || heroConfig.headline));

  const content = document.createElement("div");
  content.className = "page-hero-content";

  const headline = document.createElement("h1");
  headline.textContent = pickLocalized(heroConfig.headline);

  const subheadline = document.createElement("p");
  appendTextWithBreaks(subheadline, pickLocalized(heroConfig.subheadline));

  content.append(headline, subheadline);
  hero.replaceChildren(content);
}

function renderNavigation(navItems) {
  dom.navList.replaceChildren();
  const fragment = document.createDocumentFragment();

  navItems.forEach((item) => {
    const li = document.createElement("li");
    const anchor = document.createElement("a");
    const key = (item.key || item.path || "home").toLowerCase();

    anchor.href = buildRouteHref(item.path || "home");
    anchor.textContent = pickLocalized(item.label);

    if (key === appState.currentPage) {
      anchor.setAttribute("aria-current", "page");
    }

    li.appendChild(anchor);
    fragment.appendChild(li);
  });

  dom.navList.appendChild(fragment);
}

function renderLanguageSwitcher(siteConfig) {
  if (!dom.langSwitch) {
    return;
  }

  const languages = siteConfig.available_languages || ["zh", "en"];
  const languageNames = siteConfig.language_names || {};

  dom.langSwitch.replaceChildren();
  dom.langSwitch.setAttribute("aria-label", appState.labels.lang_switch_aria || "Language");

  const fragment = document.createDocumentFragment();

  languages.forEach((code) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lang-btn";
    button.dataset.language = code;
    button.textContent = pickLocalized(languageNames[code], code.toUpperCase());
    button.classList.toggle("is-active", code === appState.language);
    button.setAttribute("aria-pressed", code === appState.language ? "true" : "false");
    fragment.appendChild(button);
  });

  dom.langSwitch.appendChild(fragment);
}

function renderHero(home) {
  if (!dom.heroSection || dom.heroSection.hidden) {
    return;
  }

  dom.heroHeadline.textContent = pickLocalized(home.headline);
  dom.heroDescription.textContent = pickLocalized(home.description);
  dom.scrollHint.textContent = pickLocalized(home.scroll_hint);

  dom.heroLogo.src = resolveAssetPath(home.logo_path || "");
  dom.heroLogo.alt = pickLocalized(home.logo_alt);
  dom.heroLogo.onerror = () => {
    dom.heroLogo.style.display = "none";
  };

  dom.heroVideo.replaceChildren();
  if (home.video_bg) {
    const source = document.createElement("source");
    source.src = resolveAssetPath(home.video_bg);
    source.type = "video/mp4";
    dom.heroVideo.appendChild(source);
    dom.heroVideo.load();
  }
}

function setHidden(element, isHidden) {
  if (!element) {
    return;
  }
  element.hidden = isHidden;
}

function renderSectionTitles(titles) {
  setMultilineText(dom.philosophyTitle, pickLocalized(titles.philosophy));
  dom.videosTitle.textContent = pickLocalized(titles.videos);
  dom.gamesTitle.textContent = pickLocalized(titles.games);
  dom.photographyTitle.textContent = pickLocalized(titles.photography);
  dom.partnersTitle.textContent = pickLocalized(titles.partners);
  dom.contactTitle.textContent = pickLocalized(titles.contact);
}

function renderPhilosophy(blocks) {
  if (!dom.philosophyGrid) {
    return;
  }

  dom.philosophyGrid.replaceChildren();
  const fragment = document.createDocumentFragment();

  blocks.forEach((item) => {
    const card = document.createElement("article");
    card.className = "philosophy-card";

    const imagePath = resolveAssetPath(item.image_path || "");
    card.classList.toggle("has-philosophy-image", Boolean(imagePath));

    if (imagePath) {
      const figure = document.createElement("figure");
      figure.className = "philosophy-media";

      const image = document.createElement("img");
      image.src = imagePath;
      image.alt = pickLocalized(item.image_alt || "");
      image.loading = "lazy";
      image.decoding = "async";
      image.onerror = () => {
        figure.remove();
        card.classList.remove("has-philosophy-image");
      };

      figure.appendChild(image);
      card.appendChild(figure);
    }

    const body = document.createElement("div");
    body.className = "philosophy-body";

    const titleText = pickLocalized(item.title);
    const title = document.createElement("h3");
    title.textContent = titleText;

    const copy = document.createElement("div");
    copy.className = "philosophy-copy";
    const paragraphs = pickLocalizedParagraphs(item.paragraphs || item.content);
    const emphasisText = pickLocalized(item.emphasis_text || "");

    paragraphs.forEach((paragraphText) => {
      const paragraph = document.createElement("p");
      appendTextWithEmphasis(paragraph, paragraphText, emphasisText);
      copy.appendChild(paragraph);
    });

    if (!paragraphs.length) {
      const content = document.createElement("p");
      appendTextWithEmphasis(content, pickLocalized(item.content), emphasisText);
      copy.appendChild(content);
    }

    if (titleText) {
      body.appendChild(title);
    }
    body.appendChild(copy);
    card.appendChild(body);
    fragment.appendChild(card);
  });

  dom.philosophyGrid.appendChild(fragment);
}

function pickLocalizedParagraphs(value) {
  const selected = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null
      ? value[appState.language] ?? value.zh ?? value.en
      : value;

  if (Array.isArray(selected)) {
    return selected.map((item) => String(item || "")).filter(Boolean);
  }

  return String(selected || "")
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function appendTextWithEmphasis(element, text, emphasisText) {
  const normalizedText = String(text || "");
  const normalizedEmphasis = String(emphasisText || "");
  const emphasisIndex = normalizedEmphasis ? normalizedText.indexOf(normalizedEmphasis) : -1;

  if (emphasisIndex < 0) {
    appendTextWithBreaks(element, normalizedText);
    return;
  }

  appendTextWithBreaks(element, normalizedText.slice(0, emphasisIndex));
  const strong = document.createElement("strong");
  appendTextWithBreaks(strong, normalizedEmphasis);
  element.appendChild(strong);
  appendTextWithBreaks(element, normalizedText.slice(emphasisIndex + normalizedEmphasis.length));
}

function setMultilineText(element, text) {
  if (!element) {
    return;
  }

  element.replaceChildren();
  appendTextWithBreaks(element, text);
}

function appendTextWithBreaks(element, text) {
  const lines = String(text || "").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (index > 0) {
      element.appendChild(document.createElement("br"));
    }
    element.appendChild(document.createTextNode(line));
  });
}

function renderCategorizedMediaPage(container, pageData, actionLabel, options = {}) {
  if (!container) {
    return;
  }

  if (options.removeInstagramBlock) {
    removeVideosInstagramBlock();
  }

  container.className = "videos-page-layout";
  container.replaceChildren();

  const sections = Array.isArray(pageData.sections) ? pageData.sections : [];
  const fragment = document.createDocumentFragment();
  let hasInstagramEmbeds = false;

  sections.forEach((section) => {
    if (!section || typeof section !== "object") {
      return;
    }

    const sectionElement = document.createElement("section");
    sectionElement.className = "videos-content-section";

    const titleText = pickLocalized(section.title);
    if (titleText) {
      const title = document.createElement("h3");
      title.className = "videos-section-title";
      title.textContent = titleText;
      sectionElement.appendChild(title);
    }

    const categories = Array.isArray(section.categories) ? section.categories : [];
    categories.forEach((category) => {
      const categoryElement = createVideosCategory(section, category, actionLabel);
      if (categoryElement) {
        sectionElement.appendChild(categoryElement);
        hasInstagramEmbeds = hasInstagramEmbeds || isInstagramVideosSection(section);
      }
    });

    if (sectionElement.children.length > (titleText ? 1 : 0)) {
      fragment.appendChild(sectionElement);
    }
  });

  const offerBlocks = createOfferBlocksSection(pageData.offer_blocks || pageData.info_blocks || []);
  if (offerBlocks) {
    fragment.appendChild(offerBlocks);
  }

  container.appendChild(fragment);

  if (hasInstagramEmbeds) {
    processInstagramEmbeds();
  }
}

function createOfferBlocksSection(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "videos-offer-section";

  const grid = document.createElement("div");
  grid.className = "videos-offer-grid";

  blocks.forEach((block) => {
    if (!block || typeof block !== "object") {
      return;
    }

    const titleText = pickLocalized(block.title);
    const items = Array.isArray(block.items)
      ? block.items.map((item) => pickLocalized(item)).filter(Boolean)
      : [];

    if (!titleText && !items.length) {
      return;
    }

    const card = document.createElement("a");
    card.className = "videos-offer-card";
    card.href = buildRouteHref("contact");

    if (titleText) {
      const title = document.createElement("h3");
      title.textContent = titleText;
      card.appendChild(title);
    }

    if (items.length) {
      const list = document.createElement("ul");
      items.forEach((itemText) => {
        const item = document.createElement("li");
        item.textContent = itemText;
        list.appendChild(item);
      });
      card.appendChild(list);
    }

    grid.appendChild(card);
  });

  if (!grid.children.length) {
    return null;
  }

  section.appendChild(grid);
  return section;
}

function renderSiblingOfferBlocks(anchor, blocks, id) {
  if (!anchor || !id) {
    return;
  }

  removeSiblingOfferBlocks(id);

  const section = createOfferBlocksSection(blocks);
  if (!section) {
    return;
  }

  section.id = id;
  section.classList.add("sibling-offer-section");
  anchor.after(section);
}

function removeSiblingOfferBlocks(id) {
  if (!id) {
    return;
  }
  document.getElementById(id)?.remove();
}

function createVideosCategory(section, category, actionLabel) {
  if (!category || typeof category !== "object") {
    return null;
  }

  const items = Array.isArray(category.items) ? category.items : [];
  if (!items.length) {
    return null;
  }

  const categoryElement = document.createElement("section");
  categoryElement.className = "videos-category";

  const titleText = pickLocalized(category.title);
  if (titleText) {
    const title = document.createElement("h4");
    title.className = "videos-category-title";
    title.textContent = titleText;
    categoryElement.appendChild(title);
  }

  if (isInstagramVideosSection(section)) {
    const grid = document.createElement("div");
    grid.className = "instagram-embed-grid videos-category-grid";
    items.forEach((item) => {
      grid.appendChild(createHorizontalInstagramCard(item));
    });
    categoryElement.appendChild(grid);
    return categoryElement;
  }

  const grid = document.createElement("div");
  grid.className = "media-grid videos-category-grid";
  items.forEach((item) => {
    grid.appendChild(createVideoCard(item, actionLabel));
  });
  categoryElement.appendChild(grid);
  return categoryElement;
}

function isInstagramVideosSection(section) {
  const type = String(section?.type || section?.content_type || "").toLowerCase();
  return type.includes("instagram") || type.includes("reel") || type.includes("short");
}

function renderVideoLikeGrid(container, items, actionLabel) {
  if (!container) {
    return;
  }

  container.className = "media-grid";
  removeVideosInstagramBlock();
  container.replaceChildren();
  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    fragment.appendChild(createVideoCard(item, actionLabel));
  });

  container.appendChild(fragment);
}

function createVideoCard(item, actionLabel) {
  const videoId = getVideoIdFromItem(item);
  const titleText = pickLocalized(item?.title, videoId || actionLabel);
  const descriptionText = pickLocalized(item?.description);
  const thumbnailPath = item?.thumbnail || getYouTubeThumbnail(videoId);

  const card = document.createElement("article");
  card.className = "media-card";
  card.dataset.action = "play-video";
  card.dataset.videoId = videoId;
  card.dataset.title = titleText;

  const thumb = document.createElement("img");
  thumb.className = "media-thumb";
  thumb.src = resolveAssetPath(thumbnailPath);
  thumb.alt = titleText;
  thumb.loading = "lazy";
  thumb.decoding = "async";
  thumb.fetchPriority = "low";
  thumb.draggable = false;

  const thumbButton = document.createElement("button");
  thumbButton.type = "button";
  thumbButton.className = "media-thumb-button";
  thumbButton.dataset.action = "play-video";
  thumbButton.dataset.videoId = videoId;
  thumbButton.dataset.title = titleText;
  thumbButton.appendChild(thumb);

  const content = document.createElement("div");
  content.className = "media-content";

  const title = document.createElement("h3");
  title.textContent = titleText;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "media-action";
  button.dataset.action = "play-video";
  button.dataset.videoId = videoId;
  button.dataset.title = titleText;
  button.textContent = actionLabel || titleText;

  content.appendChild(title);

  if (descriptionText) {
    const description = document.createElement("p");
    description.textContent = descriptionText;
    content.appendChild(description);
  }

  content.appendChild(button);
  card.append(thumbButton, content);
  return card;
}

function getVideoIdFromItem(item) {
  return extractYouTubeId(item?.youtube_id || item?.youtube_url || item?.url || "");
}

function getYouTubeThumbnail(videoId) {
  return videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : "";
}

function renderPhotography(items, offerBlocks = []) {
  if (!dom.photographyGrid) {
    return;
  }

  removeSiblingOfferBlocks("photography-offer-blocks");
  dom.photographyGrid.classList.remove("instagram-grid", "instagram-feed-grid");
  dom.photographyGrid.classList.add("instagram-embed-grid");
  dom.photographyGrid.replaceChildren();

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    fragment.appendChild(createInstagramEmbed(item));
  });

  dom.photographyGrid.appendChild(fragment);
  renderSiblingOfferBlocks(dom.photographyGrid, offerBlocks, "photography-offer-blocks");
  processInstagramEmbeds();
}

function renderVideosInstagramPosts(items) {
  const container = getOrCreateVideosInstagramGrid();
  if (!container) {
    return;
  }

  container.replaceChildren();
  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    fragment.appendChild(createInstagramEmbed(item));
  });

  container.appendChild(fragment);
  processInstagramEmbeds();
}

function getOrCreateVideosInstagramGrid() {
  if (!dom.videosGrid) {
    return null;
  }

  let block = document.getElementById("videos-instagram-block");
  if (!block) {
    block = document.createElement("div");
    block.id = "videos-instagram-block";
    block.className = "videos-instagram-block";

    const grid = document.createElement("div");
    grid.id = "videos-instagram-grid";
    grid.className = "instagram-embed-grid";
    block.appendChild(grid);
    dom.videosGrid.after(block);
  }

  return block.querySelector(".instagram-embed-grid");
}

function removeVideosInstagramBlock() {
  document.getElementById("videos-instagram-block")?.remove();
}

function createHorizontalInstagramCard(item = {}) {
  const permalink = normalizeInstagramPermalink(item?.permalink || item?.instagram_url || item?.url || "");
  const card = document.createElement("div");
  card.className = "instagram-drag-card";
  card.dataset.instgrmPermalink = permalink;
  card.tabIndex = 0;
  card.setAttribute("role", "link");

  const overlay = document.createElement("button");
  overlay.type = "button";
  overlay.className = "instagram-drag-overlay";
  overlay.dataset.action = "open-instagram";
  overlay.dataset.instagramUrl = permalink;
  overlay.setAttribute("aria-label", "Open Instagram Reel");

  card.append(createInstagramEmbed({ ...item, permalink }), overlay);
  return card;
}

function createInstagramEmbed(item = {}) {
  const permalink = normalizeInstagramPermalink(item?.permalink || item?.instagram_url || item?.url || "");
  const blockquote = document.createElement("blockquote");
  blockquote.className = "instagram-media";
  blockquote.dataset.instgrmPermalink = permalink;
  blockquote.tabIndex = 0;
  blockquote.setAttribute("role", "link");
  return blockquote;
}

function normalizeInstagramPermalink(value) {
  const cleaned = String(value || "").trim().replace(/\s+/g, "");
  if (!cleaned) {
    return "";
  }

  try {
    const url = new URL(cleaned);
    url.search = "";
    url.hash = "";
    const normalized = url.toString();
    return normalized.endsWith("/") ? normalized : `${normalized}/`;
  } catch (error) {
    return cleaned.endsWith("/") ? cleaned : `${cleaned}/`;
  }
}

function getInstagramEmbedUrl(permalink) {
  const normalizedPermalink = normalizeInstagramPermalink(permalink);
  return normalizedPermalink ? `${normalizedPermalink}embed` : "";
}

function processInstagramEmbeds() {
  if (window.instgrm?.Embeds?.process) {
    window.instgrm.Embeds.process();
    return;
  }

  if (document.querySelector(`script[src="${APP_CONFIG.instagramEmbedScript}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = APP_CONFIG.instagramEmbedScript;
  document.body.appendChild(script);
}

function renderPartners(partners) {
  if (!dom.partnersGrid) {
    return;
  }

  dom.partnersGrid.replaceChildren();
  const fragment = document.createDocumentFragment();

  partners.forEach((partner) => {
    const card = document.createElement("article");
    card.className = "partner-card";

    if (partner.logo_path) {
      const logo = document.createElement("img");
      logo.src = resolveAssetPath(partner.logo_path);
      logo.alt = pickLocalized(partner.name);
      logo.loading = "lazy";
      logo.decoding = "async";
      logo.fetchPriority = "low";
      card.appendChild(logo);
    }

    const name = document.createElement("h3");
    name.textContent = pickLocalized(partner.name);
    card.appendChild(name);
    fragment.appendChild(card);
  });

  dom.partnersGrid.appendChild(fragment);
}

function renderContact(contact) {
  if (!dom.contactPanel) {
    return;
  }

  dom.contactPanel.replaceChildren();

  const intro = document.createElement("div");
  intro.className = "contact-intro";

  const kicker = document.createElement("p");
  kicker.className = "contact-kicker";
  kicker.textContent = pickLocalized(contact.kicker);

  const heading = document.createElement("h3");
  heading.textContent = pickLocalized(contact.heading);

  const message = document.createElement("p");
  message.className = "contact-message";
  message.textContent = pickLocalized(contact.business_message);

  intro.append(kicker, heading, message);

  const email = contact.business_email || contact.email || "";
  if (email) {
    const emailLink = document.createElement("a");
    emailLink.className = "contact-email";
    emailLink.href = `mailto:${email}`;
    emailLink.textContent = email;
    intro.appendChild(emailLink);
  }

  const socials = document.createElement("div");
  socials.className = "contact-socials";

  (contact.social_links || []).forEach((item) => {
    const link = document.createElement("a");
    link.className = "contact-social-link";
    link.href = item.url || "#";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.setProperty("--social-color", item.color || "var(--color-highlight)");

    const icon = document.createElement("span");
    icon.className = "contact-social-icon";
    icon.setAttribute("aria-hidden", "true");

    if (item.logo_path) {
      const logo = document.createElement("img");
      logo.className = "contact-social-logo";
      logo.src = resolveAssetPath(item.logo_path);
      logo.alt = "";
      logo.loading = "lazy";
      logo.decoding = "async";
      icon.appendChild(logo);
    } else {
      icon.textContent = item.icon || getSocialInitial(item.label);
    }

    const text = document.createElement("span");
    text.className = "contact-social-text";
    text.textContent = item.label || "";

    link.append(icon, text);
    socials.appendChild(link);
  });

  const side = document.createElement("div");
  side.className = "contact-side";

  const visualPath = resolveAssetPath(contact.visual_gif_path || contact.gif_path || "");
  if (visualPath) {
    const figure = document.createElement("figure");
    figure.className = "contact-visual";

    const image = document.createElement("img");
    image.src = visualPath;
    image.alt = pickLocalized(contact.visual_gif_alt || "");
    image.loading = "lazy";
    image.decoding = "async";
    image.onerror = () => figure.remove();

    figure.appendChild(image);
    side.appendChild(figure);
  }

  side.appendChild(socials);
  dom.contactPanel.append(intro, side);
}

function renderFooter(footerText) {
  if (!dom.footerText) {
    return;
  }
  setMultilineText(dom.footerText, pickLocalized(footerText));
}

function getSocialInitial(label) {
  if (typeof label !== "string" || !label.trim()) {
    return ">";
  }
  return label.trim().slice(0, 1).toUpperCase();
}

function applyModalLabels() {
  if (!dom.modalClose) {
    return;
  }
  const closeLabel = appState.labels.close_label || "";
  dom.modalClose.setAttribute("aria-label", closeLabel);
  dom.modalClose.title = closeLabel;
}

function bindGlobalEvents() {
  document.addEventListener("pointerdown", createClickEffect);
  document.addEventListener("pointerdown", startHorizontalDragScroll);
  document.addEventListener("pointermove", updateHorizontalDragScroll, { passive: false });
  document.addEventListener("pointerup", stopHorizontalDragScroll);
  document.addEventListener("pointercancel", stopHorizontalDragScroll);
  document.addEventListener("dragstart", preventHorizontalGridNativeDrag);

  document.addEventListener("click", (event) => {
    if (shouldSuppressHorizontalDragClick(event)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const languageButton = event.target.closest("[data-language]");
    if (languageButton) {
      setLanguage(languageButton.dataset.language || "");
      return;
    }

    const navLink = event.target.closest(".site-nav a");
    if (navLink && isCompactMenu()) {
      setMenuOpen(false);
      return;
    }

    const trigger = event.target.closest("[data-action]");
    if (!trigger) {
      if (appState.menuOpen && isCompactMenu() && !event.target.closest(".site-header-actions")) {
        setMenuOpen(false);
      }
      return;
    }

    handleActionTrigger(trigger);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isModalOpen()) {
      closeModal();
    } else if (event.key === "Escape" && appState.menuOpen) {
      setMenuOpen(false);
    }
  });

  window.addEventListener("resize", syncResponsiveMenu);
}

function createClickEffect(event) {
  if (event.button !== 0 || event.pointerType === "touch") {
    return;
  }

  const effect = document.createElement("span");
  effect.className = "click-effect";
  effect.style.left = `${event.clientX}px`;
  effect.style.top = `${event.clientY}px`;

  document.body.appendChild(effect);
  window.setTimeout(() => effect.remove(), APP_CONFIG.clickEffectDuration);
}

function preventHorizontalGridNativeDrag(event) {
  if (event.target.closest(".videos-category-grid")) {
    event.preventDefault();
  }
}

function startHorizontalDragScroll(event) {
  if (event.button !== 0 || event.pointerType !== "mouse") {
    return;
  }

  const grid = event.target.closest(".videos-category-grid");
  if (!grid || grid.scrollWidth <= grid.clientWidth) {
    return;
  }

  appState.dragScroll = {
    active: true,
    didDrag: false,
    pointerId: event.pointerId,
    grid,
    actionTrigger: event.target.closest("[data-action]"),
    startX: event.clientX,
    startY: event.clientY,
    startScrollLeft: grid.scrollLeft,
    suppressClickUntil: 0,
    suppressClickGrid: null
  };

  grid.classList.add("is-grabbed");

  if (typeof grid.setPointerCapture === "function") {
    try {
      grid.setPointerCapture(event.pointerId);
    } catch (error) {
      // Some browsers only allow capture on the original pointer target.
    }
  }
}

function updateHorizontalDragScroll(event) {
  const drag = appState.dragScroll;
  if (!drag?.active || drag.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - drag.startX;
  const deltaY = event.clientY - drag.startY;

  if (!drag.didDrag) {
    const movedFarEnough = Math.abs(deltaX) >= APP_CONFIG.dragScrollThreshold;
    const mostlyHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

    if (!movedFarEnough || !mostlyHorizontal) {
      return;
    }

    drag.didDrag = true;
    drag.grid.classList.add("is-dragging");
    document.body.classList.add("is-horizontal-dragging");
  }

  event.preventDefault();
  drag.grid.scrollLeft = drag.startScrollLeft - (deltaX * APP_CONFIG.dragScrollSpeed);
}

function stopHorizontalDragScroll(event) {
  const drag = appState.dragScroll;
  if (!drag?.active || drag.pointerId !== event.pointerId) {
    return;
  }

  drag.grid.classList.remove("is-grabbed", "is-dragging");
  document.body.classList.remove("is-horizontal-dragging");

  if (typeof drag.grid.releasePointerCapture === "function") {
    try {
      drag.grid.releasePointerCapture(event.pointerId);
    } catch (error) {
      // The pointer may already be released by the browser.
    }
  }

  if (!drag.didDrag && drag.actionTrigger) {
    handleActionTrigger(drag.actionTrigger);
    appState.dragScroll = {
      active: false,
      suppressClickGrid: drag.grid,
      suppressClickUntil: performance.now() + 420
    };
    return;
  }

  appState.dragScroll = drag.didDrag
    ? {
        active: false,
        suppressClickGrid: drag.grid,
        suppressClickUntil: performance.now() + 260
      }
    : null;
}

function shouldSuppressHorizontalDragClick(event) {
  const drag = appState.dragScroll;
  if (!drag?.suppressClickUntil) {
    return false;
  }

  const shouldSuppress = performance.now() <= drag.suppressClickUntil
    && drag.suppressClickGrid?.contains(event.target);

  if (!shouldSuppress || performance.now() > drag.suppressClickUntil) {
    appState.dragScroll = null;
  }

  return shouldSuppress;
}

function handleActionTrigger(trigger) {
  if (!trigger?.dataset) {
    return;
  }

  const action = trigger.dataset.action;
  if (action === "play-video") {
    openVideoModal(trigger.dataset.videoId || "", trigger.dataset.title || "");
  } else if (action === "open-image") {
    openImageModal(
      trigger.dataset.url || "",
      trigger.dataset.alt || "",
      trigger.dataset.title || "",
      trigger.dataset.previewUrl || ""
    );
  } else if (action === "open-instagram") {
    openInstagramModal(trigger.dataset.instagramUrl || "");
  } else if (action === "close-modal") {
    closeModal();
  } else if (action === "toggle-menu") {
    toggleMenu();
  }
}

function setLanguage(nextLanguage) {
  const siteConfig = appState.settings.site_config || {};
  const availableLanguages = siteConfig.available_languages || [];
  if (!availableLanguages.includes(nextLanguage)) {
    return;
  }
  appState.language = nextLanguage;
  localStorage.setItem(APP_CONFIG.languageStorageKey, nextLanguage);
  closeModal();
  renderSite();
}

function toggleMenu() {
  setMenuOpen(!appState.menuOpen);
}

function setMenuOpen(nextState) {
  if (!dom.menuToggle) {
    return;
  }

  if (!isCompactMenu()) {
    appState.menuOpen = false;
    document.body.classList.remove("menu-open");
    dom.menuToggle.setAttribute("aria-expanded", "false");
    updateMenuToggleLabel();
    return;
  }

  appState.menuOpen = Boolean(nextState);
  document.body.classList.toggle("menu-open", appState.menuOpen);
  dom.menuToggle.setAttribute("aria-expanded", appState.menuOpen ? "true" : "false");
  updateMenuToggleLabel();
}

function syncResponsiveMenu() {
  if (!dom.menuToggle) {
    return;
  }

  const compactMode = isCompactMenu();
  dom.menuToggle.hidden = !compactMode;

  if (!compactMode && appState.menuOpen) {
    appState.menuOpen = false;
    document.body.classList.remove("menu-open");
  }

  dom.menuToggle.setAttribute("aria-expanded", compactMode && appState.menuOpen ? "true" : "false");
  updateMenuToggleLabel();
}

function updateMenuToggleLabel() {
  if (!dom.menuToggle) {
    return;
  }

  const openText = appState.labels.menu_open || "Menu";
  const closeText = appState.labels.menu_close || "Close";
  const buttonText = appState.menuOpen ? closeText : openText;

  dom.menuToggle.textContent = buttonText;
  dom.menuToggle.setAttribute("aria-label", buttonText);
}

function isCompactMenu() {
  return window.innerWidth <= APP_CONFIG.compactMenuBreakpoint;
}

function shouldHydrateVideoData() {
  return appState.currentPage === "videos" || appState.currentPage === "games";
}

async function hydrateMediaDataFromOEmbed() {
  if (!appState.settings || typeof appState.settings !== "object") {
    return;
  }

  await Promise.all([
    hydrateCategorizedMediaPageItems("videos_page"),
    hydrateCategorizedMediaPageItems("games_page"),
    hydrateMediaSectionItems("videos"),
    hydrateMediaSectionItems("games")
  ]);
}

async function hydrateCategorizedMediaPageItems(pageKey) {
  const pageData = appState.settings[pageKey];
  if (!pageData || !Array.isArray(pageData.sections)) {
    return;
  }

  const sections = await Promise.all(pageData.sections.map(async (section) => {
    if (!section || typeof section !== "object" || isInstagramVideosSection(section)) {
      return section;
    }

    const nextSection = { ...section };

    if (Array.isArray(section.items)) {
      nextSection.items = await Promise.all(section.items.map((item) => hydrateSingleMediaItem(item)));
    }

    if (Array.isArray(section.categories)) {
      nextSection.categories = await Promise.all(section.categories.map(async (category) => {
        if (!category || typeof category !== "object" || !Array.isArray(category.items)) {
          return category;
        }
        return {
          ...category,
          items: await Promise.all(category.items.map((item) => hydrateSingleMediaItem(item)))
        };
      }));
    }

    return nextSection;
  }));

  appState.settings[pageKey] = {
    ...pageData,
    sections
  };
}

async function hydrateMediaSectionItems(sectionKey) {
  const sourceItems = appState.settings[sectionKey];
  if (!Array.isArray(sourceItems) || sourceItems.length === 0) {
    return;
  }

  const hydratedItems = await Promise.all(sourceItems.map((item) => hydrateSingleMediaItem(item)));
  appState.settings[sectionKey] = hydratedItems;
}

async function hydrateSingleMediaItem(item) {
  if (!item || typeof item !== "object") {
    return item;
  }

  const nextItem = { ...item };
  const needsTitleFallback = !hasTextContent(nextItem.title);
  const needsDescriptionFallback = !hasTextContent(nextItem.description);
  const needsThumbnailFallback = !isRelativePath(nextItem.thumbnail);

  if (!needsTitleFallback && !needsDescriptionFallback && !needsThumbnailFallback) {
    return nextItem;
  }

  const videoId = getVideoIdFromItem(nextItem);
  if (!videoId) {
    return nextItem;
  }
  nextItem.youtube_id = videoId;

  const videoInfo = await fetchYouTubeOEmbed(videoId);
  if (!videoInfo) {
    return nextItem;
  }

  if (needsTitleFallback && hasTextContent(videoInfo.title)) {
    nextItem.title = videoInfo.title;
  }
  if (needsDescriptionFallback && hasTextContent(videoInfo.provider_name)) {
    nextItem.description = videoInfo.provider_name;
  }
  if (needsThumbnailFallback && hasTextContent(videoInfo.thumbnail_url)) {
    nextItem.thumbnail = videoInfo.thumbnail_url;
  }

  return nextItem;
}

async function fetchYouTubeOEmbed(videoId) {
  if (appState.oembedCache.has(videoId)) {
    return appState.oembedCache.get(videoId);
  }

  const resourceUrl = `https://youtu.be/${encodeURIComponent(videoId)}`;
  const endpoint = `${APP_CONFIG.youtubeOEmbedEndpoint}?url=${encodeURIComponent(resourceUrl)}&format=json`;

  const requestPromise = fetch(endpoint, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`oEmbed request failed: ${response.status}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.warn("Failed to fetch YouTube oEmbed metadata:", videoId, error);
      return null;
    });

  appState.oembedCache.set(videoId, requestPromise);
  return requestPromise;
}

function hasTextContent(value) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number") {
    return true;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.values(value).some((entry) => typeof entry === "string" && entry.trim().length > 0);
  }
  return false;
}

function isRelativePath(value) {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }
  return !/^(?:[a-z]+:|\/\/|\/|#)/i.test(normalized);
}

function extractYouTubeId(rawVideoId) {
  if (typeof rawVideoId !== "string") {
    return "";
  }
  const normalized = rawVideoId.trim();
  if (!normalized) {
    return "";
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(normalized)) {
    return normalized;
  }

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (hostname.endsWith("youtube.com") || hostname.endsWith("youtube-nocookie.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId) {
        return watchId;
      }

      const segments = url.pathname.split("/").filter(Boolean);
      const markerIndex = segments.findIndex((segment) => ["embed", "shorts", "live"].includes(segment));
      if (markerIndex >= 0 && segments[markerIndex + 1]) {
        return segments[markerIndex + 1];
      }
    }
  } catch (error) {
    const match = normalized.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
    return match?.[1] || "";
  }

  return "";
}

function openVideoModal(youtubeId, title) {
  if (!youtubeId) {
    return;
  }
  appState.lastFocusedElement = document.activeElement;
  setModalVariant("video");
  if (dom.modalTitle) {
    dom.modalTitle.textContent = appState.labels.youtube_modal_title || "YouTube Videos";
  }

  openModal();
  const frame = document.createElement("div");
  frame.className = "video-frame";
  const iframe = document.createElement("iframe");
  iframe.src = `${APP_CONFIG.youtubeEmbedBase}${encodeURIComponent(youtubeId)}?${APP_CONFIG.youtubeParams}`;
  iframe.title = title;
  iframe.loading = "eager";
  iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
  iframe.setAttribute("allowfullscreen", "");
  frame.appendChild(iframe);
  if (dom.modalBody) {
    dom.modalBody.replaceChildren(frame);
  }
}

function openInstagramModal(permalink) {
  const normalizedPermalink = normalizeInstagramPermalink(permalink);
  if (!normalizedPermalink) {
    return;
  }

  appState.lastFocusedElement = document.activeElement;
  setModalVariant("instagram");
  if (dom.modalTitle) {
    dom.modalTitle.textContent = appState.labels.instagram_modal_title || "Instagram Reels";
  }

  openModal();

  const frame = document.createElement("div");
  frame.className = "instagram-modal-frame";
  const iframe = document.createElement("iframe");
  iframe.className = "instagram-modal-iframe";
  iframe.src = getInstagramEmbedUrl(normalizedPermalink);
  iframe.title = "Instagram Reel";
  iframe.loading = "eager";
  iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
  iframe.setAttribute("allowfullscreen", "");
  frame.appendChild(iframe);

  if (dom.modalBody) {
    dom.modalBody.replaceChildren(frame);
  }
}

function openImageModal(imageUrl, altText, title, previewUrl = "") {
  if (!imageUrl) {
    return;
  }
  appState.lastFocusedElement = document.activeElement;
  setModalVariant("image");
  if (dom.modalTitle) {
    dom.modalTitle.textContent = title;
  }

  openModal();

  const imageToken = ++appState.modalImageToken;
  const loading = previewUrl ? document.createElement("img") : document.createElement("div");
  if (previewUrl) {
    loading.className = "lightbox-image lightbox-image-preview";
    loading.src = previewUrl;
    loading.alt = altText;
    loading.decoding = "async";
  } else {
    loading.className = "lightbox-loading";
    loading.textContent = appState.labels.loading_image || "Loading image...";
  }
  if (dom.modalBody) {
    dom.modalBody.replaceChildren(loading);
  }

  requestAnimationFrame(() => {
    const image = new Image();
    image.className = "lightbox-image";
    image.alt = altText;
    image.decoding = "async";
    image.fetchPriority = "high";
    image.src = imageUrl;

    const commitImage = () => {
      if (!isModalOpen() || imageToken !== appState.modalImageToken) {
        return;
      }
      if (dom.modalBody) {
        dom.modalBody.replaceChildren(image);
      }
    };

    if (typeof image.decode === "function") {
      image.decode().then(commitImage).catch(commitImage);
    } else {
      image.addEventListener("load", commitImage, { once: true });
      image.addEventListener("error", commitImage, { once: true });
    }
  });
}

function closeModal() {
  if (!dom.modal) {
    return;
  }

  appState.modalImageToken += 1;
  const closeToken = ++appState.modalStateToken;
  dom.modal.classList.remove("is-open");
  dom.modal.setAttribute("aria-hidden", "true");

  const restoreFocusTarget = appState.lastFocusedElement;
  runInIdle(() => {
    if (restoreFocusTarget && typeof restoreFocusTarget.focus === "function") {
      restoreFocusTarget.focus();
    }
  });

  runInIdle(() => {
    if (closeToken !== appState.modalStateToken || isModalOpen()) {
      return;
    }
    if (appState.activePlayer && typeof appState.activePlayer.destroy === "function") {
      appState.activePlayer.destroy();
      appState.activePlayer = null;
    }
    if (dom.modalBody) {
      dom.modalBody.textContent = "";
    }
  });
}

function prepareModalLayer() {
  if (!dom.modal) {
    return;
  }
  dom.modal.hidden = false;
  setModalVariant("");
  dom.modal.classList.remove("is-open");
  dom.modal.setAttribute("aria-hidden", "true");
}

function setModalVariant(variant) {
  if (!dom.modal) {
    return;
  }

  dom.modal.classList.remove("is-video-modal", "is-instagram-modal", "is-image-modal");
  if (variant) {
    dom.modal.classList.add(`is-${variant}-modal`);
  }
}

function openModal() {
  if (!dom.modal) {
    return;
  }
  appState.modalStateToken += 1;
  dom.modal.classList.add("is-open");
  dom.modal.setAttribute("aria-hidden", "false");
}

function isModalOpen() {
  return Boolean(dom.modal && dom.modal.classList.contains("is-open"));
}

function runInIdle(callback) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback, { timeout: 300 });
    return;
  }
  setTimeout(callback, 120);
}

function ensureYouTubeApi() {
  if (window.YT && typeof window.YT.Player === "function") {
    return Promise.resolve();
  }

  if (appState.ytApiReadyPromise) {
    return appState.ytApiReadyPromise;
  }

  appState.ytApiReadyPromise = new Promise((resolve, reject) => {
    const previousHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousHandler === "function") {
        previousHandler();
      }
      resolve();
    };

    const script = document.createElement("script");
    script.src = APP_CONFIG.youtubeApiScript;
    script.async = true;
    script.onerror = () => reject(new Error("Unable to load YouTube API script"));
    document.head.appendChild(script);
  });

  return appState.ytApiReadyPromise;
}

function localizeLabelSet(source) {
  const result = {};
  for (const [key, value] of Object.entries(source)) {
    result[key] = pickLocalized(value);
  }
  return result;
}

function pickLocalized(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return String(value[appState.language] ?? value.zh ?? value.en ?? fallback);
  }
  return fallback;
}

function resolveAssetPath(path) {
  if (!path) {
    return "";
  }
  if (/^(https?:|mailto:|tel:|data:|#|\/)/i.test(path)) {
    return path;
  }
  return `${appState.rootPath}${path}`;
}

function buildRouteHref(path) {
  const normalizedRoot = appState.rootPath.endsWith("/") ? appState.rootPath : `${appState.rootPath}/`;
  if (!path || path === "home") {
    return normalizedRoot;
  }
  return `${normalizedRoot}${path.replace(/^\/+|\/+$/g, "")}`;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
