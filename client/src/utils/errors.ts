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

  if (typeof err === "object" && err !== null && "response" in err) {
    const res = (err as { response?: { data?: { message?: string; error?: { message?: string } } } }).response;
    return res?.data?.message || res?.data?.error?.message || fallback;
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
  if (typeof err === "object" && err !== null && "response" in err) {
    const res = (err as { response?: { data?: { error?: { code?: string } } } }).response;
    return res?.data?.error?.code;
  }
  return undefined;
}
