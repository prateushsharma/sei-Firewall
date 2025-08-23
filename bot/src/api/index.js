require('dotenv').config();
const API_BASE_URL = process.env.API_BASE_URL || 'http://0.0.0.0:8000';

async function postJson(path, body, { timeoutMs = 80000000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} ${text ? `- ${text}` : ''}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /fetch-transfers
 * input: { token_address: string }
 * output: {
 *   token_address: string,
 *   total_transfers: number,
 *   results: string,
 *   token_data: object
 * }
 */
async function fetchTransfers(tokenAddress) {
  if (!tokenAddress || typeof tokenAddress !== 'string') {
    throw new Error('token_address must be a non-empty string');
  }
  return await postJson('/fetch-transfers', { token_address: tokenAddress });
}

module.exports = {
  fetchTransfers,
};

