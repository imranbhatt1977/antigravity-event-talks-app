// Global variables
let releaseNotes = [];
let selectedNotes = new Set();
let activeTypeFilter = 'all';

// DOM Elements
const notesGrid = document.getElementById('notesGrid');
const searchInput = document.getElementById('searchInput');
const typeFilters = document.getElementById('typeFilters');
const totalCount = document.getElementById('totalCount');
const featureCount = document.getElementById('featureCount');
const lastSyncedTime = document.getElementById('lastSyncedTime');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');
const alertBanner = document.getElementById('alertBanner');
const alertMessage = document.getElementById('alertMessage');
const closeAlertBtn = document.getElementById('closeAlertBtn');

// Selection Elements
const selectionPanel = document.getElementById('selectionPanel');
const selectedCount = document.getElementById('selectedCount');
const tweetSelectedBtn = document.getElementById('tweetSelectedBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');

// Modal Elements
const tweetModal = document.getElementById('tweetModal');
const tweetTextArea = document.getElementById('tweetTextArea');
const charCounter = document.getElementById('charCounter');
const attachedLinkText = document.getElementById('attachedLinkText');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelTweetBtn = document.getElementById('cancelTweetBtn');
const publishTweetBtn = document.getElementById('publishTweetBtn');

// Active tweet details (for publishing)
let currentTweetUrl = '';

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases(false);
    setupEventListeners();
});

// Event Listeners setup
function setupEventListeners() {
    // Refresh
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search input
    searchInput.addEventListener('input', renderGrid);
    
    // Type Filters
    typeFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-chip')) {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            activeTypeFilter = e.target.getAttribute('data-type');
            renderGrid();
        }
    });

    // Close alert
    closeAlertBtn.addEventListener('click', () => alertBanner.classList.add('hidden'));

    // Selection buttons
    clearSelectionBtn.addEventListener('click', clearAllSelection);
    tweetSelectedBtn.addEventListener('click', handleTweetSelected);

    // Modal buttons
    closeModalBtn.addEventListener('click', hideModal);
    cancelTweetBtn.addEventListener('click', hideModal);
    tweetTextArea.addEventListener('input', handleTweetTextChange);
    publishTweetBtn.addEventListener('click', publishTweet);

    // Close modal on click outside
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideModal();
    });
}

// Fetch Release Notes from API
async function fetchReleases(forceRefresh = false) {
    toggleRefreshState(true);
    alertBanner.classList.add('hidden');

    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            releaseNotes = result.data;
            lastSyncedTime.textContent = result.last_updated;
            
            // Show potential warnings
            if (result.error) {
                showAlert(`Warning: ${result.error}`, 'warning');
            }
            
            updateStats();
            renderGrid();
        } else {
            showAlert(`Failed to fetch updates: ${result.error}`, 'danger');
            renderEmptyState();
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showAlert('Could not connect to the Flask server. Please ensure the backend is running.', 'danger');
        renderEmptyState();
    } finally {
        toggleRefreshState(false);
    }
}

