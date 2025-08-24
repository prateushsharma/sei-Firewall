import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import startServer from "./server.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Import the blockchain service functions directly from wherever they're exported
// Try to import from the actual location in your codebase
import * as services from "../core/services/index.js";

// Environment variables - hardcoded values
const PORT = 3001;
const HOST = "0.0.0.0";

console.error(`Configured to listen on ${HOST}:${PORT}`);

// Setup Express
const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  exposedHeaders: ["Content-Type", "Access-Control-Allow-Origin"],
}));
app.use(express.json());

// Add JSON middleware for REST API endpoints only
app.use('/api', express.json());

// Add OPTIONS handling for preflight requests
app.options("*", cors());

// Keep track of active connections with session IDs
const connections = new Map<string, SSEServerTransport>();

// Initialize the server
let server: McpServer | null = null;
let mcpTools: any = null;

startServer()
  .then((s) => {
    server = s;
    // Store the tools from the server config
    mcpTools = s;
    console.error("MCP Server initialized successfully");
  })
  .catch((error) => {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  });

// -------------------- REST API ENDPOINTS --------------------

// Helper function to convert BigInt to string recursively
function bigIntToString(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(bigIntToString);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = bigIntToString(value);
    }
    return result;
  }
  return obj;
}

// Simple transaction endpoint - call blockchain RPC directly
app.get("/api/tx/:hash", async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    const network = req.query.network?.toString() || 'sei';
    
    console.error(`REST API: Getting transaction ${hash} on network ${network}`);
    
    // Import viem for blockchain calls
    const { createPublicClient, http } = await import('viem');
    
    // Get the correct RPC URL for the network
    const getRpcUrl = (network: string) => {
      switch (network) {
        case 'sei':
        case 'sei-mainnet':
          return 'https://evm-rpc.sei-apis.com';
        case 'sei-testnet':
          return 'https://evm-rpc-testnet.sei-apis.com';
        case 'sei-devnet':
          return 'https://evm-rpc-arctic-1.sei-apis.com';
        default:
          return 'https://evm-rpc.sei-apis.com';
      }
    };
    
    // Create RPC client with proper URL
    const client = createPublicClient({
      transport: http(getRpcUrl(network))
    });
    
    // Get transaction directly
    const transaction = await client.getTransaction({ hash: hash as `0x${string}` });
    const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
    
    // Convert BigInt values to strings for JSON serialization
    const cleanTransaction = bigIntToString(transaction);
    const cleanReceipt = bigIntToString(receipt);
    
    res.json({
      success: true,
      data: {
        transaction: cleanTransaction,
        receipt: cleanReceipt
      },
      txHash: hash,
      network: network
    });
  } catch (error: any) {
    console.error(`REST API error for transaction ${req.params.hash}:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error',
      txHash: req.params.hash,
      network: req.query.network || 'sei'
    });
  }
});

// EVM resource pattern endpoint
app.get("/api/evm/:network/tx/:hash", async (req: Request, res: Response) => {
  try {
    const { network, hash } = req.params;
    
    console.error(`REST API: Getting EVM resource evm://${network}/tx/${hash}`);
    
    // Same as above but formatted as MCP resource
    const { createPublicClient, http } = await import('viem');
    
    // Get the correct RPC URL for the network
    const getRpcUrl = (network: string) => {
      switch (network) {
        case 'sei':
        case 'sei-mainnet':
          return 'https://evm-rpc.sei-apis.com';
        case 'sei-testnet':
          return 'https://evm-rpc-testnet.sei-apis.com';
        case 'sei-devnet':
          return 'https://evm-rpc-arctic-1.sei-apis.com';
        default:
          return 'https://evm-rpc.sei-apis.com';
      }
    };
    
    const client = createPublicClient({
      transport: http(getRpcUrl(network))
    });
    
    const transaction = await client.getTransaction({ hash: hash as `0x${string}` });
    const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
    
    // Convert BigInt values to strings for JSON serialization
    const cleanData = bigIntToString({ transaction, receipt });
    
    res.json({
      uri: `evm://${network}/tx/${hash}`,
      mimeType: "application/json",
      contents: cleanData
    });
  } catch (error: any) {
    console.error(`REST API error for EVM resource:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error',
      uri: `evm://${req.params.network}/tx/${req.params.hash}`
    });
  }
});

