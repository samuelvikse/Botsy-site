'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Send,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Users,
  Crown,
  CreditCard,
  Clock,
  XOctagon,
  PartyPopper,
  BarChart3,
  Calendar,
  SendHorizonal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { authFetch } from '@/lib/auth-fetch'

const DEVELOPER_EMAIL = 'hei@botsy.no'
const TARGET_EMAIL = 'hei@botsy.no'

interface EmailTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: 'team' | 'subscription' | 'notifications'
}

const emailTemplates: EmailTemplate[] = [
  // Team emails
  {
    id: 'team-invitation',
    name: 'Team-invitasjon',
    description: 'Invitasjon til å bli med i et team på Botsy',
    icon: <Users className="h-5 w-5" />,
    category: 'team',
  },
  {
    id: 'welcome-to-team',
    name: 'Velkommen til teamet',
    description: 'Bekreftelse når noen aksepterer invitasjon',
    icon: <PartyPopper className="h-5 w-5" />,
    category: 'team',
  },
  {
    id: 'ownership-transfer-request',
    name: 'Eierskapsoverføring (forespørsel)',
    description: 'E-post til nåværende eier for bekreftelse',
    icon: <Crown className="h-5 w-5" />,
    category: 'team',
  },
  {
    id: 'ownership-transfer-offer',
    name: 'Eierskapsoverføring (tilbud)',
    description: 'E-post til ny eier om tilbudet',
    icon: <Crown className="h-5 w-5" />,
    category: 'team',
  },
  {
    id: 'ownership-transfer-complete',
    name: 'Eierskapsoverføring (fullført)',
    description: 'Bekreftelse til begge parter',
    icon: <Crown className="h-5 w-5" />,
    category: 'team',
  },
  // Subscription emails
  {
    id: 'subscription-confirmation',
    name: 'Abonnementsbekreftelse',
    description: 'Bekreftelse på nytt abonnement eller prøveperiode',
    icon: <CreditCard className="h-5 w-5" />,
    category: 'subscription',
  },
  {
    id: 'trial-expiring',
    name: 'Prøveperiode utløper',
    description: 'Påminnelse om at prøveperioden snart er over',
    icon: <Clock className="h-5 w-5" />,
    category: 'subscription',
  },
  {
    id: 'subscription-cancelled',
    name: 'Abonnement kansellert',
    description: 'Bekreftelse på kansellert abonnement',
    icon: <XOctagon className="h-5 w-5" />,
    category: 'subscription',
  },
  // Notification emails
  {
    id: 'daily-summary',
    name: 'Daglig oppsummering',
    description: 'Daglig rapport over samtaler og statistikk',
    icon: <Calendar className="h-5 w-5" />,
    category: 'notifications',
  },
  {
    id: 'weekly-summary',
    name: 'Ukentlig oppsummering',
    description: 'Ukentlig rapport med statistikk og topplister',
    icon: <BarChart3 className="h-5 w-5" />,
    category: 'notifications',
  },
]

export default function EmailTestingPage() {
  return (
    <ProtectedRoute>
      <EmailTestingContent />
    </ProtectedRoute>
  )
}

