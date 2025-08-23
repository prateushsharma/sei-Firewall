// simple UI helpers for Telegram rendering

function fmtHash(h, len = 10) {
  if (!h) return '—';
  const s = String(h);
  if (s.length <= len * 2 + 3) return s;
  return `${s.slice(0, len)}…${s.slice(-len)}`;
}

function fmtAddr(addr) {
  return addr?.address_hash ? fmtHash(addr.address_hash, 6) : '—';
}

function fmtNum(x, digits = 4) {
  if (x == null) return '—';
  const n = Number(x);
  if (Number.isNaN(n)) return String(x);
  return Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(n);
}

function fmtINDate(iso, withTime = true) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: 'short', day: '2-digit',
      ...(withTime ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : {})
    });
  } catch {
    return iso;
  }
}

function summarizeTransfers(items = []) {
  const total = items.length;
  let totalAmount = 0;
  const bySymbol = new Map();
  const uniqueSenders = new Set();
  const uniqueReceivers = new Set();

  for (const it of items) {
    const sym = it?.token_info?.token_symbol || 'UNKNOWN';
    const amt = Number(it?.amount || 0);
    totalAmount += amt;
    bySymbol.set(sym, (bySymbol.get(sym) || 0) + amt);
    if (it?.from?.address_hash) uniqueSenders.add(it.from.address_hash.toLowerCase());
    if (it?.to?.address_hash) uniqueReceivers.add(it.to.address_hash.toLowerCase());
  }

  // top 3 symbols by volume
  const top = [...bySymbol.entries()]
    .sort((a,b) => b[1]-a[1])
    .slice(0,3)
    .map(([sym, vol]) => `${sym}: ${fmtNum(vol)}`);

  return {
    total,
    totalAmount,
    topSymbolsLine: top.length ? top.join(' | ') : '—',
    uniqueSenders: uniqueSenders.size,
    uniqueReceivers: uniqueReceivers.size,
  };
}

function renderSummaryCard(tokenAddress, items = []) {
  const s = summarizeTransfers(items);
  return [
    `*Token:* \`${tokenAddress}\``,
    `*Total transfers:* ${s.total}`,
    `*Unique senders:* ${s.uniqueSenders}   |   *Unique receivers:* ${s.uniqueReceivers}`,
    `*Top symbols by volume:* ${s.topSymbolsLine}`,
    `*Aggregate amount (all symbols):* ${fmtNum(s.totalAmount)}`,
  ].join('\n');
}

function renderTransfersPage(items = [], page = 0, pageSize = 5) {
  const start = page * pageSize;
  const slice = items.slice(start, start + pageSize);
  if (!slice.length) return '_No items on this page._';

  const lines = slice.map((it, i) => {
    const sym = it?.token_info?.token_symbol || 'UNKNOWN';
    const name = it?.token_info?.token_name || '';
    const amt = fmtNum(it?.amount);
    const from = fmtAddr(it?.from);
    const to = fmtAddr(it?.to);
    const time = fmtINDate(it?.timestamp);
    const tx = fmtHash(it?.tx_hash, 8);
    return [
      `*#${start + i + 1}*  ${sym}${name && sym !== name ? ` (${name})` : ''}`,
      `Amount: *${amt}*`,
      `From: \`${from}\`  →  To: \`${to}\``,
      `Time (IST): ${time}`,
      `Tx: \`${tx}\``,
    ].join('\n');
  });

  return lines.join('\n\n');
}

function toCSV(items = []) {
  const headers = [
    'timestamp','token_symbol','amount','from','to','tx_hash','block_height','token_contract'
  ];
  const rows = items.map(it => [
    it?.timestamp ?? '',
    it?.token_info?.token_symbol ?? '',
    it?.amount ?? '',
    it?.from?.address_hash ?? '',
    it?.to?.address_hash ?? '',
    it?.tx_hash ?? '',
    it?.block_height ?? '',
    it?.token_info?.token_contract ?? '',
  ]);
  const escape = (v) => `"${String(v).replaceAll('"','""')}"`;
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

module.exports = {
  renderSummaryCard,
  renderTransfersPage,
  toCSV,
};
