let lastClickedMeetTabId = null;

async function muteOtherMeetTabs() {
  const { muteEnabled } = await chrome.storage.sync.get("muteEnabled");
  if (!muteEnabled) return;

  chrome.tabs.query(
    {
      url: [
        "https://meet.google.com/*",
        "https://*.zoom.us/*",
        "https://teams.microsoft.com/*",
      ],
    },
    (tabs) => {
      tabs
        .filter((tab) => tab.id !== lastClickedMeetTabId)
        .forEach((tab) => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [tab.url],
            func: (tabUrl) => {
              const clickIfExists = (selector) => {
                const el = document.querySelector(selector);
                if (el) el.click();
              };

              if (tabUrl.includes("meet.google.com")) {
                const micStatus = document.querySelector("[data-is-muted]");
                const isMuted =
                  micStatus?.getAttribute("data-is-muted") === "true";
                if (!isMuted) {
                  clickIfExists('[aria-label*="microphone"]');
                }
              } else if (tabUrl.includes("zoom.us")) {
                const iframe = document.querySelector("iframe");
                const iframeDoc =
                  iframe?.contentDocument || iframe?.contentWindow?.document;

                const micBtn = iframeDoc?.querySelector(
                  ".join-audio-container__btn"
                );
                const ariaLabel = micBtn
                  ?.getAttribute("aria-label")
                  .toLowerCase();

                console.log(ariaLabel);

                if (micBtn && !ariaLabel.includes("unmute")) {
                  micBtn.click();
                }
              } else if (tabUrl.includes("teams.microsoft.com")) {
                const micBtn = document.querySelector(
                  '[aria-label*="Microphone"]'
                );
                const isMuted = micBtn?.getAttribute("aria-pressed") === "true";
                if (!isMuted && micBtn) {
                  micBtn.click();
                }
              }
            },
          });
        });
    }
  );
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.muteEnabled?.newValue === true) {
    muteOtherMeetTabs();
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  const isMeetTab =
    tab.url &&
    (tab.url.includes("meet.google.com") ||
      tab.url.includes("zoom.us") ||
      tab.url.includes("teams.microsoft.com"));

  if (isMeetTab && tab.status === "complete") {
    lastClickedMeetTabId = tabId;
    muteOtherMeetTabs();
  }
});
