# Token Transfer Analysis API

This API analyzes token transfers for a given token address.

---

## 📡 Endpoint

**URL:** `http://localhost:8000/fetch-transfers`  
**Method:** `POST`

## 📝 Input (JSON)

```json
{
  "token_address": "0x123456789abcdef"
}
```

## 📤 Output (JSON)

```json
{
  "token_address": "str",        // the token address
  "total_transfers": "int",      // total number of transfers fetched
  "results": "str",              // human-readable explanation
  "token_data": "dict/json",     // raw transfer data
  "images": {
    "amount_distribution": "str (BASE64 ENC.)",
    "network_graph": "str (BASE64 ENC.)",
    "volume_time": "str (BASE64 ENC.)"
  }
}
```

---

# 📌 `/fetch-nft-transfers` Endpoint

## Method

`POST`

## Description

This endpoint performs a **lifetime movement analysis** of an NFT. It:

* Fetches all transfers for the given NFT.
* Runs ownership movement and lifetime analysis.
* Reads the pre-generated NFT lifetime analysis text.
* Encodes related images into Base64.
* Generates a technical explanation of ownership patterns.

---

## 🔹 Input JSON

```json
{
  "token_address": "0x9a1e3d2a010dbe576f9cccd57b2fc0df96c8e44d",
  "token_id": 1122
}
```

**Fields:**

* `token_address` (string) → The contract address of the NFT.
* `token_id` (int or string) → The token ID of the NFT.

---

## 🔹 Output JSON

```json
{
  "nft_address": "0x9a1e3d2a010dbe576f9cccd57b2fc0df96c8e44d",
  "nft_id": 1122,
  "total_transfers": 4,
  "results": "Concise technical explanation of ownership and transfer patterns...",
  "nft_data": [
    {
      "from": "0x000000...000000",
      "to": "0x479801...6387e2",
      "timestamp": "2024-09-13T14:31:05Z",
      "tx_hash": "0x09300ca2...ac1abc09"
    },
    {
      "from": "0x479801...6387e2",
      "to": "0x2ca6d6...bb9e13",
      "timestamp": "2024-09-14T22:06:43Z",
      "tx_hash": "0xf2c824bf...2d2e2917"
    }
    // ... remaining transfers
  ],
  "images": {
    "ownership_timeline": "<base64_string>",
    "time_differences": "<base64_string>",
    "transfer_network": "<base64_string>",
    "nft_image": [
      "<base64_string_of_image_1>",
      "<base64_string_of_image_2>"
    ]
  }
}
```

**Fields explained:**

* `nft_address` → The contract address of the NFT.
* `nft_id` → The ID of the NFT.
* `total_transfers` → Total number of ownership transfers detected.
* `results` → Technical AI-generated explanation of ownership patterns & anomalies.
* `nft_data` → List of transfer records (`from`, `to`, `timestamp`, `tx_hash`).
* `images`:

  * `ownership_timeline` → Base64 encoded ownership timeline plot.
  * `time_differences` → Base64 encoded time difference visualization.
  * `transfer_network` → Base64 encoded transfer network graph.
  * `nft_image` → List of Base64 encoded NFT images.

---