// Balance endpoint
app.get("/api/balance/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const network = req.query.network?.toString() || 'sei';
    
    console.error(`REST API: Getting balance for ${address} on network ${network}`);
    
    const { createPublicClient, http } = await import('viem');
    
    // Get the correct RPC URL for the network
    const getRpcUrl = (network: string) => {
      switch (network) {
        case 'sei':
        case 'sei-mainnet':
          return 'https://evm-rpc.sei-apis.com';
        case 'sei-testnet':
          return 'https://evm-rpc-testnet.sei-apis.com';
        case 'sei-devnet':
          return 'https://evm-rpc-arctic-1.sei-apis.com';
        default:
          return 'https://evm-rpc.sei-apis.com';
      }
    };
    
    const client = createPublicClient({
      transport: http(getRpcUrl(network))
    });
    
    const balance = await client.getBalance({ address: address as `0x${string}` });
    
    // Convert BigInt to string and format
    const balanceString = balance.toString();
    const formattedBalance = (Number(balance) / 1e18).toFixed(6) + " SEI";
    
    res.json({
      success: true,
      data: {
        address,
        balance: balanceString,
        formatted: formattedBalance
      },
      network: network
    });
  } catch (error: any) {
    console.error(`REST API error for balance ${req.params.address}:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error',
      address: req.params.address,
      network: req.query.network || 'sei'
    });
  }
});

// Chain info endpoint
app.get("/api/chain/:network?", async (req: Request, res: Response) => {
  try {
    const network = req.params.network || 'sei';
    
    console.error(`REST API: Getting chain info for network ${network}`);
    
    const { createPublicClient, http } = await import('viem');
    
    // Get the correct RPC URL for the network  
    const getRpcUrl = (network: string) => {
      switch (network) {
        case 'sei':
        case 'sei-mainnet':
          return 'https://evm-rpc.sei-apis.com';
        case 'sei-testnet':
          return 'https://evm-rpc-testnet.sei-apis.com';
        case 'sei-devnet':
          return 'https://evm-rpc-arctic-1.sei-apis.com';
        default:
          return 'https://evm-rpc.sei-apis.com';
      }
    };
    
    const client = createPublicClient({
      transport: http(getRpcUrl(network))
    });
    
    const [blockNumber, chainId] = await Promise.all([
      client.getBlockNumber(),
      client.getChainId()
    ]);
    
    res.json({
      success: true,
      data: {
        network,
        chainId: chainId.toString(),
        blockNumber: blockNumber.toString(),
        rpc: getRpcUrl(network)
      }
    });
  } catch (error: any) {
    console.error(`REST API error for chain info:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error',
      network: req.params.network || 'sei'
    });
  }
});

