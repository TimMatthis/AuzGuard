import React, { useEffect, useRef } from 'react';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  height?: string;
  placeholder?: string;
}

export function MonacoEditor({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  readOnly = false,
  height = '200px',
  placeholder = ''
}: MonacoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    // For now, we'll use a simple textarea since Monaco requires additional setup
    // In a real implementation, you would load Monaco Editor here
    return () => {
      if (monacoRef.current) {
        monacoRef.current.dispose();
      }
    };
  }, []);

  // Fallback to textarea for now
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        style={{ height, resize: 'vertical' }}
      />
      <div className="absolute top-2 right-2 text-xs text-gray-500">
        Monaco Editor would be integrated here
      </div>
    </div>
  );
}
