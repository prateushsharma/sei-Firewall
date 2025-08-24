import {
  type Address,
  type Hex,
  type Hash,
  formatUnits,
  getContract
} from 'viem';
import { getPublicClient } from './clients.js';
import https from 'https';

// Standard ERC20 ABI (minimal for reading)
const erc20Abi = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Standard ERC721 ABI (minimal for reading)
const erc721Abi = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    name: 'tokenURI',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Standard ERC1155 ABI (minimal for reading)
const erc1155Abi = [
  {
    inputs: [{ type: 'uint256', name: 'id' }],
    name: 'uri',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

/**
 * Get ERC20 token information
 */
export async function getERC20TokenInfo(
  tokenAddress: Address,
  network: string = 'sei'
): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  formattedTotalSupply: string;
}> {
  const publicClient = getPublicClient(network);

  const contract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: publicClient,
  });

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    contract.read.name(),
    contract.read.symbol(),
    contract.read.decimals(),
    contract.read.totalSupply()
  ]);

  return {
    name,
    symbol,
    decimals,
    totalSupply,
    formattedTotalSupply: formatUnits(totalSupply, decimals)
  };
}

/**
 * Get ERC721 token metadata
 */
export async function getERC721TokenMetadata(
  tokenAddress: Address,
  tokenId: bigint,
  network: string = 'sei'
): Promise<{
  name: string;
  symbol: string;
  tokenURI: string;
}> {
  const publicClient = getPublicClient(network);

  const contract = getContract({
    address: tokenAddress,
    abi: erc721Abi,
    client: publicClient,
  });

  const [name, symbol, tokenURI] = await Promise.all([
    contract.read.name(),
    contract.read.symbol(),
    contract.read.tokenURI([tokenId])
  ]);

  return {
    name,
    symbol,
    tokenURI
  };
}

/**
 * Get ERC1155 token URI
 */
export async function getERC1155TokenURI(
  tokenAddress: Address,
  tokenId: bigint,
  network: string = 'sei'
): Promise<string> {
  const publicClient = getPublicClient(network);

  const contract = getContract({
    address: tokenAddress,
    abi: erc1155Abi,
    client: publicClient,
  });

  return contract.read.uri([tokenId]);
}

