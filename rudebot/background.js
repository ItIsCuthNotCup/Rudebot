const SKIP_PATTERNS = [
  /^chrome:\/\//,
  /^chrome-extension:\/\//,
  /^about:/,
  /^edge:\/\//,
  /^brave:\/\//
];

const SKIP_DOMAINS = ["localhost", "127.0.0.1"];

function shouldSkip(url) {
  if (!url) return true;
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(url)) return true;
  }
  try {
    const parsed = new URL(url);
    if (SKIP_DOMAINS.includes(parsed.hostname)) return true;
    if (parsed.hostname === "www.google.com" && parsed.pathname === "/search") return true;
    if (parsed.hostname === "google.com" && parsed.pathname === "/search") return true;
  } catch {
    return true;
  }
  return false;
}

function getDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

const recentNavigations = new Map();

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url || shouldSkip(tab.url)) return;

  const domain = getDomain(tab.url);
  if (!domain) return;

  const navKey = `${tabId}:${domain}`;
  const lastNav = recentNavigations.get(navKey);
  const now = Date.now();
  if (lastNav && now - lastNav < 2000) return;
  recentNavigations.set(navKey, now);

  try {
    const data = await chrome.storage.local.get([
      "consented",
      "enabled",
      "intensity",
      "todayCount",
      "lastResetDate",
      "globalCooldownUntil",
      "domains"
    ]);

    if (!data.consented) return;
    if (data.enabled === false) return;

    const today = getTodayDate();
    let todayCount = data.todayCount || 0;
    let domains = data.domains || {};
    let globalCooldownUntil = data.globalCooldownUntil || 0;

    if (data.lastResetDate !== today) {
      todayCount = 0;
      domains = {};
      await chrome.storage.local.set({
        todayCount: 0,
        lastResetDate: today,
        domains: {}
      });
    }

    if (now < globalCooldownUntil) return;

    const domainData = domains[domain] || { count: 0, lastRoast: 0 };
    if (domainData.lastRoast && now - domainData.lastRoast < 1800000) return;

    domainData.count += 1;
    domains[domain] = domainData;

    await chrome.storage.local.set({ domains });

    const title = tab.title || "";
    const intensity = data.intensity || 3;

    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "rudebot-roast",
        domain,
        title,
        visitCount: domainData.count,
        intensity
      });
    } catch {
      // Content script not ready, skip silently
    }
  } catch {
    // Silent failure
  }
});
