'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Search,
  HelpCircle,
  ArrowRight,
  Sparkles,
  CreditCard,
  Settings,
  Shield,
  Globe,
  Download,
  Users,
  Zap,
  Palette,
  Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FAQJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'

// Animation variants
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

// FAQ categories
const faqCategories = [
  { id: 'all', label: 'Alle', icon: HelpCircle },
  { id: 'general', label: 'Generelt', icon: Bot },
  { id: 'pricing', label: 'Priser', icon: CreditCard },
  { id: 'setup', label: 'Oppsett', icon: Settings },
  { id: 'features', label: 'Funksjoner', icon: Sparkles },
  { id: 'security', label: 'Sikkerhet', icon: Shield },
]

// FAQ data
const faqs = [
  {
    id: 1,
    category: 'general',
    question: 'Hva er Botsy?',
    answer: 'Botsy er en AI-drevet kundeservice-chatbot bygget for norske bedrifter. Den fungerer som din digitale kollega som svarer kunder 24/7 via nettside-widget, Messenger, Instagram, SMS og e-post. Botsy l\u00e6rer seg bedriften din automatisk ved \u00e5 analysere nettsiden din, og kan tilpasses til \u00e5 snakke med din bedrifts tone og personlighet.',
    icon: Bot
  },
  {
    id: 2,
    category: 'pricing',
    question: 'Hvordan fungerer pr\u00f8veperioden?',
    answer: 'Du f\u00e5r 14 dager gratis pr\u00f8veperiode med full tilgang til alle funksjoner. Du legger til betalingskort ved registrering, men belastes ikke f\u00f8r pr\u00f8veperioden er over. I l\u00f8pet av pr\u00f8veperioden kan du teste chatboten p\u00e5 alle kanaler, legge til FAQs, tilpasse utseende og tone, og se hvordan Botsy presterer for din bedrift. Du kan kansellere n\u00e5r som helst i pr\u00f8veperioden uten kostnad.',
    icon: Zap
  },
  {
    id: 3,
    category: 'pricing',
    question: 'Hva koster Botsy?',
    answer: 'Botsy koster 699 kr/mnd (introduksjonstilbud, ordin\u00e6r pris 1499 kr/mnd). Dette inkluderer ubegrenset meldinger, alle kanaler (widget, Messenger, Instagram, SMS, e-post), ubegrenset FAQs, sanntids-dashboard, statistikk, teamtilgang for opptil 20 brukere, og GDPR-compliance. Ingen skjulte kostnader eller bindingstid.',
    icon: CreditCard
  },
  {
    id: 4,
    category: 'setup',
    question: 'Hvordan installerer jeg chatboten p\u00e5 nettsiden min?',
    answer: 'Det er enkelt! Etter at du har opprettet en konto og konfigurert chatboten, f\u00e5r du en kort JavaScript-kodesnutt som du limer inn f\u00f8r du lukker body-taggen p\u00e5 nettsiden din. Hvis du bruker WordPress, Wix, Squarespace eller andre CMS, kan du enkelt lime inn koden i "Custom Code" eller "Header/Footer Scripts"-seksjonen. Hele prosessen tar vanligvis under 5 minutter.',
    icon: Settings
  },
  {
    id: 5,
    category: 'features',
    question: 'Kan jeg tilpasse chatbotens utseende?',
    answer: 'Ja, Botsy er fullt tilpassbar! Du kan endre farger, logo, navn p\u00e5 chatboten, velkomstmelding, og posisjon p\u00e5 skjermen. I tillegg kan du justere tonen fra formell til uformell, velge om chatboten skal bruke emojis eller ikke, og sette foretrukket svarlengde. Alt dette gj\u00f8res enkelt via dashboardet uten teknisk kompetanse.',
    icon: Palette
  },
  {
    id: 6,
    category: 'features',
    question: 'Hvilke kanaler st\u00f8tter Botsy?',
    answer: 'Botsy st\u00f8tter f\u00f8lgende kanaler: Nettside-widget (chat direkte p\u00e5 nettsiden din), Facebook Messenger, Instagram DMs, SMS (norske og internasjonale numre), og E-post (IMAP/SMTP). Alle samtaler fra alle kanaler samles i ett dashboard, s\u00e5 du har full oversikt uansett hvor kundene kontakter deg.',
    icon: Globe
  },
  {
    id: 7,
    category: 'setup',
    question: 'Hvordan trener jeg chatboten?',
    answer: 'Botsy l\u00e6rer seg bedriften din automatisk ved \u00e5 analysere nettsiden din. I tillegg kan du manuelt legge til FAQs (ofte stilte sp\u00f8rsm\u00e5l med svar), laste opp dokumenter, og gi spesifikke instruksjoner. Botsy oppdaterer seg automatisk hver time ved \u00e5 sjekke nettsiden din for endringer i priser, \u00e5pningstider, produkter og annen informasjon.',
    icon: Sparkles
  },
  {
    id: 8,
    category: 'features',
    question: 'Hva skjer hvis chatboten ikke kan svare?',
    answer: 'Hvis Botsy ikke finner et godt svar, kan den enten be kunden om \u00e5 reformulere sp\u00f8rsm\u00e5let, foresl\u00e5 \u00e5 kontakte en menneskelig kundebehandler, eller sende et varsel til teamet ditt. Du kan selv bestemme hvordan Botsy skal h\u00e5ndtere disse situasjonene via innstillingene. Ansatte kan ogs\u00e5 ta over samtaler manuelt n\u00e5r som helst.',
    icon: Users
  },
  {
    id: 9,
    category: 'features',
    question: 'Kan jeg eksportere samtalehistorikk?',
    answer: 'Ja, du kan eksportere all samtalehistorikk fra dashboardet. Dataene kan lastes ned i CSV- eller JSON-format for videre analyse eller arkivering. Dette er ogs\u00e5 nyttig for GDPR-compliance, hvor kunder har rett til \u00e5 f\u00e5 utlevert sine data.',
    icon: Download
  },
  {
    id: 10,
    category: 'pricing',
    question: 'Hvordan kansellerer jeg abonnementet?',
    answer: 'Du kan kansellere abonnementet n\u00e5r som helst fra fakturering-siden i dashboardet. Det er ingen bindingstid eller oppsigelsesgebyr. Ved kansellering beholder du tilgang til tjenesten ut innev\u00e6rende betalingsperiode. Du kan ogs\u00e5 velge \u00e5 pause abonnementet midlertidig hvis du trenger en pause.',
    icon: CreditCard
  },
  {
    id: 11,
    category: 'security',
    question: 'Er dataene mine trygge?',
    answer: 'Ja, sikkerhet er v\u00e5r h\u00f8yeste prioritet. Alle data lagres p\u00e5 servere innenfor EU/E\u00d8S og er kryptert b\u00e5de under overf\u00f8ring og ved lagring (AES-256). Vi er fullt GDPR-compliant, og du har full kontroll over dataene dine. Vi bruker to-faktor autentisering for ekstra sikkerhet, og dataene dine brukes aldri til \u00e5 trene AI-modeller.',
    icon: Shield
  },
  {
    id: 12,
    category: 'features',
    question: 'St\u00f8tter Botsy flere spr\u00e5k?',
    answer: 'Ja! Botsy identifiserer automatisk hvilket spr\u00e5k kunden skriver p\u00e5 og svarer p\u00e5 samme spr\u00e5k. Vi st\u00f8tter over 10 spr\u00e5k, inkludert norsk, engelsk, svensk, dansk, tysk, spansk, fransk og flere. Hovedspr\u00e5kinnstillingen din p\u00e5virker dashboardet og standardsvar, men Botsy tilpasser seg kundens spr\u00e5k automatisk.',
    icon: Globe
  }
]

