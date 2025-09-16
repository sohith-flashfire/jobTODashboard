chrome.action.onClicked.addListener((tab) => {
    // Send message to content script to toggle panel
    chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not available, inject it first
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          // Wait a bit for script to load, then send message
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
          }, 100);
        }).catch((error) => {
          console.error('Failed to inject content script:', error);
        });
      }
    });
  });