'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Mail,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  Menu,
  X,
  ChevronRight,
  Calendar,
  Sparkles,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

// Animation variants - same as main page
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

export default function ContactPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    type: 'general'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      })

      const data = await response.json()

      if (data.success) {
        setIsSubmitted(true)
        setFormState({ name: '', email: '', company: '', message: '', type: 'general' })
      } else {
        setSubmitError(data.error || 'Kunne ikke sende melding. Prøv igjen.')
      }
    } catch {
      setSubmitError('En feil oppstod. Prøv igjen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBookMeeting = async () => {
    // Pre-fill the form for booking
    setFormState({
      ...formState,
      type: 'demo',
      message: formState.message || 'Jeg ønsker å booke en 30 minutters demo av Botsy.\n\nMitt foretrukne tidspunkt: '
    })
    // Scroll to form
    document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-botsy-dark overflow-x-hidden">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-botsy-lime/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-botsy-lime/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 w-full z-50"
      >
        <div className="absolute inset-0 bg-botsy-dark/80 backdrop-blur-xl border-b border-white/[0.06]" />
        <div className="container mx-auto h-20 flex items-center justify-between relative">
          <Link href="/" className="flex items-center gap-3 relative z-10 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-botsy-lime/10 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Image
                src="/brand/botsy-full-logo.svg"
                alt="Botsy"
                width={130}
                height={44}
                priority
                className="h-10 w-auto relative"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 bg-white/[0.03] rounded-full px-2 py-1.5 border border-white/[0.06]">
              <Link href="/funksjoner" className="text-[#A8B4C8] hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium px-4 py-2 rounded-full">
                Funksjoner
              </Link>
              <Link href="/#pricing" className="text-[#A8B4C8] hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium px-4 py-2 rounded-full">
                Priser
              </Link>
              <Link href="/#how-it-works" className="text-[#A8B4C8] hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium px-4 py-2 rounded-full">
                Slik fungerer det
              </Link>
              <Link href="/kontakt" className="text-white bg-white/[0.06] text-sm font-medium px-4 py-2 rounded-full">
                Kontakt
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link href="/logg-inn">
              <Button variant="ghost" size="sm" className="text-[#A8B4C8] hover:text-white">
                Logg inn
              </Button>
            </Link>
            <Link href="/prov-gratis">
              <Button size="sm" className="shadow-lg shadow-botsy-lime/20">
                Prøv gratis
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <button
            className="lg:hidden p-2.5 text-white bg-white/[0.05] rounded-xl border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-botsy-dark/95 backdrop-blur-xl border-t border-white/[0.06]"
          >
            <div className="container py-6 flex flex-col gap-2">
              <Link href="/funksjoner" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Funksjoner</Link>
              <Link href="/#pricing" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Priser</Link>
              <Link href="/#how-it-works" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Slik fungerer det</Link>
              <Link href="/kontakt" className="text-white py-3 px-4 rounded-xl bg-white/[0.05]" onClick={() => setMobileMenuOpen(false)}>Kontakt</Link>
              <div className="h-px bg-white/[0.06] my-2" />
              <Link href="/logg-inn"><Button variant="outline" className="w-full">Logg inn</Button></Link>
              <Link href="/prov-gratis"><Button className="w-full shadow-lg shadow-botsy-lime/20">Prøv gratis</Button></Link>
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-32 pb-12 lg:pt-44 lg:pb-16">
        <div className="container">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div variants={fadeInUp}>
              <Badge className="mb-6">
                <MessageSquare className="h-3 w-3 mr-1.5" />
                Vi er her for deg
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight"
            >
              La oss <span className="text-gradient">snakke</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg lg:text-xl text-[#A8B4C8] leading-relaxed max-w-xl mx-auto"
            >
              Har du spørsmål? Vil du se en demo?
              Vi svarer vanligvis innen noen timer.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <section className="pb-24 lg:pb-32">
        <div className="container">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3"
            >
              <Card className="p-8 lg:p-10 relative overflow-hidden" glow>
                <div className="absolute top-0 right-0 w-64 h-64 bg-botsy-lime/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16 relative"
                  >
                    <div className="h-20 w-20 rounded-full bg-botsy-lime/20 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="h-10 w-10 text-botsy-lime" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 font-display">Melding sendt!</h3>
                    <p className="text-[#A8B4C8] mb-8 max-w-md mx-auto">
                      Takk for at du tok kontakt. Vi svarer deg så snart som mulig.
                    </p>
                    <Button onClick={() => setIsSubmitted(false)} variant="outline">
                      Send en ny melding
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6 relative">
                    {submitError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-red-400 text-sm">{submitError}</p>
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <label className="text-white text-sm font-medium block mb-2">
                          Navn *
                        </label>
                        <input
                          type="text"
                          required
                          value={formState.name}
                          onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                          placeholder="Ola Nordmann"
                          className="w-full h-12 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm font-medium block mb-2">
                          E-post *
                        </label>
                        <input
                          type="email"
                          required
                          value={formState.email}
                          onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                          placeholder="ola@bedrift.no"
                          className="w-full h-12 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium block mb-2">
                        Bedrift
                      </label>
                      <input
                        type="text"
                        value={formState.company}
                        onChange={(e) => setFormState({ ...formState, company: e.target.value })}
                        placeholder="Bedriften AS"
                        className="w-full h-12 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium block mb-3">
                        Hva gjelder henvendelsen?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { value: 'demo', label: 'Book demo' },
                          { value: 'sales', label: 'Salg' },
                          { value: 'support', label: 'Support' },
                          { value: 'general', label: 'Generelt' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormState({ ...formState, type: option.value })}
                            className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                              formState.type === option.value
                                ? 'border-botsy-lime bg-botsy-lime/10 text-botsy-lime'
                                : 'border-white/[0.08] text-[#A8B4C8] hover:border-white/[0.15] hover:text-white'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium block mb-2">
                        Melding *
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formState.message}
                        onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                        placeholder="Fortell oss hva vi kan hjelpe deg med..."
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 transition-colors resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full shadow-lg shadow-botsy-lime/20"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sender...
                        </>
                      ) : (
                        <>
                          Send melding
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 space-y-6"
            >
              <Card className="p-6 group hover:border-botsy-lime/20 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-botsy-lime/10 flex items-center justify-center text-botsy-lime">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">E-post</h3>
                    <a href="mailto:hei@botsy.no" className="text-[#A8B4C8] hover:text-botsy-lime transition-colors">
                      hei@botsy.no
                    </a>
                  </div>
                </div>
              </Card>

              <Card className="p-6 group hover:border-blue-500/20 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Responstid</h3>
                    <p className="text-[#A8B4C8]">Vanligvis innen 2-4 timer</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 group hover:border-purple-500/20 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Book et møte</h3>
                    <p className="text-[#A8B4C8] text-sm mb-3">30 min demo av Botsy</p>
                    <Button variant="outline" size="sm" onClick={handleBookMeeting}>
                      Book demo
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 group hover:border-white/[0.15] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-[#A8B4C8]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <div className="text-sm text-[#A8B4C8] space-y-1">
                    <h3 className="text-white font-semibold mb-1">Bedriftsinformasjon</h3>
                    <p>Botsy AS</p>
                    <p>Org.nr: 837 094 682</p>
                    <p>Inndalsveien 28, 5063 Bergen</p>
                  </div>
                </div>
              </Card>

              {/* CTA Card */}
              <Card className="p-6 border-botsy-lime/20 bg-gradient-to-br from-botsy-lime/5 to-transparent">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-botsy-lime/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-botsy-lime" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Rask start?</h3>
                    <p className="text-[#6B7A94] text-sm">Prøv Botsy selv!</p>
                  </div>
                </div>
                <p className="text-[#A8B4C8] text-sm mb-4">
                  Se hvordan Botsy fungerer. 14 dager gratis prøveperiode.
                </p>
                <Link href="/prov-gratis">
                  <Button size="sm" className="w-full shadow-lg shadow-botsy-lime/20">
                    Prøv gratis
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section className="py-20 lg:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-botsy-dark-deep/30 to-transparent" />
        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-display">
              Ofte stilte spørsmål
            </h2>
            <p className="text-[#A8B4C8]">
              Finner du ikke svaret? Send oss en melding!
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                q: 'Hvor lang tid tar det å sette opp Botsy?',
                a: 'De fleste er i gang på under 5 minutter. Botsy analyserer nettsiden din automatisk.'
              },
              {
                q: 'Trenger jeg teknisk kompetanse?',
                a: 'Nei! Du trenger bare å lime inn én kodelinje på nettsiden din.'
              },
              {
                q: 'Kan jeg prøve før jeg kjøper?',
                a: '14 dager gratis prøveperiode med full tilgang til alle funksjoner.'
              },
              {
                q: 'Hvordan fungerer integrasjonene?',
                a: 'Vi guider deg gjennom hele prosessen for Messenger, Instagram, SMS og e-post.'
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-6 h-full">
                  <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                  <p className="text-[#A8B4C8] text-sm">{faq.a}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/">
              <Image
                src="/brand/botsy-full-logo.svg"
                alt="Botsy"
                width={100}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex items-center gap-6 text-sm text-[#6B7A94]">
              <Link href="/personvern" className="hover:text-white transition-colors">Personvern</Link>
              <Link href="/vilkar" className="hover:text-white transition-colors">Vilkår</Link>
              <span>© {new Date().getFullYear()} Botsy AS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
