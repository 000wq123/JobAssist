const APPLICATION_KEY = "activeApplication";

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== "install") return;
  chrome.tabs.create({ url: chrome.runtime.getURL("onboarding/onboarding.html") });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "APPLICATION_STARTED") {
    chrome.action.setBadgeBackgroundColor({ color: "#E30613" });
    chrome.action.setBadgeText({ text: "1" });
  }

  if (message?.type === "APPLICATION_FINISHED") {
    chrome.storage.local.remove(APPLICATION_KEY);
    chrome.action.setBadgeText({ text: "" });
  }
});
