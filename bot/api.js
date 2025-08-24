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
  if (!base64String) {
    console.log('DEBUG: Empty base64String provided');
    return null;
  }
  
  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    let base64Data = base64String;
    
    // Check for data URL format
    if (base64String.startsWith('data:')) {
      base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    }
    
    // Validate base64 format (basic check)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
      console.log('DEBUG: Invalid base64 format detected');
      return null;
    }
    
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Basic validation - check if buffer has reasonable size for an image
    if (buffer.length < 100) {
      console.log('DEBUG: Buffer too small to be a valid image:', buffer.length);
      return null;
    }
    
    console.log('DEBUG: Successfully decoded base64 image, buffer length:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('DEBUG: Failed to decode base64 image:', error.message);
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

/**
 * Fetch NFT lifetime transfers and analysis
 * POST /fetch-nft-transfers
 * 
 * Input: { 
 *   token_address: string,
 *   token_id: number|string
 * }
 * 
 * Output: {
 *   nft_address: string,
 *   nft_id: number,
 *   total_transfers: number,
 *   results: string,
 *   nft_data: array,
 *   images: {
 *     ownership_timeline: string (BASE64),
 *     time_differences: string (BASE64),
 *     transfer_network: string (BASE64),
 *     nft_image: array of strings (BASE64)
 *   }
 * }
 */
async function fetchNFTTransfers(tokenAddress, tokenId) {
  if (!tokenAddress || typeof tokenAddress !== 'string') {
    throw new Error('token_address must be a non-empty string');
  }
  
  if (!tokenId) {
    throw new Error('token_id is required');
  }
  
  // Convert tokenId to appropriate type
  const parsedTokenId = typeof tokenId === 'string' ? 
    (isNaN(Number(tokenId)) ? tokenId : Number(tokenId)) : 
    tokenId;
  
  return await postJson('/fetch-nft-transfers', { 
    token_address: tokenAddress,
    token_id: parsedTokenId
  });
}

/**
 * Process NFT API response and prepare all images for Telegram
 */
function processNFTResponse(response) {
  console.log('DEBUG: Processing NFT response...');
  const images = {};
  
  if (response.images) {
    console.log('DEBUG: Images object exists, keys:', Object.keys(response.images));
    
    // Decode analysis charts
    if (response.images.ownership_timeline) {
      images.ownership_timeline = decodeBase64Image(response.images.ownership_timeline);
    }
    if (response.images.time_differences) {
      images.time_differences = decodeBase64Image(response.images.time_differences);
    }
    if (response.images.transfer_network) {
      images.transfer_network = decodeBase64Image(response.images.transfer_network);
    }
    
    // Decode NFT images (array) - API uses "nft_image"
    if (response.images.nft_image) {
      console.log('DEBUG: nft_image found, type:', typeof response.images.nft_image, 'isArray:', Array.isArray(response.images.nft_image));
      
      if (Array.isArray(response.images.nft_image)) {
        console.log('DEBUG: nft_image array length:', response.images.nft_image.length);
        
        images.nft_images = response.images.nft_image
          .map((base64Str, index) => {
            console.log(`DEBUG: Processing NFT image ${index + 1}...`);
            return decodeBase64Image(base64Str);
          })
          .filter(buffer => {
            const isValid = buffer !== null;
            console.log('DEBUG: Image buffer valid:', isValid);
            return isValid;
          });
          
        console.log('DEBUG: Successfully processed NFT images count:', images.nft_images.length);
      }
    } else {
      console.log('DEBUG: No nft_image field found in response');
    }
  } else {
    console.log('DEBUG: No images object in response');
  }
  
  console.log('DEBUG: Final processedImages keys:', Object.keys(images));
  
  return {
    ...response,
    processedImages: images
  };
}

module.exports = {
  fetchTransfers,
  fetchNFTTransfers,
  decodeBase64Image,
  processApiResponse,
  processNFTResponse,
};