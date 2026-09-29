// Small fetch wrapper: returns JSON or throws the server's error message
async function request(url, options = {}) {
  const res = await fetch(`/api${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body }),
  put: (url, body) => request(url, { method: 'PUT', body }),
  del: (url) => request(url, { method: 'DELETE' }),
};

export const formatDate = (d) =>
  new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const rupees = (n) => `₹${Number(n).toFixed(2)}`;