// Latest block endpoint
app.get("/api/block/latest", async (req: Request, res: Response) => {
  try {
    const network = req.query.network?.toString() || 'sei';
    
    console.error(`REST API: Getting latest block on network ${network}`);
    
    const { createPublicClient, http } = await import('viem');
    const { seiMainnet } = await import('../core/chains.js');
    
    const client = createPublicClient({
      chain: seiMainnet,
      transport: http()
    });
    
    const block = await client.getBlock({ blockTag: 'latest' });
    
    // Convert BigInt values to strings
    const cleanBlock = bigIntToString(block);
    
    res.json({
      success: true,
      data: cleanBlock,
      network: network
    });
  } catch (error: any) {
    console.error(`REST API error for latest block:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error',
      network: req.query.network || 'sei'
    });
  }
});

// NEW: Token transfers endpoint
app.post("/api/token/:address/transfers", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Debug: Log all query parameters
    console.error(`REST API: All query params:`, req.query);
    
    const fromDate = (req.body.from_date ?? req.query.from_date)?.toString();
  const toDate   = (req.body.to_date   ?? req.query.to_date)?.toString();
    
    // Debug: Log extracted dates
    console.error(`REST API: Extracted fromDate: "${fromDate}"`);
    console.error(`REST API: Extracted toDate: "${toDate}"`);
    console.error(`REST API: fromDate type: ${typeof fromDate}`);
    console.error(`REST API: toDate type: ${typeof toDate}`);
    
    console.error(`REST API: Getting ALL token transfers for ${address}`);
    if (fromDate) console.error(`From date: ${fromDate}`);
    if (toDate) console.error(`To date: ${toDate}`);
    
    // Call the service function with optional date parameters
    const transfers = await services.getTokenTransfers(address, fromDate, toDate);
    
    res.json({
      success: transfers.success,
      data: transfers,
      tokenAddress: address,
      fromDate: fromDate || null,
      toDate: toDate || null,
      debug_info: {
        query_params: req.query,
        extracted_from_date: fromDate,
        extracted_to_date: toDate,
        passed_to_service: { fromDate, toDate }
      },
      endpoint: "token_transfers_full"
    });
  } catch (error: any) {
    console.error(`REST API error for token transfers ${req.params.address}:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error',
      tokenAddress: req.params.address
    });
  }
});
// new post api for interaction
app.post("/api/nft/:address/transfers", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Debug: Log all query parameters and body
    console.error(`NFT REST API: All query params:`, req.query);
    console.error(`NFT REST API: Request body:`, req.body);
    
    const tokenId = (req.body.token_id ?? req.query.token_id)?.toString();
    const fromDate = (req.body.from_date ?? req.query.from_date)?.toString();
    const toDate = (req.body.to_date ?? req.query.to_date)?.toString();
    
    // Debug: Log extracted parameters
    console.error(`NFT REST API: Extracted tokenId: "${tokenId}"`);
    console.error(`NFT REST API: Extracted fromDate: "${fromDate}"`);
    console.error(`NFT REST API: Extracted toDate: "${toDate}"`);
    console.error(`NFT REST API: tokenId type: ${typeof tokenId}`);
    console.error(`NFT REST API: fromDate type: ${typeof fromDate}`);
    console.error(`NFT REST API: toDate type: ${typeof toDate}`);
    
    console.error(`NFT REST API: Getting ALL NFT transfers for ${address}`);
    if (tokenId) console.error(`Token ID: ${tokenId}`);
    if (fromDate) console.error(`From date: ${fromDate}`);
    if (toDate) console.error(`To date: ${toDate}`);
    
    // Call the service function with optional parameters
    const transfers = await services.getNFTTransfers(address, tokenId, fromDate, toDate);
    
    res.json({
      success: transfers.success,
      data: transfers,
      contractAddress: address,
      tokenId: tokenId || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
      debug_info: {
        query_params: req.query,
        body_params: req.body,
        extracted_token_id: tokenId,
        extracted_from_date: fromDate,
        extracted_to_date: toDate,
        passed_to_service: { tokenId, fromDate, toDate }
      },
      endpoint: "nft_transfers_full"
    });
  } catch (error: any) {
    console.error(`NFT REST API error for transfers ${req.params.address}:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error',
      contractAddress: req.params.address
    });
  }
});
// Also update the service function to log what it receives
// Add this debug version to tokens.ts:


// Token transfers batch endpoint with optional date filters
app.get("/api/token/:address/transfers/batch", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit?.toString() || '50');
    const offset = parseInt(req.query.offset?.toString() || '0');
    const fromDate = req.query.from_date?.toString();
    const toDate = req.query.to_date?.toString();
    
    // Validate parameters
    if (limit > 50 || limit < 1) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 50',
        tokenAddress: address
      });
    }
    
    console.error(`REST API: Getting token transfers batch for ${address} (limit: ${limit}, offset: ${offset})`);
    if (fromDate) console.error(`From date: ${fromDate}`);
    if (toDate) console.error(`To date: ${toDate}`);
    
    // Call the batch service function with optional date parameters
    const transfers = await services.getTokenTransfersBatch(address, limit, offset, fromDate, toDate);
    
    res.json({
      success: transfers.success,
      data: transfers,
      tokenAddress: address,
      limit,
      offset,
      fromDate: fromDate || null,
      toDate: toDate || null,
      endpoint: "token_transfers_batch"
    });
  } catch (error: any) {
    console.error(`REST API error for token transfers batch ${req.params.address}:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error',
      tokenAddress: req.params.address
    });
  }
});


