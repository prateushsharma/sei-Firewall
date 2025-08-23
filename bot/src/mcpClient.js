require('dotenv').config();

// Robust EventSource import that works in CJS/ESM
let EventSourceCtor;
try {
  const mod = require('eventsource');
  EventSourceCtor = mod?.default || mod?.EventSource || mod;
} catch (e) {
  throw new Error('Failed to load "eventsource". Run: npm i eventsource');
}

// Node 18+ has global fetch. For Node <18, uncomment and install node-fetch:
// const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const MCP_BASE = process.env.MCP_URL || 'http://localhost:3001';

let es = null;
let sessionId = null;            // assigned by SSE "session_init"
let messagesUrl = `${MCP_BASE}/messages`; // will append ?sessionId= once we have one
const pending = new Map();       // id -> { resolve, reject, timer }
const DEBUG = !!process.env.DEBUG_MCP;

// ---------------- SSE connection & handler ----------------
function initMCP({ log = true } = {}) {
  if (es) return; // already started
  let retryMs = 1000;

  const connect = () => {
    if (log) console.log(`[MCP] connecting SSE → ${MCP_BASE}/sse`);
    es = new EventSourceCtor(`${MCP_BASE}/sse`, { headers: { Accept: 'text/event-stream' } });

    es.onopen = () => {
      if (log) console.log('[MCP] SSE connected');
      retryMs = 1000;
    };

    es.onmessage = (evt) => {
      const raw = evt?.data;
      if (!raw) return;
      if (DEBUG) console.log('[MCP] SSE data:', raw);
      let data;
      try { data = JSON.parse(raw); } catch { return; }

      // session bootstrap from server: { type: "session_init", sessionId }
      if (data?.type === 'session_init' && data?.sessionId) {
        sessionId = data.sessionId;
        messagesUrl = `${MCP_BASE}/messages?sessionId=${encodeURIComponent(sessionId)}`;
        if (log) console.log('[MCP] sessionId =', sessionId, 'messagesUrl =', messagesUrl);
        return;
      }

      // Some servers may send an 'endpoint' announcement (optional)
      if (data?.type === 'endpoint' && data?.messages_url) {
        messagesUrl = data.messages_url.startsWith('http')
          ? data.messages_url
          : `${MCP_BASE}${data.messages_url}${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`;
        if (log) console.log('[MCP] messages endpoint set to', messagesUrl);
        return;
      }

      // JSON-RPC responses should look like: { jsonrpc:"2.0", id, result } or { ..., error }
      const msg = extractJsonRpc(data);
      if (msg && msg.id != null) {
        const pendingEntry = pending.get(String(msg.id));
        if (pendingEntry) {
          clearTimeout(pendingEntry.timer);
          pending.delete(String(msg.id));
          if (msg.error) {
            pendingEntry.reject(new Error(msg.error.message || 'MCP tool error'));
          } else {
            pendingEntry.resolve(msg.result);
          }
        }
      }
    };

    es.onerror = () => {
      if (log) console.warn('[MCP] SSE error; reconnecting in', retryMs, 'ms');
      try { es.close(); } catch {}
      es = null;
      setTimeout(() => {
        retryMs = Math.min(retryMs * 2, 15000);
        connect();
      }, retryMs);
    };
  };

  connect();
}

// Try to normalize various event shapes into a JSON-RPC payload
function extractJsonRpc(obj) {
  if (!obj || typeof obj !== 'object') return null;

  // direct JSON-RPC
  if (obj.jsonrpc === '2.0' && ('result' in obj || 'error' in obj)) {
    return obj;
  }
  // wrapped
  if (obj.data && obj.data.jsonrpc === '2.0') {
    return obj.data;
  }
  // some servers use { type:"message", data:{...} }
  if (obj.type === 'message' && obj.data && obj.data.jsonrpc === '2.0') {
    return obj.data;
  }
  return null;
}

// ---------------- JSON-RPC call helpers ----------------
async function callTool(toolName, args, { timeoutMs = 15000 } = {}) {
  const id = String(Date.now());
  const body = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args || {},
    },
  };

  // Promise that resolves when SSE brings back the response with same id
  const responsePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`MCP call timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
  });

  // POST the request; server may return empty body; real result arrives via SSE
  const res = await fetch(messagesUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });

  // Some servers return 200 with no JSON; we only care that it accepted
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`MCP ${res.status} ${res.statusText}${txt ? ' - ' + txt : ''}`);
  }

  // Wait for the SSE response matching our id
  return responsePromise;
}
async function listResources({ timeoutMs = 15000 } = {}) {
  return callJsonRpcOverSSE("resources/list", {}, { timeoutMs });
}

async function readResource(uri, { timeoutMs = 15000 } = {}) {
  if (!uri) throw new Error("uri required");
  return callJsonRpcOverSSE("resources/read", { uri }, { timeoutMs });
}

// generic JSON-RPC over SSE (same pattern your callTool uses)
async function callJsonRpcOverSSE(method, params, { timeoutMs = 15000 } = {}) {
  const id = String(Date.now());
  const body = { jsonrpc: "2.0", id, method, params };

  const responsePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`MCP call timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
  });

  const res = await fetch(messagesUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`MCP ${res.status} ${res.statusText}${txt ? " - " + txt : ""}`);
  }

  return responsePromise;
}

// export them:
module.exports = { initMCP, callTool, readResource, listResources };

