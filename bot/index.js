require('dotenv').config();
const { Telegraf } = require('telegraf');
const { fetchTransfers, fetchNFTTransfers, processApiResponse, processNFTResponse } = require('./api');

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

function renderNFTSummary(nftAddress, nftId, transfers = [], totalTransfers = 0, results = '') {
  const ownershipChanges = transfers.length;
  const uniqueOwners = new Set(
    transfers
      .map(t => t.to)
      .filter(address => address && typeof address === 'string')
      .map(address => address.toLowerCase())
  ).size;
  const timespan = transfers.length > 1 ? 
    calculateTimespan(transfers[0]?.timestamp, transfers[transfers.length - 1]?.timestamp) : 
    'N/A';
  
  return [
    `🖼️ *NFT Analysis Report*`,
    ``,
    `*Contract:* \`${nftAddress}\``,
    `*Token ID:* \`${nftId}\``,
    `*Total transfers:* ${totalTransfers}`,
    `*Ownership changes:* ${ownershipChanges}`,
    `*Unique owners:* ${uniqueOwners}`,
    `*Ownership timespan:* ${timespan}`,
    ``,
    `📊 *Analysis Results:*`,
    results || 'NFT ownership and transfer analysis completed.',
  ].join('\n');
}

function renderNFTTransfers(transfers = [], page = 0, pageSize = 3) {
  const start = page * pageSize;
  const slice = transfers.slice(start, start + pageSize);
  if (!slice.length) return '_No transfers on this page._';

  const lines = slice.map((transfer, i) => {
    const from = transfer.from === '0x0000000000000000000000000000000000000000' ? 
      'MINT' : fmtHash(transfer.from, 6);
    const to = fmtHash(transfer.to, 6);
    const time = fmtINDate(transfer.timestamp);
    const tx = fmtHash(transfer.tx_hash, 8);
    
    return [
      `🔄 *Transfer #${start + i + 1}*`,
      `From: \`${from}\`  →  To: \`${to}\``,
      `Time (IST): ${time}`,
      `Tx: \`${tx}\``,
    ].join('\n');
  });

  return lines.join('\n\n');
}

function calculateTimespan(startTime, endTime) {
  if (!startTime || !endTime) return 'N/A';
  
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Same day';
    if (diffDays === 1) return '1 day';
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  } catch {
    return 'N/A';
  }
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

function toNFTCSV(transfers = []) {
  const headers = ['timestamp', 'from', 'to', 'tx_hash'];
  const rows = transfers.map(t => [
    t?.timestamp ?? '',
    t?.from ?? '',
    t?.to ?? '',
    t?.tx_hash ?? '',
  ]);
  const escape = (v) => `"${String(v).replaceAll('"','""')}"`;
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

/* -------------------------
   Session + keyboard
--------------------------*/
const sessions = new Map(); // key: chatId, val: { token, data, page, images, results } for tokens
const nftSessions = new Map(); // key: chatId, val: { nft_address, nft_id, data, page, images, results } for NFTs

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

  // Only add charts buttons if images are available (for manual re-viewing)
  if (hasImages) {
    baseKeyboard.push([
      { text: '🔄 Re-show Charts', callback_data: 'view:charts' },
      { text: '🔄 Re-show Network', callback_data: 'view:network' },
    ]);
  }

  // Add export options
  baseKeyboard.push([
    { text: '⬇️ CSV', callback_data: 'export:csv' },
    { text: '⬇️ JSON', callback_data: 'export:json' },
  ]);

  return { inline_keyboard: baseKeyboard };
}

