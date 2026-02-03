'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Check, Edit2, RefreshCw, Building2, Sparkles, Palette, MessageCircle, Plus, X, ThumbsUp, ThumbsDown, Loader2, Mail, Phone, MapPin, Clock, Users, CreditCard, User, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChatBubble, ChatContainer } from '@/components/ui/chat-bubble'
import type { BusinessProfile, FAQ } from '@/types'

interface WebsiteAnalysisStepProps {
  onComplete: (profile: BusinessProfile) => void
  initialProfile?: BusinessProfile | null
}

interface ChatMessage {
  id: string
  role: 'botsy' | 'user'
  content: string
}

type FAQReviewState = 'idle' | 'reviewing' | 'searching' | 'confirming' | 'writing'

// Simple loading indicator
function SimpleLoader() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-white/10 border-t-botsy-lime animate-spin" />
        <Globe className="absolute inset-0 m-auto h-5 w-5 text-botsy-lime/70" />
      </div>
    </div>
  )
}

// Stat card for analysis results
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ElementType
  label: string
  value: string
  subtext?: string
}) {
  return (
    <div className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-botsy-lime/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-botsy-lime" />
        </div>
        <div>
          <p className="text-[#6B7A94] text-xs">{label}</p>
          <p className="text-white font-medium">{value}</p>
          {subtext && <p className="text-[#6B7A94] text-xs mt-0.5">{subtext}</p>}
        </div>
      </div>
    </div>
  )
}

