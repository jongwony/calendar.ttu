'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { extractMydutyUrl } from '@/app/lib/myduty'

const API_BASE = 'https://9e240d7v0k.execute-api.ap-northeast-2.amazonaws.com/api'
const MAX_POLL_ERRORS = 8

type Status = 'idle' | 'submitting' | 'polling' | 'completed' | 'failed' | 'timeout'

interface JobResult {
  events_created: number
  events_skipped: number
}

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

export default function App() {
  const now = new Date()
  const [rawText, setRawText] = useState('')
  const [extractedUrl, setExtractedUrl] = useState<string | null>(null)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<JobResult | null>(null)
  const [error, setError] = useState('')

  const pollTimer = useRef<ReturnType<typeof setTimeout>>()
  const timeoutTimer = useRef<ReturnType<typeof setTimeout>>()
  const pollCount = useRef(0)
  const errorCount = useRef(0)
  const hadSuccessfulPoll = useRef(false)
  const abortRef = useRef<AbortController>()

  useEffect(() => {
    return () => {
      clearTimeout(pollTimer.current)
      clearTimeout(timeoutTimer.current)
      abortRef.current?.abort()
    }
  }, [])

  const handleTextChange = (text: string) => {
    setRawText(text)
    setExtractedUrl(extractMydutyUrl(text))
  }

  const poll = useCallback((jobId: string) => {
    pollCount.current++
    const delay = Math.min(pollCount.current * 1000, 5000)

    pollTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/ttu_gaeng/duty/${jobId}`, {
          signal: abortRef.current?.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        errorCount.current = 0
        hadSuccessfulPoll.current = true
        if (data.status === 'completed') {
          setStatus('completed')
          setResult(data.result)
          clearTimeout(timeoutTimer.current)
        } else if (data.status === 'failed') {
          setStatus('failed')
          setError(data.error || '처리 중 오류가 발생했습니다')
          clearTimeout(timeoutTimer.current)
        } else {
          poll(jobId)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        errorCount.current++
        if (errorCount.current >= MAX_POLL_ERRORS) {
          setStatus('failed')
          setError('서버와의 연결이 불안정합니다')
          clearTimeout(timeoutTimer.current)
          return
        }
        poll(jobId)
      }
    }, delay)
  }, [])

  const submit = async () => {
    if (!extractedUrl || status === 'submitting' || status === 'polling') return

    setStatus('submitting')
    setError('')
    setResult(null)
    pollCount.current = 0
    errorCount.current = 0
    hadSuccessfulPoll.current = false
    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${API_BASE}/ttu_gaeng/duty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: year.toString(),
          month: month.toString(),
          website: extractedUrl,
        }),
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error('요청에 실패했습니다')

      const { job_id } = await res.json()
      if (!job_id) throw new Error('서버에서 작업 ID를 받지 못했습니다')
      setStatus('polling')
      poll(job_id)

      timeoutTimer.current = setTimeout(() => {
        clearTimeout(pollTimer.current)
        setStatus('timeout')
        if (!hadSuccessfulPoll.current) {
          setError('서버에 연결할 수 없습니다')
        }
      }, 60000)
    } catch (e) {
      setStatus('failed')
      setError(e instanceof Error ? e.message : '요청에 실패했습니다')
    }
  }

  const reset = () => {
    setStatus('idle')
    setError('')
    setResult(null)
    clearTimeout(pollTimer.current)
    clearTimeout(timeoutTimer.current)
    abortRef.current?.abort()
  }

  const isWorking = status === 'submitting' || status === 'polling'
  const isDone = status === 'completed' || status === 'failed' || status === 'timeout'

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-[440px]">

        {/* Editorial Header */}
        <div className="mb-10 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#b5a89a] mb-3">
            Calendar Sync
          </p>
          <h1 className="font-display text-[2.5rem] leading-none font-medium tracking-tight text-[#2c2116]">
            TTU <em className="font-light">Gaeng</em>
          </h1>
          <div className="w-8 h-[1.5px] bg-[#c0613a] mx-auto mt-4 mb-3 rounded-full" />
          <p className="text-[13px] text-[#8a7e70] leading-relaxed">
            근무표에서 캘린더로, 한 번에
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7 sm:p-8 border border-[#ece4d9]"
          style={{
            background: '#fffdf8',
            boxShadow: '0 1px 3px rgba(44, 33, 22, 0.04), 0 8px 32px rgba(44, 33, 22, 0.06)',
          }}
        >

          {/* Paste Zone */}
          <div className="mb-7">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8a7e70] mb-2.5">
              근무표 링크
            </label>
            <textarea
              value={rawText}
              onChange={e => handleTextChange(e.target.value)}
              disabled={isWorking}
              placeholder="카카오톡에서 받은 메시지를 그대로 붙여넣으세요"
              rows={3}
              className={`
                w-full rounded-xl px-4 py-3.5 text-sm leading-relaxed resize-none
                bg-[#f8f4ee] placeholder-[#c4b9ab]
                transition-all duration-200 outline-none
                ${isWorking
                  ? 'opacity-40 cursor-not-allowed border border-[#e5ddd2]'
                  : 'border border-[#e5ddd2] hover:border-[#d4c9b9] focus:border-[#c0613a]/40 focus:bg-[#faf7f2]'
                }
                ${rawText && !extractedUrl ? 'border-[#c05c5c]/30 bg-[#fdf5f5]' : ''}
              `}
            />

            {/* Extracted URL */}
            {extractedUrl && (
              <div className="mt-3 animate-slide-up flex items-start gap-3 pl-4 pr-4 py-3 rounded-lg border-l-[3px] border-l-[#5e8c50] bg-[#f4f8f2]">
                <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5e8c50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5e8c50] mb-1">링크 감지됨</p>
                  <p className="text-xs text-[#4a6b40] font-mono break-all leading-relaxed">{extractedUrl}</p>
                </div>
              </div>
            )}
            {rawText && !extractedUrl && (
              <p className="mt-2.5 text-[11px] text-[#c05c5c]/70 animate-fade-in pl-1">
                myduty.io 링크를 찾을 수 없습니다
              </p>
            )}
          </div>

          {/* Period */}
          <div className="mb-8">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8a7e70] mb-3">
              기간 선택
            </label>

            {/* Year */}
            <div className="flex items-center gap-2.5 mb-3.5">
              <button
                onClick={() => setYear(y => y - 1)}
                disabled={isWorking}
                className="w-9 h-9 rounded-full border border-[#e5ddd2] bg-[#faf7f2] text-[#8a7e70] hover:text-[#2c2116] hover:border-[#d4c9b9] transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="font-display text-xl font-medium text-[#2c2116] tabular-nums w-14 text-center">
                {year}
              </span>
              <button
                onClick={() => setYear(y => y + 1)}
                disabled={isWorking}
                className="w-9 h-9 rounded-full border border-[#e5ddd2] bg-[#faf7f2] text-[#8a7e70] hover:text-[#2c2116] hover:border-[#d4c9b9] transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-6 gap-2">
              {MONTHS.map((label, i) => {
                const m = i + 1
                const selected = m === month
                return (
                  <button
                    key={m}
                    onClick={() => setMonth(m)}
                    disabled={isWorking}
                    className={`
                      h-10 rounded-xl text-xs font-medium transition-all duration-200
                      disabled:opacity-30 disabled:cursor-not-allowed
                      ${selected
                        ? 'bg-[#c0613a] text-white font-semibold shadow-md shadow-[#c0613a]/15'
                        : 'bg-[#f8f4ee] text-[#8a7e70] border border-[#ece4d9] hover:bg-[#f2ece3] hover:text-[#2c2116] hover:border-[#d4c9b9]'
                      }
                    `}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action */}
          {!isDone && (
            <button
              onClick={submit}
              disabled={!extractedUrl || isWorking}
              className={`
                w-full h-[52px] rounded-xl font-semibold text-[15px] transition-all duration-200
                ${isWorking
                  ? 'bg-[#f5e6db] text-[#c0613a] cursor-default'
                  : extractedUrl
                    ? 'bg-[#c0613a] text-white hover:bg-[#a85330] active:scale-[0.98] shadow-lg shadow-[#c0613a]/15'
                    : 'bg-[#ece4d9] text-[#b5a89a] cursor-not-allowed'
                }
              `}
            >
              {isWorking ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="animate-spin-gentle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {status === 'submitting' ? '요청 중...' : '캘린더에 옮기는 중...'}
                </span>
              ) : (
                '동기화 시작'
              )}
            </button>
          )}

          {/* Results */}
          {isDone && (
            <div className="animate-slide-up space-y-3">
              {status === 'completed' && result && (
                <div className="rounded-xl border-l-[3px] border-l-[#5e8c50] bg-[#f4f8f2] border border-[#dde8d8] p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5e8c50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span className="text-sm font-semibold text-[#3d6832]">동기화 완료</span>
                  </div>
                  <p className="text-xs text-[#5e8c50] pl-[30px]">
                    <span className="font-display text-base font-medium text-[#3d6832]">{result.events_created}</span>개 일정 생성
                    <span className="mx-2 text-[#b5caa8]">/</span>
                    <span className="font-display text-base font-medium text-[#3d6832]">{result.events_skipped}</span>개 건너뜀
                  </p>
                </div>
              )}

              {status === 'failed' && (
                <div className="rounded-xl border-l-[3px] border-l-[#c05c5c] bg-[#fdf5f5] border border-[#e8d4d4] p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c05c5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <span className="text-sm font-semibold text-[#8b3a3a]">동기화 실패</span>
                  </div>
                  <p className="text-xs text-[#9a6060] pl-[30px]">{error}</p>
                </div>
              )}

              {status === 'timeout' && (
                <div className="rounded-xl border-l-[3px] border-l-[#b88a38] bg-[#fdf9f0] border border-[#e8ddc4] p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span className="text-sm font-semibold text-[#7a5c20]">시간 초과</span>
                  </div>
                  <p className="text-xs text-[#9a8050] pl-[30px]">
                    {error || '백그라운드에서 처리 중일 수 있습니다'}
                  </p>
                </div>
              )}

              <button
                onClick={reset}
                className="w-full h-11 rounded-xl border border-[#e5ddd2] text-sm font-medium text-[#8a7e70] hover:text-[#2c2116] hover:border-[#d4c9b9] hover:bg-[#f8f4ee] transition-all duration-150"
              >
                다시 시작
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-[#c4b9ab] mt-8 tracking-widest uppercase">
          calendar.ttu.world
        </p>
      </div>
    </div>
  )
}
