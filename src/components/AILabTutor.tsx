/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { TotalCalculation, PointCharge, TestPoint } from '../types';
import { askGeminiTutor, ChatMessage } from '../services/geminiService';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  Key, 
  ChevronDown, 
  Loader2, 
  MessageSquare,
  HelpCircle,
  Zap,
  Layers,
  Compass
} from 'lucide-react';

interface AILabTutorProps {
  calculation: TotalCalculation;
  charges: PointCharge[];
  testPoint: TestPoint;
  activePresetTitle?: string;
}

export const AILabTutor: React.FC<AILabTutorProps> = ({
  calculation,
  charges,
  testPoint,
  activePresetTitle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyOverride, setApiKeyOverride] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '¡Hola! Soy tu **Tutor Virtual de Electromagnetismo** para el Laboratorio N° 1. Puedo explicarte los cálculos paso a paso del campo eléctrico $\\vec{E}$ y potencial $V$ según las cargas actuales en el simulador. ¿En qué te ayudo hoy?',
      timestamp: Date.now(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const reply = await askGeminiTutor(
        text,
        calculation,
        charges,
        testPoint,
        activePresetTitle,
        apiKeyOverride
      );

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        text: reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Error fetching AI reply:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          role: 'assistant',
          text: 'Ocurrió un error al procesar tu consulta. Intenta nuevamente.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: '⚡ Explicar Actividad 1 (Campo E)', query: 'Explícame paso a paso cómo calcular el campo eléctrico total de la Actividad 1 en el punto r₀.' },
    { label: '🌐 Explicar Actividad 2 (Potencial V)', query: 'Explícame cómo se determina el potencial eléctrico total de la Actividad 2 en el punto r₀.' },
    { label: '📐 ¿Cómo calcular vector unitario r̂?', query: '¿Cuál es la fórmula del vector unitario r̂_i y cómo se descompone en coordenadas?' },
    { label: '🌀 Líneas de campo vs Equipotenciales', query: '¿Qué relación geométrica y física existe entre las líneas de campo y las superficies equipotenciales?' },
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-semibold text-sm shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-200 ring-2 ring-white/20 animate-bounce"
          title="Abrir Tutor IA de Laboratorio"
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-600" />
          </div>
          <span>Tutor IA Lab</span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[420px] max-h-[580px] h-[85vh] bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-slate-950/80 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-100">Tutor Virtual de Física</h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                    En línea
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Guía interactiva • Lab N° 1</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className={`p-1.5 rounded-lg border transition ${
                  apiKeyOverride || showApiKeyInput
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Configurar Gemini API Key opcional"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Optional API Key Drawer */}
          {showApiKeyInput && (
            <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs space-y-2 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold flex items-center gap-1 text-purple-400">
                  <Key className="w-3 h-3" /> Gemini API Key (Opcional):
                </span>
                <span className="text-[10px] text-slate-500">Gemini 2.5 Flash</span>
              </div>
              <input
                type="password"
                placeholder="Pega tu API Key de Gemini..."
                value={apiKeyOverride}
                onChange={(e) => setApiKeyOverride(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-slate-500">
                Si no ingresas una clave, el simulador usará su motor integrado de explicaciones de física.
              </p>
            </div>
          )}

          {/* Chat Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                        : 'bg-slate-800/80 text-slate-200 rounded-bl-none border border-slate-700/60 shadow'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans space-y-1">
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>Analizando sistema físico...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.query)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 border border-slate-700 text-[11px] transition shrink-0"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Escribe tu consulta sobre el laboratorio..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-md shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
