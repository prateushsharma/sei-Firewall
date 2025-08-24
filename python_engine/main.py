from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from data_fetch import fetch_token_transfers
from data_analysis import analyze_token_pooling
from generate_explanations import analyze_token_transfers
from fetch_results import read_pooling_analysis, read_images_as_base64
from nft_fetch import fetch_nft_transfers
from nft_data_analysis import analyze_nft_movement
from temp_data_fetch import fetch_temp_token_transfers

app = FastAPI()

# Define input schema
class TokenRequest(BaseModel):
    token_address: str

@app.post("/fetch-transfers")
async def fetch_transfers_endpoint(request: TokenRequest):
    transfers = await fetch_temp_token_transfers(request.token_address)
    await analyze_token_pooling(request.token_address)
    results = await read_pooling_analysis(request.token_address)
    explanation = await analyze_token_transfers(results)
    image_data = await read_images_as_base64(request.token_address)
    return {
        "token_address": request.token_address,
        "total_transfers": len(transfers),
        "results": explanation,
        "token_data": transfers,
        "images": image_data
    }

class NFTRequest(BaseModel):
    token_address: str
    token_id: int

@app.post("/fetch-nft-transfers")
async def fetch_nft_transfers_endpoint(request: NFTRequest):
    transfers = await fetch_nft_transfers(
        contract_address=request.token_address,
        token_id=str(request.token_id)  # function expects str
    )
    results = await analyze_nft_movement(
    contract_address=request.token_address,
    token_id=str(request.token_id)  # function expects str
    )
    return {"token_data": transfers}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)