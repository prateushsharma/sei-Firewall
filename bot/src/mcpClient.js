require('dotenv').config();
const fetchFn = global.fetch || ((...a) => import('node-fetch').then(({default:f}) => f(...a)));

const MESSAGES_URL = `${process.env.MCP_URL || 'http://localhost:3001'}/messages`;

async function callTool(tool_name, args) {
  const body = {
    type: 'call_tool',
    id: String(Date.now()),
    tool_name,
    arguments: args || {},
  };
  const res = await fetchFn(MESSAGES_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MCP ${res.status} ${res.statusText}`);
  return res.json();
}

module.exports = { callTool };
