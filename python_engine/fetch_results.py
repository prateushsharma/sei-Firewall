import aiofiles
import base64
import os

async def read_pooling_analysis(tkn: str) -> str:
    file_path = f"data_analysis/analysis_{tkn}/pooling_analysis.txt"
    async with aiofiles.open(file_path, mode="r", encoding="utf-8") as f:
        content = await f.read()
    return content

async def read_images_as_base64(tkn: str) -> dict:
    base_dir = f"data_analysis/analysis_{tkn}/images"
    image_files = {
        "amount_distribution": "amount_distribution.png",
        "network_graph": "network_graph.png",
        "volume_time": "volume_over_time.png",
    }

    result = {}

    for key, filename in image_files.items():
        file_path = os.path.join(base_dir, filename)
        try:
            async with aiofiles.open(file_path, mode="rb") as f:
                content = await f.read()
                encoded_str = base64.b64encode(content).decode("utf-8")
                result[key] = encoded_str
        except FileNotFoundError:
            result[key] = None  # if file is missing

    return result
