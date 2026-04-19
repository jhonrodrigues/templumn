// ===================================================
// js/init.js — Initialization Orchestration
// Depends on: ALL other modules (loaded last)
// ===================================================

// Global function to open a card by ID (used by calendario, captacoes, etc.)
window.openCardDetail = async (cardId) => {
    try {
        let found = null;
        if (boardState && boardState.columns) {
            boardState.columns.forEach(col => {
                const card = col.cards.find(c => c.id === cardId);
                if (card) found = { card, colId: col.id };
            });
        }

        if (found) {
            openModal(found.card, found.colId);
        } else {
            try {
                const ws = activeWorkspaceId || localStorage.getItem('templum-active-ws') || 'lagoinhaalphaville.sp';
                const res = await fetch(`/api/cards/${cardId}?workspace=${encodeURIComponent(ws)}`, { 
                    headers: getAuthHeaders() 
                });
                if (!res.ok) throw new Error('Card not found');
                const card = await res.json();
                openModal(card, card.column_id);
            } catch (err) {
                console.warn('Card not found in current boardState or API.');
                alert('Não foi possível carregar os detalhes desta demanda. Ela pode ter sido removida ou está em outra conta.');
            }
        }
    } catch(e) { console.error(e); }
};

// --- STARTUP SEQUENCE --- //
// Order matters! Each step depends on the previous ones.

// 1. Inject modal HTML into the page
injectModalsIfNeeded();

// 2. Apply saved theme (dark/light)
initTheme();

// 3. Bind all event handlers to modal elements
attachModalHandlers();

// 4. Initialize theme toggle and notifications panel
initThemeToggle();
initNotificationsPanel();

// 5. Initialize FAB button
initFAB();

// 6. Load workspaces and render the sidebar selector
initWorkspaces();

// 7. Initialize mobile menu (sidebar gestures)
initMobileMenu();

// 8. Load branding (custom colors, logo)
initBranding();

// 9. Sync current user data and update role-based navigation
updateRoleBasedNavigation(localStorage.getItem('templum-auth-role') || 'membro');
syncCurrentUser();

// 10. Load the board data and render it
loadStateFromServer();

// 11. Load notifications badge
loadNotifications();

// 12. Load label presets for the editor
loadLabelPresets();

// Handle ?open=cardId URL parameter
(function handleOpenParam() {
    const openCardId = new URLSearchParams(window.location.search).get('open');
    if (openCardId) {
        // Wait a bit for board to load, then open the card
        setTimeout(() => window.openCardDetail(openCardId), 800);
    }
})();

console.log('[TEMPLUM] All modules initialized successfully.');
