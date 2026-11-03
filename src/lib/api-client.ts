import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return new ApiError(
      error.response?.data?.error ?? error.message,
      error.response?.status,
    );
  }
  if (error instanceof Error) return new ApiError(error.message);
  return new ApiError('Something went wrong');
}

api.interceptors.response.use(
  (res) => res,
  (error: unknown) => Promise.reject(toApiError(error)),
);