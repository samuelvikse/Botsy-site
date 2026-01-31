'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  MessageCircle,
  Sparkles,
  Plus,
  X,
  Save,
  Lightbulb,
  Volume2,
  Ban,
  Heart,
  FileText,
  Loader2,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { saveToneConfig, getBusinessProfile } from '@/lib/firestore'
import type { ToneConfig, BusinessProfile } from '@/types'

interface ToneConfigViewProps {
  companyId: string
  initialProfile?: BusinessProfile | null
}

const PERSONALITY_SUGGESTIONS = [
  'Entusiastisk og energisk',
  'Rolig og tillitsfull',
  'Profesjonell og effektiv',
  'Varm og omtenksom',
  'Humoristisk og avslappet',
  'Ekspert og kunnskapsrik',
]

const AVOID_PHRASE_SUGGESTIONS = [
  'Dessverre',
  'Beklager, men',
  'Det er ikke mulig',
  'Jeg kan ikke',
  'Det har vi ikke',
]

const PREFERRED_PHRASE_SUGGESTIONS = [
  'Selvfølgelig!',
  'Det ordner vi',
  'Flott spørsmål!',
  'La meg hjelpe deg med det',
  'Så hyggelig å høre fra deg',
]

export function ToneConfigView({ companyId, initialProfile }: ToneConfigViewProps) {
  const [config, setConfig] = useState<ToneConfig>({
    customInstructions: '',
    personality: '',
    avoidPhrases: [],
    preferredPhrases: [],
    exampleResponses: [],
  })
  const [newAvoidPhrase, setNewAvoidPhrase] = useState('')
  const [newPreferredPhrase, setNewPreferredPhrase] = useState('')
  const [newExampleResponse, setNewExampleResponse] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTone, setCurrentTone] = useState<'formal' | 'friendly' | 'casual'>('friendly')

  // Load existing config
  useEffect(() => {
    async function loadConfig() {
      try {
        if (initialProfile?.toneConfig) {
          setConfig(initialProfile.toneConfig)
        }
        if (initialProfile?.tone) {
          setCurrentTone(initialProfile.tone)
        }
      } catch (error) {
        console.error('Error loading tone config:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (initialProfile) {
      loadConfig()
    } else {
      // Fetch profile if not provided
      getBusinessProfile(companyId).then((profile) => {
        if (profile?.toneConfig) {
          setConfig(profile.toneConfig)
        }
        if (profile?.tone) {
          setCurrentTone(profile.tone)
        }
        setIsLoading(false)
      })
    }
  }, [companyId, initialProfile])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      await saveToneConfig(companyId, config)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving tone config:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addAvoidPhrase = () => {
    if (newAvoidPhrase.trim() && !config.avoidPhrases?.includes(newAvoidPhrase.trim())) {
      setConfig((c) => ({
        ...c,
        avoidPhrases: [...(c.avoidPhrases || []), newAvoidPhrase.trim()],
      }))
      setNewAvoidPhrase('')
    }
  }

  const removeAvoidPhrase = (phrase: string) => {
    setConfig((c) => ({
      ...c,
      avoidPhrases: c.avoidPhrases?.filter((p) => p !== phrase) || [],
    }))
  }

  const addPreferredPhrase = () => {
    if (newPreferredPhrase.trim() && !config.preferredPhrases?.includes(newPreferredPhrase.trim())) {
      setConfig((c) => ({
        ...c,
        preferredPhrases: [...(c.preferredPhrases || []), newPreferredPhrase.trim()],
      }))
      setNewPreferredPhrase('')
    }
  }

  const removePreferredPhrase = (phrase: string) => {
    setConfig((c) => ({
      ...c,
      preferredPhrases: c.preferredPhrases?.filter((p) => p !== phrase) || [],
    }))
  }

  const addExampleResponse = () => {
    if (newExampleResponse.trim() && !config.exampleResponses?.includes(newExampleResponse.trim())) {
      setConfig((c) => ({
        ...c,
        exampleResponses: [...(c.exampleResponses || []), newExampleResponse.trim()],
      }))
      setNewExampleResponse('')
    }
  }

  const removeExampleResponse = (response: string) => {
    setConfig((c) => ({
      ...c,
      exampleResponses: c.exampleResponses?.filter((r) => r !== response) || [],
    }))
  }

  const toneLabel =
    currentTone === 'formal'
      ? 'Formell'
      : currentTone === 'casual'
      ? 'Uformell'
      : 'Vennlig'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-botsy-lime animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Tone-konfigurasjon</h1>
        <p className="text-[#6B7A94]">
          Finjuster hvordan Botsy kommuniserer med kundene dine
        </p>
      </div>

      {/* Current Tone Indicator */}
      <Card className="p-4 bg-gradient-to-r from-botsy-lime/10 to-transparent border-botsy-lime/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-botsy-lime/20 flex items-center justify-center">
            <Volume2 className="h-5 w-5 text-botsy-lime" />
          </div>
          <div>
            <p className="text-white font-medium">Nåværende grunntone: {toneLabel}</p>
            <p className="text-[#6B7A94] text-sm">
              Innstillingene nedenfor finjusterer denne tonen ytterligere
            </p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Custom Instructions */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-5 w-5 text-botsy-lime" />
              <h3 className="text-white font-medium">Egendefinerte instruksjoner</h3>
            </div>
            <p className="text-[#6B7A94] text-sm mb-4">
              Beskriv nøyaktig hvordan du vil at Botsy skal kommunisere. Vær så spesifikk som mulig.
            </p>
            <textarea
              value={config.customInstructions || ''}
              onChange={(e) => setConfig((c) => ({ ...c, customInstructions: e.target.value }))}
              rows={5}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50 resize-none"
              placeholder="F.eks: Svar alltid positivt og løsningsorientert. Start aldri med 'dessverre'. Bruk kundens navn når det er oppgitt. Hold svarene korte og presise."
            />
            <div className="mt-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-[#6B7A94] text-xs">
                  <strong className="text-white">Tips:</strong> Jo mer spesifikk du er, jo bedre vil Botsy tilpasse seg. Du kan inkludere eksempler, situasjoner å håndtere spesielt, og tonen du ønsker i ulike scenarioer.
                </p>
              </div>
            </div>
          </Card>

          {/* Personality */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-botsy-lime" />
              <h3 className="text-white font-medium">Personlighet</h3>
            </div>
            <p className="text-[#6B7A94] text-sm mb-4">
              Beskriv personlighetstrekkene Botsy skal ha
            </p>
            <input
              type="text"
              value={config.personality || ''}
              onChange={(e) => setConfig((c) => ({ ...c, personality: e.target.value }))}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
              placeholder="F.eks: Varm, hjelpsom og alltid positiv"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {PERSONALITY_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setConfig((c) => ({ ...c, personality: suggestion }))}
                  className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[#A8B4C8] text-xs hover:border-botsy-lime/30 hover:text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </Card>

          {/* Avoid Phrases */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Ban className="h-5 w-5 text-red-400" />
              <h3 className="text-white font-medium">Uttrykk som skal unngås</h3>
            </div>
            <p className="text-[#6B7A94] text-sm mb-4">
              Legg til ord eller fraser Botsy IKKE skal bruke
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newAvoidPhrase}
                onChange={(e) => setNewAvoidPhrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAvoidPhrase()}
                className="flex-1 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
                placeholder="Skriv et uttrykk..."
              />
              <Button onClick={addAvoidPhrase} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(config.avoidPhrases?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {config.avoidPhrases?.map((phrase) => (
                  <motion.span
                    key={phrase}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-sm"
                  >
                    {phrase}
                    <button onClick={() => removeAvoidPhrase(phrase)} className="hover:text-red-100">
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {AVOID_PHRASE_SUGGESTIONS.filter(
                (s) => !config.avoidPhrases?.includes(s)
              ).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      avoidPhrases: [...(c.avoidPhrases || []), suggestion],
                    }))
                  }
                  className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[#6B7A94] text-xs hover:border-red-400/30 hover:text-red-300 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Preferred Phrases */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-green-400" />
              <h3 className="text-white font-medium">Foretrukne uttrykk</h3>
            </div>
            <p className="text-[#6B7A94] text-sm mb-4">
              Legg til ord eller fraser Botsy SKAL bruke
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newPreferredPhrase}
                onChange={(e) => setNewPreferredPhrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPreferredPhrase()}
                className="flex-1 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
                placeholder="Skriv et uttrykk..."
              />
              <Button onClick={addPreferredPhrase} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(config.preferredPhrases?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {config.preferredPhrases?.map((phrase) => (
                  <motion.span
                    key={phrase}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-300 text-sm"
                  >
                    {phrase}
                    <button onClick={() => removePreferredPhrase(phrase)} className="hover:text-green-100">
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {PREFERRED_PHRASE_SUGGESTIONS.filter(
                (s) => !config.preferredPhrases?.includes(s)
              ).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      preferredPhrases: [...(c.preferredPhrases || []), suggestion],
                    }))
                  }
                  className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[#6B7A94] text-xs hover:border-green-400/30 hover:text-green-300 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </Card>

          {/* Example Responses */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-botsy-lime" />
              <h3 className="text-white font-medium">Eksempelsvar</h3>
            </div>
            <p className="text-[#6B7A94] text-sm mb-4">
              Legg til eksempler på ideelle svar for å vise Botsy stilen du ønsker
            </p>
            <div className="space-y-3 mb-3">
              <textarea
                value={newExampleResponse}
                onChange={(e) => setNewExampleResponse(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50 resize-none"
                placeholder="Skriv et eksempel på et godt svar..."
              />
              <Button onClick={addExampleResponse} size="sm" variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-1.5" />
                Legg til eksempel
              </Button>
            </div>
            {(config.exampleResponses?.length || 0) > 0 && (
              <div className="space-y-2">
                {config.exampleResponses?.map((response, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl group relative"
                  >
                    <p className="text-white text-sm pr-8">&quot;{response}&quot;</p>
                    <button
                      onClick={() => removeExampleResponse(response)}
                      className="absolute top-2 right-2 p-1 text-[#6B7A94] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>

          {/* Preview */}
          <Card className="p-6 bg-gradient-to-br from-white/[0.03] to-transparent">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-botsy-lime" />
              <h3 className="text-white font-medium">Slik vil Botsy svare</h3>
            </div>
            <div className="p-4 bg-[#1a1a2e] rounded-xl border border-white/[0.06]">
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="px-4 py-2 rounded-2xl rounded-br-md bg-botsy-lime text-gray-900 text-sm max-w-[80%]">
                    Hei, når har dere åpent?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="px-4 py-2 rounded-2xl rounded-bl-md bg-white/10 text-white text-sm max-w-[80%]">
                    {config.preferredPhrases?.[0] || 'Hei!'} Vi har åpent mandag til fredag kl. 9-17.{' '}
                    {config.personality?.toLowerCase().includes('entusiastisk')
                      ? 'Gleder oss til å se deg!'
                      : config.personality?.toLowerCase().includes('profesjonell')
                      ? 'Tar gjerne imot henvendelser i åpningstiden.'
                      : 'Bare si fra om det er noe mer jeg kan hjelpe med!'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-green-400 text-sm"
          >
            <Check className="h-4 w-4" />
            Lagret!
          </motion.div>
        )}
        <Button onClick={handleSave} disabled={isSaving} className="min-w-[140px]">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? 'Lagrer...' : 'Lagre endringer'}
        </Button>
      </div>
    </div>
  )
}
