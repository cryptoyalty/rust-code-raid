'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Room, RoomStats, Code } from '@/lib/supabase/types'
import { 
  X, 
  Check, 
  Users, 
  ArrowLeft, 
  Shield,
  Activity,
  Target,
  Undo2,
  Trophy
} from 'lucide-react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const mainStageRef = useRef<HTMLDivElement>(null)
  const [keyboardFlash, setKeyboardFlash] = useState<'green' | 'red' | null>(null)

  // State
  const [room, setRoom] = useState<Room | null>(null)
  const [stats, setStats] = useState<RoomStats>({
    total_codes: 10000,
    pending_codes: 10000,
    testing_codes: 0,
    failed_codes: 0,
    success_codes: 0,
  })
  const [currentCode, setCurrentCode] = useState<{ id: string; value: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`)
  const [activeUsers, setActiveUsers] = useState<number>(1)
  const [recentFails, setRecentFails] = useState<string[]>([])
  const [processedCodes, setProcessedCodes] = useState<Set<string>>(new Set())
  const [showCelebration, setShowCelebration] = useState(false)
  const [winningCode, setWinningCode] = useState<string>('')
  const [winningCodeId, setWinningCodeId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [codeKey, setCodeKey] = useState(0)
  const [showUndoToast, setShowUndoToast] = useState(false)
  const [lastFailedCode, setLastFailedCode] = useState<{ id: string; value: string } | null>(null)
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Confetti effect
  const fireConfetti = () => {
    const duration = 5000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#10b981', '#34d399', '#6ee7b7'],
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#10b981', '#34d399', '#6ee7b7'],
      })
    }, 250)
  }

  // Keyboard flash effect
  const triggerFlash = (color: 'green' | 'red') => {
    setKeyboardFlash(color)
    setTimeout(() => setKeyboardFlash(null), 300)
  }

  // Load room data
  useEffect(() => {
    const loadRoom = async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single()

        if (error) throw error
        setRoom(data)
      } catch (err) {
        console.error('Error loading room:', err)
        setError('Failed to load room')
      }
    }

    loadRoom()
  }, [roomId])

  // Load initial stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/stats`)
        const data = await response.json()
        if (data.stats) {
          setStats(data.stats)
        }
      } catch (err) {
        console.error('Error loading stats:', err)
      }
    }

    loadStats()
  }, [roomId])

  // Real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      channel = supabase.channel(`room:${roomId}`)

      channel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'codes',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            const code = payload.new as Code
            const codeId = `${code.id}-${code.status}`

            // Prevent duplicate processing
            if (processedCodes.has(codeId)) return
            setProcessedCodes(prev => new Set(prev).add(codeId))

            setStats((prev) => {
              const updated = { ...prev }
              
              if (code.status === 'failed') {
                updated.failed_codes = prev.failed_codes + 1
                updated.testing_codes = Math.max(0, prev.testing_codes - 1)
                
                // Add to recent fails
                setRecentFails((prevFails) => {
                  // Check if already in list
                  if (prevFails.includes(code.code)) return prevFails
                  return [code.code, ...prevFails.slice(0, 9)]
                })
              } else if (code.status === 'success') {
                updated.success_codes = prev.success_codes + 1
                updated.testing_codes = Math.max(0, prev.testing_codes - 1)
                
                setWinningCode(code.code)
                setWinningCodeId(code.id)
                setShowCelebration(true)
                fireConfetti()
              } else if (code.status === 'testing') {
                updated.testing_codes = prev.testing_codes + 1
                updated.pending_codes = Math.max(0, prev.pending_codes - 1)
              } else if (code.status === 'pending') {
                updated.pending_codes = prev.pending_codes + 1
                updated.success_codes = Math.max(0, prev.success_codes - 1)
              }

              return updated
            })
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [roomId, processedCodes])

  // Presence tracking
  useEffect(() => {
    const channel = supabase.channel(`presence:${roomId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setActiveUsers(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, userId])

  // Fetch next code
  const fetchNextCode = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/codes/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch code')
      }

      if (!data.code) {
        setError('All codes tested')
        setCurrentCode(null)
      } else {
        setCurrentCode({ id: data.code.id, value: data.code.value })
        setCodeKey(prev => prev + 1)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [roomId, userId, isLoading])

  // Load first code
  useEffect(() => {
    fetchNextCode()
  }, [])

  // Mark code as incorrect
  const handleIncorrect = async () => {
    if (!currentCode || isLoading || isProcessing) return
    
    setIsProcessing(true)
    const codeToMark = currentCode
    triggerFlash('red')
    
    try {
      // Save the code we're about to mark as failed (for undo)
      setLastFailedCode(codeToMark)
      
      // Mark as failed FIRST before fetching next code
      const response = await fetch(`/api/codes/${codeToMark.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed' }),
      })
      
      if (!response.ok) {
        console.error('Failed to mark code as failed:', await response.text())
      }
      
      // Wait a tiny bit for the database update to propagate
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Now fetch next code
      await fetchNextCode()
      
      // Show undo toast
      setShowUndoToast(true)
      
      // Clear any existing timeout
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current)
      }
      
      // Auto-hide toast after 15 seconds
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndoToast(false)
        setLastFailedCode(null)
      }, 15000)
    } catch (err) {
      console.error('Error marking code as failed:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Mark code as correct
  const handleCorrect = async () => {
    if (!currentCode || isLoading || isProcessing) return
    
    setIsProcessing(true)
    const codeToMark = currentCode
    triggerFlash('green')

    try {
      // Mark as success in database
      const response = await fetch(`/api/codes/${codeToMark.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'success' }),
      })
      
      if (!response.ok) {
        console.error('Failed to mark code as success:', await response.text())
      }

      // Show celebration after database confirms
      setWinningCode(codeToMark.value)
      setWinningCodeId(codeToMark.id)
      setShowCelebration(true)
      fireConfetti()
    } catch (err) {
      console.error('Error marking code as success:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Undo successful code
  const handleUndo = async () => {
    if (!winningCodeId) return

    try {
      await fetch(`/api/codes/${winningCodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      })

      setShowCelebration(false)
      setWinningCode('')
      setWinningCodeId(null)
      fetchNextCode()
    } catch (err) {
      console.error('Error undoing code:', err)
    }
  }

  // Undo incorrect code
  const handleUndoIncorrect = async () => {
    if (!lastFailedCode) return

    try {
      // Clear the timeout
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current)
      }

      // Mark code back to pending
      await fetch(`/api/codes/${lastFailedCode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      })

      // Restore the code as current
      setCurrentCode(lastFailedCode)
      setCodeKey(prev => prev + 1)
      
      // Hide toast and clear failed code
      setShowUndoToast(false)
      setLastFailedCode(null)
    } catch (err) {
      console.error('Error undoing incorrect code:', err)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentCode || isLoading || isProcessing || showCelebration) return

      if (e.key === 'x' || e.key === 'X' || e.key === 'ArrowLeft') {
        e.preventDefault()
        handleIncorrect()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleCorrect()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentCode, isLoading, isProcessing, showCelebration])

  // Calculate progress
  const testedCodes = stats.failed_codes + stats.success_codes
  const progressPercent = (testedCodes / stats.total_codes) * 100

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-zinc-700 mx-auto mb-4 animate-pulse" />
          <p className="text-zinc-500 text-sm uppercase tracking-wider">Initializing secure connection...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-black relative ${keyboardFlash === 'green' ? 'flash-green' : ''} ${keyboardFlash === 'red' ? 'flash-red' : ''}`}>
      {/* Ambient background effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      <div className="fixed top-1/2 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      
      {/* Dashboard Layout: Sidebar | Main Stage | Activity Feed */}
      <div className="flex h-screen relative z-10">
        {/* LEFT SIDEBAR - Room Info & Raiders */}
        <aside className="w-64 lg:w-72 backdrop-blur-xl bg-zinc-950/50 border-r border-white/5 p-6 flex flex-col hidden md:flex">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-300 transition-colors mb-8 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            EXIT
          </button>

          {/* Room Info */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-zinc-600" />
              <span className="text-xs text-zinc-600 uppercase tracking-widest">Current Room</span>
            </div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">{room.name}</h1>
          </div>

          {/* Active Raiders */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-zinc-600" />
              <span className="text-xs text-zinc-600 uppercase tracking-widest">Raiders Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-electric-emerald status-pip-green animate-pulse" />
              <span className="text-2xl font-bold text-zinc-100">{activeUsers}</span>
              <span className="text-sm text-zinc-600">online</span>
            </div>
          </div>

          {/* Global Progress */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-zinc-600" />
              <span className="text-xs text-zinc-600 uppercase tracking-widest">Global Progress</span>
            </div>
            <div className="text-3xl font-bold text-electric-emerald mb-2">
              {progressPercent.toFixed(1)}%
            </div>
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-electric-emerald to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <div className="mt-2 text-xs text-zinc-600">
              {testedCodes.toLocaleString()} / {stats.total_codes.toLocaleString()} tested
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg p-4 text-center border border-rose-500/20 hover:border-rose-500/40 transition-all">
              <div className="text-2xl font-bold text-rose-400">{stats.failed_codes}</div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Failed</div>
            </div>
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg p-4 text-center border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
              <div className="text-2xl font-bold text-cyan-400">{stats.success_codes}</div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Success</div>
            </div>
          </div>

        </aside>

        {/* MAIN STAGE - Code Display */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12" ref={mainStageRef}>
          <div className="w-full max-w-3xl">
            {/* Mobile Header */}
            <div className="mb-8 md:hidden">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => router.push('/')} className="text-zinc-600 hover:text-zinc-300">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-sm font-black tracking-tight bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient bg-300">
                  RAID.CODES
                </h1>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  {activeUsers}
                </div>
              </div>
              <div className="text-center text-xs text-zinc-600">
                {room.name}
              </div>
            </div>

            {error ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-zinc-900/50 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-12 text-center shadow-2xl shadow-rose-500/20"
              >
                <Shield className="w-16 h-16 text-rose-400 mx-auto mb-4" />
                <p className="text-rose-400 text-xl font-bold uppercase tracking-wider">{error}</p>
              </motion.div>
            ) : currentCode ? (
              <>
                {/* Main Code Display Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 mb-6 shadow-2xl shadow-black/50"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border-2 border-cyan-400 mb-8 shadow-lg shadow-cyan-400/30">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-white font-bold uppercase tracking-wider">Next Target</span>
                    </div>
                    
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={codeKey}
                        initial={{ y: 20, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="text-7xl sm:text-8xl lg:text-9xl font-black bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent tracking-[0.2em] mb-8"
                      >
                        {currentCode.value}
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-zinc-500 mb-8">
                      <kbd className="px-2.5 py-1 bg-black/40 rounded-lg border border-white/10 text-zinc-400 font-mono">X</kbd>
                      <span className="text-zinc-700">or</span>
                      <kbd className="px-2.5 py-1 bg-black/40 rounded-lg border border-white/10 text-zinc-400 font-mono">←</kbd>
                      <span className="text-zinc-700 mx-2">•</span>
                      <kbd className="px-2.5 py-1 bg-black/40 rounded-lg border border-white/10 text-zinc-400 font-mono">ENTER</kbd>
                      <span className="text-zinc-700">or</span>
                      <kbd className="px-2.5 py-1 bg-black/40 rounded-lg border border-white/10 text-zinc-400 font-mono">SPACE</kbd>
                    </div>
                  </div>

                  {/* Action Buttons - Redesigned */}
                  <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleIncorrect}
                      disabled={isLoading || isProcessing}
                      className="group relative h-16 sm:h-20 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/5 to-rose-500/0 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity" />
                      {isProcessing ? (
                        <div className="w-5 h-5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin relative z-10" />
                      ) : (
                        <X className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                      )}
                      <span className="relative z-10 uppercase tracking-wider">Incorrect</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCorrect}
                      disabled={isLoading || isProcessing}
                      className="group relative h-16 sm:h-20 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                    >
                      {isProcessing ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                      <span className="uppercase tracking-wider">Correct</span>
                    </motion.button>
                  </div>
                </motion.div>

                {/* Mobile Progress */}
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:hidden">
                  <div className="flex justify-between items-center mb-2 text-xs">
                    <span className="text-zinc-500 uppercase tracking-wider font-semibold">Progress</span>
                    <span className="text-white font-bold">{progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
                
                {/* Creator Footer - Mobile & Main */}
                <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-500">
                  <span>made by</span>
                  <a
                    href="https://steamcommunity.com/id/crypCS/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-800/50 transition-all"
                  >
                    <svg className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
                    </svg>
                    <span className="font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">cryp</span>
                  </a>
                  <a
                    href="https://x.com/crypCS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-800/50 transition-all"
                  >
                    <svg className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">crypcs</span>
                  </a>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-16 text-center shadow-2xl shadow-black/50"
              >
                <Shield className="w-16 h-16 text-zinc-700 mx-auto mb-4 animate-pulse" />
                <p className="text-zinc-600 text-sm uppercase tracking-wider">Loading next target...</p>
              </motion.div>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR - Live Activity Feed */}
        <aside className="w-80 backdrop-blur-xl bg-zinc-950/50 border-l border-white/5 p-6 hidden lg:flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-vivid-rose" />
            <span className="text-xs text-zinc-600 uppercase tracking-widest">Live Log</span>
            <div className="ml-auto w-2 h-2 bg-vivid-rose rounded-full animate-pulse status-pip-rose" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            <AnimatePresence mode="popLayout">
              {recentFails.length === 0 ? (
                <p className="text-zinc-800 text-xs text-center py-12 uppercase tracking-wider">No failures logged</p>
              ) : (
                  recentFails.map((code, idx) => (
                  <motion.div
                    key={`${code}-${idx}`}
                    initial={{ x: 20, opacity: 0, scale: 0.9 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ x: -20, opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="bg-zinc-900/50 backdrop-blur-sm rounded-lg px-4 py-3 border border-rose-500/20 hover:border-rose-500/40 transition-all hover:shadow-lg hover:shadow-rose-500/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-rose-400 font-bold tracking-wider text-lg font-mono">{code}</span>
                      <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Failed</span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <div className="text-center max-w-2xl">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-electric-emerald to-emerald-400 rounded-full mb-8 btn-glow-emerald"
              >
                <Trophy className="w-16 h-16 text-[#09090b]" />
              </motion.div>
              
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl sm:text-7xl font-black text-electric-emerald text-glow-emerald mb-8 uppercase tracking-wider"
              >
                Target Found
              </motion.h2>
              
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="text-8xl sm:text-9xl font-black text-zinc-100 mb-12 tracking-[0.3em]"
              >
                {winningCode}
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-2 px-8 py-4 cyber-glass hover:bg-zinc-800/50 text-zinc-300 rounded-xl transition-all font-bold uppercase tracking-wider text-sm"
                >
                  <Undo2 className="w-5 h-5" />
                  Undo & Continue
                </button>
                
                <button
                  onClick={() => {
                    setShowCelebration(false)
                    fetchNextCode()
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white rounded-xl transition-all font-black uppercase tracking-wider text-sm shadow-lg shadow-cyan-500/30"
                >
                  Next Target
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo Toast for Incorrect Codes */}
      <AnimatePresence>
        {showUndoToast && lastFailedCode && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 sm:bottom-32 left-1/2 md:left-[calc(50%+4rem)] lg:left-[calc(50%-5rem)] -translate-x-1/2 z-50"
          >
            <div className="bg-zinc-900/95 backdrop-blur-xl border border-vivid-rose/30 rounded-2xl px-6 py-4 shadow-2xl shadow-vivid-rose/20 flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-vivid-rose/20 flex items-center justify-center">
                  <X className="w-5 h-5 text-vivid-rose" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Marked as incorrect</p>
                  <p className="text-lg font-bold text-white font-mono">{lastFailedCode.value}</p>
                </div>
              </div>
              
              <button
                onClick={handleUndoIncorrect}
                className="ml-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <Undo2 className="w-4 h-4" />
                Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
