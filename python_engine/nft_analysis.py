import aiofiles
import aiohttp
import asyncio
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

async def analyze_nft_lifetime(token_address: str, token_id: str):
    """
    Analyze NFT lifetime movement and download images asynchronously.
    
    Args:
        token_address: The NFT contract address
        token_id: The NFT token ID
    """
    # Create base directory path
    base_dir = Path(f"nft_data_analysis/{token_address}_{token_id}")
    image_dir = base_dir / "nft_image"
    
    # Ensure directories exist
    image_dir.mkdir(parents=True, exist_ok=True)
    
    # File paths
    behavior_file = base_dir / "behavior_analysis.json"
    movement_file = base_dir / "nft_movement_chain.json"
    output_file = base_dir / "nft_lifetime_analysis.txt"
    
    try:
        # Read both JSON files asynchronously
        async with aiofiles.open(behavior_file, 'r', encoding='utf-8') as f:
            behavior_data = json.loads(await f.read())
        
        async with aiofiles.open(movement_file, 'r', encoding='utf-8') as f:
            movement_data = json.loads(await f.read())
        
        # Extract relevant data
        nft_metadata = behavior_data.get('nft_metadata', {})
        parsed_metadata = nft_metadata.get('parsed_metadata', {})
        behavior_analysis = behavior_data.get('behavior_analysis', {})
        movement_chain = movement_data.get('movement_chain', [])
        
        # Download images asynchronously
        image_urls = await extract_and_download_images(parsed_metadata, image_dir, token_id)
        
        # Generate analysis text
        analysis_text = generate_analysis_text(
            token_address, 
            token_id, 
            parsed_metadata, 
            behavior_analysis, 
            movement_chain,
            image_urls
        )
        
        # Write analysis to file
        async with aiofiles.open(output_file, 'w', encoding='utf-8') as f:
            await f.write(analysis_text)
        
        print(f"Analysis completed successfully for {token_address}_{token_id}")
        print(f"Output file: {output_file}")
        print(f"Images downloaded to: {image_dir}")
        
    except FileNotFoundError as e:
        print(f"Error: Required files not found - {e}")
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format - {e}")
    except Exception as e:
        print(f"Error during analysis: {e}")

async def extract_and_download_images(parsed_metadata: Dict, image_dir: Path, token_id: str) -> List[str]:
    """
    Extract image URLs from metadata and download them asynchronously.
    
    Args:
        parsed_metadata: The parsed metadata dictionary
        image_dir: Directory to save images
        token_id: Token ID for naming files
    
    Returns:
        List of downloaded image file paths
    """
    image_urls = []
    downloaded_files = []
    
    # Extract main image
    main_image = parsed_metadata.get('image')
    if main_image:
        image_urls.append(main_image)
    
    # Extract images from properties
    properties = parsed_metadata.get('properties', {})
    files = properties.get('files', [])
    for file_info in files:
        if file_info.get('type', '').startswith('image/'):
            image_urls.append(file_info.get('uri'))
    
    # Extract animation URL if it's an image
    animation_url = parsed_metadata.get('animation_url')
    if animation_url and any(ext in animation_url.lower() for ext in ['.png', '.jpg', '.jpeg']):
        image_urls.append(animation_url)
    
    # Remove duplicates
    image_urls = list(set(image_urls))
    
    # Download images asynchronously
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i, url in enumerate(image_urls):
            if url:
                file_extension = get_file_extension(url)
                filename = f"{token_id}_{i}{file_extension}"
                filepath = image_dir / filename
                tasks.append(download_image(session, url, filepath))
        
        downloaded_files = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Filter out exceptions and return successful downloads
    return [str(file) for file in downloaded_files if isinstance(file, Path)]

async def download_image(session: aiohttp.ClientSession, url: str, filepath: Path) -> Path:
    """
    Download an image asynchronously.
    
    Args:
        session: aiohttp session
        url: Image URL
        filepath: Path to save the image
    
    Returns:
        Path to downloaded file
    """
    try:
        async with session.get(url) as response:
            if response.status == 200:
                content = await response.read()
                async with aiofiles.open(filepath, 'wb') as f:
                    await f.write(content)
                return filepath
            else:
                print(f"Failed to download {url}: HTTP {response.status}")
                return None
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return None

def get_file_extension(url: str) -> str:
    """
    Extract file extension from URL.
    
    Args:
        url: Image URL
    
    Returns:
        File extension with dot
    """
    # Try to get extension from URL path
    path = url.split('?')[0]  # Remove query parameters
    if '.' in path:
        ext = path.split('.')[-1].lower()
        if ext in ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']:
            return f".{ext}"
    
    # Default to .png if cannot determine
    return ".png"

