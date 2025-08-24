import aiohttp
import asyncio
import json
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

async def fetch_nft_transfers(contract_address: str, 
                             token_id: str,
                             chain_id: str = "pacific-1",
                             max_entries: int = 500) -> List[Dict]:
    """Async function to fetch and process NFT transfers for a specific token"""
    
    # Initialize
    api_key = os.getenv('SEITRACE_API')
    if not api_key:
        raise ValueError("SEITRACE_API environment variable not set")
    
    # Create nft_transfer_data directory if it doesn't exist
    data_dir = Path("nft_transfer_data")
    data_dir.mkdir(exist_ok=True)
    
    def get_json_path(contract_addr: str, token_id_str: str) -> Path:
        return data_dir / f"nft_transfers_{contract_addr}_{token_id_str}.json"
    
    def build_url(chain_id: str, contract_address: str, token_id: str, 
                 from_date: Optional[str] = None, to_date: Optional[str] = None, 
                 limit: int = 50, offset: int = 0) -> str:
        base_url = "https://seitrace.com/insights/api/v2/token/erc721/transfers"
        params = {
            "limit": limit,
            "chain_id": chain_id,
            "contract_address": contract_address,
            "token_id": token_id
        }
        
        if from_date:
            params["from_date"] = from_date
        if to_date:
            params["to_date"] = to_date
        if offset > 0:
            params["offset"] = offset
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{base_url}?{query_string}"
    
    async def fetch_transfers(session: aiohttp.ClientSession, url: str) -> Optional[Dict]:
        headers = {
            'X-Api-Key': api_key,
            'Accept': 'application/json'
        }
        
        try:
            async with session.get(url, headers=headers, timeout=30) as response:
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
    
    def load_existing_transfers(contract_addr: str, token_id_str: str) -> Optional[Dict]:
        json_path = get_json_path(contract_addr, token_id_str)
        
        if not json_path.exists():
            print(f"No JSON file found for NFT: {contract_addr} token {token_id_str}")
            return None
        
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                print(f"Found existing JSON file for NFT: {contract_addr} token {token_id_str}")
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading existing JSON for {contract_addr} token {token_id_str}: {e}")
            return None
    
    def save_transfers(contract_addr: str, token_id_str: str, chain_id: str, transfers: List[Dict]):
        json_path = get_json_path(contract_addr, token_id_str)
        
        data = {
            "contract_address": contract_addr,
            "token_id": token_id_str,
            "chain_id": chain_id,
            "total_transfers": len(transfers),
            "transfers": transfers
        }
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"Saved {len(transfers)} transfers to {json_path}")
    
    # Main processing logic
    print(f"\n{'='*80}")
    print(f"Processing NFT: {contract_address} - Token ID: {token_id}")
    print(f"{'='*80}")
    
    # Load existing transfers if available
    existing_data = load_existing_transfers(contract_address, token_id)
    existing_transfers = existing_data.get('transfers', []) if existing_data else []
    existing_hashes = {tx['tx_hash'] for tx in existing_transfers if 'tx_hash' in tx}
    
    print(f"Existing transfers in JSON: {len(existing_transfers)}")
    
    # Case 1: No existing JSON file - fetch all new transfers
    if existing_data is None:
        print("Case 1: No existing JSON file found, fetching all new transfers")
        all_transfers = []
        seen_hashes = set()
        current_offset = 0
        to_date = None  # Start with no date range
        
        async with aiohttp.ClientSession() as session:
            while len(all_transfers) < max_entries:
                print(f"Fetching batch with offset {current_offset}...")
                
                url = build_url(
                    chain_id=chain_id,
                    contract_address=contract_address,
                    token_id=token_id,
                    to_date=to_date,  # Use dynamic to_date for pagination
                    limit=50,
                    offset=current_offset
                )
                
                data = await fetch_transfers(session, url)
                
                if not data:
                    print("No data received or error occurred")
                    break
                
                if 'items' not in data:
                    print(f"Unexpected response format: {list(data.keys()) if data else 'No keys'}")
                    break
                
                items = data.get('items', [])
                
                if not items:
                    print("Empty items list received")
                    break
                
                # Filter out duplicates and add new transfers
                new_items = []
                for item in items:
                    tx_hash = item.get('tx_hash')
                    if tx_hash and tx_hash not in seen_hashes:
                        seen_hashes.add(tx_hash)
                        new_items.append(item)
                
                all_transfers.extend(new_items)
                
                print(f"Added {len(new_items)} new transfers. Total: {len(all_transfers)}")
                
                if len(all_transfers) >= max_entries:
                    print(f"Reached maximum entries limit ({max_entries})")
                    break
                
                # Set to_date for next batch to the timestamp of the last item
                if items and 'timestamp' in items[-1]:
                    to_date = items[-1]['timestamp']
                    print(f"Setting next batch to_date to: {to_date}")
                
                # Check if there's more data available via pagination
                if 'next_page_params' in data and data['next_page_params']:
                    next_params = data['next_page_params']
                    current_offset = next_params.get('offset', current_offset + 50)
                    print(f"Next offset: {current_offset}")
                else:
                    print("No more pages available")
                    break
                
                await asyncio.sleep(1)
        
        if len(all_transfers) > max_entries:
            all_transfers = all_transfers[:max_entries]
        
        save_transfers(contract_address, token_id, chain_id, all_transfers)
        return all_transfers
    
    # Case 2/3: Existing JSON file found - fetch incrementally and check for duplicates
    print("Existing JSON file found, checking for new transfers...")
    
    new_transfers = []
    seen_hashes = set()
    current_offset = 0
    to_date = None  # Start with most recent transfers
    common_found = False
    
    async with aiohttp.ClientSession() as session:
        while len(new_transfers) < max_entries and not common_found:
            print(f"Fetching batch with offset {current_offset}...")
            
            url = build_url(
                chain_id=chain_id,
                contract_address=contract_address,
                token_id=token_id,
                to_date=to_date,  # Use dynamic to_date for pagination
                limit=50,
                offset=current_offset
            )
            
            data = await fetch_transfers(session, url)
            
            if not data:
                print("No data received or error occurred")
                break
            
            if 'items' not in data:
                print(f"Unexpected response format: {list(data.keys()) if data else 'No keys'}")
                break
            
            items = data.get('items', [])
            
            if not items:
                print("Empty items list received")
                break
            
            # Check each item in this batch for duplicates with existing JSON
            batch_new_items = []
            batch_matches = 0
            
            for item in items:
                tx_hash = item.get('tx_hash')
                if not tx_hash:
                    continue
                    
                if tx_hash in existing_hashes:
                    print(f"Found matching transaction in JSON: {tx_hash}")
                    batch_matches += 1
                    common_found = True
                    # Don't break here, count all matches in this batch
                
                if tx_hash not in seen_hashes and tx_hash not in existing_hashes:
                    seen_hashes.add(tx_hash)
                    batch_new_items.append(item)
            
            print(f"Batch analysis: {len(items)} total, {batch_matches} matches with JSON, {len(batch_new_items)} new unique transfers")
            
            new_transfers.extend(batch_new_items)
            
            print(f"Total new transfers so far: {len(new_transfers)}")
            
            # If common found in this batch, break immediately after processing the batch
            if common_found:
                print("Common transaction found in this batch, stopping further retrieval")
                break
            
            if len(new_transfers) >= max_entries:
                print(f"Reached maximum new entries limit ({max_entries})")
                break
            
            # Set to_date for next batch to the timestamp of the last item
            if items and 'timestamp' in items[-1]:
                to_date = items[-1]['timestamp']
                print(f"Setting next batch to_date to: {to_date}")
            
            # Check if there's more data available via pagination
            if 'next_page_params' in data and data['next_page_params']:
                next_params = data['next_page_params']
                current_offset = next_params.get('offset', current_offset + 50)
                print(f"Next offset: {current_offset}")
            else:
                print("No more pages available")
                break
            
            await asyncio.sleep(1)
    
    print(f"Final results: {len(new_transfers)} new transfers found, common transaction found: {common_found}")
    
    # Case 2: No common entries found - overwrite completely
    if not common_found and not new_transfers:
        print("Case 2: No common entries and no new transfers found, keeping existing data")
        return existing_transfers
    elif not common_found:
        print("Case 2: No common entries found, overwriting existing data with new transfers")
        save_transfers(contract_address, token_id, chain_id, new_transfers)
        return new_transfers
    
    # Case 3: Common entries found - append new unique transfers to existing ones
    print("Case 3: Common entries found, appending new unique transfers to existing data")
    
    if new_transfers:
        # Combine existing transfers with new unique transfers (newest first)
        combined_transfers = new_transfers + existing_transfers
        
        # Sort by timestamp if available (newest first)
        if combined_transfers and 'timestamp' in combined_transfers[0]:
            combined_transfers.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        save_transfers(contract_address, token_id, chain_id, combined_transfers)
        print(f"Combined total transfers: {len(combined_transfers)}")
        return combined_transfers
    else:
        print("No new unique transfers to add, returning existing data")
        return existing_transfers