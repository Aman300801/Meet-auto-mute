let lastClickedMeetTabId = null;

async function muteOtherMeetTabs() {
  const { muteEnabled } = await chrome.storage.sync.get("muteEnabled");
  console.log("Mute Enabled:", muteEnabled);

  if (!muteEnabled) return;

  chrome.tabs.query({ url: "https://meet.google.com/*" }, (tabs) => {
    console.log(tabs);
    console.log(lastClickedMeetTabId);
    for (const tab of tabs) {
      if (tab.id !== lastClickedMeetTabId) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const micBtn =
              document.querySelector('[aria-label*="microphone"]') ||
              document.querySelector("[data-is-muted]");

            const micStatusElement = document.querySelector("[data-is-muted]");
            const isMicMuted =
              micStatusElement?.getAttribute("data-is-muted") == "true";
            console.log(isMicMuted);

            if (micBtn && !isMicMuted) {
              micBtn.click();
              console.log("🔇 Mic muted by extension");
            }
          },
        });
      }
    }
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if ("muteEnabled" in changes && changes.muteEnabled.newValue === true) {
    muteOtherMeetTabs();
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  console.log(tab);
  if (
    tab.url &&
    tab.url.startsWith("https://meet.google.com") &&
    tab.status === "complete"
  ) {
    lastClickedMeetTabId = tabId;
    muteOtherMeetTabs();
  }
});
