'use client'

import { useState } from 'react'
import { Mail, Shield, User, Copy, CheckCircle, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import type { EmployeePermissions, AdminPermissions } from '@/types'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  onSuccess: () => void
  isOwner: boolean
}

export function InviteModal({ isOpen, onClose, companyId, onSuccess, isOwner }: InviteModalProps) {
  const { user, userData } = useAuth()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'employee'>('employee')
  const [permissions, setPermissions] = useState<EmployeePermissions>({
    knowledgebase: true,
    documents: true,
    instructions: false,
    analytics: false,
    adminBot: false,
  })
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions>({
    channels: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    if (!email) {
      toast.error('E-post påkrevd', 'Vennligst skriv inn en e-postadresse')
      return
    }

    if (!email.includes('@')) {
      toast.error('Ugyldig e-post', 'Vennligst skriv inn en gyldig e-postadresse')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          email: email.toLowerCase(),
          role,
          permissions: role === 'employee' ? permissions : adminPermissions,
          invitedBy: user?.uid,
          inviterName: user?.displayName || user?.email,
          companyName: userData?.companyId ? 'Din bedrift' : '',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create invitation')
      }

      const data = await response.json()
      setInviteUrl(data.inviteUrl)
      setEmailSent(data.emailSent || false)

      if (data.emailSent) {
        toast.success('Invitasjon sendt!', `E-post med invitasjon ble sendt til ${email}`)
      } else {
        toast.info('Invitasjon opprettet', 'E-post kunne ikke sendes. Del lenken manuelt.')
      }
      onSuccess()
    } catch (error) {
      toast.error('Kunne ikke sende invitasjon', error instanceof Error ? error.message : 'Prøv igjen senere')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!inviteUrl) return

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Kunne ikke kopiere', 'Prøv igjen')
    }
  }

  const handleClose = () => {
    setEmail('')
    setRole('employee')
    setPermissions({
      knowledgebase: true,
      documents: true,
      instructions: false,
      analytics: false,
      adminBot: false,
    })
    setAdminPermissions({ channels: true })
    setInviteUrl(null)
    setEmailSent(false)
    setCopied(false)
    onClose()
  }

  const togglePermission = (key: keyof EmployeePermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Inviter nytt teammedlem"
      description="Send en invitasjon til en ny medarbeider"
      size="md"
    >
      {inviteUrl ? (
        <div className="space-y-5">
          {/* Hero image */}
          <div className="flex items-center justify-center pt-2">
            <img
              src="/images/invitert.png"
              alt="Invitasjon sendt"
              className="h-32 w-auto"
            />
          </div>

          {/* Success message */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-white">
              {emailSent ? 'Invitasjonen er på vei!' : 'Invitasjon klar!'}
            </h3>
            <p className="text-[#A8B4C8] text-sm leading-relaxed">
              {emailSent ? (
                <>
                  Vi har sendt en magisk lenke til <span className="text-botsy-lime font-medium">{email}</span>.
                  <br />
                  Be dem sjekke innboksen (og spam-mappen, for sikkerhets skyld).
                </>
              ) : (
                <>
                  Del lenken nedenfor med <span className="text-botsy-lime font-medium">{email}</span>
                  <br />
                  så er de med på laget i løpet av sekunder!
                </>
              )}
            </p>
          </div>

          {/* Email confirmation badge */}
          {emailSent && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-botsy-lime/10 border border-botsy-lime/20 rounded-full">
                <CheckCircle className="h-4 w-4 text-botsy-lime" />
                <span className="text-botsy-lime text-sm font-medium">E-post sendt</span>
              </div>
            </div>
          )}

          {/* Invite link section */}
          <div className="space-y-2">
            <p className="text-[#6B7A94] text-xs">
              {emailSent ? 'Invitasjonslenke (for manuell deling):' : 'Del denne lenken:'}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white/70 text-sm truncate font-mono">
                {inviteUrl}
              </div>
              <Button onClick={handleCopyLink} size="sm" className="shrink-0">
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1.5" />
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
            <p className="text-[#6B7A94] text-xs text-center">
              Lenken er gyldig i 7 dager
            </p>
          </div>

          {/* Close button */}
          <Button variant="outline" onClick={handleClose} className="w-full">
            Ferdig
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="text-white text-sm font-medium block mb-2">
              E-postadresse
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="medarbeider@bedrift.no"
                className="w-full h-12 pl-11 pr-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="text-white text-sm font-medium block mb-3">
              Rolle
            </label>
            <div className="grid grid-cols-2 gap-3">
              {isOwner && (
                <button
                  onClick={() => setRole('admin')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    role === 'admin'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={`h-5 w-5 ${role === 'admin' ? 'text-blue-400' : 'text-[#6B7A94]'}`} />
                    <span className={`font-medium ${role === 'admin' ? 'text-blue-400' : 'text-white'}`}>
                      Administrator
                    </span>
                  </div>
                  <p className="text-[#6B7A94] text-xs">
                    Full tilgang unntatt innstillinger og eierskapsoverføring
                  </p>
                </button>
              )}

              <button
                onClick={() => setRole('employee')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  role === 'employee'
                    ? 'border-botsy-lime bg-botsy-lime/10'
                    : 'border-white/[0.08] hover:border-white/[0.16]'
                } ${!isOwner ? 'col-span-2' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <User className={`h-5 w-5 ${role === 'employee' ? 'text-botsy-lime' : 'text-[#6B7A94]'}`} />
                  <span className={`font-medium ${role === 'employee' ? 'text-botsy-lime' : 'text-white'}`}>
                    Ansatt
                  </span>
                </div>
                <p className="text-[#6B7A94] text-xs">
                  Begrenset tilgang basert på valgte rettigheter
                </p>
              </button>
            </div>
          </div>

          {/* Employee Permissions */}
          {role === 'employee' && (
            <div>
              <label className="text-white text-sm font-medium block mb-3">
                Tilganger for ansatt
              </label>
              <div className="space-y-2">
                {[
                  { key: 'knowledgebase' as const, label: 'Kunnskapsbase', desc: 'Administrer FAQs' },
                  { key: 'documents' as const, label: 'Dokumenter', desc: 'Last opp og administrer dokumenter' },
                  { key: 'instructions' as const, label: 'Instruksjoner', desc: 'Opprett og rediger instruksjoner' },
                  { key: 'analytics' as const, label: 'Analyser', desc: 'Se statistikk og rapporter' },
                  { key: 'adminBot' as const, label: 'Admin Bot', desc: 'Tilgang til AI-assistenten' },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => togglePermission(key)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      permissions[key]
                        ? 'border-botsy-lime/50 bg-botsy-lime/5'
                        : 'border-white/[0.08] hover:border-white/[0.16]'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">{label}</p>
                      <p className="text-[#6B7A94] text-xs">{desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      permissions[key]
                        ? 'bg-botsy-lime border-botsy-lime'
                        : 'border-white/20'
                    }`}>
                      {permissions[key] && (
                        <svg className="w-3 h-3 text-botsy-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Admin Permissions */}
          {role === 'admin' && (
            <div>
              <label className="text-white text-sm font-medium block mb-3">
                Tilganger for administrator
              </label>
              <p className="text-[#6B7A94] text-sm mb-3">
                Administratorer har tilgang til alle paneler unntatt Innstillinger.
              </p>
              <button
                onClick={() => setAdminPermissions(prev => ({ channels: !prev.channels }))}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  adminPermissions.channels
                    ? 'border-blue-500/50 bg-blue-500/5'
                    : 'border-white/[0.08] hover:border-white/[0.16]'
                }`}
              >
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Kanaler</p>
                  <p className="text-[#6B7A94] text-xs">Konfigurer SMS, WhatsApp, etc.</p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  adminPermissions.channels
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-white/20'
                }`}>
                  {adminPermissions.channels && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Avbryt
            </Button>
            <Button onClick={handleSubmit} disabled={!email || isLoading} className="flex-1">
              {isLoading ? 'Sender...' : 'Send invitasjon'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
