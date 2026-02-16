const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  let url = `${API_URL}${path}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${errorBody}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  const text = await res.text();
  if (!text) {
    return null as T;
  }
  return JSON.parse(text) as T;
}

export const healthAPI = {
  check: async () => {
    try {
      const res = await fetch(`${API_URL.replace('/api', '')}/health/`, {
        method: 'GET',
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};

export const interviewAPI = {
  list: (clerkUserId: string) =>
    apiFetch('/interviews/interviews/', { params: { clerk_user_id: clerkUserId } }),

  create: (data: {
    job_title: string;
    job_description?: string;
    skills?: string;
    difficulty: string;
    resume_text?: string;
    clerk_user_id: string;
  }) =>
    apiFetch('/interviews/interviews/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: number | string) =>
    apiFetch(`/interviews/interviews/${id}/`),

  getQuestions: (interviewId: number | string) =>
    apiFetch(`/interviews/interviews/${interviewId}/questions/`),

  getNextQuestion: (interviewId: number | string) =>
    apiFetch(`/interviews/interviews/${interviewId}/next_question/`),

  submitAnswer: (interviewId: number | string, questionId: number, answerText: string) =>
    apiFetch(`/interviews/interviews/${interviewId}/submit_answer/`, {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, answer: answerText }),
    }),

  evaluateAnswer: (interviewId: number | string, data: {
    question_text: string;
    answer: string;
    followup_count: number;
  }) =>
    apiFetch(`/interviews/interviews/${interviewId}/evaluate_answer/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  complete: (interviewId: number | string) =>
    apiFetch(`/interviews/interviews/${interviewId}/complete/`, {
      method: 'POST',
    }),

  end: (interviewId: number | string) =>
    apiFetch(`/interviews/interviews/${interviewId}/complete/`, {
      method: 'POST',
    }),

  results: (interviewId: number | string) =>
    apiFetch(`/interviews/interviews/${interviewId}/results/`),

  reattempt: (interviewId: number | string) =>
    apiFetch(`/interviews/interviews/${interviewId}/reattempt/`, {
      method: 'POST',
    }),

  evaluateInterview: (interviewId: number | string, data: { force?: boolean } = {}) =>
    apiFetch(`/interviews/interviews/${interviewId}/evaluate_interview/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (interviewId: number | string) =>
    apiFetch(`/interviews/interviews/${interviewId}/`, {
      method: 'DELETE',
    }),

  parseResume: async (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    const res = await fetch(`${API_URL}/interviews/parse-resume/`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to parse resume');
    return res.json();
  },
};

export const shareLinkAPI = {
  list: (params: { clerk_user_id?: string; created_by_email?: string } = {}) =>
    apiFetch('/interviews/share-links/', {
      params: Object.fromEntries(
        Object.entries(params).filter(([_k, v]) => typeof v === 'string' && v.length > 0) as Array<[string, string]>
      ),
    }),

  create: (data: {
    created_by_clerk_user_id?: string;
    created_by_email?: string;
    role: string;
    job_description?: string;
    experience?: string;
    difficulty?: string;
    expires_at?: string | null;
    is_active?: boolean;
  }) =>
    apiFetch('/interviews/share-links/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  publicGet: (token: string) =>
    apiFetch(`/interviews/share-links/public/${token}/`),

  publicStart: (token: string, data: { clerk_user_id?: string } = {}) =>
    apiFetch(`/interviews/share-links/public/${token}/start/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  attempts: (shareLinkId: number | string) =>
    apiFetch(`/interviews/share-links/${shareLinkId}/attempts/`),

  delete: (shareLinkId: number | string, clerkUserId: string) =>
    apiFetch(`/interviews/share-links/${shareLinkId}/`, {
      method: 'DELETE',
      params: { clerk_user_id: clerkUserId },
    }),

  regenerate: (shareLinkId: number | string, data: { clerk_user_id: string }) =>
    apiFetch(`/interviews/share-links/${shareLinkId}/regenerate/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const fileParseAPI = {
  parsePdfToText: async (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    const res = await fetch(`${API_URL}/interviews/parse-resume/`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${errorBody}`);
    }
    return res.json() as Promise<{ success: boolean; text: string }>;
  },
};

export default interviewAPI;
