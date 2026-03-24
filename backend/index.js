import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { encrypt, decrypt } from './crypto.js';
import { streamGemini, fetchGeminiModels } from './providers/gemini.js';
import { streamAnthropic, fetchAnthropicModels } from './providers/anthropic.js';
import { streamOpenAI, fetchOpenAIModels } from './providers/openai.js';
import paymentRouter from './routes/payment.js';

const app = express();
app.use(cors());
app.use(express.json());

// 결제 & 라이선스 라우터
app.use('/api', paymentRouter);

// JWT로 사용자 인증 후 Supabase 클라이언트 반환
function getSupabaseForUser(authHeader) {
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// API 키 저장 (암호화)
app.put('/api/keys', async (req, res) => {
  const supabase = getSupabaseForUser(req.headers.authorization);
  if (!supabase) return res.status(401).json({ error: 'Unauthorized' });

  const { apiKeys } = req.body;
  if (!apiKeys) return res.status(400).json({ error: 'apiKeys required' });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const encrypted = encrypt(JSON.stringify(apiKeys));
    const { error } = await supabase
      .from('profiles')
      .update({ api_keys_encrypted: encrypted })
      .eq('id', user.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API 키 불러오기 (복호화)
app.get('/api/keys', async (req, res) => {
  const supabase = getSupabaseForUser(req.headers.authorization);
  if (!supabase) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('profiles')
      .select('api_keys_encrypted')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    if (!data?.api_keys_encrypted) return res.json({ apiKeys: null });

    const apiKeys = JSON.parse(decrypt(data.api_keys_encrypted));
    res.json({ apiKeys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 사용 가능한 모델 목록 조회
app.get('/api/models', async (req, res) => {
  const supabase = getSupabaseForUser(req.headers.authorization);
  if (!supabase) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { provider, key } = req.query;
  if (!provider || !key) return res.status(400).json({ error: 'provider and key required' });

  try {
    let models = [];
    if (provider === 'gemini') models = await fetchGeminiModels(key);
    else if (provider === 'anthropic') models = await fetchAnthropicModels(key);
    else if (provider === 'openai') models = await fetchOpenAIModels(key);
    else return res.status(400).json({ error: 'Unknown provider' });

    res.json({ models });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// 채팅 스트리밍
app.post('/api/chat', async (req, res) => {
  const supabase = getSupabaseForUser(req.headers.authorization);
  if (!supabase) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { provider, apiKey, model, systemPrompt, messages, attachments } = req.body;

  if (!provider || !model || !messages?.length) {
    return res.status(400).json({ error: 'provider, model, messages required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const key = apiKey || process.env[`${provider.toUpperCase()}_API_KEY`] || '';

    const opts = {
      apiKey: key,
      model,
      systemPrompt: systemPrompt || '',
      messages,
      attachments: attachments || [],
      onChunk: (text) => send({ type: 'chunk', text }),
      onDone: (full) => {
        send({ type: 'done', text: full });
        res.end();
      },
    };

    if (provider === 'gemini') await streamGemini(opts);
    else if (provider === 'anthropic') await streamAnthropic(opts);
    else if (provider === 'openai') await streamOpenAI(opts);
    else throw new Error('Unknown provider');
  } catch (err) {
    console.error('[chat error]', err.message);
    send({ type: 'error', message: err.message });
    res.end();
  }
});

// Electron 패키지 환경에서 frontend 정적 파일 서빙
// FRONTEND_DIST 환경변수 우선, 없으면 상대경로 fallback
const frontendDist = process.env.FRONTEND_DIST || join(__dirname, '../frontend/dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`AI Meeting Room backend running on :${PORT}`));
