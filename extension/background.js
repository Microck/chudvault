chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-tweet",
    title: "Save Tweet to ChudVault",
    contexts: ["page", "selection", "link"],
    documentUrlPatterns: ["*://twitter.com/*", "*://x.com/*"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-tweet" && tab.id) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: triggerSave,
      });
    } catch (e) {
      console.error(e);
    }
  }
});

async function triggerSave() {
  try {
    const { apiUrl } = await chrome.storage.local.get({ apiUrl: 'http://localhost:3000/api/bookmarks/add' });
    
    const showToast = (msg, color = '#22c55e') => {
      const div = document.createElement('div');
      div.textContent = `ChudVault: ${msg}`;
      div.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${color}; color: white; padding: 10px 20px; border-radius: 5px; z-index: 9999; font-family: sans-serif; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);`;
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 3000);
    };

    showToast('Saving...', '#3b82f6');

    const url = window.location.href;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) throw new Error('Failed to save');
    const data = await response.json();
    showToast(data.message || 'Saved successfully!');

  } catch (error) {
    alert(`ChudVault Error: ${error.message}`);
  }
}
