require('dotenv').config();

// Updated API base URL for new endpoint
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

async function postJson(path, body, { timeoutMs = 80000 } = {}) {
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
 * Fetch token transfers with enhanced image data
 * POST /fetch-transfers
 * 
 * Input: { token_address: string }
 * 
 * Output: {
 *   token_address: string,
 *   total_transfers: number, 
 *   results: string,
 *   token_data: object,
 *   images: {
 *     amount_distribution: string (BASE64),
 *     network_graph: string (BASE64), 
 *     volume_time: string (BASE64)
 *   }
 * }
 */
async function fetchTransfers(tokenAddress) {
  if (!tokenAddress || typeof tokenAddress !== 'string') {
    throw new Error('token_address must be a non-empty string');
  }
  
  return await postJson('/fetch-transfers', { 
    token_address: tokenAddress 
  });
}

/**
 * Helper function to decode Base64 image data to Buffer
 * Used for sending images to Telegram
 */
function decodeBase64Image(base64String) {
  if (!base64String) return null;
  
  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('Failed to decode base64 image:', error);
    return null;
  }
}

/**
 * Process API response and prepare image buffers for Telegram
 */
function processApiResponse(response) {
  const images = {};
  
  if (response.images) {
    // Decode each image from base64 to Buffer
    if (response.images.amount_distribution) {
      images.amount_distribution = decodeBase64Image(response.images.amount_distribution);
    }
    if (response.images.network_graph) {
      images.network_graph = decodeBase64Image(response.images.network_graph);
    }
    if (response.images.volume_time) {
      images.volume_time = decodeBase64Image(response.images.volume_time);
    }
  }
  
  return {
    ...response,
    processedImages: images
  };
}

module.exports = {
  fetchTransfers,
  decodeBase64Image,
  processApiResponse,
};