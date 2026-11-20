/** An error answer from the server, with its plain-language message. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}, code?: string) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.code = code;
  }
}

interface ErrorBody {
  error?: string;
  code?: string;
  fields?: Record<string, string>;
}

/** Sends a JSON request and returns the parsed answer, or throws ApiError. */
export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  const data = await readJson(res);
  if (!res.ok) {
    const err = (data ?? {}) as ErrorBody;
    throw new ApiError(err.error ?? `The server answered ${res.status}`, res.status, err.fields ?? {}, err.code);
  }
  return data as T;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** The message to show for any error thrown by an API call. */
export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : String(err);
}
