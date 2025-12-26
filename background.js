// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setUserAgent') {
    setUserAgent(request.userAgent);
  }
});

// Listen for storage changes to update badge
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.activeId) {
    updateBadge();
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  // Load the active user-agent and update badge
  await updateBadge();
  
  // Get the current active user-agent and apply it
  const result = await chrome.storage.local.get(['userAgents', 'activeId']);
  if (result.userAgents && result.activeId) {
    const activeUA = result.userAgents.find(ua => ua.id === result.activeId);
    if (activeUA) {
      await setUserAgent(activeUA);
    }
  }
});

// Set user-agent using declarativeNetRequest
async function setUserAgent(userAgent) {
  try {
    // Remove all existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map(rule => rule.id);
    
    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }
    
    // If userAgent is empty or default, just remove rules (use browser default)
    if (!userAgent || !userAgent.userAgent || userAgent.id === 'default') {
      await updateBadge();
      return;
    }
    
    // Determine the final user-agent string
    let finalUserAgent;
    
    if (userAgent.mode === 'append') {
      // Get the default user-agent and append
      // Note: We can't easily get the browser's UA in a service worker,
      // so we'll use a typical Chrome UA as base
      const defaultUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      finalUserAgent = defaultUA + ' ' + userAgent.userAgent;
    } else {
      // Replace completely
      finalUserAgent = userAgent.userAgent;
    }
    
    // Add new rule to modify User-Agent header
    const newRule = {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'user-agent',
            operation: 'set',
            value: finalUserAgent
          }
        ]
      },
      condition: {
        urlFilter: '*',
        resourceTypes: [
          'main_frame',
          'sub_frame',
          'stylesheet',
          'script',
          'image',
          'font',
          'object',
          'xmlhttprequest',
          'ping',
          'csp_report',
          'media',
          'websocket',
          'webtransport',
          'webbundle',
          'other'
        ]
      }
    };
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [newRule]
    });
    
    // Update badge
    await updateBadge();
    
  } catch (error) {
    console.error('Error setting user-agent:', error);
  }
}

// Update the badge on the extension icon
async function updateBadge() {
  try {
    const result = await chrome.storage.local.get(['userAgents', 'activeId']);
    const userAgents = result.userAgents || [];
    const activeId = result.activeId || 'default';
    
    const activeUA = userAgents.find(ua => ua.id === activeId);
    
    if (activeUA) {
      // If it's the default user-agent, don't show any badge
      if (activeId === 'default') {
        await chrome.action.setBadgeText({ text: '' });
      } else {
        // Set badge text (the alias) for custom user-agents
        await chrome.action.setBadgeText({ text: activeUA.alias });
        
        // Use custom badge colors if available
        const badgeBgColor = activeUA.badgeBgColor || '#1a73e8';
        await chrome.action.setBadgeBackgroundColor({ color: badgeBgColor });
        
        // Note: Chrome doesn't support badge text color via API
        // The text color is automatically determined by Chrome based on background color
      }
      
      // Set title for tooltip
      await chrome.action.setTitle({ 
        title: `User-Agent Changer\nActivo: ${activeUA.name}` 
      });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Initialize badge on startup
updateBadge();