function makeNFTKeyboard(page, total, pageSize = 3, hasImages = false) {
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const prev = Math.max(0, page - 1);
  const next = Math.min(maxPage, page + 1);

  const baseKeyboard = [
    [
      { text: '🖼️ Summary', callback_data: 'nft:summary' },
      { text: '🔄 Transfers', callback_data: 'nft:transfers' },
    ],
    [
      { text: '⬅️ Prev', callback_data: `nft_nav:${prev}` },
      { text: `Page ${page + 1}/${maxPage + 1}`, callback_data: 'noop' },
      { text: 'Next ➡️', callback_data: `nft_nav:${next}` },
    ]
  ];

  // Add re-show buttons if images are available
  if (hasImages) {
    baseKeyboard.push([
      { text: '🔄 Re-show Analysis', callback_data: 'nft:charts' },
      { text: '🔄 Re-show Images', callback_data: 'nft:images' },
    ]);
  }

  // Add export options
  baseKeyboard.push([
    { text: '⬇️ CSV', callback_data: 'nft_export:csv' },
    { text: '⬇️ JSON', callback_data: 'nft_export:json' },
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
    '/nft <contract_address> <token_id> — analyze NFT ownership history & lifetime patterns',
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

    // Automatically send charts if available
    if (processedResponse.processedImages && Object.keys(processedResponse.processedImages).length > 0) {
      // Send a brief message about incoming charts
      await ctx.reply('📊 Generating visual analysis charts...');
      
      // Send charts in sequence with small delays
      if (processedResponse.processedImages.amount_distribution) {
        await ctx.replyWithPhoto(
          { source: processedResponse.processedImages.amount_distribution },
          { caption: '💰 **Amount Distribution Analysis**\nShows how transfer amounts are distributed across different ranges.' }
        );
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
      
      if (processedResponse.processedImages.volume_time) {
        await ctx.replyWithPhoto(
          { source: processedResponse.processedImages.volume_time },
          { caption: '📈 **Volume Over Time Analysis**\nDisplays transfer volume trends and patterns over time.' }
        );
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
      
      if (processedResponse.processedImages.network_graph) {
        await ctx.replyWithPhoto(
          { source: processedResponse.processedImages.network_graph },
          { caption: '🕸️ **Transfer Network Graph**\nVisualizes relationships between addresses and transfer flows.' }
        );
      }
      
      // Send completion message
      await ctx.reply('✅ Analysis complete! Use the buttons above to explore data or export files.');
    }

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
   Enhanced /nft command for NFT analysis
--------------------------*/
bot.command('nft', async (ctx) => {
  const args = ctx.message.text.replace(/^\/nft(@\w+)?\s*/i, '').trim().split(/\s+/);
  
  if (args.length < 2 || !args[0] || !args[1]) {
    return ctx.reply([
      'usage: /nft <contract_address> <token_id>',
      '',
      'Examples:',
      '/nft 0x9a1e3d2a010dbe576f9cccd57b2fc0df96c8e44d 1122',
      '/nft 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D 5555',
    ].join('\n'));
  }

  const contractAddress = args[0];
  const tokenId = args[1];

  const waitMsg = await ctx.reply('🔍 Analyzing NFT lifetime ownership patterns...');

  try {
    // Fetch NFT data from API
    const apiResponse = await fetchNFTTransfers(contractAddress, tokenId);
    const processedResponse = processNFTResponse(apiResponse);

    // Extract data from response
    const nftAddress = processedResponse.nft_address || contractAddress;
    const nftId = processedResponse.nft_id || tokenId;
    const totalTransfers = processedResponse.total_transfers || 0;
    const results = processedResponse.results || 'NFT analysis completed successfully.';
    const transfers = processedResponse.nft_data || [];

    // Store in NFT session
    nftSessions.set(ctx.chat.id, {
      nft_address: nftAddress,
      nft_id: nftId,
      data: transfers,
      page: 0,
      images: processedResponse.processedImages || {},
      results: results,
      totalTransfers: totalTransfers
    });

    // Send summary
    const summaryText = renderNFTSummary(nftAddress, nftId, transfers, totalTransfers, results);
    const hasImages = Object.keys(processedResponse.processedImages || {}).length > 0;

    await ctx.telegram.editMessageText(
      waitMsg.chat.id,
      waitMsg.message_id,
      undefined,
      summaryText,
      { 
        parse_mode: 'Markdown', 
        reply_markup: makeNFTKeyboard(0, transfers.length, 3, hasImages) 
      }
    );

    // Automatically send NFT images first (if available)
    if (processedResponse.processedImages?.nft_images?.length > 0) {
      await ctx.reply('🖼️ Displaying NFT images...');
      
      for (let i = 0; i < processedResponse.processedImages.nft_images.length; i++) {
        const imageBuffer = processedResponse.processedImages.nft_images[i];
        try {
          await ctx.replyWithPhoto(
            { source: imageBuffer },
            { caption: `🖼️ **NFT Image ${i + 1}**\n${nftAddress} #${nftId}` }
          );
          if (i < processedResponse.processedImages.nft_images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between images
          }
        } catch (photoError) {
          console.error(`DEBUG: Failed to send NFT image ${i + 1}:`, photoError.message);
          await ctx.reply(`❌ Failed to send NFT image ${i + 1}`);
        }
      }
    } else {
      // Check if raw nft_image exists but failed to decode
      if (processedResponse.images?.nft_image && Array.isArray(processedResponse.images.nft_image) && processedResponse.images.nft_image.length > 0) {
        console.log('DEBUG: Found', processedResponse.images.nft_image.length, 'NFT images, but decoding failed');
        
        // Try to process one image manually for debugging
        const firstImage = processedResponse.images.nft_image[0];
        
        try {
          // Try manual decode without data URL prefix removal first
          let testBuffer = Buffer.from(firstImage, 'base64');
          
          await ctx.reply('🧪 Testing manual decode...');
          await ctx.replyWithPhoto(
            { source: testBuffer },
            { caption: `🧪 **Test NFT Image**\n${nftAddress} #${nftId}` }
          );
          
        } catch (manualError) {
          console.error('DEBUG: Manual decode failed:', manualError.message);
          
          // Try with data URL prefix removal
          try {
            const cleanBase64 = firstImage.replace(/^data:image\/[a-z]+;base64,/, '');
            testBuffer = Buffer.from(cleanBase64, 'base64');
            
            await ctx.reply('🧪 Testing with prefix removal...');
            await ctx.replyWithPhoto(
              { source: testBuffer },
              { caption: `🧪 **Test NFT Image (Clean)**\n${nftAddress} #${nftId}` }
            );
            
          } catch (secondError) {
            console.error('DEBUG: Second manual attempt failed:', secondError.message);
            await ctx.reply(`❌ NFT images found but both decode methods failed`);
          }
        }
      } else {
        await ctx.reply('ℹ️ No NFT images available for this token.');
      }
    }

    // Then send analysis charts automatically
    if (processedResponse.processedImages && 
        (processedResponse.processedImages.ownership_timeline || 
         processedResponse.processedImages.time_differences || 
         processedResponse.processedImages.transfer_network)) {
      
      await ctx.reply('📊 Generating ownership analysis charts...');
      
      // Send ownership timeline
      if (processedResponse.processedImages.ownership_timeline) {
        try {
          await ctx.replyWithPhoto(
            { source: processedResponse.processedImages.ownership_timeline },
            { caption: '📈 **Ownership Timeline**\nShows how ownership changed over time for this NFT.' }
          );
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('DEBUG: Failed to send ownership timeline:', error.message);
          await ctx.reply('❌ Failed to send ownership timeline chart');
        }
      }
      
      // Send time differences
      if (processedResponse.processedImages.time_differences) {
        try {
          await ctx.replyWithPhoto(
            { source: processedResponse.processedImages.time_differences },
            { caption: '⏱️ **Time Between Transfers**\nAnalyzes holding periods and trading frequency patterns.' }
          );
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('DEBUG: Failed to send time differences:', error.message);
          await ctx.reply('❌ Failed to send time differences chart');
        }
      }
      
      // Send transfer network
      if (processedResponse.processedImages.transfer_network) {
        try {
          await ctx.replyWithPhoto(
            { source: processedResponse.processedImages.transfer_network },
            { caption: '🕸️ **Transfer Network Graph**\nVisualizes ownership relationships and transfer flows.' }
          );
        } catch (error) {
          console.error('DEBUG: Failed to send transfer network:', error.message);
          await ctx.reply('❌ Failed to send transfer network chart');
        }
      }
      
      await ctx.reply('✅ NFT analysis complete! Use buttons above to explore transfer details or export data.');
    } else {
      await ctx.reply('✅ NFT analysis complete! Use buttons above to explore transfer details or export data.');
    }

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
   Enhanced inline button handlers (both token and NFT)
--------------------------*/
bot.on('callback_query', async (ctx) => {
  const chatId = ctx.chat.id;
  const data = ctx.callbackQuery.data || '';
  const msg = ctx.callbackQuery.message;

  try {
    if (data === 'noop') {
      await ctx.answerCbQuery();
      return;
    }

    // Handle NFT-related callbacks
    if (data.startsWith('nft:') || data.startsWith('nft_nav:') || data.startsWith('nft_export:')) {
      const nftSess = nftSessions.get(chatId);
      if (!nftSess) {
        await ctx.answerCbQuery('No NFT session. Run /nft first.');
        return;
      }

      // NFT view handlers
      if (data.startsWith('nft:')) {
        const view = data.split(':')[1];
        const hasImages = Object.keys(nftSess.images || {}).length > 0;

        if (view === 'summary') {
          const summaryText = renderNFTSummary(nftSess.nft_address, nftSess.nft_id, nftSess.data, nftSess.totalTransfers, nftSess.results);
          await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, summaryText, {
            parse_mode: 'Markdown',
            reply_markup: makeNFTKeyboard(nftSess.page, nftSess.data.length, 3, hasImages),
          });
        } 
        else if (view === 'transfers') {
          const text = renderNFTTransfers(nftSess.data, nftSess.page, 3);
          await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, text, {
            parse_mode: 'Markdown',
            reply_markup: makeNFTKeyboard(nftSess.page, nftSess.data.length, 3, hasImages),
          });
        }
        else if (view === 'charts') {
          await ctx.reply('📊 Re-displaying analysis charts...');
          if (nftSess.images.ownership_timeline) {
            await ctx.replyWithPhoto(
              { source: nftSess.images.ownership_timeline },
              { caption: '📈 **Ownership Timeline**\nShows how ownership changed over time for this NFT.' }
            );
          }
          if (nftSess.images.time_differences) {
            await ctx.replyWithPhoto(
              { source: nftSess.images.time_differences },
              { caption: '⏱️ **Time Between Transfers**\nAnalyzes holding periods and trading frequency patterns.' }
            );
          }
          if (nftSess.images.transfer_network) {
            await ctx.replyWithPhoto(
              { source: nftSess.images.transfer_network },
              { caption: '🕸️ **Transfer Network Graph**\nVisualizes ownership relationships and transfer flows.' }
            );
          }
        }
        else if (view === 'images') {
          await ctx.reply('🖼️ Re-displaying NFT images...');
          if (nftSess.images.nft_images?.length > 0) {
            for (let i = 0; i < nftSess.images.nft_images.length; i++) {
              await ctx.replyWithPhoto(
                { source: nftSess.images.nft_images[i] },
                { caption: `🖼️ **NFT Image ${i + 1}**\n${nftSess.nft_address} #${nftSess.nft_id}` }
              );
            }
          }
        }
        
        await ctx.answerCbQuery();
        return;
      }

      // NFT navigation handler
      if (data.startsWith('nft_nav:')) {
        const nextPage = Math.max(0, parseInt(data.split(':')[1], 10) || 0);
        nftSess.page = nextPage;
        const text = renderNFTTransfers(nftSess.data, nftSess.page, 3);
        const hasImages = Object.keys(nftSess.images || {}).length > 0;
        
        await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, text, {
          parse_mode: 'Markdown',
          reply_markup: makeNFTKeyboard(nftSess.page, nftSess.data.length, 3, hasImages),
        });
        await ctx.answerCbQuery(`Page ${nftSess.page + 1}`);
        return;
      }

      // NFT export handlers
      if (data.startsWith('nft_export:')) {
        const type = data.split(':')[1];
        if (type === 'csv') {
          const csv = toNFTCSV(nftSess.data);
          await ctx.replyWithDocument({
            source: Buffer.from(csv, 'utf8'),
            filename: `nft_transfers_${nftSess.nft_address}_${nftSess.nft_id}.csv`,
          });
        } else if (type === 'json') {
          const jsonStr = JSON.stringify({
            nft_address: nftSess.nft_address,
            nft_id: nftSess.nft_id,
            total_transfers: nftSess.totalTransfers,
            results: nftSess.results,
            transfers: nftSess.data,
            generated_at: new Date().toISOString()
          }, null, 2);
          await ctx.replyWithDocument({
            source: Buffer.from(jsonStr, 'utf8'),
            filename: `nft_analysis_${nftSess.nft_address}_${nftSess.nft_id}.json`,
          });
        }
        await ctx.answerCbQuery('Export ready');
        return;
      }
    }

    // Handle regular token transfer callbacks
    const sess = sessions.get(chatId);
    if (!sess) {
      await ctx.answerCbQuery('No session. Run /transfers first.');
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
        // Re-send chart images
        await ctx.reply('📊 Re-displaying chart analysis...');
        if (sess.images.amount_distribution) {
          await ctx.replyWithPhoto(
            { source: sess.images.amount_distribution },
            { caption: '💰 **Amount Distribution Analysis**\nShows how transfer amounts are distributed across different ranges.' }
          );
        }
        if (sess.images.volume_time) {
          await ctx.replyWithPhoto(
            { source: sess.images.volume_time },
            { caption: '📈 **Volume Over Time Analysis**\nDisplays transfer volume trends and patterns over time.' }
          );
        }
      }
      else if (view === 'network') {
        // Re-send network graph
        await ctx.reply('🕸️ Re-displaying network graph...');
        if (sess.images.network_graph) {
          await ctx.replyWithPhoto(
            { source: sess.images.network_graph },
            { caption: '🕸️ **Transfer Network Graph**\nVisualizes relationships between addresses and transfer flows.' }
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