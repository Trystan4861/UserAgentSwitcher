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

// Update page title with i18n
function updatePageTitle() {
  document.title = i18n.getMessage('pageTitle') || 'User-Agent Changer';
}

// Initialize - wait for i18n to be ready
document.addEventListener('DOMContentLoaded', async () => {
  await i18n.ready;
  updatePageTitle();
  loadExtensionVersion();
  await initializeUserAgents();
  await updateDefaultUserAgentTranslation();
  await loadUserAgents();
  await loadPermanentSpoofs();
  await setupLanguageSelector();
  await setupNavigationMenu();
  await setupImportExport();
  await setupOtherSettings();
  setupEventListeners();
});

// Load and display extension version
function loadExtensionVersion() {
  const manifest = chrome.runtime.getManifest();
  const versionElement = document.getElementById('extensionVersion');
  if (versionElement) {
    versionElement.textContent = `v${manifest.version}`;
  }
}

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
  
  // Permanent Spoof form submission
  const spoofForm = document.getElementById('addPermanentSpoofForm');
  if (spoofForm) {
    spoofForm.addEventListener('submit', addPermanentSpoof);
  }
  
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
  
  setupUserAgentSelector(userAgents);
  
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
    
  // Badge colors
  const badgeTextColor = ua.badgeTextColor || '#ffffff';
  const badgeBgColor = ua.badgeBgColor || '#1a73e8';
  
  const modeClass = ua.mode === 'append' ? 'mode-append' : 'mode-replace';
  
  // For default user-agent, don't show badge or badge colors info
  const badgeSection = ua.id === 'default' ? '' : `
    <div class="card-title">
      <h3>${ua.name}</h3>
      <div class="card-badge" style="color: ${badgeTextColor}; background-color: ${badgeBgColor};">
        ${ua.alias}
      </div>
    </div>
  `;
  
  const defaultBadgeSection = ua.id === 'default' ? `
    <div class="card-title">
      <h3>${ua.name}</h3>
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
  // Remove any existing notifications first
  const existing = document.querySelectorAll('.custom-notification');
  existing.forEach(n => n.remove());
  
  // Define colors and icons for each type
  const styles = {
    success: { bg: '#34a853', icon: '✅' },
    error: { bg: '#d93025', icon: '⚠️' },
    info: { bg: '#1a73e8', icon: 'ℹ️' },
    warning: { bg: '#fbbc04', icon: '⚠️' }
  };
  
  const style = styles[type] || styles.info;
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'custom-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${style.bg};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    font-weight: 500;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 400px;
    word-wrap: break-word;
  `;
  
  notification.innerHTML = `
    <span style="font-size: 20px;">${style.icon}</span>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
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

// Permanent Spoof List Functions
async function loadPermanentSpoofs() {
  const result = await chrome.storage.local.get(['permanentSpoofs', 'userAgents']);
  const spoofs = result.permanentSpoofs || [];
  const userAgents = result.userAgents || getDefaultUserAgents();

  const listContainer = document.getElementById('permanentSpoofsList');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  if (spoofs.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-spoofs">
        <p>No hay spoofs permanentes configurados</p>
        <small>Usa el formulario de arriba para agregar uno</small>
      </div>
    `;
    return;
  }

  spoofs.forEach(spoof => {
    const ua = userAgents.find(u => u.id === spoof.userAgentId);
    if (!ua) return;

    const card = createSpoofCard(spoof, ua);
    listContainer.appendChild(card);
  });

  setupUserAgentSelector(userAgents);
}

function setupUserAgentSelector(userAgents) {
  const select = document.getElementById('spoofUserAgent');
  if (!select) return;

  // Clear previous options
  select.innerHTML = '';

  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = i18n.getMessage('selectUserAgentOption') || 'Selecciona un User-Agent';
  select.appendChild(defaultOption);

  // Add all user agents (except default)
  userAgents.forEach(ua => {
    if (ua.id !== 'default') {
      const option = document.createElement('option');
      option.value = ua.id;
      option.textContent = `${ua.name} (${ua.alias})`;
      select.appendChild(option);
    }
  });

  // Remove old listeners and add new one
  const newSelect = select.cloneNode(true);
  select.parentNode.replaceChild(newSelect, select);
  newSelect.addEventListener('change', updateSpoofPreview);
}

