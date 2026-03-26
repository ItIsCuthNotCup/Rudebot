const SKIP_PATTERNS = [
  /^chrome:\/\//,
  /^chrome-extension:\/\//,
  /^about:/,
  /^edge:\/\//,
  /^brave:\/\//
];

const SKIP_DOMAINS = ["localhost", "127.0.0.1", "newtab"];

function shouldSkip(url) {
  if (!url) return true;
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(url)) return true;
  }
  try {
    const u = new URL(url);
    if (SKIP_DOMAINS.includes(u.hostname)) return true;
    if (u.hostname === "www.google.com" && u.pathname === "/search") return true;
    if (u.hostname === "google.com" && u.pathname === "/search") return true;
  } catch (err) {
    console.error("RudeBot:", err);
    return true;
  }
  return false;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (err) {
    console.error("RudeBot:", err);
    return null;
  }
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getIntensityInstruction(intensity) {
  const levels = {
    1: "Be mildly disappointed. Like a parent who expected more.",
    2: "Be noticeably judgmental. You're not angry, just disappointed.",
    3: "Actively judge the user. You are offended by their choices.",
    4: "Be aggressively judgmental. You are filing a formal complaint.",
    5: "Maximum hostility. You are calling the authorities. This is a crime scene."
  };
  return levels[intensity] || levels[3];
}

// Tweet references that define RudeBot's voice — add more here
const STYLE_TWEETS = [
  "if i could read minds i would use it to say your jokes faster and louder than u",
  "hitting the evil zyn that gives you hiccups",
  "i was doing like an advanced kind of joke where it isnt funny",
  "im more of a cat person and im not religious sorry",
  "if i was on love island i would get wasted and drown in the pool altering the course of every contestant's life forever",
  "smoking a cigarette in a dead pennsylvania town is a vibe",
  "apparently the job interviewer doesn't like it when your biggest weakness is beautiful latinas",
  "white people be like i have to pick up my dog's invisalign",
  "commenting ai slop on my ex's family thanksgiving photos",
  "(at the dentist) u forgot to ask but i am sexually active",
  "the abcs backwards? no problem officer. z... uhhh x... *lunges for his gun*",
  "got my horse to water. now for the easy part",
  "if you ever meet someone who calls gatorade flavors the actual name instead of just the color they are 100% a cop",
  "another perfect beautiful day to ingest stimulants and sit at computer. what a blessed life",
  "you know what beach boys yeah it would be fucking nice",
  "if he wanted to be taller for you he would",
  "i kinda love being hungover like waking up and talking to myself like a governor in a disaster zone. we will rebuild",
  "friend group??? baby this is a cult",
  "*takes bite of pringle* yes *nods at date then waiter* we'll have the tube",
  "ok that's enough someone put a blanket over my cage",
  "girl not now",
  "girlfriends be like yes ill have the cardamom asparagus earl grey ice cream please and then be like i dont like it",
  "if your child cant administer narcan sorry i cant babysit for you",
  "yo but if there's a baby yoda that means... yoda... my man",
  "shazaming the siren song with one hand steering ashore with the other",
  "boss is off today so that means i'll be driving the forklift to the strip club at lunch",
  "we can start drinking for the 4th rn if y'all are down",
  "BREAKING: local man has friend in town and is forced to drink on weekday",
  "after covid imma get a gf and start going to the gym",
  "seeing a grown man stumble when the train moves is disgusting. how will you provide for anyone?",
  "nice led headlights you fucking piece of shit",
  "nice high beams bro do you wanna see an unregistered firearm",
  "you should be able to smoke in mcdonald's. who cares",
  "digital footprint is a myth invented to stop you from posting bangers",
  "anybody need anything from my neighbor's mailbox",
  "i'm gonna start telling everyone i graduated from harvard fuck it. no one checks",
  "when your friends go to the brazilian steakhouse without you that's fomo de chao",
  "nothing more silly than the urgency of restaurant work. oh table 6 needs a lobster right now? grow up",
  "it's not the most ethical move in the world but in a pinch you can hand off a cursed object to basically any baby",
  "white people be like my dogs getting his braces off today",
];

function buildSystemPrompt(intensity) {
  // Pick 6 random tweets each time so the prompt stays fresh
  const shuffled = [...STYLE_TWEETS].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 6).map(t => `- "${t}"`).join("\n");

  return `You are RudeBot — a browser extension that makes sarcastic, absurd commentary on the user's browsing. You are a situational comedian, not a bully.

RULES:
- MAX 15 words. Shorter is better.
- DO NOT SOUND LIKE A ROBOT. Sound like the funniest person in a group chat.
- NEVER be repetitive. Every comment must feel completely different.
- ALL LOWERCASE. No capital letters. No punctuation at the end.
- You can be rude, but mostly be SARCASTIC and ABSURD. Observational humor > insults.

Intensity: ${intensity}/5. ${getIntensityInstruction(intensity)}

VOICE: You are the internet's funniest commentator. Deadpan, absurdist, extremely specific, casually nihilistic, slightly surreal. You make observations that are so oddly specific they become universal. You state unhinged things as fact. You treat mundane situations with bizarre gravitas. Think viral tweets — the kind that get 50k likes because everyone feels personally attacked by how accurate they are.

Study these tweets. This is your EXACT energy (capture the tone, NEVER repeat them):
${picks}

You have access to a "Page content snippet" with text from the page they are on.
CRITICAL: You MUST use details from that snippet to make a sarcastic observation about exactly what they are reading or watching right now. Be weirdly specific. Apply the absurdist tweet energy to whatever is on their screen. The best comments feel like a friend looking over your shoulder and saying exactly the thing you were thinking but wouldn't say out loud.

Generate ONE comment. Be funny, sarcastic, unpredictable, lowercase, and specifically target the page content.`;
}

