import OpenAI from 'openai';

export async function streamOpenAI({ apiKey, model, systemPrompt, messages, attachments, onChunk, onDone }) {
  const client = new OpenAI({ apiKey });

  // 마지막 user 메시지에 첨부파일 content 추가
  const formattedMessages = messages.map((m, i) => {
    const isLast = i === messages.length - 1;
    if (isLast && m.role === 'user' && attachments?.length) {
      const content = [];
      for (const att of attachments) {
        if (att.type === 'image') {
          content.push({
            type: 'image_url',
            image_url: { url: `data:${att.mimeType};base64,${att.data}` },
          });
        } else {
          content.push({ type: 'text', text: `[첨부파일: ${att.name}]\n${att.data}` });
        }
      }
      content.push({ type: 'text', text: m.content });
      return { role: m.role, content };
    }
    return { role: m.role, content: m.content };
  });

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...formattedMessages,
    ],
  });

  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  onDone(full);
}

export async function fetchOpenAIModels(apiKey) {
  const client = new OpenAI({ apiKey });
  const list = await client.models.list();
  return list.data
    .filter(m => m.id.startsWith('gpt'))
    .map(m => ({ id: m.id, name: m.id }))
    .sort((a, b) => b.id.localeCompare(a.id));
}
