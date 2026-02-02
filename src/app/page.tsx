'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Clock,
  TrendingUp,
  Shield,
  ChevronRight,
  Check,
  Zap,
  Globe,
  HeartHandshake,
  BarChart3,
  Users,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  LayoutDashboard,
  Mail
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } }
}

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } }
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, loading } = useAuth()

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

          {/* Desktop Navigation - Centered */}
          <div className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 bg-white/[0.03] rounded-full px-2 py-1.5 border border-white/[0.06]">
              <Link href="/funksjoner" className="text-[#A8B4C8] hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium px-4 py-2 rounded-full">
                Funksjoner
              </Link>
              <Link href="#pricing" className="text-[#A8B4C8] hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium px-4 py-2 rounded-full">
                Priser
              </Link>
              <Link href="#how-it-works" className="text-[#A8B4C8] hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium px-4 py-2 rounded-full">
                Slik fungerer det
              </Link>
              <Link href="/kontakt" className="text-[#A8B4C8] hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium px-4 py-2 rounded-full">
                Kontakt
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {!loading && user ? (
              <Link href="/admin">
                <Button size="sm" className="shadow-lg shadow-botsy-lime/20">
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Admin
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
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
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2.5 text-white bg-white/[0.05] rounded-xl border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-botsy-dark/95 backdrop-blur-xl border-t border-white/[0.06]"
          >
            <div className="container py-6 flex flex-col gap-2">
              <Link href="/funksjoner" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Funksjoner</Link>
              <Link href="#pricing" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Priser</Link>
              <Link href="#how-it-works" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Slik fungerer det</Link>
              <Link href="/kontakt" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Kontakt</Link>
              <div className="h-px bg-white/[0.06] my-2" />
              {!loading && user ? (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full shadow-lg shadow-botsy-lime/20">
                    <LayoutDashboard className="h-4 w-4 mr-1.5" />
                    Admin
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}><Button variant="outline" className="w-full">Logg inn</Button></Link>
                  <Link href="/prov-gratis" onClick={() => setMobileMenuOpen(false)}><Button className="w-full shadow-lg shadow-botsy-lime/20">Prøv gratis</Button></Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left: Content */}
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="max-w-2xl"
            >
              <motion.div variants={fadeInUp}>
                <Badge className="mb-6">
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  14 dager gratis prøveperiode
                </Badge>
              </motion.div>
              
              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight"
              >
                Din nye
                <br />
                <span className="text-gradient">digitale kollega</span>
              </motion.h1>
              
              <motion.p 
                variants={fadeInUp}
                className="text-lg lg:text-xl text-[#A8B4C8] mb-10 leading-relaxed max-w-xl"
              >
                Din AI-kollega som svarer kunder 24/7 via Messenger, Instagram, SMS og nettside-widget. 
                Med din bedrifts personlighet. På norsk.
              </motion.p>
              
              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="/prov-gratis" className="w-full sm:w-auto">
                  <Button size="xl" className="w-full sm:w-auto group whitespace-normal h-auto py-4 sm:whitespace-nowrap sm:h-16 sm:py-0">
                    Start gratis prøveperiode
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 flex-shrink-0" />
                  </Button>
                </Link>
                <Link href="#how-it-works" className="w-full sm:w-auto">
                  <Button size="xl" variant="outline" className="w-full sm:w-auto whitespace-normal h-auto py-4 sm:whitespace-nowrap sm:h-16 sm:py-0">
                    Se hvordan det fungerer
                  </Button>
                </Link>
              </motion.div>
              
              <motion.p variants={fadeInUp} className="text-sm text-[#6B7A94] mt-5">
                Ingen kredittkort nødvendig • Kanseller når som helst
              </motion.p>
            </motion.div>

            {/* Right: Hero Image */}
            <motion.div
              variants={slideInRight}
              initial="hidden"
              animate="visible"
              className="relative lg:ml-auto lg:translate-x-20"
            >
              <Image
                src="/images/1.png"
                alt="Botsy Dashboard"
                width={780}
                height={560}
                priority
                className="w-full h-auto feathered-image scale-105"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== CAPABILITIES ===== */}
      <section className="py-12 border-y border-white/[0.04]">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-center"
          >
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-white font-display">24/7</p>
              <p className="text-sm text-[#6B7A94] mt-1">Alltid tilgjengelig</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-white/10" />
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-white font-display">&lt;10s</p>
              <p className="text-sm text-[#6B7A94] mt-1">Responstid</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-white/10" />
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-white font-display">10+</p>
              <p className="text-sm text-[#6B7A94] mt-1">Språk støttet</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-white/10" />
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-botsy-lime font-display">14 dager</p>
              <p className="text-sm text-[#6B7A94] mt-1">Gratis prøveperiode</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="py-24 lg:py-32">
        <div className="container">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-16 lg:mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4">Funksjoner</Badge>
            </motion.div>
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl lg:text-5xl font-bold text-white mb-6 font-display"
            >
              Alt du trenger for å automatisere kundeservicen
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-[#A8B4C8]">
              Botsy håndterer rutinehenvendelser, så du kan fokusere på det som virkelig betyr noe.
            </motion.p>
          </motion.div>

          {/* Feature Grid */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <FeatureCard 
              icon={<Clock className="h-6 w-6" />}
              title="Alltid tilgjengelig"
              description="Botsy svarer kunder 24/7, 365 dager i året. Ingen ventetid, ingen frokostpause, ingen ferie."
            />
            <FeatureCard 
              icon={<MessageSquare className="h-6 w-6" />}
              title="Alle kanaler, ett sted"
              description="Messenger, Instagram, SMS og nettside-widget. Alle samtaler samlet i ett oversiktlig dashboard."
            />
            <FeatureCard
              icon={<Globe className="h-6 w-6" />}
              title="Automatisk språktilpasning"
              description="Botsy identifiserer kundens språk og svarer på samme språk. Norsk, engelsk, svensk eller spansk – Botsy tilpasser seg automatisk."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Lærer bransjen din"
              description="Botsy tilegner seg bransjekompetanse automatisk – akkurat som en ny kollega. Fagterminologi, vanlige spørsmål og kundens behov."
            />
            <FeatureCard 
              icon={<HeartHandshake className="h-6 w-6" />}
              title="Din personlighet"
              description="Formell eller avslappet? Emojis eller ikke? Tilpass Botsys tone til merkevaren din."
            />
            <FeatureCard 
              icon={<BarChart3 className="h-6 w-6" />}
              title="Innsikt og analyse"
              description="Se hva kundene spør om, hvordan Botsy presterer, og hvor du kan forbedre deg."
            />
          </motion.div>
        </div>
      </section>

      {/* ===== INDUSTRY EXPERTISE SECTION ===== */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-botsy-dark-deep/30 to-transparent" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-botsy-lime/[0.03] rounded-full blur-[120px] translate-x-1/2" />

        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              variants={slideInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Image
                src="/images/bransjekompetanse.png"
                alt="Botsy lærer bransjekompetanse"
                width={600}
                height={500}
                className="w-full h-auto feathered-image"
              />
            </motion.div>

            <motion.div
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="h-3 w-3 mr-1.5" />
                Bransjekunnskap
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 font-display">
                Tilegner seg bransjekompetansen automatisk
              </h2>
              <p className="text-lg text-[#A8B4C8] mb-8 leading-relaxed">
                Akkurat som en ny kundeservice-kollega må lære seg bransjen, tilegner Botsy seg
                bransjekunnskap automatisk. Den forstår fagterminologi, vanlige spørsmål og
                bransjespesifikke behov – uten at du trenger å lære den opp manuelt.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-botsy-lime/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-botsy-lime" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Automatisk bransjegjenkjenning</h4>
                    <p className="text-sm text-[#6B7A94]">Botsy analyserer nettsiden din og forstår hvilken bransje du er i.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-botsy-lime/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-botsy-lime" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Fagterminologi inkludert</h4>
                    <p className="text-sm text-[#6B7A94]">Kjenner bransjespesifikke ord og uttrykk – fra restaurant til eiendom til helse.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-botsy-lime/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-botsy-lime" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Forstår kundens behov</h4>
                    <p className="text-sm text-[#6B7A94]">Vet hva kunder i din bransje typisk spør om og trenger hjelp med.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-botsy-dark-deep/50 to-transparent" />
        <div className="container relative">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4">Slik fungerer det</Badge>
            </motion.div>
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl lg:text-5xl font-bold text-white mb-6 font-display"
            >
              Kom i gang på under 5 minutter
            </motion.h2>
          </motion.div>

          {/* Step 1 */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24 lg:mb-32">
            <motion.div 
              variants={slideInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Image
                src="/images/2.png"
                alt="Registrer bedriften din"
                width={600}
                height={450}
                className="w-full h-auto feathered-image"
              />
            </motion.div>
            <motion.div 
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:pl-8"
            >
              <span className="text-botsy-lime font-mono text-sm font-medium">01</span>
              <h3 className="text-2xl lg:text-3xl font-bold text-white mt-2 mb-4 font-display">
                Registrer bedriften din
              </h3>
              <p className="text-[#A8B4C8] text-lg leading-relaxed mb-6">
                Opprett en konto, legg til bedriftsinformasjon, og koble til kanalene du vil bruke. 
                Messenger, Instagram, SMS eller nettside-widget – velg det som passer for deg.
              </p>
              <ul className="space-y-3">
                {['Gratis prøveperiode på 14 dager', 'Ingen kredittkort nødvendig', 'Enkelt oppsett-veiviser'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[#A8B4C8]">
                    <div className="h-5 w-5 rounded-full bg-botsy-lime/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-botsy-lime" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Step 2 */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24 lg:mb-32">
            <motion.div 
              variants={slideInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:order-2"
            >
              <Image
                src="/images/6.png"
                alt="Tren Botsy"
                width={600}
                height={450}
                className="w-full h-auto feathered-image"
              />
            </motion.div>
            <motion.div 
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:order-1 lg:pr-8"
            >
              <span className="text-botsy-lime font-mono text-sm font-medium">02</span>
              <h3 className="text-2xl lg:text-3xl font-bold text-white mt-2 mb-4 font-display">
                Tren Botsy på din bedrift
              </h3>
              <p className="text-[#A8B4C8] text-lg leading-relaxed mb-6">
                Legg til ofte stilte spørsmål, regler og informasjon om bedriften din. 
                Botsy lærer raskt og blir smartere jo mer du gir den.
              </p>
              <ul className="space-y-3">
                {['Last opp eksisterende FAQs', 'Sett regler Botsy må følge', 'Tilpass personlighet og tone'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[#A8B4C8]">
                    <div className="h-5 w-5 rounded-full bg-botsy-lime/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-botsy-lime" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Step 3 */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div 
              variants={slideInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Image
                src="/images/4.png"
                alt="La Botsy jobbe"
                width={600}
                height={450}
                className="w-full h-auto feathered-image"
              />
            </motion.div>
            <motion.div 
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:pl-8"
            >
              <span className="text-botsy-lime font-mono text-sm font-medium">03</span>
              <h3 className="text-2xl lg:text-3xl font-bold text-white mt-2 mb-4 font-display">
                La Botsy ta over
              </h3>
              <p className="text-[#A8B4C8] text-lg leading-relaxed mb-6">
                Aktiver Botsy og se den svare kunder automatisk. Du får varsler når noe 
                krever menneskelig oppmerksomhet, og kan når som helst ta over samtaler.
              </p>
              <ul className="space-y-3">
                {['Automatisk håndtering 24/7', 'Smart eskalering til mennesker', 'Full oversikt i dashboardet'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[#A8B4C8]">
                    <div className="h-5 w-5 rounded-full bg-botsy-lime/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-botsy-lime" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== CHANNELS SECTION ===== */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-botsy-dark via-botsy-dark-deep/50 to-botsy-dark" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-botsy-lime/[0.03] rounded-full blur-[150px]" />

        <div className="container relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4">Integrasjoner</Badge>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-5xl font-bold text-white mb-6 font-display"
            >
              Møt kundene der de er
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-[#A8B4C8]">
              Botsy kobler seg til de mest populære meldingsplattformene.
              Én Botsy – alle kanaler – samlet i ett dashboard.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6"
          >
            <motion.div variants={fadeInUp}>
              <Card className="p-6 lg:p-8 h-full group hover:border-[#0084FF]/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0084FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-2xl bg-[#0084FF]/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Image src="/icons/messenger.svg" alt="Messenger" width={32} height={32} className="lg:w-9 lg:h-9" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-white mb-2">Messenger</h3>
                  <p className="text-sm text-[#6B7A94]">Direkte integrasjon med Facebook</p>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="p-6 lg:p-8 h-full group hover:border-[#E4405F]/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#E4405F]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-2xl bg-[#E4405F]/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Image src="/icons/instagram.svg" alt="Instagram" width={32} height={32} className="lg:w-9 lg:h-9" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-white mb-2">Instagram</h3>
                  <p className="text-sm text-[#6B7A94]">Svar på DMs automatisk</p>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="p-6 lg:p-8 h-full group hover:border-botsy-lime/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-botsy-lime/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-2xl bg-botsy-lime/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Image src="/icons/sms.svg" alt="SMS" width={32} height={32} className="lg:w-9 lg:h-9" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-white mb-2">SMS</h3>
                  <p className="text-sm text-[#6B7A94]">Norske og internasjonale numre</p>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="p-6 lg:p-8 h-full group hover:border-[#3B82F6]/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <MessageSquare className="w-8 h-8 lg:w-9 lg:h-9 text-[#3B82F6]" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-white mb-2">Nettside-widget</h3>
                  <p className="text-sm text-[#6B7A94]">Chat direkte på nettsiden din</p>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="p-6 lg:p-8 h-full group hover:border-[#EA4335]/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#EA4335]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-2xl bg-[#EA4335]/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Mail className="w-8 h-8 lg:w-9 lg:h-9 text-[#EA4335]" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-white mb-2">E-post</h3>
                  <p className="text-sm text-[#6B7A94]">IMAP/SMTP-støtte</p>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section id="pricing" className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-mesh-gradient" />
        <div className="container relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4">Priser</Badge>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-5xl font-bold text-white mb-6 font-display"
            >
              Enkel og rettferdig prising
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-[#A8B4C8]">
              Ingen skjulte kostnader. Ingen bindingstid. Én pris for alt.
            </motion.p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <Card glow className="p-6 sm:p-8 lg:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-botsy-lime/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-botsy-lime/[0.03] rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

              <div className="relative grid lg:grid-cols-[1fr,auto,1.2fr] gap-8 lg:gap-12 items-center">
                {/* Left: Price */}
                <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
                  <Badge className="mb-4 bg-orange-500/20 text-orange-400 border-orange-500/30">INTRODUKSJONSTILBUD</Badge>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white font-display">699</span>
                    <span className="text-lg sm:text-xl text-[#6B7A94]">kr/mnd</span>
                  </div>

                  <div className="text-[#6B7A94] text-xs sm:text-sm mb-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                    <span className="line-through">Ordinær pris 1499 kr/mnd</span>
                    <span className="text-orange-400 font-semibold">Spar 800 kr!</span>
                  </div>

                  <p className="text-[#A8B4C8] text-sm sm:text-base mb-6 lg:mb-8 px-2 sm:px-0">
                    Alt du trenger for å automatisere kundeservicen din
                  </p>

                  <Link href="/prov-gratis" className="w-full lg:w-auto">
                    <Button size="xl" className="w-full shadow-lg shadow-botsy-lime/20 text-sm sm:text-base whitespace-normal h-auto py-3 sm:py-4">
                      Start 14 dagers gratis prøveperiode
                      <ArrowRight className="h-5 w-5 flex-shrink-0" />
                    </Button>
                  </Link>

                  <p className="text-sm text-[#6B7A94] mt-4">
                    Ingen kredittkort nødvendig
                  </p>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px h-64 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                <div className="lg:hidden h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Right: Features */}
                <div>
                  <p className="text-white font-semibold mb-5 text-center lg:text-left">Alt inkludert:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {[
                      'Ubegrenset meldinger',
                      'Alle kanaler inkludert',
                      'Ubegrenset FAQs',
                      'Sanntids-dashboard',
                      'Statistikk og rapporter',
                      'Teamtilgang (20 brukere)',
                      'Instagram-integrasjon',
                      'GDPR-compliant',
                    ].map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-white text-sm">
                        <div className="h-5 w-5 rounded-full bg-botsy-lime/20 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-botsy-lime" />
                        </div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.p
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center text-[#6B7A94] mt-10 max-w-xl mx-auto"
          >
            En deltidsansatt i kundeservice koster rundt <span className="text-white">15.000 kr/mnd</span>.
            Botsy koster <span className="text-botsy-lime">699 kr</span> og jobber 24/7 uten pause.
          </motion.p>
        </div>
      </section>

      {/* ===== WHY BOTSY ===== */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4">Hvorfor Botsy?</Badge>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-5xl font-bold text-white mb-6 font-display"
            >
              Bygget for norske bedrifter
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-[#A8B4C8]"
            >
              Botsy er ikke bare en chatbot – det er en AI-kollega som faktisk forstår norsk kontekst og kultur.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <Card className="p-6 bg-white/[0.02] border-white/[0.06]">
              <div className="h-12 w-12 rounded-xl bg-botsy-lime/10 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-botsy-lime" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Flerspråklig AI</h3>
              <p className="text-[#A8B4C8] text-sm">Identifiserer kundens språk automatisk og svarer på samme språk. Støtter 10+ språk inkludert norsk, engelsk og svensk.</p>
            </Card>
            <Card className="p-6 bg-white/[0.02] border-white/[0.06]">
              <div className="h-12 w-12 rounded-xl bg-botsy-lime/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-botsy-lime" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Klar på minutter</h3>
              <p className="text-[#A8B4C8] text-sm">Legg inn nettsiden din, og Botsy lærer seg bedriften automatisk. Ingen komplisert oppsett.</p>
            </Card>
            <Card className="p-6 bg-white/[0.02] border-white/[0.06]">
              <div className="h-12 w-12 rounded-xl bg-botsy-lime/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-botsy-lime" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">GDPR-sikker</h3>
              <p className="text-[#A8B4C8] text-sm">Data lagres i EU med full GDPR-compliance. Trygt for deg og kundene dine.</p>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ===== SECURITY SECTION ===== */}
      <section className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-botsy-dark-deep/30 to-transparent" />
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div 
              variants={slideInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Image
                src="/images/3.png"
                alt="Sikkerhet og personvern"
                width={600}
                height={500}
                className="w-full h-auto feathered-image"
              />
            </motion.div>

            <motion.div 
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Badge variant="secondary" className="mb-4">
                <Shield className="h-3 w-3 mr-1.5" />
                Sikkerhet
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 font-display">
                Dine data er trygge hos oss
              </h2>
              <p className="text-lg text-[#A8B4C8] mb-8 leading-relaxed">
                Vi tar sikkerhet og personvern på alvor. Botsy er bygget fra grunnen av med 
                GDPR-compliance og beste sikkerhetspraksis.
              </p>
              
              <div className="space-y-4">
                <SecurityFeature 
                  title="GDPR-compliant"
                  description="Full oversikt over databehandling. Eksporter eller slett data når som helst."
                />
                <SecurityFeature 
                  title="Ende-til-ende-kryptering"
                  description="All sensitiv data krypteres med AES-256 både i transit og lagring."
                />
                <SecurityFeature 
                  title="Norsk hosting"
                  description="Data lagres på servere i EU/EØS for å overholde europeiske personvernregler."
                />
                <SecurityFeature 
                  title="To-faktor autentisering"
                  description="Ekstra sikkerhet for admins som håndterer sensitiv informasjon."
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="relative rounded-botsy-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-botsy-dark-surface to-botsy-dark-deep" />
            <div className="absolute inset-0 bg-mesh-gradient opacity-50" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-botsy-lime/10 rounded-full blur-[100px]" />
            
            <div className="relative px-8 py-16 lg:py-24 text-center">
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 font-display max-w-3xl mx-auto">
                Klar til å møte din nye digitale kollega?
              </h2>
              <p className="text-lg text-[#A8B4C8] mb-10 max-w-xl mx-auto">
                Kom i gang på under 5 minutter. Ingen teknisk kunnskap nødvendig. 
                Botsy tar seg av resten.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 sm:px-0">
                <Link href="/prov-gratis">
                  <Button size="xl" className="group w-full sm:w-auto whitespace-normal h-auto py-4">
                    Prøv Botsy gratis i 14 dager
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 flex-shrink-0" />
                  </Button>
                </Link>
                <Link href="/kontakt">
                  <Button size="xl" variant="outline" className="w-full sm:w-auto">
                    Snakk med oss
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/[0.06] py-16 lg:py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Image 
                src="/brand/botsy-full-logo.svg" 
                alt="Botsy" 
                width={120} 
                height={40}
                className="h-9 w-auto mb-4"
              />
              <p className="text-[#6B7A94] text-sm max-w-xs mb-6">
                AI-drevet kundeservice for norske bedrifter.
                Din digitale kollega som aldri tar ferie.
              </p>
              <div className="flex gap-4">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-[#6B7A94] hover:text-botsy-lime transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[#6B7A94] hover:text-botsy-lime transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Produkt</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/funksjoner" className="text-[#6B7A94] hover:text-white transition-colors">Funksjoner</Link></li>
                <li><Link href="#pricing" className="text-[#6B7A94] hover:text-white transition-colors">Priser</Link></li>
                <li><Link href="#how-it-works" className="text-[#6B7A94] hover:text-white transition-colors">Slik fungerer det</Link></li>
                <li><Link href="/prov-gratis" className="text-[#6B7A94] hover:text-white transition-colors">Prøv gratis</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Ressurser</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/kontakt" className="text-[#6B7A94] hover:text-white transition-colors">Kontakt oss</Link></li>
                {user ? (
                  <li><Link href="/admin" className="text-[#6B7A94] hover:text-white transition-colors">Admin</Link></li>
                ) : (
                  <>
                    <li><Link href="/login" className="text-[#6B7A94] hover:text-white transition-colors">Logg inn</Link></li>
                    <li><Link href="/registrer" className="text-[#6B7A94] hover:text-white transition-colors">Registrer</Link></li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Juridisk</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/personvern" className="text-[#6B7A94] hover:text-white transition-colors">Personvern</Link></li>
                <li><Link href="/vilkar" className="text-[#6B7A94] hover:text-white transition-colors">Vilkår</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[#6B7A94] text-sm">
              © {new Date().getFullYear()} Botsy AS. Alle rettigheter reservert.
            </p>
            <p className="text-[#6B7A94] text-sm">
              Laget med ❤️ i Norge
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ===== COMPONENTS =====

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <motion.div variants={fadeInUp}>
      <Card className="p-6 lg:p-8 h-full">
        <div className="h-12 w-12 rounded-xl bg-botsy-lime/10 flex items-center justify-center text-botsy-lime mb-5">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white mb-3 font-display">{title}</h3>
        <p className="text-[#A8B4C8] text-sm leading-relaxed">{description}</p>
      </Card>
    </motion.div>
  )
}

function TestimonialCard({ quote, author, role, company }: {
  quote: string
  author: string
  role: string
  company: string
}) {
  return (
    <motion.div variants={fadeInUp}>
      <Card className="p-6 lg:p-8 h-full flex flex-col">
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="h-4 w-4 text-botsy-lime" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <blockquote className="text-white text-lg leading-relaxed mb-6 flex-grow">
          "{quote}"
        </blockquote>
        <div>
          <p className="text-white font-medium">{author}</p>
          <p className="text-sm text-[#6B7A94]">{role}, {company}</p>
        </div>
      </Card>
    </motion.div>
  )
}

function SecurityFeature({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="h-6 w-6 rounded-full bg-botsy-lime/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Check className="h-3.5 w-3.5 text-botsy-lime" />
      </div>
      <div>
        <h4 className="text-white font-medium mb-1">{title}</h4>
        <p className="text-sm text-[#6B7A94]">{description}</p>
      </div>
    </div>
  )
}
