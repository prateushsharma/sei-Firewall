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