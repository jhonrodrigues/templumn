// ===================================================
// js/state.js — Global State & Authentication
// ===================================================

// === SECURITY GUARD ===
const TEMPLUM_TOKEN = localStorage.getItem('templum-auth-token');
if (!TEMPLUM_TOKEN) {
    window.location.href = '/login.html';
}
const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + TEMPLUM_TOKEN
};
const getAuthHeaders = () => ({ 'Authorization': 'Bearer ' + localStorage.getItem('templum-auth-token') });

// State Object to track the dynamic state
let boardState = { columns: [] };
let activeWorkspaceId = localStorage.getItem('templum-active-ws') || 'lagoinhaalphaville.sp';
let activeCategory = new URLSearchParams(window.location.search).get('category') || 'editorial';
let activeCardData = null;
let availableWorkspaces = [];
let labelPresets = [];
let activeCardId = null;
let activeCardColId = null;
let activeColumnId = null;
let suppressCardClickOnce = false;

// Modal elements - declare all here to avoid redeclaration
let modalOverlay, modalBox, closeModalBtn, saveCardBtn, deleteCardBtn;
let editTitleInput, editDescriptionInput, editPlatformInput, editDateInput, editTimeInput, editRecurrenceInput;
let modalListName, modalTitle, memberInput, membersList, addMemberBtn;
let labelsEditor, presetLabelsList;
let checklistInput, checklistItems, addChecklistBtn;
let commentInput, commentsList, addCommentBtn;
let imageInput, imagesList, fileInput, filesList;
let removeCardFromWorkspaceBtn, duplicateCardBtn;
let columnModal, closeColumnModalBtn, editColumnTitleInput;
let saveColumnBtn, deleteColumnBtn, createColumnBtn;
let moveColumnLeftBtn, moveColumnRightBtn, columnReorderActions;
let fabGlobalCreate, newCardModal, closeNewModal, submitNewCardBtn;
let ncTitle, ncPlatform, ncDate, ncTime, ncRecurrence, ncAssignee, ncWorkspaces;
let requestDesignBtn, linkedDesignInfo;
let removeRecurrenceBtn;
let memberSuggestionsCache = [];
let draggedChecklistIndex = null;

// Reference to DOM elements
let themeToggleBtn = document.getElementById('theme-toggle');
const notificationsBtn = document.getElementById('notifications-btn');
const notificationsPanel = document.getElementById('notifications-panel');