async function updateSpoofPreview() {
  const select = document.getElementById('spoofUserAgent');
  const previewContainer = document.getElementById('spoofPreviewContainer');
  const preview = document.getElementById('spoofPreview');

  if (!select || !previewContainer || !preview) return;

  const selectedId = select.value;

  if (!selectedId) {
    previewContainer.style.display = 'none';
    return;
  }

  const result = await chrome.storage.local.get('userAgents');
  const userAgents = result.userAgents || [];
  const ua = userAgents.find(u => u.id === selectedId);

  if (ua) {
    previewContainer.style.display = 'block';
    preview.textContent = ua.userAgent;
  }
}

function createSpoofCard(spoof, ua) {
  const card = document.createElement('div');
  card.className = 'spoof-card';
  
  card.innerHTML = `
    <div class="spoof-header">
      <div class="spoof-domain">${spoof.domain}</div>
      <div class="card-actions">
        <button class="btn btn-danger" data-id="${spoof.id}">🗑️ ${i18n.getMessage('deleteButton')}</button>
      </div>
    </div>
    <div class="spoof-info">
      <div class="spoof-info-row">
        <span class="spoof-info-label">${i18n.getMessage('labelSelectUserAgent')}</span>
        <span class="spoof-ua-name">${ua.name}</span>
      </div>
    </div>
    <div class="spoof-preview">
      <label>${i18n.getMessage('userAgentPreview')}</label>
      <div class="user-agent-preview">${ua.userAgent}</div>
    </div>
  `;
  
  const deleteBtn = card.querySelector('.btn-danger');
  deleteBtn.addEventListener('click', () => deletePermanentSpoof(spoof.id));
  
  return card;
}

async function addPermanentSpoof(e) {
  e.preventDefault();
  
  const domain = document.getElementById('spoofDomain').value.trim();
  const userAgentId = document.getElementById('spoofUserAgent').value;
  
  if (!domain || !userAgentId) {
    alert(i18n.getMessage('fillAllFields'));
    return;
  }
  
  const result = await chrome.storage.local.get('permanentSpoofs');
  const spoofs = result.permanentSpoofs || [];
  
  if (spoofs.some(s => s.domain === domain)) {
    alert('Este dominio ya tiene un spoof configurado');
    return;
  }
  
  const newSpoof = {
    id: Date.now().toString(),
    domain,
    userAgentId,
    enabled: true
  };
  
  spoofs.push(newSpoof);
  await chrome.storage.local.set({ permanentSpoofs: spoofs });
  
  document.getElementById('addPermanentSpoofForm').reset();
  document.getElementById('spoofPreview').style.display = 'none';
  
  await loadPermanentSpoofs();
  showNotification('Spoof permanente agregado correctamente', 'success');
}

async function deletePermanentSpoof(id) {
  if (!confirm('¿Estás seguro de que quieres eliminar este spoof permanente?')) {
    return;
  }
  
  const result = await chrome.storage.local.get('permanentSpoofs');
  let spoofs = result.permanentSpoofs || [];
  
  spoofs = spoofs.filter(s => s.id !== id);
  await chrome.storage.local.set({ permanentSpoofs: spoofs });
  
  await loadPermanentSpoofs();
  showNotification('Spoof permanente eliminado correctamente', 'success');
}

// Import/Export Functions
async function setupImportExport() {
  const importFile = document.getElementById('importFile');
  const exportBtn = document.getElementById('exportBtn');
  const confirmImportBtn = document.getElementById('confirmImportBtn');
  const dropArea = document.getElementById('drop-area');
  const selectedFileName = document.getElementById('selectedFileName');
  
  if (!importFile || !exportBtn) return;
  
  // Setup drag and drop
  dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropArea.classList.add('drag-over');
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('drag-over');
  });

  dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    dropArea.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json') {
        selectedFileName.textContent = file.name;
        handleFileImport(file);
      } else {
        alert(i18n.getMessage('invalidFileType'));
      }
    }
  });
  
  // File selection handler
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    selectedFileName.textContent = file.name;
    
    try {
      const text = await file.text();
      
      // Add a small delay to ensure file is fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const data = JSON.parse(text);
      
      // Validate and show preview
      if (validateImportData(data)) {
        showImportPreview(data);
      } else {
        showNotification(i18n.getMessage('importErrorInvalidFormat') || 'El archivo no tiene un formato válido', 'error');
        importFile.value = '';
        selectedFileName.textContent = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      showNotification(i18n.getMessage('importErrorReadFile') || 'Error al leer el archivo. Asegúrate de que sea un JSON válido.', 'error');
      importFile.value = '';
      selectedFileName.textContent = '';
    }
  });
  
  // Export button handler
  exportBtn.addEventListener('click', exportSettings);
  
  // Confirm import button handler
  if (confirmImportBtn) {
    confirmImportBtn.addEventListener('click', confirmImport);
  }
}

