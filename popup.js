document.addEventListener('DOMContentLoaded', () => {
  const powerToggle = document.getElementById('powerToggle');
  const statusLabel = document.getElementById('statusLabel');
  const statusText = document.getElementById('statusText');
  const consoleWrapper = document.getElementById('consoleWrapper');
  const logContainer = document.getElementById('logContainer');
  const openDashboard = document.getElementById('openDashboard');

  // Load config & state
  chrome.storage.local.get(['isListening'], (result) => {
    powerToggle.checked = result.isListening || false;
    updateStatusUI(powerToggle.checked);
  });

  // Populate Dashboard History
  chrome.runtime.sendMessage({ target: 'background', action: 'get-history' }, (response) => {
    if (response && response.history && response.history.length > 0) {
      logContainer.innerHTML = '';
      response.history.forEach(log => appendLog(log));
    }
  });

  // Open Web Dashboard
  openDashboard.addEventListener('click', (e) => {
    e.preventDefault();
    // Assuming the dashboard is running on localhost:3001 for development
    // In production, this would be the deployed standard URL
    chrome.tabs.create({ url: 'http://localhost:3001/dashboard' });
  });

  // Power Toggle Logic
  powerToggle.addEventListener('change', async (event) => {
    const isTurningOn = event.target.checked;

    // We assume the user configures API keys on the Web Dashboard which syncs via chrome.storage
    // For now, if no key exists, we simply proceed or alert
    chrome.storage.local.get(['groqKey'], async (res) => {
      // In the new system, we expect the web app to set the groqKey in chrome storage
      // But for backward compatibility if it's not setup yet:
      if (isTurningOn && !res.groqKey) {
        // We'll let it pass or just warn them
        console.warn("No Groq Key detected, AI answers might fail.");
      }
    });

    if (isTurningOn) {
      await new Promise(resolve => chrome.storage.local.set({ isListening: true }, resolve));
      updateStatusUI(true);
      logContainer.innerHTML = '<div class="log-entry log-system">Initializing secure audio uplink...</div>';
      await chrome.runtime.sendMessage({ target: 'background', action: 'start-listening' });
    } else {
      chrome.storage.local.set({ isListening: false });
      updateStatusUI(false);
      logContainer.innerHTML += '<div class="log-entry log-system mt-2 text-muted">System offline. Connection severed.</div>';
      await chrome.runtime.sendMessage({ target: 'background', action: 'stop-listening' });
    }
  });

  function updateStatusUI(isLive) {
    if (isLive) {
      statusLabel.classList.add('active');
      statusText.innerText = 'System Live - Capturing';
      consoleWrapper.classList.add('active-capture');
    } else {
      statusLabel.classList.remove('active');
      statusText.innerText = 'System Offline';
      consoleWrapper.classList.remove('active-capture');
    }
  }

  function appendLog(htmlContent) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    // Parse the legacy HTML format into our new class structure
    if (htmlContent.includes('Transcript:')) {
      const text = htmlContent.split('Transcript:')[1].trim();
      entry.className += ' log-transcription';
      entry.innerText = '>> ' + text;
    } else if (htmlContent.includes('AI:')) {
      const text = htmlContent.split('AI:')[1].trim();
      entry.className += ' log-answer';
      entry.innerHTML = '<span class="ai-tag">> AI Response Generated (-15 coins)</span>' + text;
    } else if (htmlContent.includes('System:')) {
      const text = htmlContent.split('System:')[1].trim();
      entry.className += ' log-system';
      entry.innerText = '[SYS] ' + text;
    } else {
      // Fallback
      entry.innerHTML = htmlContent;
    }

    logContainer.appendChild(entry);
    scrollToBottom();
  }

  function scrollToBottom() {
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // Listen for events from background runtime
  chrome.runtime.onMessage.addListener((message) => {
    if (message.target === 'popup') {
      if (message.action === 'status-update') {
        if (message.status === 'stopped') {
          powerToggle.checked = false;
          chrome.storage.local.set({ isListening: false });
          updateStatusUI(false);
        } else if (message.status === 'error') {
          powerToggle.checked = false;
          chrome.storage.local.set({ isListening: false });
          updateStatusUI(false);
          appendLog(`<div style="color:red">[ERR] Audio Capture Error: ${message.error}</div>`);
        }
      } else if (message.action === 'live-log') {
        appendLog(message.html);
      }
    }
  });
});