def generate_analysis_text(
    token_address: str,
    token_id: str,
    parsed_metadata: Dict,
    behavior_analysis: Dict,
    movement_chain: List[Dict],
    image_files: List[str]
) -> str:
    """
    Generate natural language analysis text.
    
    Args:
        token_address: Contract address
        token_id: Token ID
        parsed_metadata: Parsed metadata
        behavior_analysis: Behavior analysis data
        movement_chain: Movement chain data
        image_files: List of downloaded image files
    
    Returns:
        Analysis text
    """
    # Basic NFT information
    nft_name = parsed_metadata.get('name', 'Unknown')
    description = parsed_metadata.get('description', 'No description available')
    attributes = parsed_metadata.get('attributes', [])
    
    # Behavior statistics
    time_stats = behavior_analysis.get('time_statistics', {})
    ownership_patterns = behavior_analysis.get('ownership_patterns', {})
    total_transfers = behavior_analysis.get('total_transfers', 0)
    unique_owners = behavior_analysis.get('unique_owners', 0)
    
    # Generate analysis text
    analysis_lines = [
        "=" * 80,
        f"NFT LIFETIME MOVEMENT ANALYSIS",
        "=" * 80,
        f"\nNFT: {nft_name}",
        f"Contract Address: {token_address}",
        f"Token ID: {token_id}",
        f"Description: {description}",
        "",
        "ATTRIBUTES:",
        "-" * 40
    ]
    
    # Add attributes
    for attr in attributes:
        trait_type = attr.get('trait_type', 'Unknown')
        value = attr.get('value', 'Unknown')
        analysis_lines.append(f"• {trait_type}: {value}")
    
    analysis_lines.extend([
        "",
        "OWNERSHIP HISTORY:",
        "-" * 40,
        f"Total Transfers: {total_transfers}",
        f"Unique Owners: {unique_owners}",
        ""
    ])
    
    # Add movement chain analysis
    if movement_chain:
        analysis_lines.append("MOVEMENT CHAIN (Mint to Current Owner):")
        analysis_lines.append("-" * 40)
        
        for i, movement in enumerate(movement_chain):
            from_addr = movement.get('from', {}).get('address_hash', 'Unknown')
            to_addr = movement.get('to', {}).get('address_hash', 'Unknown')
            timestamp = movement.get('timestamp', 'Unknown')
            tx_hash = movement.get('tx_hash', 'Unknown')
            
            if from_addr == "0x0000000000000000000000000000000000000000":
                action = "MINTED"
            else:
                action = "TRANSFERRED"
            
            analysis_lines.append(
                f"{i+1}. {action} from {from_addr[:8]}...{from_addr[-6:]} "
                f"to {to_addr[:8]}...{to_addr[-6:]} "
                f"on {timestamp.split('T')[0]} "
                f"(TX: {tx_hash[:10]}...{tx_hash[-8:]})"
            )
    
    # Add ownership patterns
    analysis_lines.extend([
        "",
        "OWNERSHIP PATTERNS:",
        "-" * 40
    ])
    
    for owner, pattern in ownership_patterns.items():
        count = pattern.get('ownership_count', 0)
        duration = pattern.get('total_duration_hours', 0)
        first_acquired = pattern.get('first_acquired', 'Unknown')
        analysis_lines.append(
            f"• {owner[:8]}...{owner[-6:]}: "
            f"{count} ownership(s), "
            f"total {duration:.1f} hours, "
            f"first acquired: {first_acquired.split('+')[0]}"
        )
    
    # Add time statistics
    analysis_lines.extend([
        "",
        "TIME STATISTICS:",
        "-" * 40,
        f"Mean ownership duration: {time_stats.get('mean_hours', 0):.1f} hours",
        f"Median ownership duration: {time_stats.get('median_hours', 0):.1f} hours",
        f"Shortest ownership: {time_stats.get('min_hours', 0):.1f} hours",
        f"Longest ownership: {time_stats.get('max_hours', 0):.1f} hours",
        f"Standard deviation: {time_stats.get('std_hours', 0):.1f} hours",
        ""
    ])
    
    # Add anomaly detection
    time_outliers = behavior_analysis.get('time_outliers', [])
    rapid_transfers = behavior_analysis.get('rapid_transfers', [])
    anomalous_addresses = behavior_analysis.get('anomalous_addresses', [])
    
    if time_outliers:
        analysis_lines.extend([
            "TIME OUTLIERS DETECTED:",
            "-" * 40
        ])
        for outlier in time_outliers:
            analysis_lines.append(f"• {outlier}")
    
    if rapid_transfers:
        analysis_lines.extend([
            "",
            "RAPID TRANSFERS DETECTED:",
            "-" * 40
        ])
        for transfer in rapid_transfers:
            analysis_lines.append(f"• {transfer}")
    
    if anomalous_addresses:
        analysis_lines.extend([
            "",
            "ANOMALOUS ADDRESSES DETECTED:",
            "-" * 40
        ])
        for address in anomalous_addresses:
            analysis_lines.append(f"• {address}")
    
    # Add image information
    analysis_lines.extend([
        "",
        "MEDIA FILES:",
        "-" * 40,
        f"Downloaded {len(image_files)} image(s) to nft_image directory:"
    ])
    
    for image_file in image_files:
        analysis_lines.append(f"• {os.path.basename(image_file)}")
    
    analysis_lines.extend([
        "",
        f"Analysis generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "=" * 80
    ])
    
    return "\n".join(analysis_lines)