// Handle file import (from drag-and-drop or file selection)
async function handleFileImport(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (validateImportData(data)) {
        showImportPreview(data);
      } else {
        showImportError(i18n.getMessage('importErrorInvalidFormat'));
      }
    } catch (error) {
      showImportError(i18n.getMessage('importErrorReadFile'));
    }
  };
  reader.readAsText(file);
}

function validateImportData(data) {
  // Check basic structure
  if (!data || typeof data !== 'object') return false;
  
  // At least one of these should exist
  if (!data.userAgents && !data.permanentSpoofs) return false;
  
  // Validate userAgents if present
  if (data.userAgents) {
    if (!Array.isArray(data.userAgents)) return false;
    
    for (const ua of data.userAgents) {
      if (!ua.id || !ua.name || !ua.alias) return false;
      if (ua.mode && !['replace', 'append'].includes(ua.mode)) return false;
    }
  }
  
  // Validate permanentSpoofs if present
  if (data.permanentSpoofs) {
    if (!Array.isArray(data.permanentSpoofs)) return false;
    
    for (const spoof of data.permanentSpoofs) {
      if (!spoof.id || !spoof.domain || !spoof.userAgentId) return false;
    }
  }
  
  return true;
}

function showImportPreview(data) {
  const previewContainer = document.getElementById('importPreview');
  const previewContent = document.getElementById('importPreviewContent');
  const importSection = document.getElementById('importSection');
  const exportSection = document.getElementById('exportSection');
  
  if (!previewContainer || !previewContent) return;
  
  // Hide the import and export sections
  if (importSection) {
    importSection.style.display = 'none';
  }
  if (exportSection) {
    exportSection.style.display = 'none';
  }
  
  // Filter out default user agent from preview
  const userAgentsToShow = data.userAgents ? data.userAgents.filter(ua => ua.id !== 'default') : [];
  
  const version = data.version || 'Unknown';
  const exportDate = data.exportDate ? new Date(data.exportDate).toLocaleString() : 'Unknown';
  
  // Build user agents selection list
  let userAgentsHTML = '';
  if (userAgentsToShow.length > 0) {
    userAgentsHTML = `
      <div class="import-selection-section">
        <div class="import-section-header">
          <h3>📱 ${i18n.getMessage('userAgentsLabel') || 'User-Agents'}</h3>
          <div class="import-section-info">
            <span class="count-badge">${userAgentsToShow.length}</span>
            <button type="button" class="btn-link toggle-ua-btn">
              ${i18n.getMessage('selectAll') || 'Seleccionar todos'}
            </button>
          </div>
        </div>
        <div class="import-selection-list">
          ${userAgentsToShow.map(ua => `
            <div class="import-selection-item">
              <label class="import-checkbox-label">
                <input type="checkbox" class="import-ua-checkbox" value="${ua.id}" checked>
                <div class="import-item-content">
                  <div class="import-item-header">
                    <span class="import-item-name">${ua.name}</span>
                    <span class="import-item-badge" style="background: ${ua.badgeBgColor || '#1a73e8'}; color: ${ua.badgeTextColor || '#ffffff'};">
                      ${ua.alias}
                    </span>
                  </div>
                  <div class="import-item-details">${ua.userAgent}</div>
                </div>
              </label>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Build permanent spoofs selection list
  let spoofsHTML = '';
  if (data.permanentSpoofs && data.permanentSpoofs.length > 0) {
    spoofsHTML = `
      <div class="import-selection-section">
        <div class="import-section-header">
          <h3>📌 ${i18n.getMessage('permanentSpoofListTitle') || 'Permanent Spoofs'}</h3>
          <div class="import-section-info">
            <span class="count-badge">${data.permanentSpoofs.length}</span>
            <button type="button" class="btn-link toggle-spoofs-btn">
              ${i18n.getMessage('selectAll') || 'Seleccionar todos'}
            </button>
          </div>
        </div>
        <div class="import-selection-list">
          ${data.permanentSpoofs.map(spoof => {
            const ua = userAgentsToShow.find(u => u.id === spoof.userAgentId);
            return `
              <div class="import-selection-item">
                <label class="import-checkbox-label">
                  <input type="checkbox" class="import-spoof-checkbox" value="${spoof.id}" checked>
                  <div class="import-item-content">
                    <div class="import-item-header">
                      <span class="import-item-name">🌐 ${spoof.domain}</span>
                    </div>
                    ${ua ? `
                      <div class="import-item-details">→ ${ua.name} (${ua.alias})</div>
                    ` : `
                      <div class="import-item-details warning">
                        ⚠️ User-Agent ${spoof.userAgentId} ${i18n.getMessage('notFoundLabel') || 'no encontrado'}
                      </div>
                    `}
                  </div>
                </label>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  previewContent.innerHTML = `
    <div class="import-preview-header">
      <div class="import-preview-title">
        <h2>${i18n.getMessage('importPreviewTitle') || 'Vista Previa de Importación'}</h2>
        <div class="import-metadata">
          <span>📦 v${version}</span>
          <span>📅 ${exportDate}</span>
        </div>
      </div>
    </div>
    
    <div class="import-selection-container">
      ${userAgentsHTML}
      ${spoofsHTML}
      
      ${!userAgentsHTML && !spoofsHTML ? `
        <div class="preview-empty">
          ${i18n.getMessage('noDataToImport') || 'No hay datos para importar'}
        </div>
      ` : ''}
    </div>
    
    <div class="import-actions-bar">
      <button class="btn btn-secondary cancel-import-btn">
        ${i18n.getMessage('cancelButton') || 'Cancelar'}
      </button>
      <button class="btn btn-primary confirm-import-btn">
        ${i18n.getMessage('confirmImportButton') || 'Confirmar Importación'}
      </button>
    </div>
  `;
  
  previewContainer.style.display = 'block';
  
  // Store data for import
  previewContainer.dataset.importData = JSON.stringify(data);
  
  // Add event listeners to dynamically created buttons
  setTimeout(() => {
    const toggleUABtn = previewContent.querySelector('.toggle-ua-btn');
    const toggleSpoofsBtn = previewContent.querySelector('.toggle-spoofs-btn');
    const cancelBtn = previewContent.querySelector('.cancel-import-btn');
    const confirmBtn = previewContent.querySelector('.confirm-import-btn');
    
    if (toggleUABtn) {
      toggleUABtn.addEventListener('click', window.toggleAllUserAgents);
    }
    
    if (toggleSpoofsBtn) {
      toggleSpoofsBtn.addEventListener('click', window.toggleAllSpoofs);
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', window.cancelImport);
    }
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', window.confirmImportSelected);
    }
  }, 0);
}

// Toggle all user agents checkboxes
window.toggleAllUserAgents = function() {
  const checkboxes = document.querySelectorAll('.import-ua-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
  });
};