// out new function to get token transfers
// Replace your getTokenTransfers function with this debug version to see what's happening:

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to make robust API calls with retries
async function makeRobustAPICall(url: string, attempt: number = 1, maxAttempts: number = 3): Promise<any> {
  try {
    console.log(`API attempt ${attempt}/${maxAttempts}: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': 'ea6a4d96-161e-4015-8657-18e4eb9baea6',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'User-Agent': 'sei-mcp-server/1.0.0'
      },
      // Add timeout and connection options
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    console.log(`Response status: ${response.status}`);

    // Handle rate limiting with proper retry
    if (response.status === 429) {
      const errorBody = await response.text();
      console.log(`Rate limited. Response: ${errorBody}`);
      
      try {
        const rateLimitInfo = JSON.parse(errorBody);
        if (rateLimitInfo.message && rateLimitInfo.message.includes('Unblock was scheduled at')) {
          const unblockTime = rateLimitInfo.message.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/)?.[1];
          if (unblockTime) {
            const waitTime = new Date(unblockTime).getTime() - new Date().getTime();
            if (waitTime > 0 && waitTime < 300000) { // Don't wait more than 5 minutes
              console.log(`Waiting ${Math.round(waitTime / 1000)} seconds until unblock...`);
              await sleep(waitTime + 1000); // Add 1 second buffer
              return makeRobustAPICall(url, attempt + 1, maxAttempts);
            }
          }
        }
      } catch (e) {
        console.log('Could not parse rate limit response');
      }
      
      // Fallback: wait 60 seconds and retry
      if (attempt < maxAttempts) {
        console.log('Rate limited, waiting 60 seconds before retry...');
        await sleep(60000);
        return makeRobustAPICall(url, attempt + 1, maxAttempts);
      } else {
        throw new Error(`Rate limited after ${maxAttempts} attempts. ${errorBody}`);
      }
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.log(`HTTP error ${response.status}: ${errorBody}`);
      
      // Retry on server errors (5xx) and some client errors
      if ((response.status >= 500 || response.status === 408 || response.status === 429) && attempt < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
        console.log(`Server error, retrying in ${delay}ms...`);
        await sleep(delay);
        return makeRobustAPICall(url, attempt + 1, maxAttempts);
      }
      
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return data;
    
  } catch (error: any) {
    console.log(`API call error (attempt ${attempt}/${maxAttempts}):`, error.message);
    
    // Retry on network errors
    if ((error.code === 'ECONNRESET' || 
         error.code === 'ETIMEDOUT' || 
         error.code === 'ENOTFOUND' ||
         error.name === 'AbortError' ||
         error.message.includes('socket connection was closed') ||
         error.message.includes('network error') ||
         error.message.includes('fetch failed')) && 
        attempt < maxAttempts) {
      
      const delay = Math.min(2000 * Math.pow(2, attempt), 15000); // Exponential backoff, max 15s
      console.log(`Network error, retrying in ${delay}ms...`);
      await sleep(delay);
      return makeRobustAPICall(url, attempt + 1, maxAttempts);
    }
    
    // If all retries failed, throw the error
    throw error;
  }
}

export async function getTokenTransfers(
  tokenAddress: string, 
  fromDate?: string, 
  toDate?: string
): Promise<any> {
  try {
    // Validate and clean the token address
    const cleanAddress = tokenAddress.toLowerCase().startsWith('0x') 
      ? tokenAddress.toLowerCase() 
      : `0x${tokenAddress.toLowerCase()}`;
    
    console.log(`Getting token transfers for: ${cleanAddress}`);
    if (fromDate) console.log(`From date: ${fromDate}`);
    if (toDate) console.log(`To date: ${toDate}`);
    
    // Seitrace API parameters
    const chainId = 'pacific-1';
    const limit = 50; // Reduced limit to be more gentle on API
    const maxRequests = 1; // Reduced max requests to avoid long waits
    
    let allTransfers: any[] = [];
    let offset = 0;
    let requestCount = 0;
    
    // Paginate through transfers with proper rate limiting
    while (requestCount < maxRequests) {
      // Build URL with optional date parameters
      let url = `https://seitrace.com/insights/api/v2/token/erc20/transfers?chain_id=${chainId}&contract_address=${cleanAddress}&limit=${limit}&offset=${offset}`;
      
      // Add date filters if provided
      if (fromDate) {
        url += `&from_date=${fromDate}`;
      }
      if (toDate) {
        url += `&to_date=${toDate}`;
      }
      
      console.log(`Request ${requestCount + 1}/${maxRequests}: Starting API call`);
      
      // Make robust API call with retries
      const data = await makeRobustAPICall(url);
      
      // Check for transfers in response
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        allTransfers.push(...data.items);
        console.log(`Batch ${requestCount + 1}: Got ${data.items.length} transfers (Total: ${allTransfers.length})`);
        
        // If we got fewer than the limit, we've reached the end
        if (data.items.length < limit) {
          console.log('Reached end of transfers (got fewer than limit)');
          break;
        }
        
        // Prepare for next batch
        offset += limit;
      } else {
        console.log(`No transfers in this batch. Response keys:`, Object.keys(data));
        
        if (requestCount === 0) {
          console.log('No transfers found on first request');
          console.log('Sample response:', JSON.stringify(data, null, 2).substring(0, 500));
        }
        break;
      }
      
      requestCount++;
      
      // Rate limiting: wait between requests to respect API limits
      if (requestCount < maxRequests) {
        // Calculate delay: 50 requests per 60 seconds = 1.2 seconds minimum + buffer
        const delay = 2000; // 2 seconds between requests to be safe
        console.log(`Waiting ${delay}ms before next request...`);
        await sleep(delay);
      }
    }
    
    console.log(`Successfully retrieved ${allTransfers.length} total transfers in ${requestCount} requests`);
    
    // Return the data in a structured format
    return {
      success: true,
      token_address: cleanAddress,
      chain_id: chainId,
      from_date: fromDate || null,
      to_date: toDate || null,
      total_transfers: allTransfers.length,
      requests_made: requestCount,
      transfers: allTransfers,
      metadata: {
        retrieved_at: new Date().toISOString(),
        api_source: 'seitrace.com',
        rate_limit_friendly: true
      }
    };
    
  } catch (error: any) {
    console.error('getTokenTransfers error:', error);
    
    return {
      success: false,
      error: error.message,
      token_address: tokenAddress,
      chain_id: 'pacific-1',
      from_date: fromDate || null,
      to_date: toDate || null,
      retrieved_at: new Date().toISOString()
    };
  }
}
// new embedding for nft transfers history
export async function getNFTTransfers(
  tokenAddress: string,
  tokenId?: string,
  fromDate?: string, 
  toDate?: string
): Promise<any> {
  try {
    // Validate and clean the token address
    const cleanAddress = tokenAddress.toLowerCase().startsWith('0x') 
      ? tokenAddress.toLowerCase() 
      : `0x${tokenAddress.toLowerCase()}`;
    
    console.log(`Getting NFT transfers for: ${cleanAddress}`);
    if (tokenId) console.log(`Token ID: ${tokenId}`);
    if (fromDate) console.log(`From date: ${fromDate}`);
    if (toDate) console.log(`To date: ${toDate}`);
    
    // Seitrace API parameters
    const chainId = 'pacific-1';
    const limit = 50; // Reduced limit to be gentle on API
    const maxRequests = 2; // Max requests to avoid long waits
    
    let allTransfers: any[] = [];
    let offset = 0;
    let requestCount = 0;
    
    // Paginate through transfers with proper rate limiting
    while (requestCount < maxRequests) {
      // Build URL with required and optional parameters
      let url = `https://seitrace.com/insights/api/v2/token/erc721/transfers?chain_id=${chainId}&contract_address=${cleanAddress}&limit=${limit}&offset=${offset}`;
      
      // Add token_id if provided (for specific NFT)
      if (tokenId) {
        url += `&token_id=${tokenId}`;
      }
      
      // Add date filters if provided
      if (fromDate) {
        url += `&from_date=${fromDate}`;
      }
      if (toDate) {
        url += `&to_date=${toDate}`;
      }
      
      console.log(`NFT Request ${requestCount + 1}/${maxRequests}: Starting API call`);
      
      // Make robust API call with retries (reuse the same makeRobustAPICall function)
      const data = await makeRobustAPICall(url);
      
      // Check for transfers in response (same structure as ERC20)
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        allTransfers.push(...data.items);
        console.log(`NFT Batch ${requestCount + 1}: Got ${data.items.length} transfers (Total: ${allTransfers.length})`);
        
        // If we got fewer than the limit, we've reached the end
        if (data.items.length < limit) {
          console.log('Reached end of NFT transfers (got fewer than limit)');
          break;
        }
        
        // Prepare for next batch
        offset += limit;
      } else {
        console.log(`No NFT transfers in this batch. Response keys:`, Object.keys(data));
        
        if (requestCount === 0) {
          console.log('No NFT transfers found on first request');
          console.log('Sample response:', JSON.stringify(data, null, 2).substring(0, 500));
        }
        break;
      }
      
      requestCount++;
      
      // Rate limiting: wait between requests
      if (requestCount < maxRequests) {
        const delay = 2000; // 2 seconds between requests to be safe
        console.log(`Waiting ${delay}ms before next NFT request...`);
        await sleep(delay);
      }
    }
    
    console.log(`Successfully retrieved ${allTransfers.length} total NFT transfers in ${requestCount} requests`);
    
    // Return the data in a structured format
    return {
      success: true,
      token_address: cleanAddress,
      token_id: tokenId || null,
      chain_id: chainId,
      from_date: fromDate || null,
      to_date: toDate || null,
      total_transfers: allTransfers.length,
      requests_made: requestCount,
      transfers: allTransfers,
      metadata: {
        retrieved_at: new Date().toISOString(),
        api_source: 'seitrace.com',
        transfer_type: 'ERC721',
        rate_limit_friendly: true
      }
    };
    
  } catch (error: any) {
    console.error('getNFTTransfers error:', error);
    
    return {
      success: false,
      error: error.message,
      token_address: tokenAddress,
      token_id: tokenId || null,
      chain_id: 'pacific-1',
      from_date: fromDate || null,
      to_date: toDate || null,
      retrieved_at: new Date().toISOString()
    };
  }
}

