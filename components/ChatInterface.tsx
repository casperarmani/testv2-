'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConversationHistory, addToConversationHistory, clearConversationHistory } from '@/lib/kv';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

// For simplicity, we're using a fixed user ID. In a real app, you'd use authentication.
const USER_ID = 'default-user';

export default function ChatInterface() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    try {
      const history = await getConversationHistory(USER_ID);
      setMessages(history.map(msg => {
        try {
          return JSON.parse(msg);
        } catch (e) {
          console.error('Failed to parse message:', msg);
          return { role: 'system', content: 'Error: Failed to load message' };
        }
      }));
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation history. Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await addToConversationHistory(USER_ID, JSON.stringify(userMessage));

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const chat = model.startChat({
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      const context = messages.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n');
      const prompt = `Context:\n${context}\n\nUser: ${input}\n\nAssistant:`;

      const result = await chat.sendMessage(prompt);
      const response = result.response.text();

      if (!response) {
        throw new Error('No response generated from AI');
      }

      const assistantMessage = { role: 'assistant', content: response };
      setMessages((prev) => [...prev, assistantMessage]);
      await addToConversationHistory(USER_ID, JSON.stringify(assistantMessage));
    } catch (error) {
      console.error('Error in chat interface:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearConversationHistory(USER_ID);
      setMessages([]);
      toast({
        title: 'Success',
        description: 'Conversation history cleared',
      });
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear conversation history. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-[80vh] max-w-2xl mx-auto border rounded-lg overflow-hidden">
      <ScrollArea className="flex-grow p-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 ${
              msg.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <span
              className={`inline-block p-2 rounded-lg ${
                msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
              }`}
            >
              {msg.content}
            </span>
          </div>
        ))}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
      <div className="p-4 border-t">
        <Button onClick={handleClearHistory} variant="outline">
          Clear History
        </Button>
      </div>
    </div>
  );
}