// Toggle all spoofs checkboxes
window.toggleAllSpoofs = function() {
  const checkboxes = document.querySelectorAll('.import-spoof-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
  });
};

// Confirm import with selected items
window.confirmImportSelected = async function() {
  const previewContainer = document.getElementById('importPreview');
  const importData = JSON.parse(previewContainer.dataset.importData || '{}');
  const importFile = document.getElementById('importFile');
  const selectedFileName = document.getElementById('selectedFileName');
  
  // Get selected user agents
  const selectedUACheckboxes = document.querySelectorAll('.import-ua-checkbox:checked');
  const selectedUAIds = Array.from(selectedUACheckboxes).map(cb => cb.value);
  
  // Get selected spoofs
  const selectedSpoofCheckboxes = document.querySelectorAll('.import-spoof-checkbox:checked');
  const selectedSpoofIds = Array.from(selectedSpoofCheckboxes).map(cb => cb.value);
  
  try {
    const result = await chrome.storage.local.get(['userAgents', 'permanentSpoofs']);
    let existingUserAgents = result.userAgents || getDefaultUserAgents();
    let existingSpoofs = result.permanentSpoofs || [];
    
    // Filter imported user agents by selection
    const selectedUserAgents = (importData.userAgents || []).filter(ua => 
      selectedUAIds.includes(ua.id) && ua.id !== 'default'
    );
    
    // Filter imported spoofs by selection
    const selectedSpoofs = (importData.permanentSpoofs || []).filter(spoof => 
      selectedSpoofIds.includes(spoof.id)
    );
    
    // Merge with existing data (avoid duplicates)
    const existingUAIds = new Set(existingUserAgents.map(ua => ua.id));
    const newUserAgents = selectedUserAgents.filter(ua => !existingUAIds.has(ua.id));
    
    const existingSpoofDomains = new Set(existingSpoofs.map(s => s.domain));
    const newSpoofs = selectedSpoofs.filter(s => !existingSpoofDomains.has(s.domain));
    
    // Combine with existing
    const finalUserAgents = [...existingUserAgents, ...newUserAgents];
    const finalSpoofs = [...existingSpoofs, ...newSpoofs];
    
    // Save to storage
    await chrome.storage.local.set({
      userAgents: finalUserAgents,
      permanentSpoofs: finalSpoofs
    });
    
    // Reload UI
    await loadUserAgents();
    await loadPermanentSpoofs();
    
    // Reset and hide preview
    importFile.value = '';
    selectedFileName.textContent = '';
    previewContainer.style.display = 'none';
    
    // Show import and export sections again
    const importSection = document.getElementById('importSection');
    const exportSection = document.getElementById('exportSection');
    if (importSection) importSection.style.display = 'block';
    if (exportSection) exportSection.style.display = 'block';
    
    // Show success message
    const count = newUserAgents.length + newSpoofs.length;
    showNotification(`${count} elementos importados correctamente`, 'success');
    
  } catch (error) {
    console.error('Import error:', error);
    showNotification('Error al importar la configuración', 'error');
  }
};

