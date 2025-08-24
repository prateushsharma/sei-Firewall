import aiofiles

async def fetch_nft_analysis(token_address: str, token_id: str) -> str:
    """
    Asynchronously fetch the content of the NFT lifetime analysis file.

    Args:
        token_address (str): The address of the token.
        token_id (str): The ID of the token.

    Returns:
        str: The content of the txt file.
    """
    file_path = f"nft_data_analysis/{token_address}_{token_id}/nft_lifetime_analysis.txt"

    async with aiofiles.open(file_path, mode="r", encoding="utf-8") as f:
        content = await f.read()
    return content

import aiofiles
import asyncio
import base64
import os
from typing import Dict, List


async def encode_file_to_base64(file_path: str) -> str:
    """
    Asynchronously read a file and return its base64-encoded string.
    """
    async with aiofiles.open(file_path, mode="rb") as f:
        data = await f.read()
    return base64.b64encode(data).decode("utf-8")


async def fetch_nft_images(token_address: str, token_id: str) -> Dict[str, any]:
    """
    Asynchronously fetch and encode NFT-related images into base64.

    Args:
        token_address (str): Token address
        token_id (str): Token ID

    Returns:
        Dict[str, any]: A dictionary containing base64 strings of images
    """
    base_dir = f"nft_data_analysis/{token_address}_{token_id}/images"

    result = {}

    # Fixed image files
    fixed_files = {
        "ownership_timeline": "ownership_timeline.png",
        "time_differences": "time_differences.png",
        "transfer_network": "transfer_network.png",
    }

    for key, filename in fixed_files.items():
        file_path = os.path.join(base_dir, filename)
        if os.path.exists(file_path):
            result[key] = await encode_file_to_base64(file_path)
        else:
            result[key] = None  # gracefully handle missing file

    # NFT images directory
    nft_images_dir = os.path.join(base_dir, "nft_image")
    nft_images: List[str] = []

    if os.path.exists(nft_images_dir):
        for filename in os.listdir(nft_images_dir):
            file_path = os.path.join(nft_images_dir, filename)
            if os.path.isfile(file_path):
                nft_images.append(await encode_file_to_base64(file_path))

    result["nft_image"] = nft_images

    return result