// FAQ Item component with confirmation flow
function FAQItem({
  faq,
  isNew,
  onConfirm,
  onReject,
  onUpdateAnswer,
  onRemove,
}: {
  faq: FAQ
  isNew?: boolean
  onConfirm: () => void
  onReject: () => void
  onUpdateAnswer: (answer: string) => void
  onRemove: () => void
}) {
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={() => setShowAnswer(!showAnswer)}
      className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer hover:bg-white/[0.02] ${
        faq.confirmed
          ? 'bg-botsy-lime/5 border-botsy-lime/20 hover:bg-botsy-lime/10'
          : isNew
          ? 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10'
          : 'bg-white/[0.03] border-white/[0.08]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 text-left">
          <p className="text-white font-medium text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-botsy-lime/70 flex-shrink-0" />
            {faq.question}
            <ChevronDown className={`h-4 w-4 text-[#6B7A94] ml-auto transition-transform ${showAnswer ? 'rotate-180' : ''}`} />
          </p>
        </div>

        {!faq.confirmed && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 text-[#6B7A94] hover:text-red-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {faq.confirmed && (
          <span className="flex items-center gap-1 text-botsy-lime text-xs">
            <Check className="h-3.5 w-3.5" />
            Bekreftet
          </span>
        )}
      </div>

      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[#A8B4C8] text-sm pl-6 mb-3">{faq.answer}</p>

            {!faq.confirmed && (
              <div className="flex items-center gap-2 pl-6">
                <span className="text-[#6B7A94] text-xs mr-2">Stemmer dette?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onConfirm}
                  className="h-8 px-3 bg-botsy-lime/10 hover:bg-botsy-lime/20 text-botsy-lime"
                >
                  <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                  Ja
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReject}
                  className="h-8 px-3 hover:bg-red-500/10 hover:text-red-400"
                >
                  <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
                  Nei
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Add new FAQ question modal/form
function AddFAQForm({
  onSubmit,
  onCancel,
  isSearching,
  searchResult,
  onConfirmSearch,
  onRejectSearch,
  isReformulating,
}: {
  onSubmit: (question: string) => void
  onCancel: () => void
  isSearching: boolean
  searchResult: { found: boolean; answer: string } | null
  onConfirmSearch: () => void
  onRejectSearch: (userAnswer: string) => void
  isReformulating: boolean
}) {
  const [question, setQuestion] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [showUserInput, setShowUserInput] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim()) {
      onSubmit(question.trim())
    }
  }

  const handleReject = () => {
    setShowUserInput(true)
  }

  const handleSubmitUserAnswer = () => {
    if (userAnswer.trim()) {
      onRejectSearch(userAnswer.trim())
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]"
    >
      {!searchResult ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="text-white text-sm font-medium block">
            Legg til nytt spørsmål
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="F.eks. Hva er leveringstiden?"
            className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:bg-white/[0.05] transition-all"
            disabled={isSearching}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSearching}
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!question.trim() || isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Søker...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  La Botsy finne svaret
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-white text-sm font-medium mb-2">{question}</p>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[#A8B4C8] text-sm">{searchResult.answer}</p>
            </div>
          </div>

          {!showUserInput ? (
            <div className="flex items-center gap-3">
              <span className="text-[#6B7A94] text-sm">Stemmer dette?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onConfirmSearch}
                className="bg-botsy-lime/10 hover:bg-botsy-lime/20 text-botsy-lime"
              >
                <ThumbsUp className="h-4 w-4 mr-1.5" />
                Ja, bruk dette
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReject}
                className="hover:bg-red-500/10 hover:text-red-400"
              >
                <ThumbsDown className="h-4 w-4 mr-1.5" />
                Nei
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-white text-sm font-medium block">
                Skriv riktig svar:
              </label>
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Skriv svaret her..."
                rows={3}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:bg-white/[0.05] resize-none transition-all"
                disabled={isReformulating}
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUserInput(false)}
                  disabled={isReformulating}
                >
                  Tilbake
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitUserAnswer}
                  disabled={!userAnswer.trim() || isReformulating}
                >
                  {isReformulating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Omformulerer...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1.5" />
                      Legg til
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

export function WebsiteAnalysisStep({ onComplete, initialProfile }: WebsiteAnalysisStepProps) {
  const [businessName, setBusinessName] = useState(initialProfile?.businessName || '')
  const [websiteUrl, setWebsiteUrl] = useState(initialProfile?.websiteUrl || '')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<BusinessProfile | null>(initialProfile || null)
  const [websiteContent, setWebsiteContent] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'botsy',
      content: 'Hei! Jeg er Botsy. Del nettsiden din med meg, så tar jeg en kikk og lærer meg alt om bedriften din. Da kan jeg gi kundene dine skikkelig gode svar!',
    },
  ])
  const [analysisProgress, setAnalysisProgress] = useState(0)

  // FAQ management states
  const [showAddFAQ, setShowAddFAQ] = useState(false)
  const [isSearchingFAQ, setIsSearchingFAQ] = useState(false)
  const [searchResult, setSearchResult] = useState<{ found: boolean; answer: string } | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [isReformulating, setIsReformulating] = useState(false)

  // Pricing management states
  const [showAllPrices, setShowAllPrices] = useState(false)
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null)

  // Contact info editing state
  const [editingContactField, setEditingContactField] = useState<'email' | 'phone' | 'address' | 'openingHours' | null>(null)

  // Simulate progress during analysis
  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 500)
      return () => clearInterval(interval)
    } else {
      setAnalysisProgress(0)
    }
  }, [isAnalyzing])

  const addBotMessage = (content: string) => {
    setChatMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'botsy', content },
    ])
  }

  const handleAnalyze = async () => {
    if (!businessName.trim() || !websiteUrl.trim()) {
      setError('Fyll ut både bedriftsnavn og nettside')
      return
    }

    setError(null)
    setIsAnalyzing(true)
    setAnalysisProgress(0)

    setChatMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: `${businessName}\n${websiteUrl}` },
    ])

    try {
      const response = await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl, businessName }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Kunne ikke analysere nettsiden')
      }

      setAnalysisProgress(100)
      setAnalysisResult(data.profile)
      setWebsiteContent(data.websiteContent || '')

      addBotMessage(data.summary || `Fantastisk! Jeg har analysert ${businessName} og lært masse. Sjekk ut det jeg fant under!`)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'En feil oppstod'
      setError(message)
      addBotMessage(`Oops! ${message}. Prøv igjen eller fyll ut informasjonen manuelt.`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleConfirm = () => {
    if (analysisResult) {
      onComplete(analysisResult)
    }
  }

  const handleEditField = (field: keyof BusinessProfile, value: string | string[]) => {
    if (analysisResult) {
      setAnalysisResult({
        ...analysisResult,
        [field]: value,
      })
    }
  }

  // FAQ handlers
  const handleConfirmFAQ = (faqId: string) => {
    if (analysisResult) {
      setAnalysisResult({
        ...analysisResult,
        faqs: analysisResult.faqs.map(faq =>
          faq.id === faqId ? { ...faq, confirmed: true } : faq
        ),
      })
    }
  }

  const handleRejectFAQ = (faqId: string) => {
    // For now, just remove the FAQ - user can add correct one
    if (analysisResult) {
      setAnalysisResult({
        ...analysisResult,
        faqs: analysisResult.faqs.filter(faq => faq.id !== faqId),
      })
    }
  }

  const handleUpdateFAQAnswer = (faqId: string, newAnswer: string) => {
    if (analysisResult) {
      setAnalysisResult({
        ...analysisResult,
        faqs: analysisResult.faqs.map(faq =>
          faq.id === faqId ? { ...faq, answer: newAnswer, confirmed: true } : faq
        ),
      })
    }
  }

  const handleRemoveFAQ = (faqId: string) => {
    if (analysisResult) {
      setAnalysisResult({
        ...analysisResult,
        faqs: analysisResult.faqs.filter(faq => faq.id !== faqId),
      })
    }
  }

  const handleAddFAQSubmit = async (question: string) => {
    setCurrentQuestion(question)
    setIsSearchingFAQ(true)
    setSearchResult(null)

    try {
      const response = await fetch('/api/find-faq-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, websiteContent }),
      })

      const data = await response.json()

      if (data.success) {
        setSearchResult({
          found: data.found,
          answer: data.answer,
        })
      } else {
        setSearchResult({
          found: false,
          answer: 'Kunne ikke søke etter svar. Skriv svaret selv.',
        })
      }
    } catch {
      setSearchResult({
        found: false,
        answer: 'En feil oppstod. Skriv svaret selv.',
      })
    } finally {
      setIsSearchingFAQ(false)
    }
  }

  const handleConfirmSearchResult = () => {
    if (searchResult && analysisResult) {
      const newFaq: FAQ = {
        id: `user-${Date.now()}`,
        question: currentQuestion,
        answer: searchResult.answer,
        source: 'user',
        confirmed: true,
      }

      setAnalysisResult({
        ...analysisResult,
        faqs: [...analysisResult.faqs, newFaq],
      })

      // Reset state
      setShowAddFAQ(false)
      setSearchResult(null)
      setCurrentQuestion('')
    }
  }

  const handleRejectSearchResult = async (userAnswer: string) => {
    if (!analysisResult) return

    setIsReformulating(true)

    try {
      const response = await fetch('/api/find-faq-answer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          userAnswer,
          tone: analysisResult.tone,
        }),
      })

      const data = await response.json()
      const finalAnswer = data.success ? data.answer : userAnswer

      const newFaq: FAQ = {
        id: `user-${Date.now()}`,
        question: currentQuestion,
        answer: finalAnswer,
        source: 'user',
        confirmed: true,
      }

      setAnalysisResult({
        ...analysisResult,
        faqs: [...analysisResult.faqs, newFaq],
      })

      // Reset state
      setShowAddFAQ(false)
      setSearchResult(null)
      setCurrentQuestion('')
    } catch {
      // Use the user's answer directly if reformulation fails
      const newFaq: FAQ = {
        id: `user-${Date.now()}`,
        question: currentQuestion,
        answer: userAnswer,
        source: 'user',
        confirmed: true,
      }

      setAnalysisResult({
        ...analysisResult,
        faqs: [...analysisResult.faqs, newFaq],
      })

      setShowAddFAQ(false)
      setSearchResult(null)
      setCurrentQuestion('')
    } finally {
      setIsReformulating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 relative"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold text-white mb-3 font-display"
        >
          La oss bli <span className="text-gradient">kjent!</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[#A8B4C8] text-lg max-w-md mx-auto"
        >
          Del nettsiden din, så tar jeg en kikk og lærer alt om bedriften
        </motion.p>
      </motion.div>

      {/* Main Card with Glass Effect */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="relative overflow-hidden p-0 border-white/[0.08]">
          {/* Decorative gradient border */}
          <div className="absolute inset-0 bg-gradient-to-br from-botsy-lime/10 via-transparent to-transparent pointer-events-none" />

          {/* Chat Section */}
          <div className="relative p-6 border-b border-white/[0.06]">
            <ChatContainer className="max-h-[280px] overflow-y-auto mb-4">
              {chatMessages.map((msg) => (
                <ChatBubble key={msg.id} role={msg.role}>
                  {msg.content}
                </ChatBubble>
              ))}
              {isAnalyzing && (
                <ChatBubble role="botsy" isTyping />
              )}
            </ChatContainer>
          </div>

          {/* Input Section or Loading State */}
          <div className="relative p-6">
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8"
                >
                  <SimpleLoader />
                  <div className="mt-8 max-w-xs mx-auto">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#6B7A94]">Analyserer...</span>
                      <span className="text-botsy-lime font-mono">{Math.round(analysisProgress)}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-botsy-lime to-botsy-lime-light rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${analysisProgress}%` }}
                        transition={{ ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-center text-[#6B7A94] text-sm mt-4">
                      Botsy tar en dypdykk i nettsiden din...
                    </p>
                  </div>
                </motion.div>
              ) : !analysisResult ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="group">
                      <label className="text-white text-sm font-medium block mb-2 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-botsy-lime/70" />
                        Bedriftsnavn
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="F.eks. Kaféen på Hjørnet"
                        className="w-full h-12 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:bg-white/[0.05] transition-all duration-300"
                        disabled={isAnalyzing}
                      />
                    </div>
                    <div className="group">
                      <label className="text-white text-sm font-medium block mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-botsy-lime/70" />
                        Nettside
                      </label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="www.minbedrift.no"
                        className="w-full h-12 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:bg-white/[0.05] transition-all duration-300"
                        disabled={isAnalyzing}
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !businessName.trim() || !websiteUrl.trim()}
                    className="w-full h-12 text-base"
                    size="lg"
                  >
                    <Globe className="h-5 w-5" />
                    La Botsy ta en kikk
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>

      {/* Analysis Result - Premium Cards */}
      <AnimatePresence>
        {analysisResult && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="mt-8 space-y-6"
          >
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={Building2}
                label="Bransje"
                value={analysisResult.industry}
              />
              <StatCard
                icon={Palette}
                label="Anbefalt tone"
                value={analysisResult.tone === 'formal' ? 'Formell' : analysisResult.tone === 'friendly' ? 'Vennlig' : 'Uformell'}
              />
              <StatCard
                icon={MessageCircle}
                label="FAQ funnet"
                value={`${analysisResult.faqs.length} spørsmål`}
              />
              <StatCard
                icon={Users}
                label="Målgruppe"
                value={analysisResult.targetAudience?.split(' ').slice(0, 3).join(' ') || 'Ikke funnet'}
              />
            </div>

            {/* Contact Info Card */}
            {/* Contact Info Card - Always show, allow adding if empty */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="p-4 border-white/[0.08]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4 text-botsy-lime" />
                    Kontaktinformasjon
                  </h4>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {/* Email */}
                  <div
                    onClick={() => setEditingContactField(editingContactField === 'email' ? null : 'email')}
                    className="group flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <Mail className="h-4 w-4 text-[#6B7A94] flex-shrink-0" />
                    {editingContactField === 'email' ? (
                      <input
                        type="email"
                        value={analysisResult.contactInfo?.email || ''}
                        onChange={(e) => setAnalysisResult({
                          ...analysisResult,
                          contactInfo: {
                            email: e.target.value || null,
                            phone: analysisResult.contactInfo?.phone ?? null,
                            address: analysisResult.contactInfo?.address ?? null,
                            openingHours: analysisResult.contactInfo?.openingHours ?? null,
                          }
                        })}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingContactField(null)}
                        placeholder="epost@bedrift.no"
                        className="flex-1 h-7 px-2 bg-white/[0.05] border border-white/[0.1] rounded text-white text-sm placeholder:text-[#6B7A94]/50 focus:outline-none focus:border-botsy-lime/50"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="text-[#A8B4C8] flex-1">{analysisResult.contactInfo?.email || <span className="text-[#6B7A94]/50">Legg til e-post</span>}</span>
                        <Edit2 className="h-3.5 w-3.5 text-[#6B7A94] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </>
                    )}
                  </div>

                  {/* Phone */}
                  <div
                    onClick={() => setEditingContactField(editingContactField === 'phone' ? null : 'phone')}
                    className="group flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <Phone className="h-4 w-4 text-[#6B7A94] flex-shrink-0" />
                    {editingContactField === 'phone' ? (
                      <input
                        type="tel"
                        value={analysisResult.contactInfo?.phone || ''}
                        onChange={(e) => setAnalysisResult({
                          ...analysisResult,
                          contactInfo: {
                            email: analysisResult.contactInfo?.email ?? null,
                            phone: e.target.value || null,
                            address: analysisResult.contactInfo?.address ?? null,
                            openingHours: analysisResult.contactInfo?.openingHours ?? null,
                          }
                        })}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingContactField(null)}
                        placeholder="+47 123 45 678"
                        className="flex-1 h-7 px-2 bg-white/[0.05] border border-white/[0.1] rounded text-white text-sm placeholder:text-[#6B7A94]/50 focus:outline-none focus:border-botsy-lime/50"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="text-[#A8B4C8] flex-1">{analysisResult.contactInfo?.phone || <span className="text-[#6B7A94]/50">Legg til telefon</span>}</span>
                        <Edit2 className="h-3.5 w-3.5 text-[#6B7A94] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </>
                    )}
                  </div>

                  {/* Address */}
                  <div
                    onClick={() => setEditingContactField(editingContactField === 'address' ? null : 'address')}
                    className="group flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-[#6B7A94] flex-shrink-0" />
                    {editingContactField === 'address' ? (
                      <input
                        type="text"
                        value={analysisResult.contactInfo?.address || ''}
                        onChange={(e) => setAnalysisResult({
                          ...analysisResult,
                          contactInfo: {
                            email: analysisResult.contactInfo?.email ?? null,
                            phone: analysisResult.contactInfo?.phone ?? null,
                            address: e.target.value || null,
                            openingHours: analysisResult.contactInfo?.openingHours ?? null,
                          }
                        })}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingContactField(null)}
                        placeholder="Gateadresse 1, 0000 By"
                        className="flex-1 h-7 px-2 bg-white/[0.05] border border-white/[0.1] rounded text-white text-sm placeholder:text-[#6B7A94]/50 focus:outline-none focus:border-botsy-lime/50"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="text-[#A8B4C8] flex-1">{analysisResult.contactInfo?.address || <span className="text-[#6B7A94]/50">Legg til adresse</span>}</span>
                        <Edit2 className="h-3.5 w-3.5 text-[#6B7A94] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </>
                    )}
                  </div>

                  {/* Opening Hours */}
                  <div
                    onClick={() => setEditingContactField(editingContactField === 'openingHours' ? null : 'openingHours')}
                    className="group flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <Clock className="h-4 w-4 text-[#6B7A94] flex-shrink-0" />
                    {editingContactField === 'openingHours' ? (
                      <input
                        type="text"
                        value={analysisResult.contactInfo?.openingHours || ''}
                        onChange={(e) => setAnalysisResult({
                          ...analysisResult,
                          contactInfo: {
                            email: analysisResult.contactInfo?.email ?? null,
                            phone: analysisResult.contactInfo?.phone ?? null,
                            address: analysisResult.contactInfo?.address ?? null,
                            openingHours: e.target.value || null,
                          }
                        })}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingContactField(null)}
                        placeholder="Man-Fre 09-17"
                        className="flex-1 h-7 px-2 bg-white/[0.05] border border-white/[0.1] rounded text-white text-sm placeholder:text-[#6B7A94]/50 focus:outline-none focus:border-botsy-lime/50"
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="text-[#A8B4C8] flex-1">{analysisResult.contactInfo?.openingHours || <span className="text-[#6B7A94]/50">Legg til åpningstider</span>}</span>
                        <Edit2 className="h-3.5 w-3.5 text-[#6B7A94] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Pricing Card */}
            {analysisResult.pricing && analysisResult.pricing.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                <Card className="p-4 border-white/[0.08]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-botsy-lime" />
                      Priser funnet ({analysisResult.pricing.length})
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newPrice = { item: '', price: '' }
                        setAnalysisResult({
                          ...analysisResult,
                          pricing: [...(analysisResult.pricing || []), newPrice],
                        })
                        setEditingPriceIndex((analysisResult.pricing?.length || 0))
                        setShowAllPrices(true)
                      }}
                      className="h-7 px-2 text-xs hover:bg-botsy-lime/10 hover:text-botsy-lime"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Legg til
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(showAllPrices ? analysisResult.pricing : analysisResult.pricing.slice(0, 6)).map((item, i) => (
                      <div key={i} className="group flex items-center gap-2 text-sm py-1.5 border-b border-white/[0.04] last:border-0">
                        {editingPriceIndex === i ? (
                          <>
                            <input
                              type="text"
                              value={item.item}
                              onChange={(e) => {
                                const newPricing = [...(analysisResult.pricing || [])]
                                newPricing[i] = { ...newPricing[i], item: e.target.value }
                                setAnalysisResult({ ...analysisResult, pricing: newPricing })
                              }}
                              placeholder="Produkt/tjeneste"
                              className="flex-1 h-8 px-2 bg-white/[0.05] border border-white/[0.1] rounded text-white text-sm placeholder:text-[#6B7A94]/50 focus:outline-none focus:border-botsy-lime/50"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={item.price}
                              onChange={(e) => {
                                const newPricing = [...(analysisResult.pricing || [])]
                                newPricing[i] = { ...newPricing[i], price: e.target.value }
                                setAnalysisResult({ ...analysisResult, pricing: newPricing })
                              }}
                              placeholder="Pris"
                              className="w-28 h-8 px-2 bg-white/[0.05] border border-white/[0.1] rounded text-botsy-lime text-sm placeholder:text-[#6B7A94]/50 focus:outline-none focus:border-botsy-lime/50"
                            />
                            <button
                              onClick={() => setEditingPriceIndex(null)}
                              className="p-1 text-botsy-lime hover:bg-botsy-lime/10 rounded"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-[#A8B4C8]">{item.item || '(tomt)'}</span>
                            <span className="text-botsy-lime font-medium">{item.price || '-'}</span>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              <button
                                onClick={() => setEditingPriceIndex(i)}
                                className="p-1 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const newPricing = analysisResult.pricing?.filter((_, idx) => idx !== i)
                                  setAnalysisResult({ ...analysisResult, pricing: newPricing })
                                }}
                                className="p-1 text-[#6B7A94] hover:text-red-400 hover:bg-red-500/10 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {analysisResult.pricing.length > 6 && (
                    <button
                      onClick={() => setShowAllPrices(!showAllPrices)}
                      className="w-full mt-3 py-2 text-sm text-[#6B7A94] hover:text-white flex items-center justify-center gap-1 transition-colors"
                    >
                      {showAllPrices ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Vis mindre
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Vis {analysisResult.pricing.length - 6} flere priser
                        </>
                      )}
                    </button>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Staff Card */}
            {analysisResult.staff && analysisResult.staff.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.19 }}
              >
                <Card className="p-4 border-white/[0.08]">
                  <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-botsy-lime" />
                    Team ({analysisResult.staff.length} ansatte)
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {analysisResult.staff.slice(0, 4).map((person, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <div className="h-8 w-8 rounded-full bg-botsy-lime/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-botsy-lime/70" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{person.name}</p>
                          <p className="text-[#6B7A94] text-xs">{person.role}</p>
                        </div>
                      </div>
                    ))}
                    {analysisResult.staff.length > 4 && (
                      <p className="text-[#6B7A94] text-xs col-span-2">+ {analysisResult.staff.length - 4} flere ansatte</p>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Tone Reason Card */}
            {analysisResult.toneReason && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="p-4 border-botsy-lime/20 bg-botsy-lime/5">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-botsy-lime/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-botsy-lime" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium mb-1">Hvorfor denne tonen?</p>
                      <p className="text-[#A8B4C8] text-sm">{analysisResult.toneReason}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Detailed Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="relative overflow-hidden p-6">
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-botsy-lime via-botsy-lime-light to-botsy-lime" />

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <Check className="h-5 w-5 text-botsy-lime" />
                    Bedriftsprofil
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      className="hover:bg-botsy-lime/10 hover:text-botsy-lime"
                    >
                      <Edit2 className="h-4 w-4 mr-1.5" />
                      {isEditing ? 'Ferdig' : 'Rediger'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAnalysisResult(null)
                        setChatMessages([chatMessages[0]])
                        setWebsiteContent('')
                      }}
                      className="hover:bg-white/5"
                    >
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      På nytt
                    </Button>
                  </div>
                </div>

                <div className="space-y-5">
                  <ProfileField
                    label="Bedriftsnavn"
                    value={analysisResult.businessName}
                    editing={isEditing}
                    onChange={(v) => handleEditField('businessName', v)}
                  />
                  <ProfileField
                    label="Beskrivelse"
                    value={analysisResult.description}
                    editing={isEditing}
                    multiline
                    onChange={(v) => handleEditField('description', v)}
                    placeholder="En detaljert beskrivelse av bedriften..."
                  />
                  {(analysisResult.targetAudience || isEditing) && (
                    <ProfileField
                      label="Målgruppe"
                      value={analysisResult.targetAudience || ''}
                      editing={isEditing}
                      onChange={(v) => handleEditField('targetAudience', v)}
                      placeholder="Hvem er deres kunder?"
                    />
                  )}
                  {(analysisResult.brandPersonality || isEditing) && (
                    <ProfileField
                      label="Merkevare-personlighet"
                      value={analysisResult.brandPersonality || ''}
                      editing={isEditing}
                      onChange={(v) => handleEditField('brandPersonality', v)}
                      placeholder="F.eks. profesjonell, vennlig, innovativ"
                    />
                  )}

                  {/* Tone Selector */}
                  <div>
                    <label className="text-[#6B7A94] text-xs uppercase tracking-wider block mb-2">Kommunikasjonstone</label>
                    {isEditing ? (
                      <div className="grid grid-cols-3 gap-3">
                        {(['formal', 'friendly', 'casual'] as const).map((tone) => (
                          <motion.button
                            key={tone}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleEditField('tone', tone)}
                            className={`p-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                              analysisResult.tone === tone
                                ? 'bg-gradient-to-br from-botsy-lime/20 to-botsy-lime/10 text-botsy-lime border border-botsy-lime/40 shadow-lg shadow-botsy-lime/10'
                                : 'bg-white/[0.03] text-white/70 border border-white/[0.06] hover:border-white/[0.12] hover:text-white'
                            }`}
                          >
                            {tone === 'formal' ? 'Formell' : tone === 'friendly' ? 'Vennlig' : 'Uformell'}
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white font-medium">
                        {analysisResult.tone === 'formal' ? 'Formell' : analysisResult.tone === 'friendly' ? 'Vennlig' : 'Uformell'}
                      </p>
                    )}
                  </div>

                  {/* Tags Display */}
                  {analysisResult.services.length > 0 && (
                    <div>
                      <label className="text-[#6B7A94] text-xs uppercase tracking-wider block mb-2">Tjenester</label>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.services.map((service, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="px-3 py-1.5 bg-gradient-to-br from-white/[0.08] to-white/[0.03] rounded-full text-white text-sm border border-white/[0.08] hover:border-botsy-lime/30 transition-colors cursor-default"
                          >
                            {service}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.products.length > 0 && (
                    <div>
                      <label className="text-[#6B7A94] text-xs uppercase tracking-wider block mb-2">Produkter</label>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.products.map((product, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="px-3 py-1.5 bg-gradient-to-br from-botsy-lime/10 to-botsy-lime/5 rounded-full text-botsy-lime/90 text-sm border border-botsy-lime/20"
                          >
                            {product}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* FAQ Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="relative overflow-hidden p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-botsy-lime" />
                    Spørsmål og svar
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddFAQ(true)}
                    className="hover:bg-botsy-lime/10 hover:text-botsy-lime"
                    disabled={showAddFAQ}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Legg til
                  </Button>
                </div>

                <p className="text-[#6B7A94] text-sm mb-4">
                  Bekreft at svarene stemmer, eller rett dem opp. Du kan også legge til flere spørsmål.
                </p>

                <div className="space-y-3">
                  <AnimatePresence>
                    {showAddFAQ && (
                      <AddFAQForm
                        onSubmit={handleAddFAQSubmit}
                        onCancel={() => {
                          setShowAddFAQ(false)
                          setSearchResult(null)
                          setCurrentQuestion('')
                        }}
                        isSearching={isSearchingFAQ}
                        searchResult={searchResult}
                        onConfirmSearch={handleConfirmSearchResult}
                        onRejectSearch={handleRejectSearchResult}
                        isReformulating={isReformulating}
                      />
                    )}
                  </AnimatePresence>

                  {analysisResult.faqs.length === 0 && !showAddFAQ ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-10 w-10 text-[#6B7A94]/50 mx-auto mb-3" />
                      <p className="text-[#6B7A94] text-sm">Ingen spørsmål funnet enda.</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddFAQ(true)}
                        className="mt-3 hover:bg-botsy-lime/10 hover:text-botsy-lime"
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Legg til det første
                      </Button>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {analysisResult.faqs.map((faq) => (
                        <FAQItem
                          key={faq.id}
                          faq={faq}
                          onConfirm={() => handleConfirmFAQ(faq.id)}
                          onReject={() => handleRejectFAQ(faq.id)}
                          onUpdateAnswer={(answer) => handleUpdateFAQAnswer(faq.id, answer)}
                          onRemove={() => handleRemoveFAQ(faq.id)}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Confirm Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                onClick={handleConfirm}
                className="w-full h-14 text-lg font-semibold shadow-xl shadow-botsy-lime/20 group"
                size="xl"
              >
                <Check className="h-5 w-5" />
                Bekreft og fortsett
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="ml-1"
                >
                  →
                </motion.span>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProfileField({
  label,
  value,
  editing,
  multiline,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  editing: boolean
  multiline?: boolean
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-[#6B7A94] text-xs uppercase tracking-wider block mb-2">{label}</label>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#6B7A94]/50 focus:outline-none focus:border-botsy-lime/50 focus:bg-white/[0.05] resize-none transition-all duration-300"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#6B7A94]/50 focus:outline-none focus:border-botsy-lime/50 focus:bg-white/[0.05] transition-all duration-300"
          />
        )
      ) : (
        <p className="text-white leading-relaxed">{value || '-'}</p>
      )}
    </div>
  )
}
