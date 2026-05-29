import { getAPIURL } from '@/api/apiUrl';
import type { TokenDecodedData } from '@/contexts/auth/model';

const apiUrl = getAPIURL();

function _buildUrl(url: string, params?: Record<string, any>): string {
  if (!params) return apiUrl + url;
  return apiUrl + url + '?' + new URLSearchParams(params).toString();
}

async function _formPostRequest(
  url: string,
  body: Record<string, any>,
): Promise<unknown> {
  const formData = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    formData.append(key, value.toString());
  }

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const response = await fetch(apiUrl + url, {
    method: 'POST',
    headers,
    body: formData,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return null;
  }
  if (!response.ok) {
    const errorMessage =
      data.detail || data.message || data.error?.message || 'Network response was not ok';
    throw new Error(errorMessage);
  }

  return data;
}

async function _jsonPostRequest(
  url: string,
  body: Record<string, any>,
): Promise<unknown> {
  const response = await fetch(apiUrl + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let errorMessage = 'Network response was not ok';
    try {
      const data = await response.json();
      errorMessage = data.detail || data.message || data.error?.message || errorMessage;
    } catch {
      // Response body is not JSON, use default message
    }
    throw new Error(errorMessage);
  }
  return await response.json();
}

function decodeToken(token: string): TokenDecodedData {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(window.atob(base64));
}

async function _postRequest(
  url: string,
  body: Record<string, any>,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req_url = _buildUrl(url, params);
  return fetch(req_url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function _getRequest(
  url: string,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req_url = _buildUrl(url, params);
  return fetch(req_url, {
    method: 'GET',
    headers,
  });
}

async function _putRequest(
  url: string,
  body: Record<string, any>,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req_url = _buildUrl(url, params);
  return fetch(req_url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
}

async function _postFormRequest(
  url: string,
  formData: FormData,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  // Note: do NOT set Content-Type; the browser adds the multipart boundary.
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const req_url = _buildUrl(url, params);
  return fetch(req_url, {
    method: 'POST',
    headers,
    body: formData,
  });
}

async function _putFormRequest(
  url: string,
  formData: FormData,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const req_url = _buildUrl(url, params);
  return fetch(req_url, {
    method: 'PUT',
    headers,
    body: formData,
  });
}

async function _patchRequest(
  url: string,
  body: Record<string, any>,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req_url = _buildUrl(url, params);
  return fetch(req_url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
}

async function _deleteRequest(
  url: string,
  token?: string | null,
  params?: Record<string, any>,
): Promise<Response> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req_url = _buildUrl(url, params);
  return fetch(req_url, {
    method: 'DELETE',
    headers,
  });
}

export class PublicApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function _parsePublicResponse<T>(response: Response): Promise<T> {
  let parsed: any = null;
  try {
    parsed = await response.json();
  } catch {
    // no JSON body
  }
  if (!response.ok) {
    const message =
      parsed?.detail ||
      parsed?.message ||
      parsed?.error?.message ||
      `Request failed with status ${response.status}`;
    throw new PublicApiError(response.status, message);
  }
  return parsed as T;
}

async function _publicGet<T = unknown>(
  url: string,
  params?: Record<string, any>,
): Promise<T> {
  const response = await fetch(_buildUrl(url, params), {
    method: 'GET',
    credentials: 'include',
  });
  return _parsePublicResponse<T>(response);
}

async function _publicPost<T = unknown>(
  url: string,
  body?: Record<string, any> | null,
  params?: Record<string, any>,
): Promise<T> {
  const init: RequestInit = {
    method: 'POST',
    credentials: 'include',
  };
  if (body !== undefined && body !== null) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(_buildUrl(url, params), init);
  return _parsePublicResponse<T>(response);
}

export {
  _formPostRequest,
  _jsonPostRequest,
  decodeToken,
  _postRequest,
  _getRequest,
  _putRequest,
  _patchRequest,
  _deleteRequest,
  _postFormRequest,
  _putFormRequest,
  _publicGet,
  _publicPost,
};