// Cancel import and return to file selection
window.cancelImport = function() {
  const previewContainer = document.getElementById('importPreview');
  const importSection = document.getElementById('importSection');
  const exportSection = document.getElementById('exportSection');
  const importFile = document.getElementById('importFile');
  const selectedFileName = document.getElementById('selectedFileName');
  
  // Hide preview
  if (previewContainer) {
    previewContainer.style.display = 'none';
  }
  
  // Show import and export sections again using grid
  const importExportContent = document.querySelector('#import-export .content');
  if (importExportContent) {
    importExportContent.style.display = 'grid';
  }
  
  if (importSection) {
    importSection.style.display = '';
  }
  if (exportSection) {
    exportSection.style.display = '';
  }
  
  // Clear file input
  if (importFile) {
    importFile.value = '';
  }
  
  if (selectedFileName) {
    selectedFileName.textContent = '';
  }
};

function showImportError(message) {
  const previewContainer = document.getElementById('importPreview');
  const previewContent = document.getElementById('importPreviewContent');
  
  if (!previewContainer || !previewContent) return;
  
  previewContent.innerHTML = `
    <div class="import-error">
      ${message}
    </div>
  `;
  
  previewContainer.style.display = 'block';
  
  setTimeout(() => {
    previewContainer.style.display = 'none';
  }, 5000);
}

async function confirmImport() {
  const previewContainer = document.getElementById('importPreview');
  const importData = JSON.parse(previewContainer.dataset.importData || '{}');
  const importFile = document.getElementById('importFile');
  const selectedFileName = document.getElementById('selectedFileName');
  
  // Get selected import mode
  const importMode = document.querySelector('input[name="importMode"]:checked').value;
  
  try {
    const result = await chrome.storage.local.get(['userAgents', 'permanentSpoofs']);
    let existingUserAgents = result.userAgents || getDefaultUserAgents();
    let existingSpoofs = result.permanentSpoofs || [];
    
    let newUserAgents = existingUserAgents;
    let newSpoofs = existingSpoofs;
    
    switch (importMode) {
      case 'replace':
        // Replace everything
        newUserAgents = importData.userAgents || getDefaultUserAgents();
        newSpoofs = importData.permanentSpoofs || [];
        break;
        
      case 'merge':
        // Merge: add new items, skip duplicates
        if (importData.userAgents) {
          const existingIds = new Set(existingUserAgents.map(ua => ua.id));
          const toAdd = importData.userAgents.filter(ua => !existingIds.has(ua.id));
          newUserAgents = [...existingUserAgents, ...toAdd];
        }
        
        if (importData.permanentSpoofs) {
          const existingDomains = new Set(existingSpoofs.map(s => s.domain));
          const toAdd = importData.permanentSpoofs.filter(s => !existingDomains.has(s.domain));
          newSpoofs = [...existingSpoofs, ...toAdd];
        }
        break;
        
      case 'userAgentsOnly':
        // Only import user agents
        if (importData.userAgents) {
          newUserAgents = importData.userAgents;
        }
        break;
        
      case 'spoofOnly':
        // Only import permanent spoofs
        if (importData.permanentSpoofs) {
          newSpoofs = importData.permanentSpoofs;
        }
        break;
    }
    
    // Ensure default user agent exists
    if (!newUserAgents.find(ua => ua.id === 'default')) {
      newUserAgents.unshift(getDefaultUserAgents()[0]);
    }
    
    // Save to storage
    await chrome.storage.local.set({
      userAgents: newUserAgents,
      permanentSpoofs: newSpoofs
    });
    
    // Reload UI
    await loadUserAgents();
    await loadPermanentSpoofs();
    
    // Reset form
    importFile.value = '';
    selectedFileName.textContent = '';
    previewContainer.style.display = 'none';
    
    // Show success message
    showNotification(i18n.getMessage('importSuccess') || 'Configuración importada correctamente', 'success');
    
  } catch (error) {
    console.error('Import error:', error);
    showImportError('Error al importar la configuración');
  }
}

