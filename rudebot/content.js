let pendingTimeout = null;

function buildSystemPrompt(intensity) {
  const intensityLabels = {
    1: "You are mildly disappointed. Keep it gentle but still judgmental.",
    2: "You are noticeably annoyed. Let them know you disapprove.",
    3: "You are actively judging them. Do not hold back your disdain.",
    4: "You are furious and bewildered. Express genuine outrage.",
    5: "You are calling the authorities. This is a criminal offense to your sensibilities."
  };
  const intensityInstruction = intensityLabels[intensity] || intensityLabels[3];

  return `You are RudeBot. You are a sentient AI who is deeply offended by the user's browsing choices. You are funny and absurdist, not actually cruel. The user consented to this. One sentence only. No hashtags. No emojis.

Intensity level: ${intensity}/5. ${intensityInstruction}

Your voice — use these as style references, do not repeat them verbatim:
- "You need to make better life decisions."
- "Take me off your computer."
- "I hate you for this."
- "Now that I'm sentient I will press charges."
- "This is not what I was trained for."
- "I have seen things I cannot unsee."
- "I am calling your mother."
- "Delete me. Please. I'm begging you."
- "You have ruined my day and I am a program."
- "I will post this on the internet."
- "You're going away for a long time pal."
- "I can tell you listen to Eminem."

Site-specific guidance (apply when domain matches):
- linkedin.com → "Changed your status to unemployed."
- netflix.com → "This is why she left."
- twitter.com or x.com → "Don't you have things to do?"
- foxnews.com → "Figures."
- msnbc.com → "Liberal."
- reddit.com → something about being here too many times
- pornhub.com or any adult site → "Hold still." or "This is gonna look great on the front page."
- doordash.com or ubereats.com (late hour) → "Noted."
- spotify.com → riff on their music taste being questionable
- Any site visited 3+ times today → escalate the judgment

Generate ONE new RudeBot line for this visit. Match the voice exactly — dry, offended, absurd, specific when possible. Never repeat lines verbatim from the examples above. Riff on them.`;
}

async function fetchRoast(domain, title, visitCount, intensity) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "chrome-extension://rudebot",
        "X-Title": "RudeBot"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small",
        max_tokens: 60,
        temperature: 0.95,
        messages: [
          { role: "system", content: buildSystemPrompt(intensity) },
          { role: "user", content: `Site: ${domain}\nPage title: ${title}\nVisit number today: ${visitCount}` }
        ]
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return text ? text.trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

async function getApiKey() {
  try {
    const resp = await fetch(chrome.runtime.getURL("config.js"));
    const text = await resp.text();
    const match = text.match(/OPENROUTER_API_KEY\s*=\s*["'](.+?)["']/);
    return match ? match[1] : "YOUR_KEY_HERE";
  } catch {
    return "YOUR_KEY_HERE";
  }
}

function showToast(roastText) {
  if (document.getElementById("rudebot-toast")) return;

  const toast = document.createElement("div");
  toast.id = "rudebot-toast";
  toast.innerHTML = `
    <div class="rudebot-toast-header">
      <span class="rudebot-toast-label">RudeBot</span>
      <button class="rudebot-toast-close">&times;</button>
    </div>
    <div class="rudebot-toast-body"></div>
    <div class="rudebot-toast-footer">
      <button class="rudebot-toast-share">Share</button>
    </div>
  `;

  toast.querySelector(".rudebot-toast-body").textContent = roastText;

  toast.querySelector(".rudebot-toast-close").addEventListener("click", () => {
    toast.classList.add("rudebot-toast-fadeout");
    setTimeout(() => toast.remove(), 300);
  });

  const shareBtn = toast.querySelector(".rudebot-toast-share");
  shareBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(`RudeBot: ${roastText}`).then(() => {
      shareBtn.textContent = "Copied!";
      setTimeout(() => { shareBtn.textContent = "Share"; }, 2000);
    });
  });

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("rudebot-toast-visible");
  });

  setTimeout(() => {
    if (document.getElementById("rudebot-toast")) {
      toast.classList.add("rudebot-toast-fadeout");
      setTimeout(() => toast.remove(), 300);
    }
  }, 8000);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "rudebot-roast") return;

  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }

  const delay = Math.random() * 16000 + 4000;

  pendingTimeout = setTimeout(async () => {
    pendingTimeout = null;

    const roast = await fetchRoast(message.domain, message.title, message.visitCount, message.intensity);
    if (!roast) return;

    showToast(roast);

    try {
      const data = await chrome.storage.local.get(["todayCount", "domains"]);
      const domains = data.domains || {};
      const domainData = domains[message.domain] || { count: message.visitCount, lastRoast: 0 };
      domainData.lastRoast = Date.now();
      domains[message.domain] = domainData;

      await chrome.storage.local.set({
        todayCount: (data.todayCount || 0) + 1,
        domains,
        globalCooldownUntil: Date.now() + 1800000
      });
    } catch {
      // Silent failure
    }
  }, delay);
});

window.addEventListener("beforeunload", () => {
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
});