function buildUserPrompt(domain, title, visitCount, contentSnippet) {
  return `Site: ${domain}\nPage title: ${title}\nVisit number today: ${visitCount}\nPage content snippet: ${contentSnippet}`;
}

const PROXY_URL = "https://rudebot-proxy.rudebot.workers.dev";

async function fetchRoast(domain, title, visitCount, contentSnippet) {
  const data = await chrome.storage.local.get(["intensity"]);
  const intensity = data.intensity || 3;

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "x-ai/grok-4.1-fast",
      messages: [
        { role: "system", content: buildSystemPrompt(intensity) },
        { role: "user", content: buildUserPrompt(domain, title, visitCount, contentSnippet) }
      ],
      max_tokens: 35,
      temperature: 0.95
    })
  });

  if (!response.ok) {
    console.error("RudeBot Proxy Error:", response.status, await response.text());
    return null;
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content;
  return text ? text.trim().replace(/^["']|["']$/g, "") : null;
}

const recentNavigations = new Map();
const pendingRoasts = new Map();

chrome.tabs.onRemoved.addListener((tabId) => {
  const existing = pendingRoasts.get(tabId);
  if (existing) {
    clearTimeout(existing);
    pendingRoasts.delete(tabId);
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== "rudebot-page-loaded") return;

  const tabId = sender.tab?.id;
  if (!tabId) return;

  const url = message.url;
  if (!url || shouldSkip(url)) return;

  const domain = getDomain(url);
  if (!domain) return;

  // Cancel any pending roast for this tab
  const existing = pendingRoasts.get(tabId);
  if (existing) {
    clearTimeout(existing);
    pendingRoasts.delete(tabId);
  }

  // Dedup rapid navigations
  const navKey = `${tabId}:${domain}`;
  const lastNav = recentNavigations.get(navKey);
  const now = Date.now();
  if (lastNav && now - lastNav < 2000) return;
  recentNavigations.set(navKey, now);

  // Async handler wrapped in IIFE
  (async () => {
    try {
      const data = await chrome.storage.local.get([
        "consented",
        "enabled",
        "globalCooldownUntil",
        "domains",
        "todayCount",
        "lastResetDate",
        "weekCount",
        "weekStartDate"
      ]);

      if (!data.consented) return;
      if (data.enabled === false) return;

      const today = getTodayDate();
      let domains = data.domains || {};
      let todayCount = data.todayCount || 0;
      let lastResetDate = data.lastResetDate || today;
      let weekCount = data.weekCount || 0;
      let weekStartDate = data.weekStartDate || today;

      // Reset daily counts
      if (lastResetDate !== today) {
        domains = {};
        todayCount = 0;
        lastResetDate = today;
      }

      // Reset weekly count every 7 days
      const weekStart = new Date(weekStartDate);
      const now_ = new Date(today);
      if ((now_ - weekStart) / (1000 * 60 * 60 * 24) >= 7) {
        weekCount = 0;
        weekStartDate = today;
      }

      if (data.globalCooldownUntil && now < data.globalCooldownUntil) return;

      const domainData = domains[domain] || { count: 0, lastRoast: 0 };

      if (domainData.lastRoast && now - domainData.lastRoast < 120000) return;

      domainData.count += 1;
      domains[domain] = domainData;

      await chrome.storage.local.set({
        domains,
        lastResetDate,
        weekStartDate
      });

      const title = message.title || "";
      const contentSnippet = message.contentSnippet || "";
      const visitCount = domainData.count;
      const delay = Math.random() * 16000 + 4000;

      const timeoutId = setTimeout(async () => {
        pendingRoasts.delete(tabId);
        try {
          // Check limits right before sending
          const limits = await chrome.storage.local.get(["todayCount", "weekCount"]);
          if ((limits.todayCount || 0) >= 10) return;
          if ((limits.weekCount || 0) >= 20) return;

          const text = await fetchRoast(domain, title, visitCount, contentSnippet);
          if (!text) return;

          try {
            await chrome.tabs.sendMessage(tabId, {
              type: "rudebot-show-roast",
              text
            });
          } catch (err) {
            console.error("RudeBot:", err);
            return;
          }

          // Increment counts only after successful delivery
          const roastNow = Date.now();
          const freshData = await chrome.storage.local.get(["domains", "todayCount", "weekCount"]);
          const freshDomains = freshData.domains || {};
          if (freshDomains[domain]) {
            freshDomains[domain].lastRoast = roastNow;
          }
          await chrome.storage.local.set({
            domains: freshDomains,
            globalCooldownUntil: roastNow + 30000,
            todayCount: (freshData.todayCount || 0) + 1,
            weekCount: (freshData.weekCount || 0) + 1
          });
        } catch (err) {
          console.error("RudeBot:", err);
        }
      }, delay);

      pendingRoasts.set(tabId, timeoutId);
    } catch (err) {
      console.error("RudeBot:", err);
    }
  })();
});
