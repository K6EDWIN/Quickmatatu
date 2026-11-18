import * as sessionStore from './sessionStore';

const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
  return configuredUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

export async function apiRequest(path, options = {}) {
  const sessionValue = await sessionStore.getItem('userSession');
  const user = sessionValue ? JSON.parse(sessionValue) : null;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (user?.token) headers.Authorization = `Bearer ${user.token}`;

  const response = await fetch(`${getApiBaseUrl()}/api${path}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('The server returned an invalid response.');
  }
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

export { getApiBaseUrl };