// NFT transfers batch function
export async function getNFTTransfersBatch(
  tokenAddress: string,
  limit: number = 40, 
  offset: number = 0,
  tokenId?: string,
  fromDate?: string,
  toDate?: string
): Promise<any> {
  try {
    const cleanAddress = tokenAddress.toLowerCase().startsWith('0x') 
      ? tokenAddress.toLowerCase() 
      : `0x${tokenAddress.toLowerCase()}`;
    
    const chainId = 'pacific-1';
    
    // Build URL with required and optional parameters
    let url = `https://seitrace.com/insights/api/v2/token/erc721/transfers?chain_id=${chainId}&contract_address=${cleanAddress}&limit=${limit}&offset=${offset}`;
    
    if (tokenId) {
      url += `&token_id=${tokenId}`;
    }
    if (fromDate) {
      url += `&from_date=${fromDate}`;
    }
    if (toDate) {
      url += `&to_date=${toDate}`;
    }
    
    console.log(`Getting single NFT batch with retry logic`);
    
    // Use robust API call
    const data = await makeRobustAPICall(url);
    
    return {
      success: true,
      token_address: cleanAddress,
      token_id: tokenId || null,
      chain_id: chainId,
      from_date: fromDate || null,
      to_date: toDate || null,
      limit,
      offset,
      transfers_count: data.items?.length || 0,
      transfers: data.items || [],
      next_page_params: data.next_page_params || null,
      metadata: {
        retrieved_at: new Date().toISOString(),
        api_source: 'seitrace.com',
        transfer_type: 'ERC721'
      }
    };
    
  } catch (error: any) {
    console.error('getNFTTransfersBatch error:', error);
    
    return {
      success: false,
      error: error.message,
      token_address: tokenAddress,
      token_id: tokenId || null,
      chain_id: 'pacific-1',
      from_date: fromDate || null,
      to_date: toDate || null,
      limit,
      offset,
      retrieved_at: new Date().toISOString()
    };
  }
}
// Updated batch function with date parameters
export async function getTokenTransfersBatch(
  tokenAddress: string, 
  limit: number = 50, 
  offset: number = 0,
  fromDate?: string,
  toDate?: string
): Promise<any> {
  try {
    const cleanAddress = tokenAddress.toLowerCase().startsWith('0x') 
      ? tokenAddress.toLowerCase() 
      : `0x${tokenAddress.toLowerCase()}`;
    
    const chainId = 'pacific-1';
    
    // Build URL with optional date parameters
    let url = `https://seitrace.com/insights/api/v2/token/erc20/transfers?chain_id=${chainId}&contract_address=${cleanAddress}&limit=${limit}&offset=${offset}`;
   
    if (fromDate) {
      url += `&from_date=${fromDate}`;
    }
    if (toDate) {
      url += `&to_date=${toDate}`;
    }
    
    console.log(`Getting single batch: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': 'ea6a4d96-161e-4015-8657-18e4eb9baea6',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Seitrace API error! Status: ${response.status} ${response.statusText}. Details: ${errorBody}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      token_address: cleanAddress,
      chain_id: chainId,
      from_date: fromDate || null,
      to_date: toDate || null,
      limit,
      offset,
      transfers_count: data.transfers?.length || 0,
      transfers: data.transfers || [],
      next_page_params: data.next_page_params || null,
      metadata: {
        retrieved_at: new Date().toISOString(),
        api_source: 'seitrace.com',
        FROM_DATE: fromDate,
        TO_DATE: toDate
      }
    };
    
  } catch (error: any) {
    console.error('getTokenTransfersBatch error:', error);
    
    return {
      success: false,
      error: error.message,
      token_address: tokenAddress,
      chain_id: 'pacific-1',
      from_date: fromDate || null,
      to_date: toDate || null,
      limit,
      offset,
      retrieved_at: new Date().toISOString()
    };
  }
}
// Also add this simple test function to directly test the API
export async function testSeitraceAPI(tokenAddress: string): Promise<any> {
  const cleanAddress = tokenAddress.toLowerCase();
  const url = `https://seitrace.com/insights/api/v2/token/erc20/transfers?chain_id=pacific-1&contract_address=${cleanAddress}&limit=10&offset=0`;
  
  console.log(`Direct test URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': 'ea6a4d96-161e-4015-8657-18e4eb9baea6'
      }
    });
    
    const data = await response.json();
    console.log('Direct API test result:', data);
    return data;
  } catch (error) {
    console.error('Direct API test failed:', error);
    return { error: error.message };
  }
}