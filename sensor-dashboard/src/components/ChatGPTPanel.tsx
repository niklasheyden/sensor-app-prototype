import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface ChatGPTPanelProps {
  sensorContext: {
    summary: Record<string, any>;
    locationData: Record<string, any>[];
  };
  className?: string;
  loading?: boolean;
  hasData?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatGPTPanel({ sensorContext, className, loading: dataLoading, hasData }: ChatGPTPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Only trigger summary after data is loaded and present
  useEffect(() => {
    if (dataLoading) return;
    if (!hasData) return;
    if (!sensorContext || !sensorContext.summary || !sensorContext.locationData) return;
    setHasFetched(false);
  }, [sensorContext, dataLoading, hasData]);

  useEffect(() => {
    if (dataLoading) return;
    if (!hasData) return;
    if (!sensorContext || !sensorContext.summary || !sensorContext.locationData) return;
    if (hasFetched) return;
    async function fetchSummary() {
      setLoading(true);
      const res = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], sensorContext }),
      });
      const data = await res.json();
      setMessages([{ role: 'assistant' as const, content: data.reply }]);
      setLoading(false);
      setHasFetched(true);
    }
    fetchSummary();
  }, [sensorContext, dataLoading, hasData, hasFetched]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    const res = await fetch('/api/chatgpt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages, sensorContext }),
    });
    const data = await res.json();
    setMessages([...newMessages, { role: 'assistant' as const, content: data.reply }]);
    setLoading(false);
  }

  return (
    <div className={`flex flex-col h-full w-full bg-white rounded-lg shadow p-4 border border-gray-200 ${className || ''}`} style={{ minHeight: 0 }}>
      <h3 className="text-lg font-semibold mb-2 text-gray-800">AI Climate Assistant</h3>
      <div className="flex-1 min-h-0 overflow-y-auto mb-2 space-y-2">
        {!hasData && (
          <div className="text-gray-500 text-center py-8">No data to analyze yet.</div>
        )}
        {hasData && messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            {msg.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none bg-gray-100 text-gray-900 rounded px-3 py-2">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <span className="bg-blue-100 text-blue-900 rounded px-3 py-2 inline-block">{msg.content}</span>
            )}
          </div>
        ))}
        {hasData && loading && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mb-2"></div>
            <div className="text-blue-600 font-semibold text-sm">AI is analyzing the data...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 mt-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-gray-900 bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about the climate, adaptation, etc..."
          disabled={loading || !hasData}
        />
        <button
          type="submit"
          className="px-4 py-1 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-semibold"
          disabled={loading || !input.trim() || !hasData}
        >
          Send
        </button>
      </form>
    </div>
  );
} 