// API documentation endpoint
app.get("/api", (req: Request, res: Response) => {
  res.json({
    name: "Sei MCP REST API",
    version: "1.0.0",
    description: "REST API wrapper for Sei MCP Server",
    server_status: server ? "initialized" : "initializing",
    endpoints: {
      transaction: {
        pattern: "/api/tx/{hash}",
        method: "GET",
        query_params: ["network"],
        example: "/api/tx/0xdd7502013b5a298618c84b0e1af8aa0dea012a63096a41ab3e208d5100524fbb?network=sei",
        description: "Get transaction details by hash"
      },
      evm_resource: {
        pattern: "/api/evm/{network}/tx/{hash}",
        method: "GET",
        example: "/api/evm/sei/tx/0xdd7502013b5a298618c84b0e1af8aa0dea012a63096a41ab3e208d5100524fbb",
        description: "Get transaction via EVM resource pattern"
      },
      balance: {
        pattern: "/api/balance/{address}",
        method: "GET",
        query_params: ["network"],
        example: "/api/balance/0x1234567890123456789012345678901234567890?network=sei",
        description: "Get native token balance for address"
      },
      chain_info: {
        pattern: "/api/chain/{network}",
        method: "GET",
        example: "/api/chain/sei",
        description: "Get blockchain network information"
      },
      latest_block: {
        pattern: "/api/block/latest",
        method: "GET",
        query_params: ["network"],
        example: "/api/block/latest?network=sei",
        description: "Get latest block data"
      },
      token_transfers: {
        pattern: "/api/token/{address}/transfers",
        method: "GET",
        example: "/api/token/0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1/transfers",
        description: "Get ERC20 token transfer history for a specific token address using seitrace.com API"
      }
    },
    networks: ["sei", "sei-testnet", "sei-devnet"],
    note: "This server provides both MCP protocol (SSE) and REST API access to Sei blockchain data"
  });
});

// -------------------- SSE (EXISTING) --------------------
app.get("/sse", (req: Request, res: Response) => {
  console.error(`Received SSE connection request from ${req.ip}`);
  console.error(`Query parameters: ${JSON.stringify(req.query)}`);

  // Set CORS headers explicitly
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (!server) {
    console.error("Server not initialized yet, rejecting SSE connection");
    return res.status(503).send("Server not initialized");
  }

  // Generate a unique session ID
  const sessionId = generateSessionId();
  console.error(`Creating SSE session with ID: ${sessionId}`);

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    console.error(`Creating SSE transport for session: ${sessionId}`);

    // Create and store the transport keyed by session ID
    const transport = new SSEServerTransport("/messages", res);
    connections.set(sessionId, transport);

    // Handle connection close
    req.on("close", () => {
      console.error(`SSE connection closed for session: ${sessionId}`);
      connections.delete(sessionId);
    });

    // Connect transport to server
    server
      .connect(transport)
      .then(() => {
        console.error(`SSE connection established for session: ${sessionId}`);
        // Send sessionId to client
        res.write(
          `data: ${JSON.stringify({ type: "session_init", sessionId })}\n\n`
        );
      })
      .catch((error: Error) => {
        console.error(`Error connecting transport to server: ${error}`);
        connections.delete(sessionId);
      });
  } catch (error) {
    console.error(`Error creating SSE transport: ${error}`);
    connections.delete(sessionId);
    res.status(500).send(`Internal server error: ${error}`);
  }
});

// -------------------- Messages (EXISTING) --------------------
// IMPORTANT: Do NOT use express.json() here.
// The transport needs the raw request stream.
app.post("/messages", (req: Request, res: Response) => {
  // Extract the session ID from query
  let sessionId = req.query.sessionId?.toString();

  // If no sessionId and only one connection, use that
  if (!sessionId && connections.size === 1) {
    sessionId = Array.from(connections.keys())[0];
    console.error(
      `No sessionId provided, using the only active session: ${sessionId}`
    );
  }

  console.error(`Received message for sessionId ${sessionId}`);
  // DO NOT read req.body here (no JSON parsing!) — it would consume the stream.

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (!server) {
    console.error("Server not initialized yet");
    return res.status(503).json({ error: "Server not initialized" });
  }

  if (!sessionId) {
    console.error("No session ID provided and multiple connections exist");
    return res.status(400).json({
      error:
        "No session ID provided. Please provide a sessionId query parameter or connect to /sse first.",
      activeConnections: connections.size,
    });
  }

  const transport = connections.get(sessionId);
  if (!transport) {
    console.error(`Session not found: ${sessionId}`);
    return res.status(404).json({ error: "Session not found" });
  }

  console.error(`Handling message for session: ${sessionId}`);
  try {
    transport.handlePostMessage(req, res).catch((error: Error) => {
      console.error(`Error handling post message: ${error}`);
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    });
  } catch (error) {
    console.error(`Exception handling post message: ${error}`);
    res.status(500).json({ error: `Internal server error: ${error}` });
  }
});

