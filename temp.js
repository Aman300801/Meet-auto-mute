let lastClickedMeetTabId = null;

const MEETING_URLS = [
  "https://meet.google.com/*",
  "https://*.zoom.us/*",
  "https://teams.microsoft.com/*",
];

function isMeetingUrl(url = "") {
  return (
    url.includes("meet.google.com") ||
    url.includes("zoom.us") ||
    url.includes("teams.microsoft.com")
  );
}


function executeSafe(tabId, func, args = []) {
  if (!tabId) return;

  chrome.scripting.executeScript(
    {
      target: { tabId },
      func,
      args,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn(
          "executeScript failed:",
          chrome.runtime.lastError.message
        );
      }
    }
  );
}

/* ---------------- CORE ---------------- */

async function muteOtherMeetTabs() {
  const { muteEnabled } = await chrome.storage.sync.get("muteEnabled");
  if (!muteEnabled || !lastClickedMeetTabId) return;

  chrome.tabs.query({ url: MEETING_URLS }, (tabs) => {
    tabs.forEach((tab) => {
      if (
        !tab?.id ||
        tab.id === lastClickedMeetTabId ||
        tab.status !== "complete"
      ) {
        return;
      }

      // 🔒 HARD browser mute (cannot unmute accidentally)
      chrome.tabs.update(tab.id, { muted: true });

      // 🔁 UI mute
      executeSafe(tab.id, (tabUrl) => {
        /* ---------- HELPERS (INSIDE CONTEXT) ---------- */

        const attempt = (fn, retries = 10, delay = 500) => {
          const run = () => {
            try {
              if (fn()) return;
              if (retries-- > 0) setTimeout(run, delay);
            } catch {}
          };
          run();
        };

        /* ---------- GOOGLE MEET ---------- */
        if (tabUrl.includes("meet.google.com")) {
          attempt(() => {
            const micBtn = document.querySelector(
              'button[jsname="hw0c9"][data-is-muted="false"]'
            );

            if (!micBtn) return false;

            const label =
              micBtn.getAttribute("aria-label")?.toLowerCase() || "";

            // ✅ click ONLY when mic is ON
            if (label.includes("turn off")) {
              micBtn.click();
              return true;
            }
            return false;
          });
        }

        /* ---------- ZOOM ---------- */
        else if (tabUrl.includes("zoom.us")) {
          attempt(() => {
            const buttons = document.querySelectorAll("button");
            for (const btn of buttons) {
              const label =
                btn.getAttribute("aria-label")?.toLowerCase() || "";
              if (label.includes("mute") && !label.includes("unmute")) {
                btn.click();
                return true;
              }
            }
            return false;
          });
        }

        /* ---------- TEAMS ---------- */
        else if (tabUrl.includes("teams.microsoft.com")) {
          attempt(() => {
            const micBtn = document.querySelector(
              'button[aria-label*="Microphone"][aria-pressed="false"]'
            );
            if (micBtn) {
              micBtn.click();
              return true;
            }
            return false;
          });
        }
      }, [tab.url]);
    });
  });
}

/* ---------------- EVENTS ---------------- */

chrome.storage.onChanged.addListener((changes) => {
  if (changes.muteEnabled?.newValue === true) {
    muteOtherMeetTabs();
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    if (!isMeetingUrl(tab.url) || tab.status !== "complete") return;

    lastClickedMeetTabId = tab.id;
    muteOtherMeetTabs();
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === lastClickedMeetTabId) {
    lastClickedMeetTabId = null;
  }
});
