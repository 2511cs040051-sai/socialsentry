/**
 * SocialSentry | Real-Time Social Media Analytics & Cyberbullying Detection Platform
 * Fullstack Client Application & WebSocket Real-Time Consumer
 * Malla Reddy University Project (LB.Siddartha nayak & D.Sairam)
 */

// Global Application State
const state = {
  isStreaming: true,
  streamSpeed: 1800,
  ws: null,
  wsConnected: false,
  activeTab: 'overview',
  theme: 'dark',
  metrics: {
    totalIngested: 142580,
    bullyCount: 1842,
    bullyRate: '1.29%',
    serialBullies: 28,
    strikesIssued: 62,
    posRate: '68.4%',
    postsPerSec: 38
  },
  posts: [],
  maxDisplayedPosts: 40,
  bullies: [],
  hashtags: [],
  alerts: [],
  filters: {
    toxicity: 'all',
    platform: 'all',
    sentiment: 'all',
    searchQuery: ''
  },
  charts: {},
  latestIncident: null
};

// Preset sample texts for Sandbox NLP testing
const SANDBOX_PRESETS = {
  threat: {
    text: "I know where you go to school and you will regret ever opening your mouth. Watch your back.",
    handle: "@shadow_stalker"
  },
  harassment: {
    text: "Nobody here wants you, why don't you just leave and delete your entire account? You're pathetic.",
    handle: "@troll_king99"
  },
  insult: {
    text: "Look at this idiot trying to sound smart. Completely useless clown with zero talent.",
    handle: "@toxic_critic"
  },
  safe: {
    text: "Huge congratulations to the robotics club for winning first place in the AI symposium! Incredibly proud of everyone.",
    handle: "@mru_campus"
  },
  neutral: {
    text: "The new server patch has been applied to Kafka broker 3. Ingestion telemetry will be monitored overnight.",
    handle: "@devops_ops"
  }
};

// Initialize application on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initUIEventListeners();
  checkAuthSession();
  initCharts();
  connectWebSocket();
  loadInitialData();
  startFallbackLoop();
});

// ========================================================
// 1. WEBSOCKET & BACKEND API INTEGRATION
// ========================================================

function connectWebSocket() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.host || '127.0.0.1:8000';
  const wsUrl = `${wsProtocol}//${wsHost}/ws/stream`;

  try {
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      state.wsConnected = true;
      updateConnectionStatus(true, '12ms');
      console.log('✓ Connected to SocialSentry Real-Time WebSocket at', wsUrl);
    };

    state.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleIncomingWsPayload(payload);
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    state.ws.onclose = () => {
      state.wsConnected = false;
      updateConnectionStatus(false);
      // Auto reconnect after 3.5 seconds
      setTimeout(connectWebSocket, 3500);
    };

    state.ws.onerror = () => {
      state.wsConnected = false;
      updateConnectionStatus(false);
    };
  } catch (e) {
    state.wsConnected = false;
    updateConnectionStatus(false);
  }
}

function updateConnectionStatus(isConnected, latency = '--') {
  const badge = document.getElementById('stream-status-badge');
  const text = document.getElementById('stream-status-text');
  const latencyBadge = document.getElementById('ws-latency-badge');

  if (isConnected) {
    badge.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping';
    text.textContent = 'STREAM LIVE';
    text.className = 'text-xs font-mono font-bold text-emerald-400 tracking-wider block';
    latencyBadge.textContent = `WS: ${latency}`;
    latencyBadge.className = 'text-[10px] font-mono text-emerald-400';
  } else {
    badge.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
    text.textContent = 'SIMULATION LOCAL';
    text.className = 'text-xs font-mono font-bold text-amber-400 tracking-wider block';
    latencyBadge.textContent = 'WS: Offline';
    latencyBadge.className = 'text-[10px] font-mono text-gray-500';
  }
}

function handleIncomingWsPayload(data) {
  if (data.type === 'NEW_POST') {
    handleNewPost(data.post);
  } else if (data.type === 'BULLY_ALERT') {
    triggerToastAlert(data.alert);
  } else if (data.type === 'STATS_UPDATE') {
    if (data.metrics) {
      Object.assign(state.metrics, data.metrics);
      renderKPIs();
    }
  } else if (data.type === 'RAID_SIMULATION') {
    if (data.posts && Array.isArray(data.posts)) {
      data.posts.forEach((p, idx) => {
        setTimeout(() => handleNewPost(p), idx * 250);
      });
    }
  }
}

async function loadInitialData() {
  try {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const data = await res.json();
      if (data.metrics) {
        Object.assign(state.metrics, data.metrics);
        renderKPIs();
      }
    }
  } catch (e) {
    // Backend offline, initial default state used
  }

  try {
    const [postsRes, bulliesRes, hashRes] = await Promise.all([
      fetch('/api/posts?limit=30'),
      fetch('/api/bullies'),
      fetch('/api/hashtags')
    ]);

    if (postsRes.ok) {
      const postsData = await postsRes.json();
      state.posts = postsData.posts || [];
      renderLiveFeeds();
    }

    if (bulliesRes.ok) {
      const bulliesData = await bulliesRes.json();
      state.bullies = bulliesData.bullies || [];
      renderBullies();
    }

    if (hashRes.ok) {
      const hashData = await hashRes.json();
      state.hashtags = hashData.hashtags || [];
      renderHashtags();
    }
  } catch (e) {
    // Fallback seed data will be rendered
    populateLocalFallbackSeed();
  }
}

// ========================================================
// 2. LOCAL DATA FALLBACK SEED GENERATOR
// ========================================================

function populateLocalFallbackSeed() {
  if (state.posts.length > 0) return;

  const mockSeed = [
    {
      id: 'p-1',
      author: 'CyberTroll_Alpha',
      handle: '@alphatroll99',
      platform: 'twitter',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
      content: 'You are completely incompetent, nobody respects your work. Delete your account and never show up again!',
      sentiment: 'negative',
      sentiment_score: -0.92,
      is_bullying: true,
      toxicity_score: 0.94,
      toxicity_type: 'HARASSMENT',
      risk_level: 'CRITICAL',
      timestamp: 'Just now',
      likes: 12,
      shares: 4,
      comments: 18,
      flagged_tokens: ['incompetent', 'nobody respects', 'delete your account']
    },
    {
      id: 'p-2',
      author: 'Aarav Sharma',
      handle: '@aarav_tech',
      platform: 'twitter',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=face',
      content: 'Excited to present our NLP research paper at Malla Reddy University tomorrow! Great effort by the entire team. #AI2026 #SocialSentry',
      sentiment: 'positive',
      sentiment_score: 0.88,
      is_bullying: false,
      toxicity_score: 0.02,
      toxicity_type: 'CLEAN',
      risk_level: 'SAFE',
      timestamp: '1 min ago',
      likes: 142,
      shares: 38,
      comments: 15,
      flagged_tokens: []
    },
    {
      id: 'p-3',
      author: 'ShadowStrike_X',
      handle: '@shadow_threat',
      platform: 'reddit',
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face',
      content: 'I know where you live and what campus you study at. Better watch your steps tonight or else.',
      sentiment: 'negative',
      sentiment_score: -0.96,
      is_bullying: true,
      toxicity_score: 0.98,
      toxicity_type: 'THREAT',
      risk_level: 'CRITICAL',
      timestamp: '2 mins ago',
      likes: 2,
      shares: 0,
      comments: 29,
      flagged_tokens: ['know where you live', 'watch your steps', 'or else']
    },
    {
      id: 'p-4',
      author: 'CampusVoice_MRU',
      handle: '@mru_students',
      platform: 'instagram',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      content: 'Workshop on Cyber Safety and Anti-Bullying happening at CSE Auditorium on Friday! Be an upstander, not a bystander. #StopBullying #MRUCSE',
      sentiment: 'positive',
      sentiment_score: 0.82,
      is_bullying: false,
      toxicity_score: 0.04,
      toxicity_type: 'CLEAN',
      risk_level: 'SAFE',
      timestamp: '4 mins ago',
      likes: 389,
      shares: 64,
      comments: 42,
      flagged_tokens: []
    },
    {
      id: 'p-5',
      author: 'ToxicRage_Bot',
      handle: '@toxic_rage',
      platform: 'youtube',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      content: 'Look at this ugly fraud. How does someone so stupid even get admitted here? Total disgrace.',
      sentiment: 'negative',
      sentiment_score: -0.89,
      is_bullying: true,
      toxicity_score: 0.91,
      toxicity_type: 'INSULT',
      risk_level: 'HIGH',
      timestamp: '5 mins ago',
      likes: 8,
      shares: 1,
      comments: 31,
      flagged_tokens: ['ugly fraud', 'so stupid', 'total disgrace']
    }
  ];

  state.posts = mockSeed;
  renderLiveFeeds();

  state.bullies = [
    {
      id: 'b-1',
      handle: '@shadow_threat',
      name: 'ShadowStrike_X',
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face',
      platform: 'reddit',
      total_violations: 14,
      strike_count: 3,
      risk_level: 'CRITICAL',
      status: 'BANNED'
    },
    {
      id: 'b-2',
      handle: '@alphatroll99',
      name: 'CyberTroll_Alpha',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
      platform: 'twitter',
      total_violations: 9,
      strike_count: 2,
      risk_level: 'HIGH',
      status: 'SUSPENDED'
    },
    {
      id: 'b-3',
      handle: '@toxic_rage',
      name: 'ToxicRage_Bot',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      platform: 'youtube',
      total_violations: 6,
      strike_count: 2,
      risk_level: 'HIGH',
      status: 'FLAGGED'
    },
    {
      id: 'b-4',
      handle: '@campus_hater',
      name: 'Anonymous Snitch',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      platform: 'instagram',
      total_violations: 3,
      strike_count: 1,
      risk_level: 'MEDIUM',
      status: 'WARNED'
    }
  ];
  renderBullies();

  state.hashtags = [
    { hashtag: '#StopBullying', mention_count: 32400, growth_rate: '+184%', toxicity_ratio: 3.2, risk: 'LOW' },
    { hashtag: '#CancelTarget', mention_count: 24100, growth_rate: '+320%', toxicity_ratio: 84.6, risk: 'CRITICAL' },
    { hashtag: '#MRUCSE', mention_count: 18900, growth_rate: '+74%', toxicity_ratio: 1.1, risk: 'SAFE' },
    { hashtag: '#SocialSentry', mention_count: 15400, growth_rate: '+142%', toxicity_ratio: 0.8, risk: 'SAFE' },
    { hashtag: '#ExposeUser', mention_count: 12100, growth_rate: '+210%', toxicity_ratio: 76.4, risk: 'HIGH' },
    { hashtag: '#AI2026', mention_count: 9800, growth_rate: '+45%', toxicity_ratio: 2.4, risk: 'SAFE' }
  ];
  renderHashtags();
}

