// Default user-agents with badge colors - function to get them after i18n is loaded
const getDefaultUserAgents = () => [
  {
    id: 'default',
    name: i18n.getMessage('defaultUserAgent'),
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

// Initialize - wait for i18n to be ready
document.addEventListener('DOMContentLoaded', async () => {
  await i18n.ready;
  await initializeUserAgents();
  await updateDefaultUserAgentTranslation();
  await loadUserAgents();
  await setupLanguageSelector();
  await setupNavigationMenu();
  setupEventListeners();
});

// Initialize default user-agents if none exist
async function initializeUserAgents() {
  const result = await chrome.storage.local.get(['userAgents', 'activeId']);
  
  if (!result.userAgents) {
    await chrome.storage.local.set({
      userAgents: getDefaultUserAgents(),
      activeId: 'default'
    });
  }
}

// Update the default user agent translation when language changes
async function updateDefaultUserAgentTranslation() {
  const result = await chrome.storage.local.get('userAgents');
  if (!result.userAgents) return;
  
  const userAgents = result.userAgents;
  const defaultUA = userAgents.find(ua => ua.id === 'default');
  
  if (defaultUA) {
    // Update the name with the current language translation
    defaultUA.name = i18n.getMessage('defaultUserAgent');
    await chrome.storage.local.set({ userAgents });
  }
}

// Setup language selector
async function setupLanguageSelector() {
  const select = document.getElementById('languageSelect');
  const currentLang = await i18n.getLanguage();
  
  // Set current language
  select.value = currentLang;
  
  // Add change event listener
  select.addEventListener('change', async (e) => {
    const newLang = e.target.value;
    
    // Save the language preference
    await i18n.setLanguage(newLang);
    
    // Show notification
    showNotification(i18n.getMessage('languageChanged'), 'info');
    
    // Wait a bit and reload
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  });
}

// Setup navigation menu
async function setupNavigationMenu() {
  const menuItems = document.querySelectorAll('.menu-item');
  
  // Load last active section or default to 'custom-user-agents'
  const result = await chrome.storage.local.get('activeSection');
  const activeSection = result.activeSection || 'custom-user-agents';
  
  // Show the active section
  showSection(activeSection);
  
  // Add click listeners to menu items
  menuItems.forEach(item => {
    item.addEventListener('click', async () => {
      const sectionId = item.getAttribute('data-section');
      showSection(sectionId);
      
      // Save the active section
      await chrome.storage.local.set({ activeSection: sectionId });
    });
  });
}

// Show a specific section and hide others
function showSection(sectionId) {
  // Hide all sections
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => {
    section.classList.remove('active');
  });
  
  // Show the selected section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  // Update menu active state
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-section') === sectionId) {
      item.classList.add('active');
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Form submission
  document.getElementById('addUserAgentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addUserAgent();
  });
  
  // Color picker sync for background color only
  const badgeBgColor = document.getElementById('badgeBgColor');
  const badgeBgColorHex = document.getElementById('badgeBgColorHex');
  
  badgeBgColor.addEventListener('input', (e) => {
    badgeBgColorHex.value = e.target.value.toUpperCase();
    updateBadgePreview();
  });
  
  badgeBgColorHex.addEventListener('input', (e) => {
    const value = e.target.value;
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      badgeBgColor.value = value;
      updateBadgePreview();
    }
  });
  
  // Update preview when alias changes
  document.getElementById('alias').addEventListener('input', updateBadgePreview);
  
  // Initial preview
  updateBadgePreview();
}

