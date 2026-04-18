/* Thin fetch wrappers around the FastAPI backend. */
async function req(path, opts = {}) {
    const res = await fetch(path, {
        headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
        ...opts,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    return res.json();
}
export const api = {
    /* scraping */
    async startScrape(payload) {
        return req("/api/scrape", { method: "POST", body: JSON.stringify(payload) });
    },
    async getJob(jobId) {
        return req(`/api/job/${jobId}`);
    },
    /* task history */
    async getTasks() {
        return req("/api/tasks");
    },
    async deleteTask(jobId) {
        return req(`/api/tasks/${jobId}`, { method: "DELETE" });
    },
    async bulkDeleteTasks(jobIds) {
        return req(`/api/tasks/bulk-delete`, {
            method: "POST",
            body: JSON.stringify({ job_ids: jobIds }),
        });
    },
    async getTaskResults(jobId) {
        return req(`/api/tasks/${jobId}/results`);
    },
    /* database */
    async getData(industry = "", limit = 5000) {
        const qs = new URLSearchParams({ industry, limit: String(limit) }).toString();
        return req(`/api/data?${qs}`);
    },
    async getIndustries() {
        return req(`/api/industries`);
    },
    async getStats() {
        return req(`/api/stats`);
    },
    async getDbStatus() {
        return req(`/api/db-status`);
    },
    /* exports (return Blobs, not JSON) */
    async exportJobBlob(jobId, fmt) {
        const res = await fetch(`/api/export/${jobId}/${fmt}`);
        if (!res.ok)
            throw new Error(await res.text());
        return res.blob();
    },
    async exportTaskBlob(jobId, fmt) {
        const res = await fetch(`/api/tasks/${jobId}/export/${fmt}`);
        if (!res.ok)
            throw new Error(await res.text());
        return res.blob();
    },
    async bulkExportTasksBlob(jobIds) {
        const res = await fetch(`/api/tasks/bulk-export`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_ids: jobIds }),
        });
        if (!res.ok)
            throw new Error(await res.text());
        return res.blob();
    },
};
