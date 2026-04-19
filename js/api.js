// ===================================================
// js/api.js — API Calls & Data Loading
// Depends on: state.js, utils.js
// ===================================================

async function syncCurrentUser() {
    try {
        const response = await fetch('/api/me', { headers: getAuthHeaders() });
        if (!response.ok) return;
        const user = await response.json();
        localStorage.setItem('templum-auth-user', user.email);
        localStorage.setItem('templum-auth-role', user.role || 'membro');
        updateRoleBasedNavigation(user.role || 'membro');
    } catch (err) {
        console.error('Current user sync error', err);
    }
}

async function loadStateFromServer() {
    const boardCanvas = document.getElementById('board-canvas');
    if (!boardCanvas) return; // Not on the Kanban page
    
    try {
        const response = await fetch(`/api/board?workspace=${activeWorkspaceId}&category=${activeCategory}`, { headers: getAuthHeaders() });
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/login.html';
            return;
        }
        if (response.ok) {
            const data = await response.json();
            boardState.columns = data.columns;
            renderBoard();
        }
    } catch(err) {
        console.error('Failed to load board state, fallback to empty', err);
    }
}

async function loadNotifications() {
    const badge = document.getElementById('notifications-badge');
    const list = document.getElementById('notifications-list');
    const countLabel = document.getElementById('notifications-count-label');
    if (!badge || !list || !countLabel) return;

    try {
        const response = await fetch('/api/notifications?workspace=' + encodeURIComponent(activeWorkspaceId), { headers: getAuthHeaders() });
        if (!response.ok) return;
        const data = await response.json();
        const notifications = Array.isArray(data.notifications) ? data.notifications : [];
        badge.innerText = String(notifications.length);
        badge.style.display = notifications.length ? 'flex' : 'none';
        countLabel.innerText = `${notifications.length} item(ns)`;
        list.innerHTML = notifications.length
            ? notifications.map((notification) => `
                <div class="notification-item notification-${notification.type}">
                    <strong>${notification.title}</strong>
                    <span>${notification.detail}</span>
                </div>
            `).join('')
            : '<div class="notifications-empty">Sem notificações no momento.</div>';
    } catch (err) {
        console.error('Notifications error', err);
    }
}

async function loadMemberSuggestions(search = '') {
    const datalist = document.getElementById('member-suggestions');
    if (!datalist) return;
    try {
        const response = await fetch('/api/users/options?q=' + encodeURIComponent(search), { headers: getAuthHeaders() });
        if (!response.ok) return;
        const users = await response.json();
        memberSuggestionsCache = Array.isArray(users) ? users : [];
        datalist.innerHTML = users.map((user) => `<option value="${user.email}"></option>`).join('');
    } catch (err) {
        console.error('Member suggestions error', err);
    }
}

async function isValidMemberEmail(email) {
    try {
        const response = await fetch('/api/users/options?q=' + encodeURIComponent(email), { headers: getAuthHeaders() });
        if (!response.ok) return false;
        const users = await response.json();
        return users.some((user) => (user.email || '').toLowerCase() === email.toLowerCase());
    } catch (err) {
        return false;
    }
}

async function loadLabelPresets() {
    try {
        const response = await fetch('/api/label-presets', { headers: getAuthHeaders() });
        if (!response.ok) return;
        labelPresets = await response.json();
        renderPresetLabels();
    } catch (err) {
        console.error('Label presets error', err);
    }
}

async function initBranding() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.primary_color) {
            document.documentElement.style.setProperty('--primary', data.primary_color);
        }
        updateLogo(data);
        const observer = new MutationObserver(() => {
            updateLogo(data);
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    } catch(err) {
        console.error('Sem conexao, mantendo cor original.');
    }
}

function updateLogo(data) {
    const logoContainer = document.querySelector('.logo');
    if (logoContainer) {
        const existingImg = logoContainer.querySelector('.custom-logo');
        if (existingImg) existingImg.remove();
        const logoIcon = logoContainer.querySelector('.logo-icon');
        const logoText = logoContainer.querySelector('.logo-text');
        if (logoIcon) logoIcon.style.display = 'none';
        if (logoText) logoText.style.display = 'none';
        
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const logoUrl = isDark ? data.logo_dark_url : data.logo_light_url;
        
        if (logoUrl) {
            const img = document.createElement('img');
            img.src = logoUrl;
            img.className = 'custom-logo';
            img.style.cssText = 'max-height: 36px; max-width: 120px; border-radius: 6px;';
            logoContainer.insertBefore(img, logoContainer.firstChild);
        }
    }
}

async function moveColumn(id, direction) {
    console.log(`[FRONTEND] Move Column: ID=${id}, Direction=${direction}`);
    try {
        const response = await fetch(`/api/columns/${id}/move`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ direction })
        });
        const data = await response.json();
        console.log(`[FRONTEND] Move Response:`, data);
        if (!response.ok) throw new Error(data.error || 'Move failed');
        loadStateFromServer();
        if (columnModal) columnModal.classList.remove('active');
    } catch (err) {
        console.error(`[FRONTEND] Move Error:`, err);
        alert('Erro ao mover quadro: ' + err.message);
    }
}
