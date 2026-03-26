let hostEl = null;
let shadowRoot = null;
let dismissTimer = null;

const TOAST_CSS = `
#rudebot-toast {
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  max-width: 260px;
  padding: 10px 14px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 12px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    -1px 0 0 0 rgba(255, 60, 60, 0.3),
    1px 0 0 0 rgba(60, 120, 255, 0.3),
    0 -1px 0 0 rgba(60, 255, 120, 0.2),
    0 1px 0 0 rgba(255, 60, 255, 0.2);
  transform: translateY(-120%);
  opacity: 0;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
  pointer-events: auto;
  overflow: hidden;
}

#rudebot-toast::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 20px;
  border: 1px solid transparent;
  background: linear-gradient(135deg, rgba(255, 80, 80, 0.15), rgba(80, 120, 255, 0.15), rgba(80, 255, 120, 0.1)) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

#rudebot-toast::after {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

#rudebot-toast.rudebot-visible {
  transform: translateY(0);
  opacity: 1;
}

#rudebot-toast.rudebot-fade-out {
  transform: translateY(-120%);
  opacity: 0;
}

.rudebot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.rudebot-label {
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.rudebot-close {
  background: none;
  border: none;
  color: #666;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  font-family: system-ui, -apple-system, sans-serif;
}

.rudebot-close:hover {
  color: #ffffff;
}

.rudebot-text {
  color: #ffffff;
  font-size: 12px;
  line-height: 1.4;
  margin: 0;
}

.rudebot-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.rudebot-share {
  background: none;
  border: 1px solid #333;
  color: #999;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-family: system-ui, -apple-system, sans-serif;
}

.rudebot-share:hover {
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}
`;

function removeToast() {
  if (!shadowRoot) return;
  const toast = shadowRoot.getElementById("rudebot-toast");
  if (toast) {
    toast.classList.add("rudebot-fade-out");
    toast.classList.remove("rudebot-visible");
    setTimeout(() => {
      if (hostEl && hostEl.parentNode) {
        hostEl.parentNode.removeChild(hostEl);
      }
      hostEl = null;
      shadowRoot = null;
    }, 400);
  }
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

function showToast(text) {
  // Remove any existing toast first
  if (hostEl && hostEl.parentNode) {
    hostEl.parentNode.removeChild(hostEl);
    hostEl = null;
    shadowRoot = null;
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
  }

  // Create shadow DOM host
  hostEl = document.createElement("div");
  hostEl.style.cssText = "position:fixed;z-index:999999;top:20px;left:20px;pointer-events:none;";
  shadowRoot = hostEl.attachShadow({ mode: "closed" });

  // Inject styles
  const style = document.createElement("style");
  style.textContent = TOAST_CSS;
  shadowRoot.appendChild(style);

  // Build toast DOM
  const toast = document.createElement("div");
  toast.id = "rudebot-toast";

  const header = document.createElement("div");
  header.className = "rudebot-header";

  const label = document.createElement("span");
  label.className = "rudebot-label";
  label.textContent = "RudeBot";

  const closeBtn = document.createElement("button");
  closeBtn.className = "rudebot-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", removeToast);

  header.appendChild(label);
  header.appendChild(closeBtn);

  const roastText = document.createElement("p");
  roastText.className = "rudebot-text";
  roastText.textContent = text;

  const footer = document.createElement("div");
  footer.className = "rudebot-footer";

  const shareBtn = document.createElement("button");
  shareBtn.className = "rudebot-share";
  shareBtn.textContent = "Share";
  shareBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(`RudeBot says: ${text}`).then(() => {
      shareBtn.textContent = "Copied!";
      setTimeout(() => {
        shareBtn.textContent = "Share";
      }, 2000);
    }).catch((err) => {
      console.error("RudeBot:", err);
    });
  });

  footer.appendChild(shareBtn);

  toast.appendChild(header);
  toast.appendChild(roastText);
  toast.appendChild(footer);

  shadowRoot.appendChild(toast);
  document.body.appendChild(hostEl);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add("rudebot-visible");
    });
  });

  // Auto-dismiss after 8s
  dismissTimer = setTimeout(removeToast, 8000);
}

// Notify background script of page load
function sendPageLoaded() {
  const contentSnippet = document.body ? document.body.innerText.replace(/\s+/g, ' ').substring(0, 400) : "";
  chrome.runtime.sendMessage({
    type: "rudebot-page-loaded",
    url: window.location.href,
    title: document.title,
    contentSnippet: contentSnippet
  }).catch((err) => {
    console.error("RudeBot:", err);
  });
}

sendPageLoaded();

// Detect SPA navigations (YouTube, Twitter, etc.)
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    sendPageLoaded();
  }
});
observer.observe(document, { subtree: true, childList: true });

// Listen for roast from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "rudebot-show-roast" && message.text) {
    showToast(message.text);
  }
});
