import aiofiles

async def read_pooling_analysis(tkn: str) -> str:
    file_path = f"data_analysis/analysis_{tkn}/pooling_analysis.txt"
    async with aiofiles.open(file_path, mode="r", encoding="utf-8") as f:
        content = await f.read()
    return content
