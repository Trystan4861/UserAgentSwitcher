// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setUserAgent') {
    setUserAgent(request.userAgent);
  }
});

// Listen for storage changes to update badge and permanent spoofs
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.activeId) {
      updateBadge();
    }
    // Update permanent spoof rules when they change
    if (changes.permanentSpoofs) {
      applyPermanentSpoofs();
    }
    // Update rules when settings change (to adjust priorities)
    if (changes.settings) {
      applyPermanentSpoofs();
      // Also reapply current manual selection to update its priority
      chrome.storage.local.get(['userAgents', 'activeId'], (result) => {
        if (result.userAgents && result.activeId) {
          const activeUA = result.userAgents.find(ua => ua.id === result.activeId);
          if (activeUA && activeUA.id !== 'default') {
            setUserAgent(activeUA);
          }
        }
      });
    }
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
    // Get existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    
    // Remove only manual selection rules (ID < 1000)
    // Keep permanent spoof rules (ID >= 1000)
    const manualRuleIds = existingRules
      .filter(rule => rule.id < 1000)
      .map(rule => rule.id);
    
    if (manualRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: manualRuleIds
      });
    }
    
    // If userAgent is empty or default, just remove manual rules (use browser default)
    // Permanent spoofs will still be active
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
    
    // Get settings to determine priority
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};
    
    // If permanentOverride is true, manual selection has priority 2 (lower than permanent spoofs at 3)
    // If false, manual selection has priority 2 (higher than permanent spoofs at 1)
    const priority = settings.permanentOverride ? 2 : 2;
    
    // Add new rule to modify User-Agent header
    const newRule = {
      id: 1,
      priority: priority,
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

// ============================================================================
// PERMANENT SPOOFS FUNCTIONALITY
// ============================================================================

/**
 * Convert domain pattern to URL pattern for declarativeNetRequest
 * Supports wildcards like *.example.com and specific paths like localhost/core/*
 * @param {string} domain - Domain pattern (e.g., "google.com", "*.amazon.com", or "localhost/core/*")
 * @returns {string} - URL pattern for declarativeNetRequest
 */
function getDomainPattern(domain) {
  // Remove protocol if present
  domain = domain.replace(/^https?:\/\//, '');
  
  // Check if domain contains a path (has a slash after the domain part)
  const hasPath = domain.includes('/');
  
  if (hasPath) {
    // Handle paths like "localhost/core/*" or "example.com/api/*"
    // Keep the path as-is, just add protocol
    if (!domain.endsWith('*')) {
      // If path doesn't end with *, add /* to match everything under that path
      domain = domain.endsWith('/') ? domain + '*' : domain + '/*';
    }
    return `*://${domain}`;
  }
  
  // Remove trailing slash for domain-only patterns
  domain = domain.replace(/\/$/, '');
  
  // Handle wildcard subdomain
  if (domain.startsWith('*.')) {
    // *.example.com -> *://*.example.com/*
    return `*://${domain}/*`;
  } else if (domain.startsWith('*')) {
    // *example.com -> *://*example.com/*
    return `*://${domain}/*`;
  } else {
    // example.com -> *://example.com/*
    return `*://${domain}/*`;
  }
}

/**
 * Get the User-Agent string for a given userAgentId
 * @param {string} userAgentId - ID of the user-agent
 * @returns {Promise<string|null>} - User-Agent string or null if not found
 */
async function getUserAgentString(userAgentId) {
  try {
    const result = await chrome.storage.local.get(['userAgents']);
    const userAgents = result.userAgents || [];
    const ua = userAgents.find(u => u.id === userAgentId);
    
    if (!ua || !ua.userAgent) {
      return null;
    }
    
    // Handle append mode
    if (ua.mode === 'append') {
      const defaultUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      return defaultUA + ' ' + ua.userAgent;
    }
    
    return ua.userAgent;
  } catch (error) {
    console.error('Error getting user-agent string:', error);
    return null;
  }
}

/**
 * Update permanent spoof rules in declarativeNetRequest
 * Rules for permanent spoofs start at ID 1000
 */
async function updatePermanentSpoofRules() {
  try {
    const result = await chrome.storage.local.get(['permanentSpoofs', 'settings']);
    const permanentSpoofs = result.permanentSpoofs || [];
    const settings = result.settings || {};
    
    // Get existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    
    // Identify permanent spoof rules (ID >= 1000)
    const permanentRuleIds = existingRules
      .filter(rule => rule.id >= 1000)
      .map(rule => rule.id);
    
    // Remove existing permanent spoof rules
    if (permanentRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: permanentRuleIds
      });
    }
    
    // Create new rules for active permanent spoofs
    const newRules = [];
    let ruleId = 1000; // Start IDs at 1000 for permanent spoofs
    
    for (const spoof of permanentSpoofs) {
      if (!spoof.enabled) {
        continue; // Skip disabled spoofs
      }
      
      const userAgentString = await getUserAgentString(spoof.userAgentId);
      if (!userAgentString) {
        console.warn(`User-Agent not found for spoof: ${spoof.domain}`);
        continue;
      }
      
      // Create URL pattern from domain
      const urlPattern = getDomainPattern(spoof.domain);
      
      // Determine priority based on settings
      // If permanentOverride is true, permanent spoofs have higher priority (3)
      // Otherwise, they have lower priority (1) so manual selection takes precedence
      const priority = settings.permanentOverride ? 3 : 1;
      
      const rule = {
        id: ruleId++,
        priority: priority,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              header: 'user-agent',
              operation: 'set',
              value: userAgentString
            }
          ]
        },
        condition: {
          urlFilter: urlPattern,
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
      
      newRules.push(rule);
      
      // Also add rule for subdomains if not already a wildcard and doesn't have a path
      if (!spoof.domain.includes('*') && !spoof.domain.includes('/')) {
        const subdomainPattern = `*://*.${spoof.domain}/*`;
        newRules.push({
          ...rule,
          id: ruleId++,
          condition: {
            ...rule.condition,
            urlFilter: subdomainPattern
          }
        });
      }
    }
    
    // Add new permanent spoof rules
    if (newRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
      });
    }
    
    console.log(`Updated ${newRules.length} permanent spoof rules`);
  } catch (error) {
    console.error('Error updating permanent spoof rules:', error);
  }
}

/**
 * Apply all permanent spoofs
 * This function is called when permanent spoofs change in storage
 */
async function applyPermanentSpoofs() {
  await updatePermanentSpoofRules();
}

/**
 * Initialize permanent spoofs on extension startup
 */
async function initializePermanentSpoofs() {
  try {
    // Apply permanent spoofs
    await applyPermanentSpoofs();
    
    // Also reapply any active user-agent from toolbar if it exists
    const result = await chrome.storage.local.get(['userAgents', 'activeId', 'settings']);
    const settings = result.settings || {};
    
    // Only reapply manual selection if permanentOverride is false
    if (!settings.permanentOverride && result.userAgents && result.activeId) {
      const activeUA = result.userAgents.find(ua => ua.id === result.activeId);
      if (activeUA && activeUA.id !== 'default') {
        await setUserAgent(activeUA);
      }
    }
  } catch (error) {
    console.error('Error initializing permanent spoofs:', error);
  }
}

// Initialize permanent spoofs on startup
initializePermanentSpoofs();
