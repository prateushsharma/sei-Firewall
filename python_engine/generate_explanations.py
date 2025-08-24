from groq import AsyncGroq
from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API")


async def analyze_token_transfers(results: str):
    client = AsyncGroq(api_key=GROQ_API_KEY)

    prompt = f"""Conduct a rigorous, technical risk assessment of the following token transfer analysis:

{results}

## CONTEXT (definitions of metrics):
- **Circular trades**: Multi-hop transactions returning to the origin (A→B→C→A). Strong indication of wash trading and synthetic volume generation.
- **Rapid back-and-forth**: High-frequency bidirectional trades between identical address pairs, implying manipulative cycles.
- **Suspicious address pairs**: Address dyads with abnormal trade frequency, reflecting non-random coordination or automated behavior.
- **Time anomalies**: Transaction intervals at deterministic, non-human frequencies, consistent with bot-driven execution.
- **Network nodes**: Unique addresses involved in transfer activity.
- **Network edges**: Directed transactional relationships, forming the graph topology.
- **Communities**: Subgraph clusters with high intra-connectivity, indicative of collusive entities.
- **Risk score 100/100**: Absolute indication of systemic manipulation patterns.

## TASK:
Produce a concise, **technical summary** that:
1. Strictly interprets the meaning of the observed data (do not provide recommendations).
2. Focuses on quantitative findings and their implications in network behavior.
3. Maintains a highly technical and analytical tone.
4. Avoids emojis, casual language, or user-facing advice.
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