// -------------------- Health (UPDATED) --------------------
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    server: server ? "initialized" : "initializing",
    activeConnections: connections.size,
    connectedSessionIds: Array.from(connections.keys()),
    apis: {
      sse: "available",
      rest: "available"
    },
    rest_endpoints: [
      "/api/tx/{hash}",
      "/api/evm/{network}/tx/{hash}",
      "/api/balance/{address}",
      "/api/chain/{network}",
      "/api/block/latest",
      "/api/token/{address}/transfers"
    ]
  });
});

// -------------------- Root (UPDATED) --------------------
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    name: "Sei MCP Server with REST API",
    version: "1.0.0",
    endpoints: {
      // SSE endpoints
      sse: "/sse",
      messages: "/messages",
      health: "/health",
      // REST API endpoints
      api_docs: "/api",
      transaction: "/api/tx/{hash}",
      evm_resource: "/api/evm/{network}/tx/{hash}",
      balance: "/api/balance/{address}",
      chain_info: "/api/chain/{network}",
      latest_block: "/api/block/latest",
      token_transfers: "/api/token/{address}/transfers"
    },
    status: server ? "ready" : "initializing",
    activeConnections: connections.size,
  });
});

app.get("/api/debug/token/:address/test", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    console.error(`DEBUG: Testing seitrace API for ${address}`);
    
    // Call the debug test function
    const result = await services.testSeitraceAPI(address);
    
    res.json({
      success: true,
      debug_result: result,
      tokenAddress: address,
      endpoint: "debug_test"
    });
  } catch (error: any) {
    console.error(`DEBUG API error:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error',
      tokenAddress: req.params.address
    });
  }
});

// Also add a manual curl test endpoint
app.get("/api/debug/manual-test/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const cleanAddress = address.toLowerCase();
    
    // Make the exact same call as the working online version
    const url = `https://seitrace.com/insights/api/v2/token/erc20/transfers?chain_id=pacific-1&contract_address=${cleanAddress}&limit=50&offset=0`;
    
    console.log(`Manual test URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': 'ea6a4d96-161e-4015-8657-18e4eb9baea6',
        'Accept': 'application/json'
      }
    });

    console.log(`Manual test response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`Manual test raw response: ${responseText.substring(0, 500)}...`);
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      parsedData = { raw_response: responseText, parse_error: e.message };
    }

    res.json({
      success: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      url: url,
      raw_response_length: responseText.length,
      parsed_data: parsedData,
      tokenAddress: address
    });
    
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      tokenAddress: req.params.address
    });
  }
});

// Helper function to generate a UUID-like session ID
function generateSessionId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Handle process termination gracefully
process.on("SIGINT", () => {
  console.error("Shutting down server...");
  connections.forEach((_, sessionId) => {
    console.error(`Closing connection for session: ${sessionId}`);
  });
  process.exit(0);
});

// Start the HTTP server
app.listen(PORT, HOST, () => {
    console.error(`Template MCP Server running at http://${HOST}:${PORT}`);
    console.error(`SSE endpoint:       http://${HOST}:${PORT}/sse`);
    console.error(`Messages:           http://${HOST}:${PORT}/messages (sessionId optional if only one connection)`);
    console.error(`Health check:       http://${HOST}:${PORT}/health`);
    console.error(`REST API docs:      http://${HOST}:${PORT}/api`);
    console.error(`Transaction API:    http://${HOST}:${PORT}/api/tx/{hash}`);
    console.error(`EVM Resource API:   http://${HOST}:${PORT}/api/evm/{network}/tx/{hash}`);
    console.error(`Balance API:        http://${HOST}:${PORT}/api/balance/{address}`);
    console.error(`Chain Info API:     http://${HOST}:${PORT}/api/chain/{network}`);
    console.error(`Latest Block API:   http://${HOST}:${PORT}/api/block/latest`);
    console.error(`Token Transfers:    http://${HOST}:${PORT}/api/token/{address}/transfers`);
  })
  .on("error", (err: Error) => {
    console.error(`Server error: ${err}`);
  });