function EmailTestingContent() {
  const { user } = useAuth()
  const router = useRouter()
  const toast = useToast()
  
  const [sendingAll, setSendingAll] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, 'success' | 'error'>>({})

  // Check authorization
  if (user?.email !== DEVELOPER_EMAIL) {
    router.push('/admin')
    return null
  }

  const handleSendAll = async () => {
    setSendingAll(true)
    setResults({})
    
    try {
      const response = await authFetch('/api/test/email-demos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TARGET_EMAIL }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Alle e-poster sendt', `${data.results?.filter((r: { success: boolean }) => r.success).length || 10} e-poster sendt til ${TARGET_EMAIL}`)
        
        // Update results
        const newResults: Record<string, 'success' | 'error'> = {}
        emailTemplates.forEach(template => {
          newResults[template.id] = 'success'
        })
        setResults(newResults)
      } else {
        toast.error('Feil', data.error || 'Kunne ikke sende e-poster')
      }
    } catch (error) {
      toast.error('Feil', 'Nettverksfeil ved sending')
    } finally {
      setSendingAll(false)
    }
  }

  const handleSendSingle = async (templateId: string) => {
    setSendingId(templateId)
    
    try {
      const response = await authFetch('/api/test/send-single-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          email: TARGET_EMAIL,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('E-post sendt', `Sendt til ${TARGET_EMAIL}`)
        setResults(prev => ({ ...prev, [templateId]: 'success' }))
      } else {
        toast.error('Feil', data.error || 'Kunne ikke sende e-post')
        setResults(prev => ({ ...prev, [templateId]: 'error' }))
      }
    } catch (error) {
      toast.error('Feil', 'Nettverksfeil ved sending')
      setResults(prev => ({ ...prev, [templateId]: 'error' }))
    } finally {
      setSendingId(null)
    }
  }

  const handlePreview = async (templateId: string) => {
    setPreviewLoading(templateId)
    
    try {
      const response = await authFetch(`/api/test/preview-email?templateId=${templateId}`)
      const data = await response.json()
      
      if (data.html) {
        setPreviewHtml(data.html)
      } else {
        toast.error('Feil', 'Kunne ikke laste forhåndsvisning')
      }
    } catch (error) {
      toast.error('Feil', 'Nettverksfeil')
    } finally {
      setPreviewLoading(null)
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'team': return 'Team'
      case 'subscription': return 'Abonnement'
      case 'notifications': return 'Varsler'
      default: return category
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'team': return 'bg-blue-500/20 text-blue-400'
      case 'subscription': return 'bg-purple-500/20 text-purple-400'
      case 'notifications': return 'bg-amber-500/20 text-amber-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-botsy-dark p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/testing">
              <Button variant="ghost" size="sm" className="text-botsy-gray-light hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tilbake
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Mail className="h-6 w-6 text-botsy-lime" />
                E-post Testing
              </h1>
              <p className="text-botsy-gray-light text-sm mt-1">
                Send alle e-postmaler til {TARGET_EMAIL}
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleSendAll}
            disabled={sendingAll}
            className="bg-botsy-lime text-botsy-dark hover:bg-botsy-lime/90 font-medium"
          >
            {sendingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4 mr-2" />
            )}
            Send alle ({emailTemplates.length})
          </Button>
        </div>

        {/* Email Templates Grid */}
        <div className="grid gap-4">
          {['team', 'subscription', 'notifications'].map(category => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Badge className={getCategoryColor(category)}>
                  {getCategoryLabel(category)}
                </Badge>
              </h2>
              <div className="grid gap-3">
                {emailTemplates
                  .filter(t => t.category === category)
                  .map(template => (
                    <Card 
                      key={template.id} 
                      className="bg-botsy-card border-botsy-border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-botsy-dark flex items-center justify-center text-botsy-gray-light">
                            {template.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-white">{template.name}</h3>
                              {results[template.id] === 'success' && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {results[template.id] === 'error' && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <p className="text-sm text-botsy-gray-light">{template.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(template.id)}
                            disabled={previewLoading === template.id}
                            className="border-botsy-border text-botsy-gray-light hover:text-white"
                          >
                            {previewLoading === template.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSendSingle(template.id)}
                            disabled={sendingId === template.id || sendingAll}
                            className="bg-botsy-lime text-botsy-dark hover:bg-botsy-lime/90"
                          >
                            {sendingId === template.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Email Preview Modal */}
        {previewHtml && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-botsy-dark p-4 flex items-center justify-between">
                <h3 className="text-white font-medium">E-post forhåndsvisning</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewHtml(null)}
                  className="text-botsy-gray-light hover:text-white"
                >
                  Lukk
                </Button>
              </div>
              <div 
                className="overflow-auto max-h-[calc(90vh-60px)]"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
