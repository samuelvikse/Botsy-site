'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Eye, Palette, MessageCircle, Move, Code, ExternalLink, Upload, Trash2, ImageIcon, Loader2, Maximize2, Sparkles, Play, X, Cloud, Type } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { updateWidgetSettings, getCompany } from '@/lib/firestore'
import { uploadCompanyLogo, deleteCompanyLogo } from '@/lib/storage'

interface WidgetSettingsViewProps {
  companyId: string
  initialSettings?: {
    primaryColor: string
    secondaryColor?: string
    position: string
    greeting: string
    isEnabled: boolean
    logoUrl?: string | null
    widgetSize?: 'small' | 'medium' | 'large'
    animationStyle?: 'scale' | 'slide' | 'fade' | 'bounce' | 'flip'
  }
  businessName?: string
  greeting?: string
}

const SIZE_OPTIONS = [
  { value: 'small', label: 'Liten', width: '340px', height: '460px' },
  { value: 'medium', label: 'Medium', width: '380px', height: '520px' },
  { value: 'large', label: 'Stor', width: '420px', height: '600px' },
]

const ANIMATION_OPTIONS = [
  { value: 'scale', label: 'Skalering', description: 'Vokser inn og ut' },
  { value: 'slide', label: 'Glid', description: 'Glir opp fra bunnen' },
  { value: 'fade', label: 'Fade', description: 'Enkel inn/ut-toning' },
  { value: 'bounce', label: 'Sprett', description: 'Sprettende animasjon' },
  { value: 'flip', label: 'Vend', description: '3D-vending' },
]

// Animation variants for preview
const ANIMATION_VARIANTS = {
  scale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  slide: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 30 },
    transition: { type: 'spring', damping: 30, stiffness: 400 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
  bounce: {
    initial: { opacity: 0, scale: 0.3, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.3, y: 20 },
    transition: { type: 'spring', damping: 12, stiffness: 200 },
  },
  flip: {
    initial: { opacity: 0, rotateX: -90 },
    animate: { opacity: 1, rotateX: 0 },
    exit: { opacity: 0, rotateX: 90 },
    transition: { type: 'spring', damping: 20, stiffness: 300 },
  },
}

