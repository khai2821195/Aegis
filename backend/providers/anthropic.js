import Anthropic from '@anthropic-ai/sdk';

export async function streamAnthropic({ apiKey, model, systemPrompt, messages, attachments, onChunk, onDone }) {
  const client = new Anthropic({ apiKey });

  // 마지막 user 메시지에 첨부파일 content blocks 추가
  const formattedMessages = messages.map((m, i) => {
    const isLast = i === messages.length - 1;
    if (isLast && m.role === 'user' && attachments?.length) {
      const content = [];
      for (const att of attachments) {
        if (att.type === 'image') {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: att.mimeType, data: att.data },
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

  const stream = client.messages.stream({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: formattedMessages,
  });

  let full = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      full += event.delta.text;
      onChunk(event.delta.text);
    }
  }
  onDone(full);
}

export async function fetchAnthropicModels(apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });
  if (!res.ok) throw new Error('Invalid Anthropic API key');
  const data = await res.json();
  return (data.data || []).map(m => ({
    id: m.id,
    name: m.display_name || m.id,
  }));
}
