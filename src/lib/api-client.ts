import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    // `error.response?.data` short-circuits to undefined when response is
    // missing, so `.error` does not need its own optional chain.
    return error.response?.data.error ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

api.interceptors.response.use(
  (res) => res,
  (error: unknown) => Promise.reject(new Error(extractErrorMessage(error))),
);