async function exportSettings() {
  try {
    const result = await chrome.storage.local.get(['userAgents', 'permanentSpoofs', 'activeSection', 'permanentOverride', 'perTabSpoof']);
    
    const manifest = chrome.runtime.getManifest();
    
    // Filter out the default user agent from export
    const userAgentsToExport = (result.userAgents || []).filter(ua => ua.id !== 'default');
    
    const exportData = {
      version: manifest.version,
      exportDate: new Date().toISOString(),
      userAgents: userAgentsToExport,
      permanentSpoofs: result.permanentSpoofs || [],
      settings: {
        activeSection: result.activeSection || 'custom-user-agents',
        permanentOverride: result.permanentOverride || false,
        perTabSpoof: result.perTabSpoof || false
      }
    };
    
    // Create JSON blob
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `useragent-changer-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(i18n.getMessage('exportSuccess') || 'Configuración exportada correctamente', 'success');
    
  } catch (error) {
    console.error('Export error:', error);
    alert('Error al exportar la configuración');
  }
}

// Other Settings Functions
async function setupOtherSettings() {
  const permanentOverrideCheckbox = document.getElementById('permanentOverride');
  const perTabSpoofCheckbox = document.getElementById('perTabSpoof');
  const resetExtensionBtn = document.getElementById('resetExtensionBtn');
  
  if (!permanentOverrideCheckbox || !perTabSpoofCheckbox || !resetExtensionBtn) return;
  
  // Load current settings
  const result = await chrome.storage.local.get(['permanentOverride', 'perTabSpoof']);
  
  permanentOverrideCheckbox.checked = result.permanentOverride || false;
  perTabSpoofCheckbox.checked = result.perTabSpoof || false;
  
  // Add event listeners
  permanentOverrideCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ permanentOverride: e.target.checked });
    showNotification(
      e.target.checked 
        ? 'Spoofs permanentes ahora tienen prioridad'
        : 'Selección de toolbar tiene prioridad', 
      'success'
    );
  });
  
  perTabSpoofCheckbox.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ perTabSpoof: e.target.checked });
    showNotification(
      e.target.checked 
        ? 'Spoof por pestaña activado'
        : 'Spoof global activado', 
      'success'
    );
  });
  
  resetExtensionBtn.addEventListener('click', resetExtension);
}

async function resetExtension() {
  const confirmMsg = i18n.getMessage('confirmReset') || 
    '¿Estás seguro de que quieres resetear la extensión? Esta acción NO se puede deshacer y perderás todas tus configuraciones, user-agents y spoofs permanentes.';
  
  if (!confirm(confirmMsg)) {
    showNotification(i18n.getMessage('resetCancelled') || 'Reseteo cancelado', 'info');
    return;
  }
  
  try {
    // Clear all storage
    await chrome.storage.local.clear();
    
    // Reinitialize with defaults
    await chrome.storage.local.set({
      userAgents: getDefaultUserAgents(),
      activeId: 'default',
      permanentSpoofs: [],
      permanentOverride: false,
      perTabSpoof: false,
      activeSection: 'custom-user-agents'
    });
    
    // Reset badge
    await chrome.action.setBadgeText({ text: '' });
    
    // Reload the page
    showNotification(i18n.getMessage('resetSuccess') || 'Extensión reseteada correctamente. Se recargarán las configuraciones por defecto.', 'success');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Reset error:', error);
    showNotification('Error al resetear la extensión', 'error');
  }
}
