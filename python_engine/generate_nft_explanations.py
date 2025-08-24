from groq import AsyncGroq
from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API")


async def analyze_nft_transfers(results: str):
    client = AsyncGroq(api_key=GROQ_API_KEY)

    prompt = f"""Conduct a rigorous, technical ownership and movement risk assessment of the following NFT lifetime analysis:

{results}

## CONTEXT (definitions of metrics):
- **Total Transfers**: Cumulative number of ownership changes across the NFT’s lifespan.
- **Unique Owners**: Count of distinct addresses holding the NFT at least once.
- **Movement Chain**: Sequential path of NFT ownership, from minting to the latest holder.
- **Ownership Duration Statistics**:
  - Mean: Average time per owner.
  - Median: Typical holding time.
  - Shortest/Longest: Extremes of retention, reflecting flipping vs. long-term holding.
  - Standard deviation: Variability of holding behavior.
- **Rapid Transfers**: Consecutive transfers within negligible time intervals (bot-like or wash-like activity).
- **Suspicion Level**: Severity classification of detected anomalies (LOW, MEDIUM, HIGH).
- **Media Metadata**: Reference to downloaded visual assets, included for completeness but not part of the technical movement analysis.

## TASK:
Produce a concise, **technical summary** that:
1. Interprets the meaning of the observed ownership and transfer data without providing recommendations.
2. Focuses on quantitative findings and their implications for market behavior, provenance integrity, and potential manipulation.
3. Highlights anomalies such as rapid transfers, zero-duration holdings, or abnormal statistical distributions.
4. Maintains a highly technical and analytical tone.
5. Avoids emojis, casual language, or speculative commentary.
"""

    completion = await client.chat.completions.create(
        model="deepseek-r1-distill-llama-70b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.4,
        max_completion_tokens=4096,
        top_p=0.9,
        stream=False,
        reasoning_format="hidden"
    )

    return completion.choices[0].message.content
