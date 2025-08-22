# Token Transfer Analysis API

This API analyzes token transfers for a given token address.

---

## 📡 Endpoint

**URL:** `http://0.0.0.0:8000/fetch-transfers`  
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
  "token_data": "dict/json"      // raw transfer data
}
```

---