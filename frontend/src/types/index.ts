export type Provider = 'gemini' | 'anthropic' | 'openai';

export interface ModelOption {
  id: string;
  name: string;
}

export interface ApiKeys {
  gemini: string;
  anthropic: string;
  openai: string;
}

export interface PersonaModel {
  provider: Provider;
  modelId: string;
}

export interface ColorScheme {
  bg: string;   // hex - avatar background
  text: string; // hex - name text color
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  description?: string;
  color: ColorScheme;
  emoji: string;
  systemPrompt: string;
  isCustom?: boolean;
}

export interface Attachment {
  type: 'image' | 'text';
  name: string;
  mimeType: string;
  data: string;       // image: base64 / text: raw content
  previewUrl?: string; // image preview용 object URL
}

export interface Message {
  id: string;
  personaId: string; // 'user' | persona id
  content: string;
  timestamp: number;
  streaming?: boolean;
  attachments?: Attachment[];
}

export interface Settings {
  apiKeys: ApiKeys;
  personaModels: Record<string, PersonaModel>;
  personas: Persona[];          // all personas (default + custom)
  attendeeIds: string[];        // selected for current meeting (max 10)
}