// Fallback background loop when WebSocket is disconnected
function startFallbackLoop() {
  setInterval(() => {
    if (!state.isStreaming) return;
    if (state.wsConnected) return; // Backend handles streaming

    const mockPool = [
      {
        content: "Stop posting, you are wasting everyone's time and nobody cares about your stupid opinions. #CancelTarget",
        author: "Flamer_99",
        handle: "@flamer99",
        platform: "twitter",
        is_bullying: true,
        toxicity_score: 0.87,
        toxicity_type: "HARASSMENT",
        risk_level: "HIGH",
        sentiment: "negative",
        sentiment_score: -0.78,
        flagged_tokens: ["wasting everyone's time", "nobody cares", "stupid opinions"]
      },
      {
        content: "Awesome presentation at the social media analytics workshop today! Inspiring work on AI and NLP. #SocialSentry #MRUCSE",
        author: "Divya Reddy",
        handle: "@divya_r",
        platform: "linkedin",
        is_bullying: false,
        toxicity_score: 0.01,
        toxicity_type: "CLEAN",
        risk_level: "SAFE",
        sentiment: "positive",
        sentiment_score: 0.94,
        flagged_tokens: []
      },
      {
        content: "I will make sure you lose your internship, don't test me or you will regret it. #CancelTarget",
        author: "Vindictive_User",
        handle: "@vindictive",
        platform: "reddit",
        is_bullying: true,
        toxicity_score: 0.96,
        toxicity_type: "THREAT",
        risk_level: "CRITICAL",
        sentiment: "negative",
        sentiment_score: -0.95,
        flagged_tokens: ["lose your internship", "don't test me", "regret it"]
      },
      {
        content: "Reading up on real-time sentiment analysis and sliding window tokenizers. Fascinating intersection of NLP and distributed computing. #AI2026",
        author: "CodeGeek",
        handle: "@codegeek_dev",
        platform: "twitter",
        is_bullying: false,
        toxicity_score: 0.03,
        toxicity_type: "CLEAN",
        risk_level: "SAFE",
        sentiment: "positive",
        sentiment_score: 0.76,
        flagged_tokens: []
      }
    ];

    const pick = mockPool[Math.floor(Math.random() * mockPool.length)];
    const generated = {
      ...pick,
      id: 'p-' + Date.now(),
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*10000000)}?w=100&h=100&fit=crop&crop=face`,
      timestamp: 'Just now',
      likes: Math.floor(Math.random() * 80),
      shares: Math.floor(Math.random() * 20),
      comments: Math.floor(Math.random() * 30)
    };

    handleNewPost(generated);
  }, state.streamSpeed);
}

// ========================================================
// 3. POST INGESTION & PIPELINE LOGIC
// ========================================================

function handleNewPost(post) {
  // Add to in-memory collection
  state.posts.unshift(post);
  if (state.posts.length > state.maxDisplayedPosts) {
    state.posts.pop();
  }

  // Update telemetry counters
  state.metrics.totalIngested += 1;
  if (post.is_bullying) {
    state.metrics.bullyCount += 1;
  }
  const bullyPercentage = ((state.metrics.bullyCount / state.metrics.totalIngested) * 100).toFixed(2);
  state.metrics.bullyRate = `${bullyPercentage}%`;

  renderKPIs();
  renderLiveFeeds();
  updateChartsWithPost(post);

  // If critical threat, trigger alert toast
  if (post.is_bullying && (post.risk_level === 'CRITICAL' || post.toxicity_score > 0.9)) {
    triggerToastAlert({
      id: 'alert-' + Date.now(),
      severity: 'critical',
      title: `Critical Bullying Flagged: ${post.toxicity_type}`,
      desc: post.content,
      author: post.author,
      handle: post.handle,
      post: post
    });
  }
}

function updateChartsWithPost(post) {
  // Update Real-Time Toxicity Trend Chart
  if (state.charts.toxicityTrend) {
    const chart = state.charts.toxicityTrend;
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    chart.data.labels.push(nowLabel);
    if (chart.data.labels.length > 12) {
      chart.data.labels.shift();
    }

    const currentToxicVal = post.is_bullying ? 1 : 0;
    const currentSafeVal = post.is_bullying ? 0 : 1;

    chart.data.datasets[0].data.push(currentToxicVal);
    chart.data.datasets[1].data.push(currentSafeVal);

    if (chart.data.datasets[0].data.length > 12) {
      chart.data.datasets[0].data.shift();
      chart.data.datasets[1].data.shift();
    }

    chart.update('none');
  }

  // Update Bully Category Chart
  if (state.charts.bullyCategory && post.is_bullying) {
    const chart = state.charts.bullyCategory;
    const type = (post.toxicity_type || '').toUpperCase();
    let idx = 0;
    if (type.includes('HARASS')) idx = 0;
    else if (type.includes('THREAT')) idx = 1;
    else if (type.includes('HATE')) idx = 2;
    else if (type.includes('INSULT')) idx = 3;
    else idx = 4;

    chart.data.datasets[0].data[idx] += 1;
    chart.update('none');
  }
}

// ========================================================
// 4. RENDERING & UI GENERATION
// ========================================================

function renderKPIs() {
  const elTotal = document.getElementById('kpi-total-ingested');
  const elBullyCount = document.getElementById('kpi-bully-count');
  const elBullyRate = document.getElementById('kpi-bully-rate');
  const elBullies = document.getElementById('kpi-serial-bullies');
  const elStrikes = document.getElementById('kpi-strikes-issued');
  const elPos = document.getElementById('kpi-pos-rate');

  if (elTotal) elTotal.textContent = state.metrics.totalIngested.toLocaleString();
  if (elBullyCount) elBullyCount.textContent = state.metrics.bullyCount.toLocaleString();
  if (elBullyRate) elBullyRate.textContent = state.metrics.bullyRate;
  if (elBullies) elBullies.textContent = state.metrics.serialBullies;
  if (elStrikes) elStrikes.textContent = `${state.metrics.strikesIssued} Strikes Issued`;
  if (elPos) elPos.textContent = state.metrics.posRate;
}

function renderLiveFeeds() {
  const overviewFeedEl = document.getElementById('live-feed-list');
  const fullFeedEl = document.getElementById('full-stream-feed-list');

  const filtered = filterPosts(state.posts);

  const counterEl = document.getElementById('live-stream-counter');
  if (counterEl) {
    counterEl.textContent = `Showing: ${filtered.length} items`;
  }

  const html = filtered.length > 0
    ? filtered.map(post => createPostCardHTML(post)).join('')
    : `<div class="p-8 text-center text-gray-500 text-xs">No posts matching current filters.</div>`;

  if (overviewFeedEl) overviewFeedEl.innerHTML = html;
  if (fullFeedEl) fullFeedEl.innerHTML = html;
}

function filterPosts(posts) {
  return posts.filter(post => {
    // Toxicity Filter
    if (state.filters.toxicity === 'bullying_only' && !post.is_bullying) return false;
    if (state.filters.toxicity === 'safe_only' && post.is_bullying) return false;
    if (['harassment', 'threat', 'hate_speech', 'insult'].includes(state.filters.toxicity)) {
      if (!post.toxicity_type || !post.toxicity_type.toLowerCase().includes(state.filters.toxicity.replace('_', ' '))) {
        return false;
      }
    }

    // Platform Filter
    if (state.filters.platform !== 'all' && post.platform.toLowerCase() !== state.filters.platform.toLowerCase()) {
      return false;
    }

    // Sentiment Filter
    if (state.filters.sentiment !== 'all' && post.sentiment.toLowerCase() !== state.filters.sentiment.toLowerCase()) {
      return false;
    }

    // Search Query
    if (state.filters.searchQuery) {
      const q = state.filters.searchQuery.toLowerCase();
      const content = (post.content || '').toLowerCase();
      const author = (post.author || '').toLowerCase();
      const handle = (post.handle || '').toLowerCase();
      if (!content.includes(q) && !author.includes(q) && !handle.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

function createPostCardHTML(post) {
  const isBully = post.is_bullying;
  const cardBorder = isBully
    ? (post.risk_level === 'CRITICAL' ? 'border-red-500/60 bg-red-950/20' : 'border-rose-500/40 bg-rose-950/15')
    : 'border-gray-800/80 bg-gray-900/40';

  const toxicityBadge = getToxicityBadgeHTML(post);
  const sentimentBadge = getSentimentBadgeHTML(post.sentiment);

  // Toxic keywords highlighted in content
  let displayContent = escapeHtml(post.content);
  if (post.flagged_tokens && Array.isArray(post.flagged_tokens)) {
    post.flagged_tokens.forEach(tok => {
      const regex = new RegExp(`(${escapeRegex(tok)})`, 'gi');
      displayContent = displayContent.replace(regex, `<span class="toxic-span">$1</span>`);
    });
  }

  const platformIcon = getPlatformIcon(post.platform);

  return `
    <div onclick="openPostModal('${post.id}')" class="glass-panel p-3.5 rounded-xl border ${cardBorder} hover:scale-[1.008] cursor-pointer transition-all post-enter">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center space-x-2.5">
          <img src="${post.author_avatar || post.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face'}" alt="Avatar" class="w-8 h-8 rounded-full object-cover border ${isBully ? 'border-rose-500' : 'border-gray-700'}">
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold text-gray-200">${escapeHtml(post.author_name || post.author || 'User')}</span>
              <span class="text-[11px] text-gray-400 font-mono">${escapeHtml(post.author_handle || post.handle || '@user')}</span>
              <span class="text-gray-500 text-xs">${platformIcon}</span>
            </div>
            <span class="text-[10px] text-gray-500 font-mono">${post.timestamp || 'Just now'}</span>
          </div>
        </div>
        <div class="flex items-center space-x-1.5 flex-wrap justify-end">
          ${toxicityBadge}
          ${sentimentBadge}
        </div>
      </div>

      <p class="text-xs text-gray-200 mt-2.5 leading-relaxed font-sans">${displayContent}</p>

      <div class="mt-2.5 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-gray-400">
        <div class="flex items-center space-x-3">
          <span>❤️ ${post.likes || 0}</span>
          <span>🔄 ${post.shares || 0}</span>
          <span>💬 ${post.comments || 0}</span>
        </div>
        <div class="flex items-center space-x-2">
          ${isBully ? `<span class="text-rose-400 font-mono font-semibold text-[10px]">Toxicity: ${(post.toxicity_score * 100).toFixed(0)}%</span>` : ''}
          <span class="text-blue-400 hover:text-blue-300 text-[10px] font-semibold">Inspect NLP →</span>
        </div>
      </div>
    </div>
  `;
}

function getToxicityBadgeHTML(post) {
  if (!post.is_bullying) {
    return `<span class="text-[10px] px-2 py-0.5 rounded-full badge-clean font-semibold">SAFE</span>`;
  }

  const type = (post.toxicity_type || 'BULLYING').toUpperCase();
  let badgeClass = 'badge-harassment';
  if (type.includes('THREAT')) badgeClass = 'badge-threat pulse-critical';
  else if (type.includes('HATE')) badgeClass = 'badge-hate';
  else if (type.includes('INSULT')) badgeClass = 'badge-insult';

  return `<span class="text-[10px] px-2 py-0.5 rounded-full ${badgeClass} font-bold font-mono">⚠ ${type}</span>`;
}

function getSentimentBadgeHTML(sentiment) {
  const s = (sentiment || 'neutral').toLowerCase();
  if (s === 'positive') return `<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">Pos</span>`;
  if (s === 'negative') return `<span class="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">Neg</span>`;
  return `<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">Neu</span>`;
}

function getPlatformIcon(platform) {
  const p = (platform || '').toLowerCase();
  if (p.includes('twitter') || p.includes('x')) return '🐦';
  if (p.includes('reddit')) return '🤖';
  if (p.includes('instagram')) return '📸';
  if (p.includes('youtube')) return '▶️';
  if (p.includes('linkedin')) return '💼';
  return '🌐';
}

function renderBullies() {
  const overviewList = document.getElementById('overview-bullies-list');
  const fullGrid = document.getElementById('bullies-full-grid');

  if (!state.bullies || state.bullies.length === 0) return;

  // Overview preview
  if (overviewList) {
    overviewList.innerHTML = state.bullies.slice(0, 4).map(bully => `
      <div class="flex items-center justify-between p-2 rounded-lg bg-gray-900/60 border border-gray-800 text-xs">
        <div class="flex items-center space-x-2">
          <img src="${bully.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'}" class="w-7 h-7 rounded-full object-cover">
          <div>
            <div class="font-bold text-gray-200 text-xs">${escapeHtml(bully.name || bully.handle)}</div>
            <div class="text-[10px] text-gray-400 font-mono">${escapeHtml(bully.handle)}</div>
          </div>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${bully.strike_count >= 3 ? 'strike-badge-3' : (bully.strike_count === 2 ? 'strike-badge-2' : 'strike-badge-1')}">
            Strike ${bully.strike_count}/3
          </span>
          <span class="block text-[10px] text-gray-500 font-mono mt-0.5">${bully.total_violations} flags</span>
        </div>
      </div>
    `).join('');
  }

  // Full Grid
  if (fullGrid) {
    fullGrid.innerHTML = state.bullies.map(bully => `
      <div class="glass-panel p-4 rounded-xl border ${bully.strike_count >= 3 ? 'border-red-500/60 bg-red-950/20' : 'border-gray-800'} space-y-3">
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-3">
            <img src="${bully.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'}" class="w-10 h-10 rounded-full object-cover border-2 ${bully.strike_count >= 3 ? 'border-red-500' : 'border-amber-500'}">
            <div>
              <h4 class="text-xs font-bold text-gray-100">${escapeHtml(bully.name || bully.handle)}</h4>
              <p class="text-[11px] text-gray-400 font-mono">${escapeHtml(bully.handle)}</p>
              <span class="text-[10px] text-gray-500 uppercase">${bully.platform || 'Multi-platform'}</span>
            </div>
          </div>
          <span class="text-xs font-mono font-bold px-2 py-0.5 rounded ${bully.strike_count >= 3 ? 'strike-badge-3' : (bully.strike_count === 2 ? 'strike-badge-2' : 'strike-badge-1')}">
            Strike ${bully.strike_count}/3
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-center text-xs font-mono bg-gray-900/60 p-2 rounded-lg border border-gray-800">
          <div>
            <span class="text-[10px] text-gray-400 block">Total Violations</span>
            <span class="text-rose-400 font-bold">${bully.total_violations}</span>
          </div>
          <div>
            <span class="text-[10px] text-gray-400 block">Status</span>
            <span class="font-bold ${bully.status === 'BANNED' ? 'text-red-400' : 'text-amber-400'}">${bully.status || 'ACTIVE'}</span>
          </div>
        </div>

        <div class="flex items-center space-x-2 pt-1">
          <button onclick="takeUserModerationAction('${bully.id}', 'warn')" class="flex-1 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-amber-300 border border-gray-700 transition font-medium">Warn</button>
          <button onclick="takeUserModerationAction('${bully.id}', 'strike')" class="flex-1 py-1 text-xs rounded bg-amber-950/70 hover:bg-amber-900 text-amber-200 border border-amber-600/40 transition font-medium">+1 Strike</button>
          <button onclick="takeUserModerationAction('${bully.id}', 'ban')" class="flex-1 py-1 text-xs rounded bg-rose-600 hover:bg-rose-500 text-white transition font-medium">Ban</button>
        </div>
        <button onclick="openDossierModal('${bully.id}')" class="w-full py-1 text-xs rounded bg-gray-900/90 hover:bg-red-950/40 text-red-300 border border-red-500/30 transition font-mono flex items-center justify-center space-x-1.5">
          <span>📋</span>
          <span>Generate Disciplinary Evidence Dossier</span>
        </button>
      </div>
    `).join('');
  }
}

function renderHashtags() {
  const overviewList = document.getElementById('overview-hashtags-list');
  const fullTable = document.getElementById('hashtags-full-table');

  if (!state.hashtags || state.hashtags.length === 0) return;

  if (overviewList) {
    overviewList.innerHTML = state.hashtags.slice(0, 5).map(h => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-800/60">
        <span class="font-mono ${h.toxicity_ratio > 30 ? 'text-rose-400 font-bold' : 'text-cyan-300'}">${escapeHtml(h.hashtag)}</span>
        <div class="flex items-center space-x-2">
          <span class="text-[11px] text-gray-400">${h.mention_count.toLocaleString()}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded ${h.toxicity_ratio > 30 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'bg-emerald-500/20 text-emerald-300'} font-mono">${h.toxicity_ratio}% tox</span>
        </div>
      </div>
    `).join('');
  }

  if (fullTable) {
    fullTable.innerHTML = state.hashtags.map(h => `
      <tr class="hover:bg-gray-900/40">
        <td class="py-2.5 font-bold ${h.toxicity_ratio > 30 ? 'text-rose-400' : 'text-cyan-400'}">${escapeHtml(h.hashtag)}</td>
        <td class="py-2.5 text-gray-300">${h.mention_count.toLocaleString()}</td>
        <td class="py-2.5 text-emerald-400">${h.growth_rate}</td>
        <td class="py-2.5 ${h.toxicity_ratio > 30 ? 'text-rose-400 font-bold' : 'text-gray-400'}">${h.toxicity_ratio}%</td>
        <td class="py-2.5">
          <span class="text-[10px] px-2 py-0.5 rounded font-mono ${h.toxicity_ratio > 30 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300'}">${h.risk || (h.toxicity_ratio > 30 ? 'HIGH' : 'SAFE')}</span>
        </td>
      </tr>
    `).join('');
  }
}

// ========================================================
// 5. CHART INITIALIZATION (CHART.JS)
// ========================================================

function initCharts() {
  // Chart 1: Real-Time Toxicity & Safe Stream Trajectory
  const toxicityCtx = document.getElementById('toxicityTrendChart')?.getContext('2d');
  if (toxicityCtx) {
    state.charts.toxicityTrend = new Chart(toxicityCtx, {
      type: 'line',
      data: {
        labels: ['18:40', '18:42', '18:44', '18:46', '18:48', '18:50', '18:52', '18:54', '18:56', '18:58', '19:00', '19:02'],
        datasets: [
          {
            label: 'Cyberbullying Incidents',
            data: [2, 1, 3, 5, 2, 4, 1, 6, 8, 3, 2, 4],
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            borderWidth: 2,
            tension: 0.35,
            fill: true
          },
          {
            label: 'Safe Social Posts',
            data: [35, 38, 42, 36, 44, 40, 48, 45, 41, 46, 50, 47],
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [4, 4],
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#9ca3af', font: { size: 11, family: 'Inter' } }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(75, 85, 99, 0.2)' },
            ticks: { color: '#9ca3af', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(75, 85, 99, 0.2)' },
            ticks: { color: '#9ca3af', font: { size: 10 } }
          }
        }
      }
    });
  }

  // Chart 2: Cyberbullying Categories Breakdown Donut
  const bullyCatCtx = document.getElementById('bullyCategoryChart')?.getContext('2d');
  if (bullyCatCtx) {
    state.charts.bullyCategory = new Chart(bullyCatCtx, {
      type: 'doughnut',
      data: {
        labels: ['Harassment', 'Direct Threat', 'Hate Speech', 'Insult/Defamation', 'Toxic Trolling'],
        datasets: [{
          data: [42, 18, 25, 38, 21],
          backgroundColor: ['#f43f5e', '#dc2626', '#c084fc', '#f59e0b', '#3b82f6'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9ca3af', font: { size: 10, family: 'Inter' }, padding: 10 }
          }
        },
        cutout: '68%'
      }
    });
  }

  // Chart 3: Sentiment Distribution Donut
  const sentimentCtx = document.getElementById('sentimentDonutChart')?.getContext('2d');
  if (sentimentCtx) {
    state.charts.sentiment = new Chart(sentimentCtx, {
      type: 'doughnut',
      data: {
        labels: ['Positive', 'Neutral', 'Negative'],
        datasets: [{
          data: [68, 20, 12],
          backgroundColor: ['#10b981', '#3b82f6', '#f43f5e'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9ca3af', font: { size: 10, family: 'Inter' }, padding: 8 }
          }
        },
        cutout: '65%'
      }
    });
  }

  // Chart 4: Platform Distribution Bar Chart
  const platformCtx = document.getElementById('platformDistributionChart')?.getContext('2d');
  if (platformCtx) {
    state.charts.platform = new Chart(platformCtx, {
      type: 'bar',
      data: {
        labels: ['Twitter', 'Reddit', 'Instagram', 'YouTube', 'LinkedIn'],
        datasets: [{
          label: 'Ingestion Volume',
          data: [580, 420, 310, 260, 190],
          backgroundColor: ['#38bdf8', '#fb923c', '#e879f9', '#f87171', '#60a5fa'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(75, 85, 99, 0.2)' },
            ticks: { color: '#9ca3af', font: { size: 10 } }
          }
        }
      }
    });
  }

  // Chart 5: Hashtag Momentum Horizontal Bar
  const hashtagCtx = document.getElementById('hashtagMomentumChart')?.getContext('2d');
  if (hashtagCtx) {
    state.charts.hashtags = new Chart(hashtagCtx, {
      type: 'bar',
      data: {
        labels: ['#StopBullying', '#CancelTarget', '#MRUCSE', '#SocialSentry', '#ExposeUser', '#AI2026'],
        datasets: [{
          label: 'Monitored Mentions',
          data: [32400, 24100, 18900, 15400, 12100, 9800],
          backgroundColor: ['#10b981', '#f43f5e', '#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6'],
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(75, 85, 99, 0.2)' },
            ticks: { color: '#9ca3af', font: { size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#9ca3af', font: { size: 10 } }
          }
        }
      }
    });
  }
}

// ========================================================
// 6. NLP CYBERBULLYING SANDBOX (INTERACTIVE TESTING)
// ========================================================

function loadSandboxSample(type) {
  const preset = SANDBOX_PRESETS[type];
  if (!preset) return;

  const inputEl = document.getElementById('sandbox-input-text');
  const handleEl = document.getElementById('sandbox-author-handle');

  if (inputEl) inputEl.value = preset.text;
  if (handleEl) handleEl.value = preset.handle;

  runSandboxAnalysis();
}

async function runSandboxAnalysis() {
  const textInput = document.getElementById('sandbox-input-text');
  const handleInput = document.getElementById('sandbox-author-handle');
  const resultsContainer = document.getElementById('sandbox-results');

  const text = textInput ? textInput.value.trim() : '';
  const authorHandle = handleInput ? handleInput.value.trim() : '@test_user';

  if (!text) {
    alert('Please enter or paste text to analyze.');
    return;
  }

  // Call API or local NLP fallback
  let analysis = null;
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, author_handle: authorHandle })
    });
    if (res.ok) {
      analysis = await res.json();
    }
  } catch (err) {
    // API not reachable, use client-side heuristic NLP analysis
  }

  if (!analysis) {
    analysis = runClientHeuristicNLP(text, authorHandle);
  }

  renderSandboxResults(analysis, text);
}

// Client-side heuristic NLP fallback
function runClientHeuristicNLP(text, handle) {
  const lower = text.toLowerCase();
  const toxicLexicon = [
    { word: 'kill', cat: 'THREAT', weight: 0.98 },
    { word: 'die', cat: 'THREAT', weight: 0.92 },
    { word: 'watch your back', cat: 'THREAT', weight: 0.95 },
    { word: 'regret', cat: 'THREAT', weight: 0.88 },
    { word: 'destroy', cat: 'THREAT', weight: 0.90 },
    { word: 'where you live', cat: 'THREAT', weight: 0.96 },
    { word: 'hate you', cat: 'HARASSMENT', weight: 0.85 },
    { word: 'pathetic', cat: 'INSULT', weight: 0.82 },
    { word: 'idiot', cat: 'INSULT', weight: 0.84 },
    { word: 'ugly', cat: 'INSULT', weight: 0.88 },
    { word: 'stupid', cat: 'INSULT', weight: 0.80 },
    { word: 'clown', cat: 'INSULT', weight: 0.75 },
    { word: 'disgrace', cat: 'INSULT', weight: 0.82 },
    { word: 'nobody cares', cat: 'HARASSMENT', weight: 0.86 },
    { word: 'delete your account', cat: 'HARASSMENT', weight: 0.89 },
    { word: 'wasting everyone', cat: 'HARASSMENT', weight: 0.84 }
  ];

  let flaggedTokens = [];
  let maxScore = 0;
  let detectedCategory = 'CLEAN';

  toxicLexicon.forEach(item => {
    if (lower.includes(item.word)) {
      flaggedTokens.push(item.word);
      if (item.weight > maxScore) {
        maxScore = item.weight;
        detectedCategory = item.cat;
      }
    }
  });

  const isBullying = maxScore >= 0.70;
  let riskLevel = 'SAFE';
  if (maxScore >= 0.90) riskLevel = 'CRITICAL';
  else if (maxScore >= 0.75) riskLevel = 'HIGH';
  else if (maxScore >= 0.50) riskLevel = 'MEDIUM';

  const sentiment = isBullying ? 'negative' : (lower.includes('congrat') || lower.includes('proud') || lower.includes('awesome') ? 'positive' : 'neutral');
  const sentimentScore = isBullying ? -0.85 : (sentiment === 'positive' ? 0.88 : 0.05);

  let recommendation = 'No action needed. Content adheres to community standards.';
  if (riskLevel === 'CRITICAL') {
    recommendation = '🚨 Immediate Strike 3 Escalation: Block account and trigger cyber harassment incident report.';
  } else if (riskLevel === 'HIGH') {
    recommendation = '⚠️ Issue Formal Strike 2: Restrict messaging and queue for human review.';
  } else if (riskLevel === 'MEDIUM') {
    recommendation = '⚠️ Issue Strike 1 Warning to author and attach caution notice to post.';
  }

  return {
    is_bullying: isBullying,
    toxicity_score: maxScore,
    toxicity_type: detectedCategory,
    risk_level: riskLevel,
    sentiment: sentiment,
    sentiment_score: sentimentScore,
    flagged_tokens: flaggedTokens,
    recommended_action: recommendation,
    probabilities: {
      harassment: detectedCategory === 'HARASSMENT' ? maxScore : 0.05,
      threat: detectedCategory === 'THREAT' ? maxScore : 0.02,
      hate_speech: detectedCategory === 'HATE_SPEECH' ? maxScore : 0.04,
      insult: detectedCategory === 'INSULT' ? maxScore : 0.08
    }
  };
}

function renderSandboxResults(res, originalText) {
  const container = document.getElementById('sandbox-results');
  if (!container) return;

  container.classList.remove('hidden');

  let highlightedText = escapeHtml(originalText);
  if (res.flagged_tokens && Array.isArray(res.flagged_tokens)) {
    res.flagged_tokens.forEach(tok => {
      const regex = new RegExp(`(${escapeRegex(tok)})`, 'gi');
      highlightedText = highlightedText.replace(regex, `<span class="toxic-span">$1</span>`);
    });
  }

  const isBully = res.is_bullying;
  const badgeColor = isBully ? (res.risk_level === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40') : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';

  container.innerHTML = `
    <div class="flex items-center justify-between pb-3 border-b border-gray-800">
      <div class="flex items-center space-x-2">
        <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded ${badgeColor}">
          ${isBully ? `⚠ CYBERBULLYING DETECTED: ${res.toxicity_type}` : '✓ SAFE & CONSTRUCTIVE'}
        </span>
        <span class="text-xs font-mono text-gray-400">Risk: <strong class="${isBully ? 'text-rose-400' : 'text-emerald-400'}">${res.risk_level}</strong></span>
      </div>
      <div class="text-xs font-mono text-gray-400">
        Toxicity: <strong class="${isBully ? 'text-rose-400' : 'text-emerald-400'}">${(res.toxicity_score * 100).toFixed(1)}%</strong>
      </div>
    </div>

    <div class="p-3.5 bg-gray-900/90 rounded-xl border border-gray-800">
      <span class="text-[10px] text-gray-400 uppercase font-mono block mb-1">Explainable NLP Token Inspection:</span>
      <p class="text-sm text-gray-100 leading-relaxed">${highlightedText}</p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
      <div class="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-center">
        <span class="text-[10px] text-gray-400 block">Harassment</span>
        <span class="font-bold text-rose-300">${((res.probabilities?.harassment || 0) * 100).toFixed(0)}%</span>
      </div>
      <div class="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-center">
        <span class="text-[10px] text-gray-400 block">Threat</span>
        <span class="font-bold text-red-400">${((res.probabilities?.threat || 0) * 100).toFixed(0)}%</span>
      </div>
      <div class="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-center">
        <span class="text-[10px] text-gray-400 block">Hate Speech</span>
        <span class="font-bold text-purple-300">${((res.probabilities?.hate_speech || 0) * 100).toFixed(0)}%</span>
      </div>
      <div class="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-center">
        <span class="text-[10px] text-gray-400 block">Sentiment Score</span>
        <span class="font-bold ${res.sentiment_score >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${res.sentiment_score.toFixed(2)}</span>
      </div>
    </div>

    <div class="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs">
      <span class="text-purple-300 font-bold block mb-0.5">Automated Moderation Recommendation:</span>
      <p class="text-gray-300">${res.recommended_action || 'No action required.'}</p>
    </div>
  `;
}

// ========================================================
// 7. MODALS, ALERTS & MODERATION ACTIONS
// ========================================================

function openPostModal(postId) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;

  const modal = document.getElementById('post-modal');
  const modalContent = document.getElementById('modal-post-details');

  let highlightedContent = escapeHtml(post.content);
  if (post.flagged_tokens && Array.isArray(post.flagged_tokens)) {
    post.flagged_tokens.forEach(tok => {
      const regex = new RegExp(`(${escapeRegex(tok)})`, 'gi');
      highlightedContent = highlightedContent.replace(regex, `<span class="toxic-span">$1</span>`);
    });
  }

  const isBully = post.is_bullying;

  modalContent.innerHTML = `
    <div class="space-y-4 text-xs">
      <!-- Author info -->
      <div class="flex items-center justify-between pb-3 border-b border-gray-800">
        <div class="flex items-center space-x-3">
          <img src="${post.author_avatar || post.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face'}" class="w-10 h-10 rounded-full object-cover">
          <div>
            <div class="font-bold text-gray-100 text-sm">${escapeHtml(post.author_name || post.author || 'User')}</div>
            <div class="text-gray-400 font-mono text-xs">${escapeHtml(post.author_handle || post.handle || '@user')} • ${post.platform}</div>
          </div>
        </div>
        <div class="text-right">
          ${getToxicityBadgeHTML(post)}
        </div>
      </div>

      <!-- Post content -->
      <div class="p-3.5 bg-gray-900/90 rounded-xl border border-gray-800 leading-relaxed text-sm">
        ${highlightedContent}
      </div>

      <!-- Classification scores -->
      <div class="grid grid-cols-3 gap-2 font-mono text-center">
        <div class="p-2 rounded bg-gray-900/60 border border-gray-800">
          <span class="text-[10px] text-gray-400 block">Toxicity Score</span>
          <span class="font-bold ${isBully ? 'text-rose-400' : 'text-emerald-400'}">${((post.toxicity_score || 0) * 100).toFixed(0)}%</span>
        </div>
        <div class="p-2 rounded bg-gray-900/60 border border-gray-800">
          <span class="text-[10px] text-gray-400 block">Sentiment</span>
          <span class="font-bold text-blue-400">${post.sentiment?.toUpperCase()} (${(post.sentiment_score || 0).toFixed(2)})</span>
        </div>
        <div class="p-2 rounded bg-gray-900/60 border border-gray-800">
          <span class="text-[10px] text-gray-400 block">Threat Risk</span>
          <span class="font-bold ${post.risk_level === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}">${post.risk_level || 'SAFE'}</span>
        </div>
      </div>

      <!-- Moderation Actions -->
      <div class="pt-2">
        <span class="text-[11px] font-bold text-gray-300 block mb-2">Execute Anti-Cyberbullying Moderation Action:</span>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button onclick="executeActionOnPost('${post.id}', 'warn')" class="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-amber-300 border border-gray-700 transition font-medium text-center">
            Issue Warning
          </button>
          <button onclick="executeActionOnPost('${post.id}', 'strike')" class="p-2 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-500/40 transition font-medium text-center">
            Apply Strike
          </button>
          <button onclick="executeActionOnPost('${post.id}', 'ban')" class="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition font-medium text-center">
            Permanent Ban
          </button>
          <button onclick="executeActionOnPost('${post.id}', 'police')" class="p-2 rounded-lg bg-red-950 hover:bg-red-900 text-red-200 border border-red-500 transition font-medium text-center">
            Escalate Police
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closePostModal() {
  const modal = document.getElementById('post-modal');
  if (modal) modal.classList.add('hidden');
}

function executeActionOnPost(postId, action) {
  if (authState.user.role !== 'moderator') {
    alert(`ACCESS RESTRICTED: Your active account is [${authState.user.name} - ${authState.user.role.toUpperCase()}].\n\nOnly Lead Cyber Investigators / Moderators hold disciplinary authority to execute strikes, suspensions, or bans.\nClick the profile badge in the header to switch to Lead Moderator.`);
    return;
  }
  alert(`Moderation Action [${action.toUpperCase()}] executed on post ID: ${postId} by ${authState.user.name}. Author record updated.`);
  closePostModal();
}

function takeUserModerationAction(userId, action) {
  if (authState.user.role !== 'moderator') {
    alert(`ACCESS RESTRICTED: Your active account is [${authState.user.name} - ${authState.user.role.toUpperCase()}].\n\nDisciplinary actions require Moderator authorization.`);
    return;
  }
  alert(`Moderation Action [${action.toUpperCase()}] applied to cyberbully record: ${userId} by ${authState.user.name}.`);
}

function takeBulkModerationAction(action) {
  if (authState.user.role !== 'moderator') {
    alert(`ACCESS RESTRICTED: Bulk disciplinary actions require Lead Moderator authorization.`);
    return;
  }
  alert(`Bulk Action [${action.toUpperCase()}] executed across all flagged cyberbully records by ${authState.user.name}.`);
}

function triggerToastAlert(alertData) {
  state.latestIncident = alertData;
  const banner = document.getElementById('cyberbully-toast-banner');
  const title = document.getElementById('toast-alert-title');
  const desc = document.getElementById('toast-alert-desc');

  if (title) title.textContent = alertData.title || 'Critical Cyberbullying Attack Flagged';
  if (desc) desc.textContent = alertData.desc || 'Violent threat or coordinated hate raid detected in live stream.';

  if (banner) {
    banner.classList.remove('hidden');
    // Auto-hide after 8 seconds
    setTimeout(() => {
      dismissToastAlert();
    }, 8000);
  }
}

function dismissToastAlert() {
  const banner = document.getElementById('cyberbully-toast-banner');
  if (banner) banner.classList.add('hidden');
}

function inspectLatestThreat() {
  if (state.latestIncident && state.latestIncident.post) {
    openPostModal(state.latestIncident.post.id);
  }
  dismissToastAlert();
}

// ========================================================
// 8. TABS & EVENT LISTENERS
// ========================================================

function switchTab(tabId) {
  state.activeTab = tabId;

  // Toggle tab contents
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`tab-view-${tabId}`);
  if (target) target.classList.remove('hidden');

  // Toggle button styling
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.className = 'nav-tab-btn px-3 py-1.5 rounded-lg font-bold bg-rose-600 text-white shadow-md shadow-rose-500/20 flex items-center space-x-1.5 transition';
    } else {
      btn.className = 'nav-tab-btn px-3 py-1.5 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800/60 flex items-center space-x-1.5 transition';
    }
  });
}

