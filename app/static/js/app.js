/**
 * Restaurant Leads Scraper - Frontend JavaScript
 */

let currentJobId = null;
let pollInterval = null;
let allResults = [];

// DOM Elements
const searchTermsInput = document.getElementById('searchTerms');
const zipCodesInput = document.getElementById('zipCodes');
const maxResultsInput = document.getElementById('maxResults');
const startBtn = document.getElementById('startBtn');
const filterInput = document.getElementById('filterInput');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const resultsBody = document.getElementById('resultsBody');
const emptyState = document.getElementById('emptyState');
const tableContainer = document.getElementById('tableContainer');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');

// Stats
const statTotal = document.getElementById('statTotal');
const statEmails = document.getElementById('statEmails');
const statPos = document.getElementById('statPos');
const statRunning = document.getElementById('statRunning');

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Start a scraping job
 */
async function startScraping() {
    const searchTerms = searchTermsInput.value
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const zipCodes = zipCodesInput.value
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (searchTerms.length === 0) {
        showToast('Please enter at least one search term', 'error');
        return;
    }

    if (zipCodes.length === 0) {
        showToast('Please enter at least one zip code', 'error');
        return;
    }

    const maxResults = parseInt(maxResultsInput.value) || 20;

    // Disable button
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="spinner"></span> Scraping...';

    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                search_terms: searchTerms,
                zip_codes: zipCodes,
                max_results_per_search: maxResults,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to start scraping');
        }

        currentJobId = data.job_id;
        showToast('Scraping started! This may take a few minutes...', 'success');

        // Show progress
        progressContainer.classList.add('active');
        progressBar.style.width = '0%';

        // Start polling
        startPolling();
    } catch (error) {
        showToast(error.message, 'error');
        startBtn.disabled = false;
        startBtn.innerHTML = 'Start Scraping';
    }
}

/**
 * Poll for job status updates
 */
function startPolling() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        if (!currentJobId) return;

        try {
            const response = await fetch(`/api/job/${currentJobId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get job status');
            }

            // Update progress
            const percent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${data.completed} / ${data.total} searches completed`;
            progressPercent.textContent = `${percent}%`;

            // Update results
            allResults = data.results || [];
            updateStats();
            renderResults(allResults);

            // Update status
            statRunning.textContent = data.status === 'running' ? 'Running' : data.status;

            if (data.status === 'completed') {
                clearInterval(pollInterval);
                pollInterval = null;
                startBtn.disabled = false;
                startBtn.innerHTML = 'Start Scraping';
                progressContainer.classList.remove('active');
                showToast(`Scraping complete! Found ${data.results_count} leads.`, 'success');
                statRunning.textContent = 'Done';
            } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                pollInterval = null;
                startBtn.disabled = false;
                startBtn.innerHTML = 'Start Scraping';
                progressContainer.classList.remove('active');
                showToast('Scraping failed. Check the logs.', 'error');
                statRunning.textContent = 'Failed';
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 2000); // Poll every 2 seconds
}

/**
 * Update statistics
 */
function updateStats() {
    statTotal.textContent = allResults.length;

    const withEmails = allResults.filter(r => r.final_email).length;
    statEmails.textContent = withEmails;

    const withPos = allResults.filter(r => r.has_pos === 'Yes').length;
    statPos.textContent = withPos;
}

/**
 * Render results in the table
 */
function renderResults(results) {
    if (results.length === 0) {
        emptyState.style.display = 'block';
        tableContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';

    // Apply filter
    const filter = filterInput.value.toLowerCase();
    let filtered = results;
    if (filter) {
        filtered = results.filter(r =>
            r.name.toLowerCase().includes(filter) ||
            r.address.toLowerCase().includes(filter) ||
            r.final_email.toLowerCase().includes(filter) ||
            r.phone.toLowerCase().includes(filter) ||
            r.city.toLowerCase().includes(filter)
        );
    }

    resultsBody.innerHTML = filtered.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</td>
            <td title="${escapeHtml(r.address)}">${escapeHtml(r.address)}</td>
            <td>${escapeHtml(r.phone)}</td>
            <td class="email-cell" title="${escapeHtml(r.final_email)}">${escapeHtml(r.final_email) || '-'}</td>
            <td title="${escapeHtml(r.all_website_emails)}">${escapeHtml(r.all_website_emails) || '-'}</td>
            <td>${escapeHtml(r.email_source) || '-'}</td>
            <td>${r.website ? `<a href="${escapeHtml(r.website.startsWith('http') ? r.website : 'https://' + r.website)}" target="_blank" style="color: #818cf8;">Visit</a>` : '-'}</td>
            <td>${r.facebook_link ? `<a href="${escapeHtml(r.facebook_link)}" target="_blank" style="color: #818cf8;">FB</a>` : '-'}</td>
            <td>${escapeHtml(r.rating) || '-'}</td>
            <td>${escapeHtml(r.reviews_count) || '-'}</td>
            <td class="${r.has_pos === 'Yes' ? 'pos-yes' : 'pos-no'}">${escapeHtml(r.has_pos) || '-'}</td>
            <td title="${escapeHtml(r.pos_system)}">${escapeHtml(r.pos_system) || '-'}</td>
            <td class="${r.status === 'Open' ? 'status-open' : 'status-closed'}">${escapeHtml(r.status) || '-'}</td>
            <td>${r.maps_url ? `<a href="${escapeHtml(r.maps_url)}" target="_blank" style="color: #818cf8;">Map</a>` : '-'}</td>
        </tr>
    `).join('');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Export results
 */
async function exportResults(format) {
    if (!currentJobId) {
        showToast('No results to export. Run a scrape first.', 'error');
        return;
    }

    if (allResults.length === 0) {
        showToast('No results to export.', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/export/${currentJobId}/${format}`);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads_${currentJobId}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        showToast(`Exported ${allResults.length} leads as ${format.toUpperCase()}`, 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Event Listeners
startBtn.addEventListener('click', startScraping);
filterInput.addEventListener('input', () => renderResults(allResults));
exportCsvBtn.addEventListener('click', () => exportResults('csv'));
exportJsonBtn.addEventListener('click', () => exportResults('json'));

// Initial state
updateStats();