// Update badge preview
function updateBadgePreview() {
  const preview = document.getElementById('badgePreview');
  const alias = document.getElementById('alias').value.toUpperCase() || 'TEST';
  const bgColor = document.getElementById('badgeBgColor').value;
  
  // Determine text color based on background brightness (Chrome does this automatically)
  const r = parseInt(bgColor.slice(1, 3), 16);
  const g = parseInt(bgColor.slice(3, 5), 16);
  const b = parseInt(bgColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = brightness > 128 ? '#000000' : '#ffffff';
  
  preview.textContent = alias;
  preview.style.color = textColor;
  preview.style.backgroundColor = bgColor;
}

// Load and display user-agents
async function loadUserAgents() {
  const result = await chrome.storage.local.get('userAgents');
  const userAgents = result.userAgents || getDefaultUserAgents();
  
  const listContainer = document.getElementById('userAgentsList');
  listContainer.innerHTML = '';
  
  if (userAgents.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>${i18n.getMessage('noUserAgents')}</p>
      </div>
    `;
    return;
  }
  
  userAgents.forEach(ua => {
    const card = createUserAgentCard(ua);
    listContainer.appendChild(card);
  });
}

// Create user-agent card element
function createUserAgentCard(ua) {
  const card = document.createElement('div');
  card.className = `user-agent-card${ua.id === 'default' ? ' default' : ''}`;
  
  const modeText = ua.mode === 'append' ? i18n.getMessage('modeAppend') : i18n.getMessage('modeReplace');
  
  // For default user-agent, show the actual browser user-agent
  let preview;
  if (ua.id === 'default') {
    preview = navigator.userAgent;
  } else {
    preview = ua.userAgent ? ua.userAgent : i18n.getMessage('defaultUserAgentPreview');
  }
  
  const defaultTag = ua.id === 'default' ? `<span class="default-tag">${i18n.getMessage('defaultTag')}</span>` : '';
  
  // Badge colors
  const badgeTextColor = ua.badgeTextColor || '#ffffff';
  const badgeBgColor = ua.badgeBgColor || '#1a73e8';
  
  const modeClass = ua.mode === 'append' ? 'mode-append' : 'mode-replace';
  
  // For default user-agent, don't show badge or badge colors info
  const badgeSection = ua.id === 'default' ? '' : `
    <div class="card-title">
      <h3>${ua.name}${defaultTag}</h3>
      <div class="card-badge" style="color: ${badgeTextColor}; background-color: ${badgeBgColor};">
        ${ua.alias}
      </div>
    </div>
  `;
  
  const defaultBadgeSection = ua.id === 'default' ? `
    <div class="card-title">
      <h3>${ua.name}${defaultTag}</h3>
    </div>
  ` : '';
  
  // For default user-agent, don't show mode info
  const modeInfoRow = ua.id === 'default' ? '' : `
    <div class="info-row">
      <span class="info-label">${i18n.getMessage('modeLabel')}</span>
      <span class="mode-badge ${modeClass}">${modeText}</span>
    </div>
  `;
  
  card.innerHTML = `
    <div class="card-header">
      ${ua.id === 'default' ? defaultBadgeSection : badgeSection}
      <div class="card-actions">
        ${ua.id !== 'default' ? `<button class="btn btn-danger" data-id="${ua.id}">🗑️ <span data-i18n="deleteButton">${i18n.getMessage('deleteButton')}</span></button>` : ''}
      </div>
    </div>
    <div class="card-info">
      ${modeInfoRow}
    </div>
    <div class="user-agent-preview">${preview}</div>
  `;
  
  // Add delete event listener
  if (ua.id !== 'default') {
    const deleteBtn = card.querySelector('.btn-danger');
    deleteBtn.addEventListener('click', () => deleteUserAgent(ua.id));
  }
  
  return card;
}

// Add new user-agent
async function addUserAgent() {
  const alias = document.getElementById('alias').value.trim().toUpperCase();
  const name = document.getElementById('name').value.trim();
  const mode = document.getElementById('mode').value;
  const userAgent = document.getElementById('userAgent').value.trim();
  const badgeBgColor = document.getElementById('badgeBgColor').value;
  
  // Calculate text color based on background brightness
  const r = parseInt(badgeBgColor.slice(1, 3), 16);
  const g = parseInt(badgeBgColor.slice(3, 5), 16);
  const b = parseInt(badgeBgColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const badgeTextColor = brightness > 128 ? '#000000' : '#ffffff';
  
  if (!alias || !name || !userAgent) {
    alert(i18n.getMessage('fillAllFields'));
    return;
  }
  
  const result = await chrome.storage.local.get('userAgents');
  const userAgents = result.userAgents || [];
  
  const newUserAgent = {
    id: Date.now().toString(),
    name,
    alias,
    userAgent,
    mode,
    badgeTextColor,
    badgeBgColor
  };
  
  userAgents.push(newUserAgent);
  await chrome.storage.local.set({ userAgents });
  
  // Clear form
  document.getElementById('addUserAgentForm').reset();
  document.getElementById('badgeBgColor').value = '#1a73e8';
  document.getElementById('badgeBgColorHex').value = '#1A73E8';
  updateBadgePreview();
  
  // Reload list
  await loadUserAgents();
  
  // Show success message
  showNotification(i18n.getMessage('userAgentAdded'), 'success');
}

// Delete user-agent
async function deleteUserAgent(id) {
  if (!confirm(i18n.getMessage('confirmDelete'))) {
    return;
  }
  
  const result = await chrome.storage.local.get(['userAgents', 'activeId']);
  let userAgents = result.userAgents || [];
  const activeId = result.activeId;
  
  // Remove the user-agent
  userAgents = userAgents.filter(ua => ua.id !== id);
  
  // If the deleted user-agent was active, set default as active
  const updates = { userAgents };
  if (activeId === id) {
    updates.activeId = 'default';
    
    // Notify background to reset to default
    chrome.runtime.sendMessage({
      action: 'setUserAgent',
      userAgent: userAgents.find(ua => ua.id === 'default')
    });
  }
  
  await chrome.storage.local.set(updates);
  
  // Reload list
  await loadUserAgents();
  
  showNotification(i18n.getMessage('userAgentDeleted'), 'success');
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#34a853' : '#1a73e8'};
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    font-weight: 600;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
