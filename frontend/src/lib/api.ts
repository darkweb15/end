/* Thin fetch wrappers around the FastAPI backend. */

export type LeadResult = {
  name: string;
  address: string;
  phone: string;
  website: string;
  final_email: string;
  all_website_emails: string;
  email_source: string;
  facebook_link: string;
  instagram_link: string;
  maps_url: string;
  place_id: string;
  rating: string;
  reviews_count: string;
  has_pos: string;
  pos_system: string;
  website_type: string;
  search_query: string;
  zipcode: string;
  city: string;
  state: string;
  [key: string]: unknown;
};

export type JobStatus = {
  job_id: string;
  status: string;
  total: number;
  completed: number;
  results_count: number;
  errors: string[];
  results: LeadResult[];
  skipped_duplicates?: number;
  discovered?: number;
};

export type Task = {
  id: number;
  job_id: string;
  search_term: string;
  zip_codes: string;
  status: string;
  total_results: number;
  scraped_count: number;
  industry: string;
  created_at: string;
  completed_at?: string | null;
};

export type DbStats = {
  total_businesses: number;
  total_emails: number;
  total_tasks: number;
  total_pos?: number;
};

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  /* scraping */
  async startScrape(payload: {
    search_terms: string[];
    zip_codes: string[];
    max_results_per_search: number;
  }): Promise<{ job_id: string; message: string }> {
    return req("/api/scrape", { method: "POST", body: JSON.stringify(payload) });
  },
  async getJob(jobId: string): Promise<JobStatus> {
    return req(`/api/job/${jobId}`);
  },

  /* task history */
  async getTasks(): Promise<{ tasks: Task[] }> {
    return req("/api/tasks");
  },
  async deleteTask(jobId: string): Promise<{ message: string }> {
    return req(`/api/tasks/${jobId}`, { method: "DELETE" });
  },
  async bulkDeleteTasks(jobIds: string[]): Promise<{ deleted: number }> {
    return req(`/api/tasks/bulk-delete`, {
      method: "POST",
      body: JSON.stringify({ job_ids: jobIds }),
    });
  },
  async getTaskResults(jobId: string): Promise<{ results: LeadResult[]; count: number }> {
    return req(`/api/tasks/${jobId}/results`);
  },

  /* database */
  async getData(
    industry = "",
    limit = 5000
  ): Promise<{ data: LeadResult[]; count: number }> {
    const qs = new URLSearchParams({ industry, limit: String(limit) }).toString();
    return req(`/api/data?${qs}`);
  },
  async getIndustries(): Promise<{ industries: string[] }> {
    return req(`/api/industries`);
  },
  async getStats(): Promise<DbStats> {
    return req(`/api/stats`);
  },
  async getDbStatus(): Promise<{ connected: boolean; reason?: string }> {
    return req(`/api/db-status`);
  },

  /* exports (return Blobs, not JSON) */
  async exportJobBlob(jobId: string, fmt: "csv" | "json"): Promise<Blob> {
    const res = await fetch(`/api/export/${jobId}/${fmt}`);
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async exportTaskBlob(jobId: string, fmt: "csv" | "json"): Promise<Blob> {
    const res = await fetch(`/api/tasks/${jobId}/export/${fmt}`);
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async bulkExportTasksBlob(jobIds: string[]): Promise<Blob> {
    const res = await fetch(`/api/tasks/bulk-export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_ids: jobIds }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },

  /* email re-enrichment */
  async getMissingEmailsCount(): Promise<{ count: number }> {
    return req(`/api/leads/missing-emails/count`);
  },
  async previewMissingEmails(
    start: number,
    end: number
  ): Promise<{
    leads: { index: number; id: number; name: string; website: string }[];
    start: number;
    end: number;
  }> {
    return req(`/api/leads/missing-emails?start=${start}&end=${end}`);
  },
  async startReenrich(
    start_index: number,
    end_index: number
  ): Promise<{ job_id: string; start_index: number; end_index: number }> {
    return req(`/api/leads/re-enrich-emails`, {
      method: "POST",
      body: JSON.stringify({ start_index, end_index }),
    });
  },
  async getReenrichJob(jobId: string): Promise<ReenrichStatus> {
    return req(`/api/leads/re-enrich/${jobId}`);
  },
};

export type ReenrichStatus = {
  job_id: string;
  start_index: number;
  end_index: number;
  status: "pending" | "running" | "completed" | "failed";
  total: number;
  processed: number;
  updated: number;
  no_email_found: number;
  errors: string[];
  started_at: string;
  finished_at: string;
  sample_updates: { id: number; name: string; email: string }[];
};
