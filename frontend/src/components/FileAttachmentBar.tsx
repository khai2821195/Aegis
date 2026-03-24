import type { Attachment } from '../types';

const ACCEPTED = [
  'image/png','image/jpeg','image/gif','image/webp',
  'text/plain','text/markdown','text/csv','application/json',
  'text/javascript','text/typescript','text/html','text/css',
  'text/x-python','application/x-yaml','text/xml',
].join(',');

const TEXT_TYPES = ['text/', 'application/json', 'application/x-yaml'];
const MAX_IMAGE_MB = 5;
const MAX_TEXT_MB  = 1;

interface Props {
  attachments: Attachment[];
  onAdd: (files: Attachment[]) => void;
  onRemove: (index: number) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export default function FileAttachmentBar({ attachments, onAdd, onRemove, inputRef }: Props) {
  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const results: Attachment[] = [];

    for (const file of Array.from(fileList)) {
      const isImage = file.type.startsWith('image/');
      const isText  = TEXT_TYPES.some(t => file.type.startsWith(t));
      const maxMB   = isImage ? MAX_IMAGE_MB : MAX_TEXT_MB;

      if (file.size > maxMB * 1024 * 1024) {
        alert(`${file.name}: 파일 크기 초과 (최대 ${maxMB}MB)`);
        continue;
      }

      if (isImage) {
        const data = await readAsBase64(file);
        results.push({
          type: 'image',
          name: file.name,
          mimeType: file.type,
          data,
          previewUrl: URL.createObjectURL(file),
        });
      } else if (isText) {
        const data = await readAsText(file);
        results.push({ type: 'text', name: file.name, mimeType: file.type, data });
      }
    }

    if (results.length) onAdd(results);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <>
      {/* 숨긴 file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {/* 첨부 미리보기 */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-gray-800">
          {attachments.map((att, i) => (
            <div key={i} className="relative flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1.5 group">
              {att.type === 'image' && att.previewUrl ? (
                <img src={att.previewUrl} alt={att.name} className="w-8 h-8 rounded object-cover" />
              ) : (
                <span className="text-lg">{fileIcon(att.name)}</span>
              )}
              <span className="text-xs text-gray-300 max-w-[120px] truncate">{att.name}</span>
              <button
                onClick={() => onRemove(i)}
                className="ml-1 text-gray-400 hover:text-red-400 transition-colors text-xs"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = {
    py: '🐍', js: '🟨', ts: '🔷', json: '📋',
    csv: '📊', md: '📝', html: '🌐', css: '🎨', txt: '📄',
  };
  return icons[ext ?? ''] ?? '📎';
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // base64 부분만
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}