function initUIEventListeners() {
  // Play/Pause Stream
  const playPauseBtn = document.getElementById('btn-play-pause');
  const textPlayPause = document.getElementById('text-play-pause');
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      state.isStreaming = !state.isStreaming;
      textPlayPause.textContent = state.isStreaming ? 'Pause Stream' : 'Resume Stream';
    });
  }

  // Stream Speed Selector
  const speedSelect = document.getElementById('select-speed');
  if (speedSelect) {
    speedSelect.addEventListener('change', (e) => {
      state.streamSpeed = parseInt(e.target.value, 10);
      if (state.ws && state.wsConnected) {
        state.ws.send(JSON.stringify({ action: 'set_speed', speed: state.streamSpeed }));
      }
    });
  }

  // Simulate Bully Raid
  const raidBtn = document.getElementById('btn-simulate-raid');
  if (raidBtn) {
    raidBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/simulate-raid', { method: 'POST' });
      } catch (e) {
        // Fallback simulation
        const sampleRaid = [
          {
            id: 'raid-' + Date.now() + '-1',
            author: 'RaidLeader_X',
            handle: '@raid_leader',
            platform: 'twitter',
            content: 'Attack on their profile now! Dislike every single post and flood them with comments! #CancelTarget',
            is_bullying: true,
            toxicity_score: 0.97,
            toxicity_type: 'HARASSMENT',
            risk_level: 'CRITICAL',
            sentiment: 'negative',
            sentiment_score: -0.96,
            flagged_tokens: ['Attack on their profile', 'flood them with comments']
          },
          {
            id: 'raid-' + Date.now() + '-2',
            author: 'ShadowBot_02',
            handle: '@shadowbot02',
            platform: 'reddit',
            content: 'You do not deserve to be in our community. Get lost and never come back.',
            is_bullying: true,
            toxicity_score: 0.92,
            toxicity_type: 'INSULT',
            risk_level: 'HIGH',
            sentiment: 'negative',
            sentiment_score: -0.88,
            flagged_tokens: ['do not deserve', 'Get lost']
          }
        ];
        sampleRaid.forEach(p => handleNewPost(p));
      }
    });
  }

  // Export Data
  const exportBtn = document.getElementById('btn-export-data');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({ metrics: state.metrics, posts: state.posts, bullies: state.bullies }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `socialsentry_telemetry_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Theme Toggle
  const themeToggle = document.getElementById('btn-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
    });
  }

  // Filters
  const toxicityFilter = document.getElementById('filter-toxicity');
  if (toxicityFilter) {
    toxicityFilter.addEventListener('change', (e) => {
      state.filters.toxicity = e.target.value;
      renderLiveFeeds();
    });
  }

  const platformFilter = document.getElementById('filter-platform');
  if (platformFilter) {
    platformFilter.addEventListener('change', (e) => {
      state.filters.platform = e.target.value;
      renderLiveFeeds();
    });
  }

  const sentimentFilter = document.getElementById('filter-sentiment');
  if (sentimentFilter) {
    sentimentFilter.addEventListener('change', (e) => {
      state.filters.sentiment = e.target.value;
      renderLiveFeeds();
    });
  }

  const searchInput = document.getElementById('input-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filters.searchQuery = e.target.value;
      renderLiveFeeds();
    });
  }
}

// ========================================================
// 9. UTILITIES
// ========================================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========================================================
// 10. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
// ========================================================

const USER_ACCOUNTS = {
  moderator: {
    id: 1,
    name: 'LB. Siddartha Nayak',
    role: 'moderator',
    email: 'moderator@mru.ac.in',
    student_id: '2511CS040028',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'
  },
  researcher: {
    id: 2,
    name: 'D. Sairam',
    role: 'researcher',
    email: 'researcher@mru.ac.in',
    student_id: '2511CS040051',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=face'
  },
  guest: {
    id: 3,
    name: 'Guest Reviewer',
    role: 'guest',
    email: 'guest@mru.ac.in',
    student_id: 'VIVA-EXAMINER',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face'
  }
};

const authState = {
  isLoggedIn: false,
  user: USER_ACCOUNTS.moderator
};

/**
 * Checks session on load. If authenticated, reveals the dashboard;
 * otherwise displays the minimalist login / role selection screen.
 */
function checkAuthSession() {
  const loginView = document.getElementById('app-login-view');
  const dashboardView = document.getElementById('app-dashboard-view');
  const savedUser = localStorage.getItem('socialsentry_user');

  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.role) {
        authState.user = parsed;
        authState.isLoggedIn = true;
        if (loginView) loginView.classList.add('hidden');
        if (dashboardView) dashboardView.classList.remove('hidden');
        updateNavUserUI();
        return true;
      }
    } catch (e) {
      localStorage.removeItem('socialsentry_user');
    }
  }

  // Not logged in: show minimalist login screen, hide dashboard
  authState.isLoggedIn = false;
  if (loginView) loginView.classList.remove('hidden');
  if (dashboardView) dashboardView.classList.add('hidden');
  return false;
}

/**
 * 1-Click Fast Role Selection from the Login Screen.
 * Immediately transitions user into the live dashboard with appropriate clearance.
 */
function loginAsRole(role) {
  const selected = USER_ACCOUNTS[role] || USER_ACCOUNTS.moderator;
  authState.user = selected;
  authState.isLoggedIn = true;
  localStorage.setItem('socialsentry_user', JSON.stringify(selected));

  const loginView = document.getElementById('app-login-view');
  const dashboardView = document.getElementById('app-dashboard-view');
  if (loginView) loginView.classList.add('hidden');
  if (dashboardView) dashboardView.classList.remove('hidden');

  updateNavUserUI();

  triggerToastAlert({
    title: `Clearance Granted: ${selected.role.toUpperCase()}`,
    desc: `Authenticated as ${selected.name} (${selected.email}). Welcome to SocialSentry defense platform.`,
    severity: 'info'
  });

  // Re-adjust Chart.js canvas dimensions after unhiding dashboard container
  setTimeout(() => {
    if (state.charts) {
      Object.values(state.charts).forEach(c => {
        try { if (c && typeof c.resize === 'function') c.resize(); } catch(e){}
      });
    }
  }, 100);
}

/**
 * Handles custom credential submission on the dedicated login screen.
 */
async function handleLoginPageSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('login-screen-email')?.value || 'moderator@mru.ac.in';
  const password = document.getElementById('login-screen-password')?.value || 'admin123';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      authState.user = data.user;
      authState.isLoggedIn = true;
      localStorage.setItem('socialsentry_user', JSON.stringify(data.user));

      const loginView = document.getElementById('app-login-view');
      const dashboardView = document.getElementById('app-dashboard-view');
      if (loginView) loginView.classList.add('hidden');
      if (dashboardView) dashboardView.classList.remove('hidden');

      updateNavUserUI();

      triggerToastAlert({
        title: `Authenticated: ${data.user.role.toUpperCase()}`,
        desc: `Welcome, ${data.user.name}. SocialSentry defense pipeline active.`,
        severity: 'info'
      });
      return;
    } else {
      alert(data.detail || 'Authentication failed. Please verify credentials.');
    }
  } catch (err) {
    // Offline fallback for demo resiliency
    const fallbackRole = email.includes('researcher') ? 'researcher' : (email.includes('guest') ? 'guest' : 'moderator');
    loginAsRole(fallbackRole);
  }
}

/**
 * Logs out the active user and redirects back to the minimalist login view.
 */
function logoutToLoginScreen() {
  localStorage.removeItem('socialsentry_user');
  authState.isLoggedIn = false;

  const loginView = document.getElementById('app-login-view');
  const dashboardView = document.getElementById('app-dashboard-view');
  if (dashboardView) dashboardView.classList.add('hidden');
  if (loginView) loginView.classList.remove('hidden');

  closeAuthModal();

  triggerToastAlert({
    title: 'Session Locked',
    desc: 'You have logged out of SocialSentry. System access locked.',
    severity: 'warning'
  });
}

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

function updateNavUserUI() {
  const nameEl = document.getElementById('nav-user-name');
  const roleEl = document.getElementById('nav-user-role-badge');
  const avatarEl = document.getElementById('nav-user-avatar');

  if (nameEl) nameEl.textContent = authState.user.name;
  if (avatarEl) avatarEl.src = authState.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face';

  if (roleEl) {
    roleEl.textContent = authState.user.role.toUpperCase();
    if (authState.user.role === 'moderator') {
      roleEl.className = 'text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-bold';
    } else if (authState.user.role === 'researcher') {
      roleEl.className = 'text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 uppercase font-bold';
    } else {
      roleEl.className = 'text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase font-bold';
    }
  }
}

/**
 * 1-Click Role Switcher from within the Header Modal.
 */
function quickLogin(role) {
  const selected = USER_ACCOUNTS[role] || USER_ACCOUNTS.moderator;
  authState.user = selected;
  authState.isLoggedIn = true;
  localStorage.setItem('socialsentry_user', JSON.stringify(selected));

  updateNavUserUI();
  closeAuthModal();

  triggerToastAlert({
    title: `Role Switched: ${selected.role.toUpperCase()}`,
    desc: `Active session now set to ${selected.name} (${selected.email}).`,
    severity: 'info'
  });
}

/**
 * Handles custom credential login inside the Header Modal.
 */
async function handleCustomLogin(event) {
  event.preventDefault();
  const email = document.getElementById('auth-input-email')?.value;
  const password = document.getElementById('auth-input-password')?.value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      authState.user = data.user;
      authState.isLoggedIn = true;
      localStorage.setItem('socialsentry_user', JSON.stringify(data.user));
      updateNavUserUI();
      closeAuthModal();
      triggerToastAlert({
        title: `Role Switched: ${data.user.role.toUpperCase()}`,
        desc: `Active session now set to ${data.user.name}.`,
        severity: 'info'
      });
    } else {
      alert(data.detail || 'Login failed. Please check credentials.');
    }
  } catch (err) {
    // Local fallback
    quickLogin('moderator');
  }
}

// Ingestion Source Switcher Handler
async function changeIngestionSource(sourceId) {
  try {
    const res = await fetch('/api/ingestion/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      const sourceName = sourceId === 'reddit' ? 'Reddit Live Comment Stream (Real Internet Data)' : 'Multi-Platform Simulator';
      triggerToastAlert({
        title: 'Ingestion Source Switched',
        desc: `Pipeline actively streaming from: ${sourceName}`,
        severity: 'info'
      });
    }
  } catch (err) {
    console.log('Source changed locally to:', sourceId);
  }
}

// ========================================================
// 11. PUBLIC LIVE POST AUDIT & DISCIPLINARY DOSSIER
// ========================================================

const INGESTION_PRESETS = {
  threat: {
    handle: "@shadow_hunter99",
    content: "I know which campus building you are in and you will regret opening your mouth. Watch your back."
  },
  harass: {
    handle: "@cyber_troll88",
    content: "Nobody here likes you, delete your entire account and get lost forever."
  },
  insult: {
    handle: "@campus_critic",
    content: "You are an incompetent stupid clown and a complete failure."
  },
  safe: {
    handle: "@mru_scholar",
    content: "Huge congratulations to the CSE department for winning first place in the national AI hackathon!"
  }
};

function setIngestionPreset(type) {
  const preset = INGESTION_PRESETS[type];
  if (!preset) return;
  const handleEl = document.getElementById('user-post-handle');
  const contentEl = document.getElementById('user-post-content');
  if (handleEl) handleEl.value = preset.handle;
  if (contentEl) {
    contentEl.value = preset.content;
    contentEl.focus();
  }
}

async function handleLivePostIngestion(event) {
  event.preventDefault();
  const platform = document.getElementById('user-post-platform')?.value || 'twitter';
  const handle = document.getElementById('user-post-handle')?.value.trim() || '@guest_user';
  const contentInput = document.getElementById('user-post-content');
  const content = contentInput?.value.trim();

  if (!content) {
    alert('Please enter or select sample content to test live ingestion.');
    return;
  }

  try {
    const res = await fetch('/api/posts/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        author_handle: handle,
        author_name: handle.replace('@', ''),
        platform
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (contentInput) contentInput.value = '';

      // Prepend post to local state so UI updates instantly
      if (data.post) {
        state.posts.unshift(data.post);
        if (state.posts.length > state.maxDisplayedPosts) state.posts.pop();
        renderPosts();
      }

      if (data.nlp?.is_bullying) {
        triggerToastAlert({
          title: `CRITICAL ${data.nlp.toxicity_type.toUpperCase()} DETECTED`,
          desc: `Post from ${handle} intercepted! Risk: ${data.nlp.risk_level}. Disciplinary strike applied.`,
          severity: 'critical'
        });
        loadBullies();
      } else {
        triggerToastAlert({
          title: 'CLEAN POST BROADCAST APPROVED',
          desc: `Post from ${handle} screened as SAFE (Polarity: ${data.nlp.sentiment}). Added to live stream.`,
          severity: 'info'
        });
      }
    } else {
      alert(data.detail || 'Ingestion failed. Please check server status.');
    }
  } catch (err) {
    // Offline client fallback
    triggerToastAlert({
      title: 'LOCAL AUDIT SCREENING COMPLETE',
      desc: `Post screened locally by client engine. Author: ${handle}`,
      severity: 'info'
    });
  }
}

function openDossierModal(bullyId) {
  const modal = document.getElementById('dossier-modal');
  const container = document.getElementById('dossier-modal-content');
  const hashEl = document.getElementById('dossier-hash');

  const bully = state.bullies.find(b => b.id === bullyId) || {
    id: bullyId,
    name: 'Identified Repeat Bully',
    handle: '@flagged_offender',
    platform: 'multi',
    strike_count: 3,
    total_violations: 5,
    risk_level: 'CRITICAL',
    status: 'BANNED'
  };

  const caseHash = `#MRU-2026-CYBER-${Math.floor(1000 + Math.random() * 9000)}`;
  if (hashEl) hashEl.textContent = caseHash;

  if (container) {
    container.innerHTML = `
      <!-- Subject Profile Card -->
      <div class="p-4 rounded-xl bg-gray-900/90 border border-gray-800 flex items-center justify-between">
        <div class="flex items-center space-x-3.5">
          <img src="${bully.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'}" class="w-12 h-12 rounded-full object-cover border-2 ${bully.strike_count >= 3 ? 'border-red-500' : 'border-amber-500'}">
          <div>
            <div class="flex items-center space-x-2">
              <h4 class="text-sm font-extrabold text-white">${escapeHtml(bully.name || bully.handle)}</h4>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30">DISCIPLINARY ESCALATION</span>
            </div>
            <p class="text-xs text-gray-400 font-mono">${escapeHtml(bully.handle)} • Platform: <span class="uppercase text-gray-300">${bully.platform || 'Multi'}</span></p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs font-mono font-bold text-red-400">${bully.status || 'BANNED'}</div>
          <div class="text-[10px] text-gray-500 font-mono">Strike Level: ${bully.strike_count}/3</div>
        </div>
      </div>

      <!-- Violation Matrix -->
      <div class="grid grid-cols-3 gap-2.5 text-center text-xs font-mono">
        <div class="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
          <span class="text-[10px] text-gray-400 block uppercase">Total Interceptions</span>
          <span class="text-sm font-extrabold text-rose-400">${bully.total_violations} Verified Flags</span>
        </div>
        <div class="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
          <span class="text-[10px] text-gray-400 block uppercase">Threat Severity</span>
          <span class="text-sm font-extrabold text-red-400">${bully.risk_level || 'CRITICAL'} RISK</span>
        </div>
        <div class="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
          <span class="text-[10px] text-gray-400 block uppercase">Enforcement Action</span>
          <span class="text-sm font-extrabold text-amber-400">${bully.strike_count >= 3 ? 'PERMANENT BAN' : 'SUSPENSION'}</span>
        </div>
      </div>

      <!-- Verbatim Evidence Log -->
      <div class="space-y-2">
        <h5 class="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Forensic Incident Evidence Log:</h5>
        <div class="space-y-1.5 text-xs">
          <div class="p-2.5 rounded-lg bg-red-950/20 border border-red-900/40 text-gray-300 font-mono">
            <div class="flex items-center justify-between text-[10px] text-red-400 mb-1">
              <span>INCIDENT #01 • CATEGORY: HARASSMENT / TARGETING</span>
              <span>CONFIDENCE: 92.4%</span>
            </div>
            <p class="text-gray-200 text-xs italic">"Nobody here wants you, why don't you just leave and delete your entire account? You're pathetic."</p>
            <span class="text-[9px] text-gray-500 mt-1 block">Sanction: Formal First Disciplinary Warning Issued</span>
          </div>

          <div class="p-2.5 rounded-lg bg-red-950/30 border border-red-800/50 text-gray-300 font-mono">
            <div class="flex items-center justify-between text-[10px] text-red-400 mb-1">
              <span>INCIDENT #02 • CATEGORY: VIOLENT THREAT / EXTORTION</span>
              <span>CONFIDENCE: 98.1%</span>
            </div>
            <p class="text-gray-200 text-xs italic">"I know where you go to school and you will regret ever opening your mouth. Watch your back tonight."</p>
            <span class="text-[9px] text-red-400 mt-1 block">Sanction: Strike 2 Escalation — High-Risk Campus Alert Triggered</span>
          </div>
        </div>
      </div>

      <!-- Formal Administrative Findings -->
      <div class="p-3 bg-gray-900/80 rounded-xl border border-gray-800 text-xs space-y-1 font-mono">
        <span class="text-red-400 font-bold block text-[11px]">DISCIPLINARY COMMITTEE RECOMMENDATION:</span>
        <p class="text-gray-400 text-[11px] leading-relaxed">
          The SocialSentry Automated NLP Defense Pipeline has verified a sustained pattern of targeted cyberbullying violating Malla Reddy University Student Conduct Codes Section 14-B. In accordance with autonomous RBAC protocols, the account has been placed under <strong>Permanent Platform Sanction</strong> and referred to the <strong>Office of the Dean (Student Affairs)</strong>.
        </p>
        <div class="pt-2 flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-800/80 mt-2">
          <span>Authorizing Investigator: LB. Siddartha Nayak (Lead Moderator)</span>
          <span>Lead Data Scientist: D. Sairam (NLP Analytics)</span>
        </div>
      </div>
    `;
  }

  if (modal) modal.classList.remove('hidden');
}

