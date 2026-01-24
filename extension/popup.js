document.addEventListener('DOMContentLoaded', async () => {
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const apiUrlInput = document.getElementById('apiUrl');
  const settingsDiv = document.getElementById('settings');
  const mainDiv = document.getElementById('main');
  const openSettingsLink = document.getElementById('openSettings');
  const saveSettingsBtn = document.getElementById('saveSettings');

  const { apiUrl } = await chrome.storage.local.get({ apiUrl: 'http://localhost:3000/api/bookmarks/add' });
  apiUrlInput.value = apiUrl;

  openSettingsLink.addEventListener('click', () => {
    mainDiv.classList.add('hidden');
    settingsDiv.classList.remove('hidden');
  });

  saveSettingsBtn.addEventListener('click', () => {
    chrome.storage.local.set({ apiUrl: apiUrlInput.value }, () => {
      mainDiv.classList.remove('hidden');
      settingsDiv.classList.add('hidden');
    });
  });

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    statusDiv.textContent = 'Extracting data...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
        throw new Error('Not a Twitter/X page');
      }

      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractTweetData,
      });

      const tweetData = result[0].result;
      if (!tweetData) throw new Error('Could not extract tweet');

      statusDiv.textContent = 'Saving to ChudVault...';

      const response = await fetch(apiUrlInput.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tweetData),
      });

      if (!response.ok) throw new Error('Failed to save');

      const data = await response.json();
      statusDiv.textContent = data.message || 'Saved successfully!';
      statusDiv.style.color = 'green';
    } catch (error) {
      statusDiv.textContent = error.message;
      statusDiv.style.color = 'red';
    } finally {
      saveBtn.disabled = false;
    }
  });
});

function extractTweetData() {
  try {
    const url = window.location.href;
    const pathParts = new URL(url).pathname.split('/');
    const tweetId = pathParts[pathParts.indexOf('status') + 1];
    const screenName = pathParts[1];

    const article = document.querySelector('article[data-testid="tweet"]');
    if (!article) return null;

    const textElement = article.querySelector('[data-testid="tweetText"]');
    const fullText = textElement ? textElement.innerText : '';
    
    const timeElement = article.querySelector('time');
    const createdAt = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();

    const userElement = article.querySelector('[data-testid="User-Name"]');
    const name = userElement ? userElement.innerText.split('\n')[0] : screenName;

    const avatarImg = article.querySelector('img[src*="profile_images"]');
    const profileImageUrl = avatarImg ? avatarImg.src : '';

    return {
      id: tweetId,
      created_at: createdAt,
      full_text: fullText,
      screen_name: screenName,
      name: name,
      profile_image_url: profileImageUrl,
      url: url,
      favorite_count: 0,
      retweet_count: 0,
      bookmark_count: 0,
      views_count: 0,
      media: [],
      tags: []
    };
  } catch (e) {
    return null;
  }
}
