const intensityLabels = {
  1: "Mildly disappointed",
  2: "Noticeably judgmental",
  3: "Actively judging you",
  4: "Filing a complaint",
  5: "Calling the authorities"
};

const consentScreen = document.getElementById("consent-screen");
const settingsScreen = document.getElementById("settings-screen");
const acceptBtn = document.getElementById("accept-btn");
const toggleEnabled = document.getElementById("toggle-enabled");
const intensitySlider = document.getElementById("intensity-slider");
const intensityLabel = document.getElementById("intensity-label");
const todayCountEl = document.getElementById("today-count");
function updateIntensityLabel(val) {
  intensityLabel.textContent = `${val} — ${intensityLabels[val]}`;
}

chrome.storage.local.get(
  ["consented", "enabled", "intensity", "todayCount", "lastResetDate"],
  (data) => {
    const today = new Date().toISOString().split("T")[0];

    if (data.consented) {
      consentScreen.style.display = "none";
      settingsScreen.style.display = "flex";

      toggleEnabled.checked = data.enabled !== false;

      const intensity = data.intensity || 3;
      intensitySlider.value = intensity;
      updateIntensityLabel(intensity);

      const count = data.lastResetDate === today ? data.todayCount || 0 : 0;
      todayCountEl.textContent = count;
    }
  }
);

acceptBtn.addEventListener("click", () => {
  chrome.storage.local.set(
    { consented: true, enabled: true, intensity: 3, todayCount: 0, lastResetDate: new Date().toISOString().split("T")[0], domains: {}, globalCooldownUntil: 0 },
    () => {
      consentScreen.style.display = "none";
      settingsScreen.style.display = "flex";
    }
  );
});

toggleEnabled.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggleEnabled.checked });
});

intensitySlider.addEventListener("input", () => {
  const val = parseInt(intensitySlider.value);
  updateIntensityLabel(val);
  chrome.storage.local.set({ intensity: val });
});



