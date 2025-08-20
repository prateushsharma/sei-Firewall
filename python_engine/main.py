import subprocess
import json
import time
from typing import List, Dict, Any, Optional
import os

class CurlTokenTransferFetcher:
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    def run_curl_command(self, url: str) -> Optional[Dict]:
        """Execute curl command and return JSON response"""
        curl_command = [
            'curl',
            '-s',  # Silent mode
            '-H', f'X-Api-Key: {self.api_key}',
            '-H', 'Accept: application/json',
            url
        ]
        
        try:
            print(f"Executing: curl -H 'X-Api-Key: ...' '{url}'")
            result = subprocess.run(curl_command, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                print(f"Curl failed with return code: {result.returncode}")
                print(f"Error: {result.stderr}")
                return None
            
            if not result.stdout.strip():
                print("Empty response from curl")
                return None
            
            try:
                data = json.loads(result.stdout)
                return data
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON response: {e}")
                print(f"Raw response: {result.stdout[:200]}...")
                return None
                
        except subprocess.TimeoutExpired:
            print("Curl command timed out")
            return None
        except Exception as e:
            print(f"Error running curl: {e}")
            return None
    
    def build_url(self, chain_id: str, contract_address: str, from_date: str, 
                 to_date: str, limit: int = 50, offset: int = 0) -> str:
        """Build the API URL with parameters"""
        base_url = "https://seitrace.com/insights/api/v2/token/erc20/transfers"
        params = {
            "limit": limit,
            "chain_id": chain_id,
            "contract_address": contract_address,
            "from_date": from_date,
            "to_date": to_date
        }
        
        if offset > 0:
            params["offset"] = offset
        
        # Build query string
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{base_url}?{query_string}"
    
    def fetch_transfers(self, chain_id: str, contract_address: str, 
                       from_date: str, to_date: str, limit: int = 50, 
                       offset: int = 0) -> Optional[Dict]:
        """Fetch transfers using curl"""
        url = self.build_url(chain_id, contract_address, from_date, to_date, limit, offset)
        return self.run_curl_command(url)
    
    def get_all_transfers_for_token(self, chain_id: str, contract_address: str, 
                                  max_entries: int = 1000) -> List[Dict]:
        """Get all transfers for a token up to max_entries using curl"""
        all_transfers = []
        seen_hashes = set()
        current_offset = 0
        
        # Use the dates from your working example
        start_date = "2025-07-20"
        end_date = "2025-08-20"
        
        print(f"Fetching transfers for {contract_address} from {start_date} to {end_date}...")
        
        while len(all_transfers) < max_entries:
            print(f"Fetching batch with offset {current_offset}...")
            
            data = self.fetch_transfers(
                chain_id=chain_id,
                contract_address=contract_address,
                from_date=start_date,
                to_date=end_date,
                limit=50,
                offset=current_offset
            )
            
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
            
            # Check if we've reached the limit
            if len(all_transfers) >= max_entries:
                print(f"Reached maximum entries limit ({max_entries})")
                break
            
            # Check if there's more data available via pagination
            if 'next_page_params' in data and data['next_page_params']:
                next_params = data['next_page_params']
                current_offset = next_params.get('offset', current_offset + 50)
                print(f"Next offset: {current_offset}")
                
                # Update date range if provided in next_page_params
                if 'from_date' in next_params:
                    start_date = next_params['from_date']
                if 'to_date' in next_params:
                    end_date = next_params['to_date']
            else:
                print("No more pages available")
                break
            
            # Add a small delay to be respectful to the API
            time.sleep(1)
        
        # Trim to max_entries if we exceeded
        if len(all_transfers) > max_entries:
            all_transfers = all_transfers[:max_entries]
        
        return all_transfers
    
    def process_token_addresses(self, token_addresses: List[str], 
                              chain_id: str = "pacific-1",
                              max_entries_per_token: int = 1000):
        """Process multiple token addresses and save results to JSON files"""
        results = {}
        
        for token_address in token_addresses:
            print(f"\n{'='*60}")
            print(f"Processing token: {token_address}")
            print(f"{'='*60}")
            
            transfers = self.get_all_transfers_for_token(
                chain_id=chain_id,
                contract_address=token_address,
                max_entries=max_entries_per_token
            )
            
            results[token_address] = transfers
            
            # Save to JSON file
            filename = f"token_transfers_{token_address}.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump({
                    "token_address": token_address,
                    "chain_id": chain_id,
                    "total_transfers": len(transfers),
                    "transfers": transfers
                }, f, indent=2, ensure_ascii=False)
            
            print(f"Saved {len(transfers)} transfers to {filename}")
        
        return results

def test_curl_connection():
    """Test if curl is available and working"""
    try:
        result = subprocess.run(['curl', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ curl is available")
            print(f"curl version: {result.stdout.split()[1]}")
            return True
        else:
            print("✗ curl is not available or not working")
            return False
    except Exception as e:
        print(f"✗ Error checking curl: {e}")
        return False

def main():
    # Test if curl is available
    if not test_curl_connection():
        print("Please install curl or make sure it's in your PATH")
        return
    
    # Initialize with your API key
    api_key = "ea6a4d96-161e-4015-8657-18e4eb9baea6"
    fetcher = CurlTokenTransferFetcher(api_key)
    
    # Test the connection first
    print("\nTesting API connection with curl...")
    test_data = fetcher.fetch_transfers(
        chain_id="pacific-1",
        contract_address="0x95597EB8D227a7c4B4f5E807a815C5178eE6dBE1",
        from_date="2025-07-20",
        to_date="2025-08-20",
        limit=5
    )
    
    if test_data and 'items' in test_data:
        print("✓ API connection successful!")
        print(f"Received {len(test_data['items'])} test items")
    else:
        print("✗ API connection failed")
        return
    
    # Define token addresses to process
    token_addresses = [
        "0x95597EB8D227a7c4B4f5E807a815C5178eE6dBE1"  # MILLI token
        # Add more token addresses here as needed
    ]
    
    # Process all token addresses
    results = fetcher.process_token_addresses(
        token_addresses=token_addresses,
        chain_id="pacific-1",
        max_entries_per_token=1000
    )
    
    print(f"\nProcessing complete!")
    for token_address, transfers in results.items():
        print(f"Token {token_address}: {len(transfers)} transfers")

if __name__ == "__main__":
    main()