// Helpers
function toggleRefreshState(isLoading) {
    if (isLoading) {
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
    } else {
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

function showAlert(message, type) {
    alertMessage.textContent = message;
    alertBanner.className = `alert-banner alert-${type}`;
    alertBanner.classList.remove('hidden');
}

function updateStats() {
    totalCount.textContent = releaseNotes.length;
    const features = releaseNotes.filter(n => n.type.toLowerCase() === 'feature').length;
    featureCount.textContent = features;
}

// Utility to strip HTML tags for clean text rendering
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

// Helper to truncate text with ellipsis
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// Generate a smart Tweet draft for a single update
function generateDraftText(note) {
    const typeLabel = note.type ? `[${note.type}]` : '[Update]';
    const dateLabel = note.date;
    const cleanContent = stripHtml(note.content).trim();
    
    // Twitter URL counts as 23 chars, leaving ~250 chars for text structure
    const header = `${typeLabel} BigQuery Release (${dateLabel}): `;
    const footer = ` #BigQuery #GoogleCloud`;
    
    const availableLength = 280 - 23 - header.length - footer.length - 2; // -2 for spacing
    const summary = truncateText(cleanContent, availableLength);
    
    return `${header}"${summary}"${footer}`;
}

// Render Release Notes Grid
function renderGrid() {
    const searchVal = searchInput.value.toLowerCase().trim();
    
    // Filter release notes
    const filteredNotes = releaseNotes.filter(note => {
        const matchesSearch = searchVal === '' || 
            note.date.toLowerCase().includes(searchVal) ||
            note.type.toLowerCase().includes(searchVal) ||
            stripHtml(note.content).toLowerCase().includes(searchVal);
            
        const matchesType = activeTypeFilter === 'all' || 
            note.type.toLowerCase() === activeTypeFilter.toLowerCase();
            
        return matchesSearch && matchesType;
    });

    if (filteredNotes.length === 0) {
        notesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <h3>No Release Notes Found</h3>
                <p>Try adjusting your search criteria or checking another filter option.</p>
            </div>
        `;
        return;
    }

    notesGrid.innerHTML = '';
    
    filteredNotes.forEach(note => {
        const isSelected = selectedNotes.has(note.id);
        const card = document.createElement('div');
        card.className = `release-card ${isSelected ? 'selected' : ''}`;
        card.setAttribute('data-id', note.id);
        
        // Define badge class
        let badgeClass = 'badge-general';
        const typeLower = note.type.toLowerCase();
        if (typeLower.includes('feature')) badgeClass = 'badge-feature';
        else if (typeLower.includes('announcement')) badgeClass = 'badge-announcement';
        else if (typeLower.includes('deprecation')) badgeClass = 'badge-deprecation';
        else if (typeLower.includes('issue') || typeLower.includes('bug') || typeLower.includes('fix')) badgeClass = 'badge-issue';
        
        card.innerHTML = `
            <div class="card-select-overlay">
                <input type="checkbox" class="card-checkbox" ${isSelected ? 'checked' : ''} aria-label="Select update">
            </div>
            <div class="card-header">
                <span class="badge ${badgeClass}">${note.type}</span>
                <span class="card-date">${note.date}</span>
            </div>
            <div class="card-content">
                ${note.content}
            </div>
            <div class="card-footer">
                <button class="btn btn-tweet-action btn-tweet-single" title="Draft Tweet">
                    <i class="fa-brands fa-x-twitter"></i> Tweet This
                </button>
            </div>
        `;

        // Selection triggers
        // Click on the checkbox itself
        const checkbox = card.querySelector('.card-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSelection(note.id);
        });

        // Click on card body (toggles selection unless clicking a link/button)
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a') || e.target.closest('.btn-tweet-action')) {
                return; // Let native link click or tweet action pass
            }
            toggleSelection(note.id);
        });

        // Direct single Tweet button click
        const tweetBtn = card.querySelector('.btn-tweet-single');
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTweetModal(note);
        });

        notesGrid.appendChild(card);
    });
}

function renderEmptyState() {
    notesGrid.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h3>No Data Available</h3>
            <p>Could not load the release notes feed. Please verify your connection or click Sync Feed to retry.</p>
        </div>
    `;
}

// Selection Management
function toggleSelection(id) {
    if (selectedNotes.has(id)) {
        selectedNotes.delete(id);
    } else {
        selectedNotes.add(id);
    }
    
    // Update active visual styles
    const card = document.querySelector(`.release-card[data-id="${id}"]`);
    if (card) {
        card.classList.toggle('selected');
        const checkbox = card.querySelector('.card-checkbox');
        if (checkbox) checkbox.checked = selectedNotes.has(id);
    }
    
    updateSelectionPanel();
}

function clearAllSelection() {
    selectedNotes.clear();
    document.querySelectorAll('.release-card').forEach(c => {
        c.classList.remove('selected');
        const cb = c.querySelector('.card-checkbox');
        if (cb) cb.checked = false;
    });
    updateSelectionPanel();
}

function updateSelectionPanel() {
    const size = selectedNotes.size;
    selectedCount.textContent = size;
    
    if (size > 0) {
        selectionPanel.classList.remove('hidden');
    } else {
        selectionPanel.classList.add('hidden');
    }
}

// Tweet Modals
function openTweetModal(note) {
    const draftText = generateDraftText(note);
    tweetTextArea.value = draftText;
    currentTweetUrl = note.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';
    attachedLinkText.textContent = currentTweetUrl;
    
    updateCharCounter();
    showModal();
}

// Handle multi-selected Tweet action
function handleTweetSelected() {
    if (selectedNotes.size === 0) return;
    
    // Collect all selected notes
    const selectedList = releaseNotes.filter(n => selectedNotes.has(n.id));
    
    // Create combined summary text
    let summaryText = `Multiple BigQuery Updates:`;
    selectedList.forEach(note => {
        const cleanVal = stripHtml(note.content).trim();
        summaryText += `\n• [${note.type}] ${truncateText(cleanVal, 40)}`;
    });
    
    const footer = `\nCheck docs:`;
    const tag = ` #BigQuery`;
    
    // Ensure total fits Twitter's limit
    const allowedLength = 280 - 23 - footer.length - tag.length; // 23 for Twitter URL
    
    let draftText = truncateText(summaryText, allowedLength) + footer + tag;
    
    tweetTextArea.value = draftText;
    // Multi-link uses primary landing docs page
    currentTweetUrl = 'https://docs.cloud.google.com/bigquery/docs/release-notes';
    attachedLinkText.textContent = currentTweetUrl;
    
    updateCharCounter();
    showModal();
}

// Modal Animation utilities
function showModal() {
    tweetModal.classList.remove('hidden');
    tweetTextArea.focus();
}

function hideModal() {
    tweetModal.classList.add('hidden');
}

function handleTweetTextChange() {
    updateCharCounter();
}

function updateCharCounter() {
    const currentLength = tweetTextArea.value.length;
    // Twitter intent automatically appends the URL parameter which takes 23 characters.
    // However, the textarea itself only tracks text content length.
    // Let's count link length towards total limit of 280.
    const linkLength = currentTweetUrl ? 24 : 0; // space + link
    const totalLength = currentLength + linkLength;
    const remaining = 280 - totalLength;
    
    charCounter.textContent = remaining;
    
    // Style adjustments for thresholds
    if (remaining < 0) {
        charCounter.className = 'char-counter danger';
        publishTweetBtn.disabled = true;
    } else if (remaining < 30) {
        charCounter.className = 'char-counter warning';
        publishTweetBtn.disabled = false;
    } else {
        charCounter.className = 'char-counter';
        publishTweetBtn.disabled = false;
    }
}

// Redirects user to Twitter Intent Web share page
function publishTweet() {
    const text = tweetTextArea.value;
    if (text.length + (currentTweetUrl ? 24 : 0) > 280) {
        alert('Tweet exceeds the 280-character limit!');
        return;
    }
    
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(currentTweetUrl)}`;
    
    // Open Twitter intent in a new window/tab
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
    
    hideModal();
    clearAllSelection();
}