// FAQ Item Component
function FAQItem({ faq, isOpen, onToggle }: {
  faq: typeof faqs[0]
  isOpen: boolean
  onToggle: () => void
}) {
  const Icon = faq.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      <Card
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'border-botsy-lime/30 bg-botsy-dark-surface/80' : ''
        }`}
        hover={!isOpen}
      >
        <button
          onClick={onToggle}
          className="w-full p-6 text-left flex items-start gap-4"
          aria-expanded={isOpen}
        >
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            isOpen
              ? 'bg-botsy-lime/20 text-botsy-lime'
              : 'bg-white/[0.05] text-[#A8B4C8]'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-semibold pr-8 transition-colors ${
              isOpen ? 'text-white' : 'text-[#E8ECF2]'
            }`}>
              {faq.question}
            </h3>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 mt-1"
          >
            <ChevronDown className={`h-5 w-5 transition-colors ${
              isOpen ? 'text-botsy-lime' : 'text-[#6B7A94]'
            }`} />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="px-6 pb-6 pt-0">
                <div className="pl-14">
                  <p className="text-[#A8B4C8] leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

export default function FAQPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [openFAQs, setOpenFAQs] = useState<number[]>([])

  // Filter FAQs based on search and category
  const filteredFAQs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesSearch = searchQuery === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory

      return matchesSearch && matchesCategory
    })
  }, [searchQuery, activeCategory])

  const toggleFAQ = (id: number) => {
    setOpenFAQs(prev =>
      prev.includes(id)
        ? prev.filter(faqId => faqId !== id)
        : [...prev, id]
    )
  }

  // Prepare FAQ data for JSON-LD
  const faqJsonLdData = faqs.map(faq => ({
    question: faq.question,
    answer: faq.answer
  }))

  return (
    <div className="min-h-screen bg-botsy-dark overflow-x-hidden">
      {/* SEO JSON-LD */}
      <FAQJsonLd faqs={faqJsonLdData} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Hjem', url: 'https://botsy.no' },
          { name: 'Ofte stilte sp\u00f8rsm\u00e5l', url: 'https://botsy.no/ofte-stilte-sporsmal' }
        ]}
      />

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
              <Link href="/kontakt" className="text-[#A8B4C8] hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium px-4 py-2 rounded-full">
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
                Pr\u00f8v gratis
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
              <Link href="/kontakt" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Kontakt</Link>
              <div className="h-px bg-white/[0.06] my-2" />
              <Link href="/logg-inn"><Button variant="outline" className="w-full">Logg inn</Button></Link>
              <Link href="/prov-gratis"><Button className="w-full shadow-lg shadow-botsy-lime/20">Pr\u00f8v gratis</Button></Link>
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
                <HelpCircle className="h-3 w-3 mr-1.5" />
                Vi hjelper deg
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight"
            >
              Ofte stilte <span className="text-gradient">sp\u00f8rsm\u00e5l</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg lg:text-xl text-[#A8B4C8] leading-relaxed max-w-xl mx-auto mb-10"
            >
              Finn svar p\u00e5 de vanligste sp\u00f8rsm\u00e5lene om Botsy.
              Finner du ikke svaret? Ta gjerne kontakt med oss.
            </motion.p>

            {/* Search Bar */}
            <motion.div variants={fadeInUp} className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7A94]" />
                <input
                  type="text"
                  placeholder="S\u00f8k i ofte stilte sp\u00f8rsm\u00e5l..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white placeholder:text-[#6B7A94] text-base focus:outline-none focus:border-botsy-lime/50 transition-colors"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FAQ CONTENT ===== */}
      <section className="pb-24 lg:pb-32">
        <div className="container">
          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2 mb-12"
          >
            {faqCategories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === category.id
                      ? 'bg-botsy-lime/20 text-botsy-lime border border-botsy-lime/30'
                      : 'bg-white/[0.03] text-[#A8B4C8] border border-white/[0.06] hover:border-white/[0.12] hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </button>
              )
            })}
          </motion.div>

          {/* FAQ List */}
          <div className="max-w-3xl mx-auto space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq) => (
                  <FAQItem
                    key={faq.id}
                    faq={faq}
                    isOpen={openFAQs.includes(faq.id)}
                    onToggle={() => toggleFAQ(faq.id)}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="h-16 w-16 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-[#6B7A94]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Ingen resultater</h3>
                  <p className="text-[#A8B4C8] mb-6">
                    Vi fant ingen sp\u00f8rsm\u00e5l som matcher &quot;{searchQuery}&quot;
                  </p>
                  <Button variant="outline" onClick={() => setSearchQuery('')}>
                    Nullstill s\u00f8k
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results count */}
          {searchQuery && filteredFAQs.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[#6B7A94] text-sm mt-8"
            >
              Viser {filteredFAQs.length} av {faqs.length} sp\u00f8rsm\u00e5l
            </motion.p>
          )}
        </div>
      </section>

      {/* ===== CONTACT CTA ===== */}
      <section className="py-20 lg:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-botsy-dark-deep/30 to-transparent" />
        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-botsy-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-botsy-dark-surface to-botsy-dark-deep" />
            <div className="absolute inset-0 bg-mesh-gradient opacity-50" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-botsy-lime/10 rounded-full blur-[100px]" />

            <div className="relative px-8 py-16 lg:py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-botsy-lime/20 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-8 w-8 text-botsy-lime" />
              </div>
              <h2 className="text-2xl lg:text-4xl font-bold text-white mb-4 font-display">
                Fant du ikke svaret du lette etter?
              </h2>
              <p className="text-lg text-[#A8B4C8] mb-8 max-w-xl mx-auto">
                Vi er her for \u00e5 hjelpe! Ta kontakt med oss s\u00e5 svarer vi s\u00e5 raskt vi kan.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/kontakt">
                  <Button size="lg" className="group shadow-lg shadow-botsy-lime/20">
                    Kontakt oss
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/prov-gratis">
                  <Button size="lg" variant="outline">
                    Pr\u00f8v Botsy gratis
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
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
                loading="lazy"
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex items-center gap-6 text-sm text-[#6B7A94]">
              <Link href="/personvern" className="hover:text-white transition-colors">Personvern</Link>
              <Link href="/vilkar" className="hover:text-white transition-colors">Vilk\u00e5r</Link>
              <Link href="/kontakt" className="hover:text-white transition-colors">Kontakt</Link>
              <span>&copy; {new Date().getFullYear()} Botsy AS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
