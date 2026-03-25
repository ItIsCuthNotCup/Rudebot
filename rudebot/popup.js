const intensityLabels = {
  1: "Mildly disappointed",
  2: "Raised eyebrow",
  3: "Actively judging you",
  4: "Deeply offended",
  5: "Calling the authorities"
};

const consentScreen = document.getElementById("consent-screen");
const settingsScreen = document.getElementById("settings-screen");
const consentBtn = document.getElementById("consent-btn");
const enabledToggle = document.getElementById("enabled-toggle");
const intensitySlider = document.getElementById("intensity-slider");
const intensityLabel = document.getElementById("intensity-label");
const todayCountEl = document.getElementById("today-count");

function showConsent() {
  consentScreen.classList.add("active");
  settingsScreen.classList.remove("active");
}

function showSettings() {
  consentScreen.classList.remove("active");
  settingsScreen.classList.add("active");
}

chrome.storage.local.get(
  ["consented", "enabled", "intensity", "todayCount", "lastResetDate"],
  (data) => {
    if (!data.consented) {
      showConsent();
      return;
    }

    showSettings();

    const today = new Date().toISOString().split("T")[0];
    let count = data.todayCount || 0;
    if (data.lastResetDate !== today) {
      count = 0;
    }

    enabledToggle.checked = data.enabled !== false;
    intensitySlider.value = data.intensity || 3;
    intensityLabel.textContent = intensityLabels[intensitySlider.value];
    todayCountEl.textContent = count;
  }
);

consentBtn.addEventListener("click", () => {
  chrome.storage.local.set(
    { consented: true, enabled: true, intensity: 3, todayCount: 0, lastResetDate: new Date().toISOString().split("T")[0], domains: {}, globalCooldownUntil: 0 },
    () => {
      showSettings();
      todayCountEl.textContent = "0";
    }
  );
});

enabledToggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabledToggle.checked });
});

intensitySlider.addEventListener("input", () => {
  const val = parseInt(intensitySlider.value);
  intensityLabel.textContent = intensityLabels[val];
  chrome.storage.local.set({ intensity: val });
});
