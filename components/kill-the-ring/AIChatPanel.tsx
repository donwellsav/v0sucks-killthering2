'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Sparkles, Send, X, User, Bot, Loader2, AlertCircle } from 'lucide-react'
import type { Advisory, DetectorSettings } from '@/types/advisory'
import type { AgentSettings } from '@/types/agent'

interface AIChatPanelProps {
  advisories: Advisory[]
  settings: DetectorSettings
  isRunning: boolean
  agentSettings: AgentSettings
}

export function AIChatPanel({ advisories, settings, isRunning, agentSettings }: AIChatPanelProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ 
      api: '/api/chat',
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          message: messages[messages.length - 1],
          id,
          context: {
            advisories: advisories.slice(0, 10), // Send top 10 issues
            settings: {
              mode: settings.mode,
              feedbackThresholdDb: settings.feedbackThresholdDb,
              ringThresholdDb: settings.ringThresholdDb,
              growthRateThreshold: settings.growthRateThreshold,
              musicAware: settings.musicAware,
              eqPreset: settings.eqPreset,
            },
            isRunning,
          },
          agentSettings: {
            model: agentSettings.model,
            temperature: agentSettings.temperature,
            systemPrompt: agentSettings.systemPrompt,
          },
        },
      }),
    }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  // Helper to extract text from message parts
  const getMessageText = (message: typeof messages[0]): string => {
    if (!message.parts || !Array.isArray(message.parts)) return ''
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
  }

  // Helper to render tool calls
  const renderToolCall = (part: { type: string; toolInvocation?: { toolName: string; state: string; output?: string } }) => {
    if (part.type !== 'tool-invocation' || !part.toolInvocation) return null
    const { toolName, state, output } = part.toolInvocation
    
    return (
      <div key={toolName} className="my-2 p-2 bg-muted/50 rounded-md border border-border text-xs">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Sparkles className="w-3 h-3" />
          <span className="font-medium capitalize">{toolName.replace(/([A-Z])/g, ' $1').trim()}</span>
          {state === 'input-streaming' || state === 'input-available' ? (
            <Loader2 className="w-3 h-3 animate-spin ml-auto" />
          ) : null}
        </div>
        {state === 'output-available' && output && (
          <div className="text-foreground mt-1 whitespace-pre-wrap">{String(output)}</div>
        )}
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          aria-label="AI Assistant"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">AI</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[420px] sm:max-w-[420px] p-0 flex flex-col gap-0 border-l border-border bg-card"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 px-4 py-3 border-b border-border bg-card/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <SheetTitle className="text-sm font-semibold">Sound Engineer AI</SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-mono">
                {agentSettings.model.split('/')[1] || agentSettings.model}
              </span>
            </div>
          </div>
          {isRunning && advisories.length > 0 && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Monitoring {advisories.length} active issue{advisories.length !== 1 ? 's' : ''}
            </div>
          )}
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0">
          <div ref={scrollRef} className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-8 h-8 text-primary/50 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-foreground mb-1">Sound Engineer AI Assistant</h3>
                <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                  Ask me about feedback issues, EQ recommendations, or general live sound questions. I can see your current analysis in real-time.
                </p>
                <div className="mt-4 space-y-2">
                  <SuggestionChip onClick={() => { setInput('What issues do you see right now?'); }}>
                    What issues do you see?
                  </SuggestionChip>
                  <SuggestionChip onClick={() => { setInput('Suggest EQ cuts for the current feedback'); }}>
                    Suggest EQ cuts
                  </SuggestionChip>
                  <SuggestionChip onClick={() => { setInput('Explain the difference between feedback and resonance'); }}>
                    Feedback vs resonance
                  </SuggestionChip>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-foreground'
                    }`}
                  >
                    {message.parts?.map((part, index) => {
                      if (part.type === 'text') {
                        return <span key={index} className="whitespace-pre-wrap">{part.text}</span>
                      }
                      if (part.type === 'tool-invocation') {
                        return renderToolCall(part as { type: string; toolInvocation?: { toolName: string; state: string; output?: string } })
                      }
                      return null
                    })}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                </div>
                <div className="bg-muted/50 rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Error display */}
        {error && (
          <div className="flex-shrink-0 px-4 py-2 bg-destructive/10 border-t border-destructive/20">
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error.message || 'An error occurred'}</span>
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 p-3 border-t border-border bg-card/80">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about feedback, EQ, or live sound..."
              className="flex-1 h-9 px-3 text-sm bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 p-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function SuggestionChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-block px-3 py-1.5 text-xs bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full border border-border transition-colors"
    >
      {children}
    </button>
  )
}
