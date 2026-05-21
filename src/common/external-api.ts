import axios from 'axios';

export type ApiProvider = 'overpass' | 'dimria' | 'nominatim' | 'nbu';
export type ApiErrorKind = 'timeout' | 'rate_limit' | 'http_error' | 'empty_response' | 'invalid_payload' | 'network_error';

// Hard wall-clock limit per individual HTTP request, applied via AbortController.
// axios `timeout` option is a socket inactivity timeout and can be bypassed by a server
// that holds the connection open — AbortController is not.
export const REQUEST_TIMEOUT_MS = 8_000;

export class ExternalApiError extends Error {
  constructor(
    public readonly provider: ApiProvider,
    public readonly kind: ApiErrorKind,
    message: string,
  ) {
    super(`[${provider}:${kind}] ${message}`);
    this.name = 'ExternalApiError';
  }
}

export function classifyAxiosError(err: unknown, provider: ApiProvider): ExternalApiError {
  if (axios.isCancel(err)) {
    return new ExternalApiError(provider, 'timeout', 'request aborted');
  }
  if (axios.isAxiosError(err)) {
    const code = err.code;
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ERR_CANCELED') {
      return new ExternalApiError(provider, 'timeout', err.message);
    }
    if (err.response?.status === 429) {
      return new ExternalApiError(provider, 'rate_limit', 'HTTP 429');
    }
    if (err.response) {
      return new ExternalApiError(provider, 'http_error', `HTTP ${err.response.status}`);
    }
    return new ExternalApiError(provider, 'network_error', err.message);
  }
  return new ExternalApiError(provider, 'network_error', String(err));
}
