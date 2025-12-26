// Default user-agents with badge colors
const DEFAULT_USER_AGENTS = [
  {
    id: 'default',
    name: 'Por defecto (Chrome)',
    alias: 'DEF',
    userAgent: '',
    mode: 'replace',
    badgeTextColor: '#ffffff',
    badgeBgColor: '#666666'
  },
  {
    id: 'iphone',
    name: 'iPhone 14',
    alias: 'iOS',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    mode: 'replace',
    badgeTextColor: '#ffffff',
    badgeBgColor: '#1a73e8'
  },
  {
    id: 'android',
    name: 'Android',
    alias: 'AND',
    userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    mode: 'replace',
    badgeTextColor: '#ffffff',
    badgeBgColor: '#34a853'
  }
];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await initializeUserAgents();
  await loadUserAgents();
  setupEventListeners();
});

// Initialize default user-agents if none exist
async function initializeUserAgents() {
  const result = await chrome.storage.local.get(['userAgents', 'activeId']);
  
  if (!result.userAgents) {
    await chrome.storage.local.set({
      userAgents: DEFAULT_USER_AGENTS,
      activeId: 'default'
    });
  }
}

// Load and display user-agents
async function loadUserAgents() {
  const result = await chrome.storage.local.get(['userAgents', 'activeId']);
  const userAgents = result.userAgents || DEFAULT_USER_AGENTS;
  const activeId = result.activeId || 'default';
  
  const listContainer = document.getElementById('userAgentsList');
  listContainer.innerHTML = '';
  
  if (userAgents.length === 0) {
    listContainer.innerHTML = '<div class="empty-state"><p>No hay user-agents configurados</p></div>';
    return;
  }
  
  userAgents.forEach(ua => {
    const item = createUserAgentItem(ua, activeId);
    listContainer.appendChild(item);
  });
}

// Create user-agent item element
function createUserAgentItem(ua, activeId) {
  const div = document.createElement('div');
  div.className = `user-agent-item${ua.id === activeId ? ' active' : ''}`;
  div.dataset.id = ua.id;
  
  const modeText = ua.mode === 'append' ? ' (agregar)' : '';
  const preview = ua.userAgent ? ua.userAgent.substring(0, 50) + '...' : 'User-agent por defecto del navegador';
  
  // Badge colors
  const badgeTextColor = ua.badgeTextColor || '#ffffff';
  const badgeBgColor = ua.badgeBgColor || '#1a73e8';
  
  div.innerHTML = `
    <div class="user-agent-info">
      <div class="user-agent-name">${ua.name}${modeText}</div>
      <div class="user-agent-preview">${preview}</div>
    </div>
    <div class="user-agent-badge" style="color: ${badgeTextColor}; background-color: ${badgeBgColor};">
      ${ua.alias}
    </div>
  `;
  
  div.addEventListener('click', () => activateUserAgent(ua.id));
  
  return div;
}

// Activate a user-agent
async function activateUserAgent(id) {
  await chrome.storage.local.set({ activeId: id });
  
  // Get the selected user-agent
  const result = await chrome.storage.local.get('userAgents');
  const userAgent = result.userAgents.find(ua => ua.id === id);
  
  // Send message to background script
  chrome.runtime.sendMessage({
    action: 'setUserAgent',
    userAgent: userAgent
  });
  
  // Reload the list to update active state
  await loadUserAgents();
}

// Setup event listeners
function setupEventListeners() {
  // Manage button - open options page in new tab
  document.getElementById('manageBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'options.html' });
  });
}
