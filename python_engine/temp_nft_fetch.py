import aiohttp
import asyncio
import json
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

MCP_SERVER_IP = os.getenv("MCP_SERVER_IP")

async def fetch_temp_nft_transfers(contract_address: str, 
                             token_id: str,
                             chain_id: str = "pacific-1",
                             max_entries: int = 500) -> List[Dict]:
    """Async function to fetch and process NFT transfers for a specific token"""
    
    # Create nft_transfer_data directory if it doesn't exist
    data_dir = Path("nft_transfer_data")
    data_dir.mkdir(exist_ok=True)
    
    def get_json_path(contract_addr: str, token_id_str: str) -> Path:
        return data_dir / f"nft_transfers_{contract_addr}_{token_id_str}.json"
    
    def build_url(contract_addr: str) -> str:
        return f"http://{MCP_SERVER_IP}/api/nft/{contract_addr}/transfers"
    
    async def fetch_transfers(session: aiohttp.ClientSession, url: str) -> Optional[Dict]:
        # Prepare JSON payload with token_id
        payload = {"token_id": str(token_id)}
        
        try:
            async with session.post(url, json=payload, timeout=30) as response:
                if response.status != 200:
                    print(f"API request failed with status: {response.status}")
                    return None
                
                data = await response.json()
                return data
                
        except asyncio.TimeoutError:
            print("API request timed out")
            return None
        except aiohttp.ClientError as e:
            print(f"Error making API request: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            return None
    
    def save_data(contract_addr: str, token_id_str: str, api_response_data: Dict):
        json_path = get_json_path(contract_addr, token_id_str)
        
        # Wrap the entire response under "data"
        wrapped_data = api_response_data.get('data', {})
        
        # Store JSON
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(wrapped_data, f, indent=2, ensure_ascii=False)
        
        # Extract transfers count from the nested data structure
        transfers = api_response_data.get('data', {}).get('transfers', [])
        print(f"Saved {len(transfers)} transfers to {json_path}")
    
    # Main processing logic
    print(f"\n{'='*80}")
    print(f"Processing NFT: {contract_address} - Token ID: {token_id}")
    print(f"{'='*80}")
    
    # Build the URL
    url = build_url(contract_address)
    
    # Make a single POST request
    async with aiohttp.ClientSession() as session:
        print("Making single POST request...")
        response_data = await fetch_transfers(session, url)
        
        if not response_data:
            print("No data received or error occurred")
            return []
        
        # Save the entire response data
        save_data(contract_address, token_id, response_data)
        
        # Extract and return the transfers from the response
        transfers = response_data.get('data', {}).get('transfers', [])
        print(f"Retrieved {len(transfers)} transfers")
        return transfers