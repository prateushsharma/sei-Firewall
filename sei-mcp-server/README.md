# SEI MCP Server - Enhanced Features

## New APIs Added

### 1. Token Transfer History API

#### MCP Tool: `get_token_transfers`
Get comprehensive ERC20 token transfer history with optional date filtering.

**Parameters:**
- `tokenAddress` (required): ERC20 contract address
- `fromDate` (optional): Start date in YYYY-MM-DD format
- `toDate` (optional): End date in YYYY-MM-DD format

**Example:**
```javascript
await mcpClient.callTool('get_token_transfers', {
  tokenAddress: '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1',
  fromDate: '2024-01-01',
  toDate: '2024-12-31'
});
```

#### REST API Endpoints:
```bash
POST /api/token/{address}/transfers
POST /api/token/{address}/transfers/batch
```

**Request Body:**
```json
{
  "from_date": "2024-01-01",
  "to_date": "2024-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token_address": "0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1",
    "chain_id": "pacific-1",
    "total_transfers": 150,
    "transfers": [
      {
        "amount": "1000.50",
        "raw_amount": "1000500000",
        "from": {"address_hash": "0x1234..."},
        "to": {"address_hash": "0x5678..."},
        "timestamp": "2024-08-23T19:54:17.000Z",
        "tx_hash": "0xabcd...",
        "token_info": {
          "token_symbol": "USDC",
          "token_name": "USD Coin",
          "token_decimals": "6"
        }
      }
    ]
  }
}
```

### 2. NFT Transfer History API

#### MCP Tool: `get_nft_transfers`
Get comprehensive NFT transfer history with optional token ID and date filtering.

**Parameters:**
- `contractAddress` (required): NFT collection contract address
- `tokenId` (optional): Specific NFT token ID (e.g., "390")
- `fromDate` (optional): Start date in YYYY-MM-DD format
- `toDate` (optional): End date in YYYY-MM-DD format

**Examples:**

**All NFTs in collection:**
```javascript
await mcpClient.callTool('get_nft_transfers', {
  contractAddress: '0x9a1e3d2a010dbe576f9ccd57b2fc0d6',
  fromDate: '2024-01-01',
  toDate: '2024-12-31'
});
```

**Specific NFT:**
```javascript
await mcpClient.callTool('get_nft_transfers', {
  contractAddress: '0x9a1e3d2a010dbe576f9ccd57b2fc0d6',
  tokenId: '390',
  fromDate: '2024-01-01',
  toDate: '2024-12-31'
});
```

#### REST API Endpoints:
```bash
POST /api/nft/{address}/transfers
POST /api/nft/{address}/transfers/batch
```

**Request Body Examples:**

**All NFTs in collection:**
```json
{
  "from_date": "2024-01-01",
  "to_date": "2024-12-31"
}
```

**Specific NFT:**
```json
{
  "token_id": "390",
  "from_date": "2021-01-01",
  "to_date": "2021-03-01"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token_address": "0x9a1e3d2a010dbe576f9ccd57b2fc0d6",
    "token_id": "390",
    "chain_id": "pacific-1",
    "total_transfers": 25,
    "transfers": [
      {
        "from": {"address_hash": "0x1234..."},
        "to": {"address_hash": "0x5678..."},
        "timestamp": "2021-02-15T14:30:00.000Z",
        "tx_hash": "0xnft123...",
        "token_info": {
          "token_id": "390",
          "token_name": "Cool NFT Collection",
          "token_symbol": "COOL"
        }
      }
    ]
  }
}
```

## Enhanced Reliability Features

- **Rate Limiting**: 50 requests per 60 seconds
- **Retry Logic**: Exponential backoff with up to 3 attempts
- **Connection Recovery**: ECONNRESET handling
- **Timeout Protection**: 30-second request limits
- **Batch Processing**: Handle up to 200+ items per operation
- **Smart Delays**: 2-second spacing between requests

## Error Handling

**Network Errors:**
```json
{
  "success": false,
  "error": "The socket connection was closed unexpectedly",
  "token_address": "0x...",
  "retrieved_at": "2025-08-23T22:53:28.825Z"
}
```

**Rate Limit Response:**
```json
{
  "success": false,
  "error": "Rate limited after 3 attempts. Unblock scheduled at 2025-08-23T22:54:21.575Z"
}
```