const PRESET_COLORS = [
  { name: 'Lime', value: '#CCFF00' },
  { name: 'Blå', value: '#3B82F6' },
  { name: 'Lilla', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Oransje', value: '#F97316' },
  { name: 'Grønn', value: '#22C55E' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Rød', value: '#EF4444' },
]

const SECONDARY_PRESET_COLORS = [
  { name: 'Mørk', value: '#1A1A2E' },
  { name: 'Sort', value: '#000000' },
  { name: 'Grå', value: '#4B5563' },
  { name: 'Hvit', value: '#FFFFFF' },
  { name: 'Kremhvit', value: '#F5F5F0' },
]

export function WidgetSettingsView({
  companyId,
  initialSettings,
  businessName,
  greeting: greetingProp,
}: WidgetSettingsViewProps) {
  const [settings, setSettings] = useState({
    primaryColor: initialSettings?.primaryColor || '#CCFF00',
    secondaryColor: initialSettings?.secondaryColor || '#1A1A2E',
    position: initialSettings?.position || 'bottom-right',
    isEnabled: initialSettings?.isEnabled ?? true,
    logoUrl: initialSettings?.logoUrl || null,
    widgetSize: initialSettings?.widgetSize || 'medium' as 'small' | 'medium' | 'large',
    animationStyle: initialSettings?.animationStyle || 'scale' as 'scale' | 'slide' | 'fade' | 'bounce' | 'flip',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [animationPreview, setAnimationPreview] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialSettingsRef = useRef(JSON.stringify(settings))
  const hasChangedRef = useRef(false)
  const isInitializedRef = useRef(false)

  // Fetch fresh data on mount
  useEffect(() => {
    async function fetchFreshData() {
      try {
        const company = await getCompany(companyId)
        if (company?.widgetSettings) {
          const freshSettings = {
            primaryColor: company.widgetSettings.primaryColor || '#CCFF00',
            secondaryColor: company.widgetSettings.secondaryColor || '#1A1A2E',
            position: company.widgetSettings.position || 'bottom-right',
            isEnabled: company.widgetSettings.isEnabled ?? true,
            logoUrl: company.widgetSettings.logoUrl || null,
            widgetSize: (company.widgetSettings.widgetSize || 'medium') as 'small' | 'medium' | 'large',
            animationStyle: (company.widgetSettings.animationStyle || 'scale') as 'scale' | 'slide' | 'fade' | 'bounce' | 'flip',
          }
          setSettings(freshSettings)
          initialSettingsRef.current = JSON.stringify(freshSettings)
        }
      } catch (error) {
        console.error('Failed to fetch widget settings:', error)
      } finally {
        setIsLoading(false)
        isInitializedRef.current = true
      }
    }

    fetchFreshData()
  }, [companyId])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://botsy.no'

  const embedCode = `<script src="${baseUrl}/widget.js" data-company-id="${companyId}"></script>`

  // Save function
  const doSave = async (settingsToSave: typeof settings) => {
    if (!companyId) {
      setSaveError('Mangler bedrifts-ID')
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      await updateWidgetSettings(companyId, settingsToSave)
      setSaveSuccess(true)
      hasChangedRef.current = false
      initialSettingsRef.current = JSON.stringify(settingsToSave)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to save widget settings:', error)
      setSaveError('Kunne ikke lagre endringer')
    } finally {
      setIsSaving(false)
    }
  }

  // Wrapper that triggers auto-save
  const updateSettings = (updater: (prev: typeof settings) => typeof settings) => {
    setSettings(prev => {
      const newSettings = updater(prev)

      // Don't auto-save during initial load
      if (!isInitializedRef.current) {
        return newSettings
      }

      // Check if settings actually changed from initial
      const hasChanged = JSON.stringify(newSettings) !== initialSettingsRef.current
      hasChangedRef.current = hasChanged

      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      if (hasChanged) {
        saveTimeoutRef.current = setTimeout(() => {
          doSave(newSettings)
        }, 800)
      }

      return newSettings
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(embedCode)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = embedCode
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Kunne ikke kopiere. Prøv å markere teksten og kopier manuelt.')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    setLogoError(null)
    setUploadProgress('Forbereder opplasting...')

    const timeoutId = setTimeout(() => {
      setUploadProgress('Laster fortsatt opp... Dette kan ta litt tid for store bilder.')
    }, 5000)

    try {
      if (settings.logoUrl) {
        setUploadProgress('Fjerner gammel logo...')
        await deleteCompanyLogo(settings.logoUrl)
      }

      setUploadProgress('Laster opp logo...')

      const uploadPromise = uploadCompanyLogo(companyId, file)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Opplastingen tok for lang tid. Sjekk internettforbindelsen og prøv igjen.')), 120000)
      })

      const logoUrl = await Promise.race([uploadPromise, timeoutPromise])

      setUploadProgress('Lagrer innstillinger...')
      setSettings(s => ({ ...s, logoUrl }))

      await updateWidgetSettings(companyId, { logoUrl })
      setUploadProgress(null)
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'Kunne ikke laste opp logo. Sjekk internettforbindelsen og prøv igjen.')
      setUploadProgress(null)
    } finally {
      clearTimeout(timeoutId)
      setIsUploadingLogo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveLogo = async () => {
    if (!settings.logoUrl) return

    setIsUploadingLogo(true)
    setLogoError(null)

    try {
      await deleteCompanyLogo(settings.logoUrl)
      setSettings(s => ({ ...s, logoUrl: null }))
      await updateWidgetSettings(companyId, { logoUrl: null })
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'Kunne ikke fjerne logo')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  // Play animation preview
  const playAnimation = (animValue: string) => {
    setAnimationPreview(null)
    setTimeout(() => setAnimationPreview(animValue), 50)
    setTimeout(() => setAnimationPreview(null), 1500)
  }

  const currentAnimation = ANIMATION_VARIANTS[settings.animationStyle as keyof typeof ANIMATION_VARIANTS]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-botsy-lime animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Chat Widget</h1>
          <p className="text-[#6B7A94]">Tilpass utseendet og legg widgeten på nettsiden din</p>
        </div>
        <AnimatePresence mode="wait">
          {isSaving ? (
            <motion.div
              key="saving"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] rounded-full"
            >
              <Loader2 className="h-3.5 w-3.5 text-botsy-lime animate-spin" />
              <span className="text-[#A8B4C8] text-sm">Lagrer...</span>
            </motion.div>
          ) : saveSuccess ? (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full"
            >
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400 text-sm">Lagret</span>
            </motion.div>
          ) : saveError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-full"
            >
              <X className="h-3.5 w-3.5 text-red-400" />
              <span className="text-red-400 text-sm">{saveError}</span>
            </motion.div>
          ) : (
            <motion.div
              key="autosave"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 text-[#6B7A94]"
            >
              <Cloud className="h-3.5 w-3.5" />
              <span className="text-sm">Auto-lagring på</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Enable/Disable Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-medium">Widget aktivert</h3>
            <p className="text-[#6B7A94] text-sm">Skru av for å midlertidig deaktivere chatten</p>
          </div>
          <button
            onClick={() => updateSettings(s => ({ ...s, isEnabled: !s.isEnabled }))}
            className={`w-14 h-7 rounded-full relative transition-colors ${
              settings.isEnabled ? 'bg-botsy-lime' : 'bg-white/10'
            }`}
          >
            <motion.span
              className="absolute top-1 h-5 w-5 bg-white rounded-full shadow"
              animate={{ left: settings.isEnabled ? '1.75rem' : '0.25rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </Card>

      {/* Main Content - Preview + Appearance Settings */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Live Preview - Sticky */}
        <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-botsy-lime" />
                <h3 className="text-white font-medium">Forhåndsvisning</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`${baseUrl}/widget/${companyId}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Fullskjerm
              </Button>
            </div>

            {/* Preview Container */}
            <div
              className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden border border-white/[0.06]"
              style={{ height: '320px', perspective: '1000px' }}
            >
              {/* Fake website content */}
              <div className="p-4 space-y-3">
                <div className="h-5 w-28 bg-white/10 rounded" />
                <div className="h-2.5 w-full bg-white/5 rounded" />
                <div className="h-2.5 w-4/5 bg-white/5 rounded" />
                <div className="h-2.5 w-3/5 bg-white/5 rounded" />
                <div className="h-16 w-full bg-white/5 rounded mt-3" />
              </div>

              {/* Widget Button Preview */}
              <div className={`absolute ${settings.position === 'bottom-left' ? 'left-3' : 'right-3'} bottom-3`}>
                <AnimatePresence mode="wait">
                  {!showPreview && (
                    <motion.div
                      key="button"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="h-11 w-11 rounded-full shadow-lg flex items-center justify-center cursor-pointer overflow-hidden"
                      style={{ backgroundColor: settings.primaryColor }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPreview(true)}
                    >
                      {settings.logoUrl ? (
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                          <Image
                            src={settings.logoUrl}
                            alt="Logo"
                            fill
                            className="object-cover rounded-full"
                          />
                        </div>
                      ) : (
                        <MessageCircle className="h-5 w-5" style={{ color: settings.secondaryColor }} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat Preview Popup with selected animation */}
                <AnimatePresence>
                  {showPreview && (
                    <motion.div
                      initial={currentAnimation.initial}
                      animate={currentAnimation.animate}
                      exit={currentAnimation.exit}
                      transition={currentAnimation.transition}
                      className={`absolute bottom-0 ${settings.position === 'bottom-left' ? 'left-0' : 'right-0'} bg-[#1a1a2e] rounded-xl shadow-2xl overflow-hidden`}
                      style={{
                        transformStyle: 'preserve-3d',
                        width: settings.widgetSize === 'small' ? '180px' : settings.widgetSize === 'large' ? '230px' : '205px',
                        height: settings.widgetSize === 'small' ? '200px' : settings.widgetSize === 'large' ? '280px' : '240px',
                      }}
                    >
                      <div
                        className="px-3 py-2 flex items-center justify-between"
                        style={{ backgroundColor: settings.primaryColor }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center overflow-hidden relative" style={{ backgroundColor: `${settings.secondaryColor}20` }}>
                            {settings.logoUrl ? (
                              <Image
                                src={settings.logoUrl}
                                alt="Logo"
                                fill
                                className="object-cover rounded-full"
                              />
                            ) : (
                              <MessageCircle className="h-3 w-3" style={{ color: settings.secondaryColor }} />
                            )}
                          </div>
                          <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: settings.secondaryColor }}>
                            {businessName || 'Din bedrift'}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowPreview(false)}
                          className="p-1 rounded hover:bg-black/10"
                        >
                          <X className="h-3.5 w-3.5" style={{ color: settings.secondaryColor }} />
                        </button>
                      </div>
                      <div className="p-3">
                        <div className="bg-white/10 rounded-lg rounded-bl-none p-2 text-white text-xs">
                          {greetingProp || 'Hei! 👋 Hvordan kan jeg hjelpe deg?'}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[#6B7A94] text-xs">
                Klikk for å teste animasjonen
              </p>
              <span className="text-[#6B7A94] text-xs">
                {settings.widgetSize === 'small' ? 'Liten' : settings.widgetSize === 'large' ? 'Stor' : 'Medium'}
              </span>
            </div>
          </Card>
        </div>

        {/* Appearance Settings */}
        <div className="lg:col-span-3 space-y-6">
          {/* Animation Style with Preview */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-botsy-lime" />
              <h3 className="text-white font-medium">Animasjon</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ANIMATION_OPTIONS.map((anim) => {
                const isActive = settings.animationStyle === anim.value
                const animVariant = ANIMATION_VARIANTS[anim.value as keyof typeof ANIMATION_VARIANTS]
                const isPreviewPlaying = animationPreview === anim.value

                return (
                  <button
                    key={anim.value}
                    onClick={() => {
                      updateSettings(s => ({ ...s, animationStyle: anim.value as 'scale' | 'slide' | 'fade' | 'bounce' | 'flip' }))
                      playAnimation(anim.value)
                    }}
                    className={`relative p-4 rounded-xl border text-sm font-medium transition-all text-left overflow-hidden ${
                      isActive
                        ? 'border-botsy-lime bg-botsy-lime/10 text-botsy-lime'
                        : 'border-white/[0.06] text-[#A8B4C8] hover:border-white/[0.12] hover:text-white'
                    }`}
                    style={{ perspective: '500px' }}
                  >
                    {/* Mini animation preview */}
                    <div className="h-12 mb-3 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        {isPreviewPlaying ? (
                          <motion.div
                            key="preview"
                            initial={animVariant.initial}
                            animate={animVariant.animate}
                            exit={animVariant.exit}
                            transition={animVariant.transition}
                            className="h-8 w-8 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: settings.primaryColor,
                              transformStyle: 'preserve-3d'
                            }}
                          >
                            <MessageCircle className="h-4 w-4" style={{ color: settings.secondaryColor }} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="static"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/10"
                          >
                            <Play className="h-3 w-3 text-white/50" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="block text-center">{anim.label}</span>
                    <span className="text-xs opacity-60 mt-1 block text-center">{anim.description}</span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Color */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-botsy-lime" />
              <h3 className="text-white font-medium">Farge</h3>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateSettings(s => ({ ...s, primaryColor: color.value }))}
                  className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                    settings.primaryColor === color.value
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-botsy-dark scale-90'
                      : 'hover:scale-90'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {settings.primaryColor === color.value && (
                    <Check className="h-4 w-4" style={{ color: settings.secondaryColor }} />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => updateSettings(s => ({ ...s, primaryColor: e.target.value }))}
                className="h-10 w-10 rounded-lg cursor-pointer bg-transparent border border-white/10"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => updateSettings(s => ({ ...s, primaryColor: e.target.value }))}
                className="flex-1 h-10 px-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-botsy-lime/50"
              />
            </div>
          </Card>

          {/* Secondary Color (Text Color) */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Type className="h-5 w-5 text-botsy-lime" />
              <h3 className="text-white font-medium">Tekstfarge</h3>
            </div>
            <p className="text-[#6B7A94] text-sm mb-3">Fargen på tekst i header, brukerbobler og knapper</p>
            <div className="grid grid-cols-5 gap-2">
              {SECONDARY_PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateSettings(s => ({ ...s, secondaryColor: color.value }))}
                  className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                    settings.secondaryColor === color.value
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-botsy-dark scale-90'
                      : 'hover:scale-90'
                  }`}
                  style={{ backgroundColor: color.value, border: color.value === '#FFFFFF' || color.value === '#F5F5F0' ? '1px solid rgba(255,255,255,0.2)' : undefined }}
                  title={color.name}
                >
                  {settings.secondaryColor === color.value && (
                    <Check className="h-4 w-4" style={{ color: color.value === '#FFFFFF' || color.value === '#F5F5F0' ? '#1A1A2E' : '#FFFFFF' }} />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => updateSettings(s => ({ ...s, secondaryColor: e.target.value }))}
                className="h-10 w-10 rounded-lg cursor-pointer bg-transparent border border-white/10"
              />
              <input
                type="text"
                value={settings.secondaryColor}
                onChange={(e) => updateSettings(s => ({ ...s, secondaryColor: e.target.value }))}
                className="flex-1 h-10 px-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-botsy-lime/50"
              />
            </div>
          </Card>

          {/* Position & Size Row */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Position */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Move className="h-5 w-5 text-botsy-lime" />
                <h3 className="text-white font-medium">Posisjon</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'bottom-left', label: 'Venstre' },
                  { value: 'bottom-right', label: 'Høyre' },
                ].map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => updateSettings(s => ({ ...s, position: pos.value }))}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                      settings.position === pos.value
                        ? 'border-botsy-lime bg-botsy-lime/10 text-botsy-lime'
                        : 'border-white/[0.06] text-[#A8B4C8] hover:border-white/[0.12] hover:text-white'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Widget Size */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Maximize2 className="h-5 w-5 text-botsy-lime" />
                <h3 className="text-white font-medium">Størrelse</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SIZE_OPTIONS.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => updateSettings(s => ({ ...s, widgetSize: size.value as 'small' | 'medium' | 'large' }))}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                      settings.widgetSize === size.value
                        ? 'border-botsy-lime bg-botsy-lime/10 text-botsy-lime'
                        : 'border-white/[0.06] text-[#A8B4C8] hover:border-white/[0.12] hover:text-white'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Logo Upload */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="h-5 w-5 text-botsy-lime" />
              <h3 className="text-white font-medium">Bedriftslogo</h3>
            </div>

            {logoError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{logoError}</p>
              </div>
            )}

            {uploadProgress && (
              <div className="mb-4 p-3 bg-botsy-lime/10 border border-botsy-lime/20 rounded-xl flex items-center gap-3">
                <Loader2 className="h-4 w-4 text-botsy-lime animate-spin flex-shrink-0" />
                <p className="text-botsy-lime text-sm">{uploadProgress}</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />

            {settings.logoUrl ? (
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                  <Image
                    src={settings.logoUrl}
                    alt="Bedriftslogo"
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1.5" />
                    )}
                    Bytt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={isUploadingLogo}
                    className="text-red-400 hover:text-red-300 hover:border-red-400/50"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Fjern
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="w-full h-24 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-white/20 hover:bg-white/[0.02] transition-colors disabled:opacity-50"
              >
                {isUploadingLogo ? (
                  <Loader2 className="h-6 w-6 text-[#6B7A94] animate-spin" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-[#6B7A94]" />
                    <span className="text-[#6B7A94] text-sm">Klikk for å laste opp logo</span>
                  </>
                )}
              </button>
            )}
          </Card>

        </div>
      </div>

      {/* Embed Code Section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code className="h-5 w-5 text-botsy-lime" />
          <h3 className="text-white font-medium">Installasjonskode</h3>
        </div>
        <p className="text-[#6B7A94] text-sm mb-4">
          Legg til denne koden like før <code className="text-botsy-lime">&lt;/body&gt;</code> på nettsiden din
        </p>
        <div className="relative">
          <pre className="p-4 bg-black/30 rounded-xl text-sm text-[#A8B4C8] overflow-x-auto border border-white/[0.06]">
            <code>{embedCode}</code>
          </pre>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute top-2 right-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-green-400" />
                Kopiert!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                Kopier
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-botsy-lime/5 border border-botsy-lime/20 rounded-xl">
          <h4 className="text-botsy-lime text-sm font-medium mb-2">Tips</h4>
          <ul className="text-[#A8B4C8] text-sm space-y-1">
            <li>• Koden fungerer på alle nettsider (WordPress, Wix, Squarespace, etc.)</li>
            <li>• Widgeten lastes asynkront og påvirker ikke sideytelsen</li>
            <li>• Husk å lagre endringene før du tester på andre nettsider</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
