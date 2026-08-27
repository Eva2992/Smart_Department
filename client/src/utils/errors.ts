import axios from "axios";

export function getErrorMessage(err: unknown, fallback = "An unexpected error occurred"): string {
  if (axios.isAxiosError(err)) {
    return (
      err.response?.data?.message ||
      err.response?.data?.error?.message ||
      err.message ||
      fallback
    );
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

export function getErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.code;
  }
  return undefined;
}
