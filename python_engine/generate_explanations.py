from groq import AsyncGroq
from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API")


async def analyze_token_transfers(results: str):
    client = AsyncGroq(api_key=GROQ_API_KEY)

    prompt = f"""Analyze this token transfer analysis and provide a comprehensive risk assessment summary:

{results}

## METRIC EXPLANATIONS (for context):
- **Circular trades**: Transactions where funds move through multiple addresses and return to origin (A→B→C→A). This indicates artificial volume creation and wash trading.
- **Rapid back-and-forth**: Immediate reciprocal trading between the same addresses within short timeframes. Suggests price manipulation rather than organic trading.
- **Suspicious address pairs**: Addresses that trade excessively with each other. Reveals coordinated behavior and potential bot networks.
- **Time anomalies**: Transactions occurring at non-human intervals or patterns. Indicates automated trading systems.
- **Network nodes**: Total unique addresses involved in trading.
- **Network edges**: Total trading relationships between addresses. 
- **Communities**: Distinct groups of addresses trading primarily among themselves. Multiple communities suggest organized manipulation groups.
- **Risk score 100/100**: Maximum risk level indicating systematic market manipulation.

Based on these explanations, provide a clear, professional summary that:
1. Explains the findings in simple, accessible language
2. Assesses the overall safety level of the token (High/Medium/Low risk)
3. Highlights the most concerning patterns with specific numbers
4. Gives practical recommendations for users
5. Uses appropriate emojis for visual clarity
6. Structures the response with clear sections
"""

    completion = await client.chat.completions.create(
        model="deepseek-r1-distill-llama-70b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.6,
        max_completion_tokens=1024,
        top_p=0.95,
        stream=False,
        reasoning_format="hidden"
    )

    return completion.choices[0].message.content