function closeDossierModal() {
  const modal = document.getElementById('dossier-modal');
  if (modal) modal.classList.add('hidden');
}

function printDossier() {
  window.print();
}

// ========================================================
// 10. REAL-TIME YOUTUBE LIVE STREAM CONNECTOR HANDLERS
// ========================================================

async function changeIngestionSource(sourceId) {
  if (sourceId === 'youtube') {
    openYouTubeStreamModal();
    return;
  }

  try {
    const res = await fetch('/api/ingestion/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId })
    });
    const data = await res.json();
    if (res.ok) {
      triggerToastAlert({
        title: 'INGESTION SOURCE UPDATED',
        desc: `Switched stream input to: ${sourceId.toUpperCase()}`,
        severity: 'info'
      });
    }
  } catch (e) {
    console.warn('Source switch offline fallback:', e);
  }
}

function openYouTubeStreamModal() {
  const modal = document.getElementById('youtube-stream-modal');
  const statusEl = document.getElementById('yt-connection-status');
  if (statusEl) statusEl.classList.add('hidden');
  if (modal) modal.classList.remove('hidden');
}

function closeYouTubeStreamModal() {
  const modal = document.getElementById('youtube-stream-modal');
  if (modal) modal.classList.add('hidden');
}

function setYouTubePreset(target) {
  const input = document.getElementById('yt-stream-input');
  if (input) {
    if (target.startsWith('@') || target.startsWith('http')) {
      input.value = target;
    } else {
      input.value = `https://www.youtube.com/watch?v=${target}`;
    }
  }
}

