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

// Setup event listeners
function setupEventListeners() {
  // Form submission
  document.getElementById('addUserAgentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addUserAgent();
  });
  
  // Color picker sync
  const badgeTextColor = document.getElementById('badgeTextColor');
  const badgeTextColorHex = document.getElementById('badgeTextColorHex');
  const badgeBgColor = document.getElementById('badgeBgColor');
  const badgeBgColorHex = document.getElementById('badgeBgColorHex');
  
  badgeTextColor.addEventListener('input', (e) => {
    badgeTextColorHex.value = e.target.value.toUpperCase();
    updateBadgePreview();
  });
  
  badgeTextColorHex.addEventListener('input', (e) => {
    const value = e.target.value;
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      badgeTextColor.value = value;
      updateBadgePreview();
    }
  });
  
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
  const textColor = document.getElementById('badgeTextColor').value;
  const bgColor = document.getElementById('badgeBgColor').value;
  
  preview.textContent = alias;
  preview.style.color = textColor;
  preview.style.backgroundColor = bgColor;
}

// Load and display user-agents
async function loadUserAgents() {
  const result = await chrome.storage.local.get('userAgents');
  const userAgents = result.userAgents || DEFAULT_USER_AGENTS;
  
  const listContainer = document.getElementById('userAgentsList');
  listContainer.innerHTML = '';
  
  if (userAgents.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>No hay user-agents configurados</p>
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
  
  const modeClass = ua.mode === 'append' ? 'mode-append' : 'mode-replace';
  const modeText = ua.mode === 'append' ? 'Agregar' : 'Reemplazar';
  
  const preview = ua.userAgent ? ua.userAgent : 'User-agent por defecto del navegador';
  
  const defaultTag = ua.id === 'default' ? '<span class="default-tag">POR DEFECTO</span>' : '';
  
  // Badge colors
  const badgeTextColor = ua.badgeTextColor || '#ffffff';
  const badgeBgColor = ua.badgeBgColor || '#1a73e8';
  
  card.innerHTML = `
    <div class="card-header">
      <div class="card-title">
        <h3>${ua.name}${defaultTag}</h3>
        <div class="card-badge" style="color: ${badgeTextColor}; background-color: ${badgeBgColor};">
          ${ua.alias}
        </div>
      </div>
      <div class="card-actions">
        ${ua.id !== 'default' ? `<button class="btn btn-danger" data-id="${ua.id}">🗑️ Eliminar</button>` : ''}
      </div>
    </div>
    <div class="card-info">
      <div class="info-row">
        <span class="info-label">Modo:</span>
        <span class="info-value"><span class="mode-badge ${modeClass}">${modeText}</span></span>
      </div>
      <div class="info-row">
        <span class="info-label">Badge:</span>
        <span class="info-value">
          Texto: <code>${badgeTextColor}</code> | Fondo: <code>${badgeBgColor}</code>
        </span>
      </div>
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
  const badgeTextColor = document.getElementById('badgeTextColor').value;
  const badgeBgColor = document.getElementById('badgeBgColor').value;
  
  if (!alias || !name || !userAgent) {
    alert('Por favor completa todos los campos obligatorios');
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
  document.getElementById('badgeTextColor').value = '#ffffff';
  document.getElementById('badgeTextColorHex').value = '#ffffff';
  document.getElementById('badgeBgColor').value = '#1a73e8';
  document.getElementById('badgeBgColorHex').value = '#1a73e8';
  updateBadgePreview();
  
  // Reload list
  await loadUserAgents();
  
  // Show success message
  showNotification('User-Agent agregado correctamente', 'success');
}

// Delete user-agent
async function deleteUserAgent(id) {
  if (!confirm('¿Estás seguro de que quieres eliminar este user-agent?')) {
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
  
  showNotification('User-Agent eliminado correctamente', 'success');
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
