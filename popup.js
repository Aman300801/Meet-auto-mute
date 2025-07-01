const toggle = document.getElementById("muteToggle");
const statusText = document.getElementById("statusText");

chrome.storage.sync.get("muteEnabled", ({ muteEnabled }) => {
  toggle.checked = muteEnabled || false;
  statusText.innerHTML = `Auto-mute is <strong>${
    muteEnabled ? "on" : "off"
  }</strong>.`;
});

toggle.addEventListener("change", () => {
  const isEnabled = toggle.checked;
  chrome.storage.sync.set({ muteEnabled: isEnabled });
  statusText.innerHTML = `Auto-mute is <strong>${
    isEnabled ? "on" : "off"
  }</strong>.`;
});
