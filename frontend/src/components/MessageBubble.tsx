import type { Message, Persona } from '../types';

interface Props {
  message: Message;
  personas: Persona[];
  facilitatorId?: string;
}

export default function MessageBubble({ message, personas, facilitatorId }: Props) {
  const isUser = message.personaId === 'user';
  const persona = personas.find(p => p.id === message.personaId);
  const isFacilitator = persona?.id === facilitatorId;

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[70%]">
          <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-base leading-relaxed">
            {message.content}
          </div>
          <p className="text-right text-gray-400 text-xs mt-1">대표님</p>
        </div>
      </div>
    );
  }

  if (!persona) return null;

  return (
    <div className="flex gap-3 mb-4">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-1"
        style={{ backgroundColor: persona.color.bg }}
      >
        {isFacilitator ? '🎤' : persona.emoji}
      </div>
      <div className="max-w-[75%]">
        <p className="text-xs font-medium mb-1" style={{ color: persona.color.text }}>
          {persona.name}
          {isFacilitator && (
            <span className="text-indigo-400 font-normal ml-1">· 사회</span>
          )}
          <span className="text-gray-400 font-normal ml-1">· {persona.role}</span>
        </p>
        <div className={`text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-base leading-relaxed whitespace-pre-wrap ${
          isFacilitator ? 'bg-gray-800 border border-indigo-900/40' : 'bg-gray-800'
        }`}>
          {message.content}
          {message.streaming && (
            <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse ml-1 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
