// All content script files in load order (must match manifest.json)
const CONTENT_SCRIPTS = [
  'extractors/namespace.js',
  'extractors/confidence.js',
  'extractors/json-ld.js',
  'extractors/meta-tags.js',
  'extractors/site-jobright.js',
  'extractors/site-linkedin.js',
  'extractors/site-indeed.js',
  'extractors/site-greenhouse.js',
  'extractors/site-lever.js',
  'extractors/site-workday.js',
  'extractors/site-smartrecruiters.js',
  'extractors/site-icims.js',
  'extractors/site-bamboohr.js',
  'extractors/generic.js',
  'extractors/pipeline.js',
  'content.js'
];

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab.id;
  const openPanelAfterRefresh = () => {
    chrome.tabs.sendMessage(tabId, { action: 'togglePanel' }, (err) => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId },
          files: CONTENT_SCRIPTS
        }).then(() => {
          setTimeout(() => chrome.tabs.sendMessage(tabId, { action: 'togglePanel' }), 300);
        }).catch((e) => console.error('Failed to inject:', e));
      }
    });
  };

  const onUpdated = (updatedTabId, changeInfo) => {
    if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
    chrome.tabs.onUpdated.removeListener(onUpdated);
    setTimeout(openPanelAfterRefresh, 200);
  };
  chrome.tabs.onUpdated.addListener(onUpdated);
  chrome.tabs.reload(tabId);
});
