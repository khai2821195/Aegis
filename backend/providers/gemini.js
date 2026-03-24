import { GoogleGenerativeAI } from '@google/generative-ai';

export async function streamGemini({ apiKey, model, systemPrompt, messages, attachments, onChunk, onDone }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  });

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  // 첨부파일 parts 구성
  const parts = [];
  if (attachments?.length) {
    for (const att of attachments) {
      if (att.type === 'image') {
        parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
      } else {
        parts.push({ text: `[첨부파일: ${att.name}]\n${att.data}` });
      }
    }
  }
  parts.push({ text: lastMessage.content });

  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessageStream(parts);

  let full = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    full += text;
    onChunk(text);
  }
  onDone(full);
}

export async function fetchGeminiModels(apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`
  );
  if (!res.ok) throw new Error('Invalid Gemini API key');
  const data = await res.json();
  return (data.models || [])
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => ({
      id: m.name.replace('models/', ''),
      name: m.displayName || m.name.replace('models/', ''),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
