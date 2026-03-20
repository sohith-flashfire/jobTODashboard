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
  'extractors/site-ashby.js',
  'extractors/generic.js',
  'extractors/pipeline.js',
  'content.js'
];

function sendMessageToFrame(tabId, payload, frameId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, payload, { frameId }, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

/** Try frames in a sensible order: main first, then likely job-board iframes (e.g. Greenhouse embed). */
async function tryOpenInFrames(tabId, payload) {
  const frames = await new Promise((resolve) => {
    chrome.webNavigation.getAllFrames({ tabId }, (list) => {
      if (chrome.runtime.lastError || !list || !list.length) {
        resolve(null);
        return;
      }
      resolve(list);
    });
  });

  if (!frames) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, payload, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }

  const sorted = [...frames].sort((a, b) => {
    if (a.frameId === 0) return -1;
    if (b.frameId === 0) return 1;
    const au = (a.url || '').toLowerCase();
    const bu = (b.url || '').toLowerCase();
    const aJob = /greenhouse|lever|workday|icims|smartrecruiters|bamboohr|ashby|embed|job/i.test(au) ? 0 : 1;
    const bJob = /greenhouse|lever|workday|icims|smartrecruiters|bamboohr|ashby|embed|job/i.test(bu) ? 0 : 1;
    if (aJob !== bJob) return aJob - bJob;
    return a.frameId - b.frameId;
  });

  for (const f of sorted) {
    if (await sendMessageToFrame(tabId, payload, f.frameId)) {
      return true;
    }
  }
  return false;
}

async function injectAllFrames(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: CONTENT_SCRIPTS
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  const payload = { action: 'togglePanel', hostTabId: tabId };

  const delays = [0, 60, 180, 400];

  for (let i = 0; i < delays.length; i += 1) {
    if (delays[i] > 0) {
      await new Promise((r) => setTimeout(r, delays[i]));
    }
    if (await tryOpenInFrames(tabId, payload)) {
      return;
    }
  }

  try {
    await injectAllFrames(tabId);
    await new Promise((r) => setTimeout(r, 280));
    if (await tryOpenInFrames(tabId, payload)) {
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
    await tryOpenInFrames(tabId, payload);
  } catch (e) {
    console.error('[FlashFire] Could not inject or open panel:', e?.message || e);
  }
});
