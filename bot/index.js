require('dotenv').config();
const { Telegraf } = require('telegraf');
const { fetchTransfers, processApiResponse } = require('./api');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN in .env'); 
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

/* -------------------------
   Tiny UI helpers (inline)
--------------------------*/
function fmtHash(h, len = 10) {
  if (!h) return '—';
  const s = String(h);
  return s.length <= len * 2 + 3 ? s : `${s.slice(0, len)}…${s.slice(-len)}`;
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

function renderSummaryCard(tokenAddress, items = [], totalTransfers = 0) {
  const s = summarizeTransfers(items);
  return [
    `*Token:* \`${tokenAddress}\``,
    `*Total transfers found:* ${totalTransfers}`,
    `*Data shown:* ${s.total} transfers`,
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

/* -------------------------
   Session + keyboard
--------------------------*/
const sessions = new Map(); // key: chatId, val: { token, data, page, images, results }

function makeKeyboard(page, total, pageSize = 5, hasImages = false) {
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const prev = Math.max(0, page - 1);
  const next = Math.min(maxPage, page + 1);

  const baseKeyboard = [
    [
      { text: '📊 Summary', callback_data: 'view:summary' },
      { text: '📄 List', callback_data: 'view:list' },
    ],
    [
      { text: '⬅️ Prev', callback_data: `nav:${prev}` },
      { text: `Page ${page + 1}/${maxPage + 1}`, callback_data: 'noop' },
      { text: 'Next ➡️', callback_data: `nav:${next}` },
    ]
  ];

  // Add images row if available
  if (hasImages) {
    baseKeyboard.push([
      { text: '📈 Charts', callback_data: 'view:charts' },
      { text: '🕸️ Network', callback_data: 'view:network' },
    ]);
  }

  // Add export options
  baseKeyboard.push([
    { text: '⬇️ CSV', callback_data: 'export:csv' },
    { text: '⬇️ JSON', callback_data: 'export:json' },
  ]);

  return { inline_keyboard: baseKeyboard };
}

/* -------------------------
   Basic commands
--------------------------*/
// /start
bot.start((ctx) => {
  const name = ctx.from.first_name || 'there';
  ctx.reply(`hey ${name} 👋\ntry /help`);
});

// /help
bot.help((ctx) => {
  ctx.reply([
    'commands:',
    '/ping — quick check',
    '/echo <text> — I repeat what you say',
    '/id — show chat/user ids',
    '/transfers <token_address> — fetch transfers via API with enhanced charts & UI',
  ].join('\n'));
});

// /ping
bot.command('ping', (ctx) => ctx.reply('pong 🏓'));

// /echo
bot.command('echo', (ctx) => {
  const text = ctx.message.text.replace(/^\/echo(@\w+)?\s*/i, '').trim();
  if (!text) return ctx.reply('usage: /echo your text');
  return ctx.reply(text);
});

// /id
bot.command('id', (ctx) => {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  ctx.reply(`chat_id: ${chatId}\nuser_id: ${userId}`);
});

/* -------------------------
   Enhanced /transfers command 
--------------------------*/
bot.command('transfers', async (ctx) => {
  const arg = ctx.message.text.replace(/^\/transfers(@\w+)?\s*/i, '').trim();
  if (!arg) return ctx.reply('usage: /transfers 0xYourTokenAddress');

  const waitMsg = await ctx.reply('🔍 Fetching transfers and generating charts…');

  try {
    // Fetch data from new API endpoint
    const apiResponse = await fetchTransfers(arg);
    const processedResponse = processApiResponse(apiResponse);

    // Extract data from response
    const tokenAddr = processedResponse.token_address || arg;
    const totalTransfers = processedResponse.total_transfers || 0;
    const results = processedResponse.results || 'Transfer data retrieved successfully.';
    
    // Handle different possible data structures
    const items = Array.isArray(processedResponse.token_data)
      ? processedResponse.token_data
      : (processedResponse.token_data?.items || processedResponse.token_data || []);

    // Store in session with enhanced data
    sessions.set(ctx.chat.id, { 
      token: tokenAddr, 
      data: items, 
      page: 0,
      images: processedResponse.processedImages || {},
      results: results,
      totalTransfers: totalTransfers
    });

    // Send summary with enhanced information
    const summaryText = [
      renderSummaryCard(tokenAddr, items, totalTransfers),
      '',
      `📊 *Analysis Results:*`,
      results
    ].join('\n');

    const hasImages = Object.keys(processedResponse.processedImages || {}).length > 0;

    await ctx.telegram.editMessageText(
      waitMsg.chat.id,
      waitMsg.message_id,
      undefined,
      summaryText,
      { 
        parse_mode: 'Markdown', 
        reply_markup: makeKeyboard(0, items.length, 5, hasImages) 
      }
    );

  } catch (err) {
    await ctx.telegram.editMessageText(
      waitMsg.chat.id,
      waitMsg.message_id,
      undefined,
      `❌ Error: ${err.message || String(err)}`
    );
  }
});

/* -------------------------
   Enhanced inline button handlers
--------------------------*/
bot.on('callback_query', async (ctx) => {
  const chatId = ctx.chat.id;
  const sess = sessions.get(chatId);
  if (!sess) {
    await ctx.answerCbQuery('No session. Run /transfers first.');
    return;
  }

  const data = ctx.callbackQuery.data || '';
  const msg = ctx.callbackQuery.message;

  try {
    if (data === 'noop') {
      await ctx.answerCbQuery();
      return;
    }

    // View handlers
    if (data.startsWith('view:')) {
      const view = data.split(':')[1];
      const hasImages = Object.keys(sess.images || {}).length > 0;

      if (view === 'summary') {
        const summaryText = [
          renderSummaryCard(sess.token, sess.data, sess.totalTransfers),
          '',
          `📊 *Analysis Results:*`,
          sess.results
        ].join('\n');

        await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, summaryText, {
          parse_mode: 'Markdown',
          reply_markup: makeKeyboard(sess.page, sess.data.length, 5, hasImages),
        });
      } 
      else if (view === 'list') {
        const text = renderTransfersPage(sess.data, sess.page);
        await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, text, {
          parse_mode: 'Markdown',
          reply_markup: makeKeyboard(sess.page, sess.data.length, 5, hasImages),
        });
      }
      else if (view === 'charts') {
        // Send chart images
        if (sess.images.amount_distribution) {
          await ctx.replyWithPhoto(
            { source: sess.images.amount_distribution },
            { caption: '💰 Amount Distribution Analysis' }
          );
        }
        if (sess.images.volume_time) {
          await ctx.replyWithPhoto(
            { source: sess.images.volume_time },
            { caption: '📈 Volume Over Time Analysis' }
          );
        }
      }
      else if (view === 'network') {
        // Send network graph
        if (sess.images.network_graph) {
          await ctx.replyWithPhoto(
            { source: sess.images.network_graph },
            { caption: '🕸️ Transfer Network Graph' }
          );
        }
      }
      
      await ctx.answerCbQuery();
      return;
    }

    // Navigation handler
    if (data.startsWith('nav:')) {
      const nextPage = Math.max(0, parseInt(data.split(':')[1], 10) || 0);
      sess.page = nextPage;
      const text = renderTransfersPage(sess.data, sess.page);
      const hasImages = Object.keys(sess.images || {}).length > 0;
      
      await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, text, {
        parse_mode: 'Markdown',
        reply_markup: makeKeyboard(sess.page, sess.data.length, 5, hasImages),
      });
      await ctx.answerCbQuery(`Page ${sess.page + 1}`);
      return;
    }

    // Export handlers
    if (data.startsWith('export:')) {
      const type = data.split(':')[1];
      if (type === 'csv') {
        const csv = toCSV(sess.data);
        await ctx.replyWithDocument({
          source: Buffer.from(csv, 'utf8'),
          filename: `transfers_${sess.token}.csv`,
        });
      } else if (type === 'json') {
        const jsonStr = JSON.stringify({
          token_address: sess.token,
          total_transfers: sess.totalTransfers,
          results: sess.results,
          data: sess.data,
          generated_at: new Date().toISOString()
        }, null, 2);
        await ctx.replyWithDocument({
          source: Buffer.from(jsonStr, 'utf8'),
          filename: `transfers_${sess.token}.json`,
        });
      }
      await ctx.answerCbQuery('Export ready');
      return;
    }

    await ctx.answerCbQuery();
  } catch (e) {
    await ctx.answerCbQuery('Error');
    await ctx.reply(`❌ ${e.message || String(e)}`);
  }
});

/* -------------------------
   Launch
--------------------------*/
bot.launch().then(() => console.log('Enhanced Bot running with new API & image support ✅'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));