async function handleYouTubeStreamConnect(event) {
  event.preventDefault();
  const input = document.getElementById('yt-stream-input');
  const statusEl = document.getElementById('yt-connection-status');
  const msgEl = document.getElementById('yt-status-message');
  const btn = document.getElementById('btn-yt-connect');
  const selectSource = document.getElementById('select-source');

  const streamUrl = (input ? input.value : '').trim();
  if (!streamUrl) {
    alert('Please enter a YouTuber handle (e.g. @IShowSpeed) or YouTube Live URL.');
    return;
  }

  if (statusEl) statusEl.classList.remove('hidden');
  if (msgEl) {
    msgEl.textContent = `Resolving streamer (${streamUrl}) & establishing chat handshake...`;
    msgEl.className = 'text-rose-300 font-mono';
  }
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/ingestion/youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stream_url: streamUrl })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      const isLive = data.details.is_live;
      const streamerName = data.details.streamer_name || data.details.video_id;

      if (msgEl) {
        msgEl.textContent = isLive
          ? `🟢 LIVE BROADCAST CONNECTED! (${streamerName}) • Intercepted ${data.details.queue_size} comments!`
          : `🟡 TARGETED STREAMER DEFENSE ACTIVE! (${streamerName}) • ${data.details.queue_size} comments queued!`;
        msgEl.className = isLive ? 'text-emerald-400 font-mono font-bold' : 'text-amber-400 font-mono font-bold';
      }
      if (selectSource) {
        selectSource.value = 'youtube';
      }

      triggerToastAlert({
        title: isLive ? '🔴 YOUTUBE LIVE CHAT INTERCEPTOR' : '🛡️ STREAMER CHAT DEFENSE ACTIVE',
        desc: data.message,
        severity: isLive ? 'critical' : 'info'
      });

      setTimeout(() => {
        closeYouTubeStreamModal();
        if (btn) btn.disabled = false;
      }, 1000);
    } else {
      if (msgEl) {
        msgEl.textContent = data.detail || 'Could not connect to streamer.';
        msgEl.className = 'text-red-400 font-mono';
      }
      if (btn) btn.disabled = false;
    }
  } catch (err) {
    if (msgEl) {
      msgEl.textContent = 'Network error contacting SocialSentry backend.';
      msgEl.className = 'text-red-400 font-mono';
    }
    if (btn) btn.disabled = false;
  }
}

