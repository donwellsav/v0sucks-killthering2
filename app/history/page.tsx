'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getEventLogger, type LogEntry, type FeedbackIssueLog } from '@/lib/logging/eventLogger'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  Home,
  Download,
  Trash2,
  FileJson,
  FileText,
  TableIcon,
  Activity,
  Radio,
  AlertTriangle,
  TrendingUp,
  Clock,
  Filter,
} from 'lucide-react'

type FilterType = 'all' | 'issue_detected' | 'analysis_started' | 'analysis_stopped' | 'settings_changed'

const SEVERITY_COLORS: Record<string, string> = {
  RUNAWAY:   'text-red-400   bg-red-400/10   border-red-400/30',
  GROWING:   'text-amber-400 bg-amber-400/10 border-amber-400/30',
  RESONANCE: 'text-sky-400   bg-sky-400/10   border-sky-400/30',
  STABLE:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
}

const SEVERITY_BAR: Record<string, string> = {
  RUNAWAY:   'bg-red-400',
  GROWING:   'bg-amber-400',
  RESONANCE: 'bg-sky-400',
  STABLE:    'bg-emerald-400',
}

function formatHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(2)}kHz` : `${hz.toFixed(0)}Hz`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '< 1s'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

// Frequency band breakdown helper
function getFreqBand(hz: number): string {
  if (hz < 250) return 'Low'
  if (hz < 500) return 'Low-Mid'
  if (hz < 2000) return 'Mid'
  if (hz < 5000) return 'Upper-Mid'
  return 'High'
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const logger = getEventLogger()

  useEffect(() => {
    setLogs(logger.getLogs())
    const unsub = logger.subscribe(setLogs)
    return unsub
  }, [])

  const stats = logger.getStats()
  const issueLogs = logs.filter(l => l.type === 'issue_detected') as FeedbackIssueLog[]

  // Frequency band distribution
  const bandCounts = issueLogs.reduce<Record<string, number>>((acc, l) => {
    const band = getFreqBand(l.data.frequency)
    acc[band] = (acc[band] || 0) + 1
    return acc
  }, {})
  const maxBandCount = Math.max(...Object.values(bandCounts), 1)

  const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter)
  const reversedFiltered = [...filtered].reverse()

  const handleExport = (format: 'csv' | 'json' | 'text') => {
    let content = ''
    let filename = `ktr-history_${new Date().toISOString().split('T')[0]}`
    let mimeType = 'text/plain'
    switch (format) {
      case 'csv': content = logger.exportAsCSV(); filename += '.csv'; mimeType = 'text/csv'; break
      case 'json': content = logger.exportAsJSON(); filename += '.json'; mimeType = 'application/json'; break
      case 'text': content = logger.exportAsText(); filename += '.txt'; break
    }
    const blob = new Blob([content], { type: mimeType })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
    logger.logExport(format, logs.length)
  }

  const handleClear = () => {
    if (confirm('Clear all session history? This cannot be undone.')) logger.clearLogs()
  }

  const FILTERS: { value: FilterType; label: string }[] = [
    { value: 'all',               label: `All (${logs.length})` },
    { value: 'issue_detected',    label: `Issues (${issueLogs.length})` },
    { value: 'analysis_started',  label: `Started (${logs.filter(l => l.type === 'analysis_started').length})` },
    { value: 'settings_changed',  label: `Settings (${logs.filter(l => l.type === 'settings_changed').length})` },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kill The Ring</span>
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Session History</span>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={logs.length === 0}
            className="h-7 text-xs text-destructive hover:text-destructive gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={logs.length === 0}
            className="h-7 text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">

        {logs.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-12 h-12 rounded-full border border-border bg-muted/50 flex items-center justify-center">
              <Activity className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1">No session history yet</h2>
              <p className="text-xs text-muted-foreground max-w-xs">
                Start analysis on the main page to begin recording feedback events, settings changes, and session activity.
              </p>
            </div>
            <Link href="/">
              <Button size="sm" className="mt-2">Go to analyzer</Button>
            </Link>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

            {/* Left panel: Stats + Distribution */}
            <aside className="flex-shrink-0 lg:w-64 xl:w-72 border-b lg:border-b-0 lg:border-r border-border bg-card/30 overflow-y-auto">
              <div className="p-4 space-y-5">

                {/* Stat cards */}
                <section>
                  <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Session Stats</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                    <StatCard icon={<Radio className="w-3.5 h-3.5" />}      label="Issues Detected"  value={stats.issuesDetected.toString()} />
                    <StatCard icon={<Activity className="w-3.5 h-3.5" />}   label="Total Events"     value={stats.totalEvents.toString()} />
                    <StatCard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Avg Frequency"    value={stats.avgFrequency > 0 ? formatHz(stats.avgFrequency) : '—'} mono />
                    <StatCard icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Avg Amplitude" value={stats.avgAmplitude !== 0 ? `${stats.avgAmplitude.toFixed(1)}dB` : '—'} mono />
                    <StatCard icon={<Clock className="w-3.5 h-3.5" />}      label="Session Length"   value={formatDuration(stats.sessionDuration)} />
                  </div>
                </section>

                {/* Severity breakdown */}
                {Object.keys(stats.severities).length > 0 && (
                  <section>
                    <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Severity</h2>
                    <div className="space-y-2">
                      {Object.entries(stats.severities)
                        .sort(([, a], [, b]) => b - a)
                        .map(([sev, count]) => (
                          <div key={sev} className="flex items-center gap-2">
                            <span className={cn(
                              'text-[10px] font-medium px-1.5 py-0.5 rounded border w-20 text-center flex-shrink-0',
                              SEVERITY_COLORS[sev] ?? 'text-muted-foreground bg-muted/50 border-border'
                            )}>
                              {sev}
                            </span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', SEVERITY_BAR[sev] ?? 'bg-muted-foreground')}
                                style={{ width: `${(count / stats.issuesDetected) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground w-5 text-right">{count}</span>
                          </div>
                        ))}
                    </div>
                  </section>
                )}

                {/* Frequency band distribution */}
                {Object.keys(bandCounts).length > 0 && (
                  <section>
                    <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Freq Bands</h2>
                    <div className="space-y-2">
                      {['Low', 'Low-Mid', 'Mid', 'Upper-Mid', 'High'].map(band => {
                        const count = bandCounts[band] ?? 0
                        return (
                          <div key={band} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">{band}</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${(count / maxBandCount) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground w-5 text-right">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* Export */}
                <section>
                  <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Export</h2>
                  <div className="space-y-1.5">
                    <ExportRow icon={<TableIcon className="w-3.5 h-3.5" />}  label="CSV"  desc="Excel / Sheets"  onClick={() => handleExport('csv')}  disabled={logs.length === 0} />
                    <ExportRow icon={<FileJson className="w-3.5 h-3.5" />}  label="JSON" desc="Full data"       onClick={() => handleExport('json')} disabled={logs.length === 0} />
                    <ExportRow icon={<FileText className="w-3.5 h-3.5" />}  label="Text" desc="Human-readable"  onClick={() => handleExport('text')} disabled={logs.length === 0} />
                  </div>
                </section>
              </div>
            </aside>

            {/* Right panel: Event log */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Filter bar */}
              <div className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 border-b border-border bg-card/20">
                <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex items-center gap-1 flex-wrap">
                  {FILTERS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFilter(f.value)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        filter === f.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Events list */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="divide-y divide-border">
                  {reversedFiltered.length === 0 ? (
                    <p className="py-12 text-center text-xs text-muted-foreground">No events match this filter</p>
                  ) : (
                    reversedFiltered.map(log => (
                      <LogRow key={log.id} log={log} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ---------- Sub-components ----------

function StatCard({
  icon, label, value, mono,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="border border-border rounded-md p-2.5 bg-card/50 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <span className={cn('text-sm font-semibold text-foreground', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

function ExportRow({
  icon, label, desc, onClick, disabled,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 p-2 rounded-md border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground ml-1.5">{desc}</span>
      </span>
      <Download className="w-3 h-3 text-muted-foreground flex-shrink-0" />
    </button>
  )
}

function LogRow({ log }: { log: LogEntry }) {
  const isIssue = log.type === 'issue_detected'
  const issueLog = isIssue ? (log as FeedbackIssueLog) : null

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
      {/* Time */}
      <div className="flex-shrink-0 text-right w-16">
        <div className="text-[10px] font-mono text-muted-foreground">{formatTime(log.timestamp)}</div>
        <div className="text-[9px] text-muted-foreground/50">{formatDate(log.timestamp)}</div>
      </div>

      {/* Type badge */}
      <div className="flex-shrink-0 pt-0.5">
        <span className={cn(
          'text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wide',
          log.type === 'issue_detected'    && 'text-amber-400 bg-amber-400/10 border-amber-400/30',
          log.type === 'analysis_started'  && 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
          log.type === 'analysis_stopped'  && 'text-muted-foreground bg-muted/50 border-border',
          log.type === 'settings_changed'  && 'text-sky-400 bg-sky-400/10 border-sky-400/30',
          log.type === 'export'            && 'text-primary bg-primary/10 border-primary/30',
        )}>
          {log.type.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Detail */}
      <div className="flex-1 min-w-0">
        {issueLog ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-mono font-semibold text-foreground">
              {formatHz(issueLog.data.frequency)}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {issueLog.data.amplitude.toFixed(1)}dB
            </span>
            <span className={cn(
              'text-[9px] font-medium px-1.5 py-0.5 rounded border',
              SEVERITY_COLORS[issueLog.data.severity] ?? 'text-muted-foreground bg-muted/50 border-border'
            )}>
              {issueLog.data.severity}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {issueLog.data.classification.replace(/_/g, ' ').toLowerCase()}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              Q {issueLog.data.qFactor.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              {issueLog.data.growthRate.toFixed(1)}dB/s
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {Object.entries(log.data)
              .slice(0, 4)
              .map(([k, v]) => (
                <span key={k} className="text-[10px] text-muted-foreground">
                  <span className="text-muted-foreground/50">{k}: </span>
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
