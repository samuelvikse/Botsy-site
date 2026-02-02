'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Clock,
  Shield,
  Check,
  Zap,
  Globe,
  BarChart3,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  ChevronRight,
  Brain,
  Users,
  FileText,
  Settings,
  Languages,
  Palette,
  Layers,
  Target,
  LineChart,
  Bell,
  Code,
  Smartphone,
  HeartHandshake
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useState } from 'react'

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

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } }
}

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } }
}

export default function FeaturesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  const mainFeatures = [
    {
      id: 'ai',
      icon: Brain,
      title: 'AI som lærer din bransje',
      subtitle: 'Skriv inn nettside – Botsy gjør resten',
      description: 'Botsy setter seg inn i din virksomhets fagfelt og henter all nødvendig informasjon fra nettsiden din. Alt du trenger å gjøre er å skrive inn firmanavn og nettadresse – så analyserer Botsy innholdet og blir ekspert på akkurat din bedrift.',
      features: [
        'Skanner nettsiden din automatisk',
        'Lærer bransje-spesifikk terminologi',
        'Forstår produkter og tjenester',
        'Oppdateres når du endrer innhold'
      ]
    },
    {
      id: 'channels',
      icon: Layers,
      title: 'Alle kanaler, ett sted',
      subtitle: 'Messenger, Instagram, SMS, Widget',
      description: 'Kundene dine kan nå deg hvor som helst. Botsy svarer på alle kanaler fra ett samlet dashboard.',
      features: [
        'Facebook Messenger',
        'Instagram DMs',
        'SMS-gateway',
        'Nettside-widget'
      ]
    },
    {
      id: 'dashboard',
      icon: LineChart,
      title: 'Innsikt som teller',
      subtitle: 'Se hva kundene virkelig lurer på',
      description: 'Sanntidsanalyse av alle samtaler. Forstå trender, finn flaskehalser, og ta bedre beslutninger.',
      features: [
        'Sanntids-dashboard',
        'Automatiske rapporter',
        'Sentimentanalyse',
        'Trendsporing'
      ]
    },
    {
      id: 'customize',
      icon: Palette,
      title: 'Fullt tilpassbar',
      subtitle: 'Fra navn og logo til tone og personlighet',
      description: 'Gjør Botsy helt til din egen. Endre navn, last opp egen logo, velg farger som matcher merkevaren din, og juster tonen fra formell til uformell. Alt er customizable.',
      features: [
        'Eget navn og egen logo',
        'Merkevare-farger i widget',
        'Tilpassbar tone og personlighet',
        'Velkomstmelding og emoji-preferanser'
      ]
    }
  ]

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
              <Link href="/funksjoner" className="text-white bg-white/[0.06] text-sm font-medium px-4 py-2 rounded-full">
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
              <Link href="/funksjoner" className="text-white py-3 px-4 rounded-xl bg-white/[0.05]" onClick={() => setMobileMenuOpen(false)}>Funksjoner</Link>
              <Link href="/#pricing" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Priser</Link>
              <Link href="/#how-it-works" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Slik fungerer det</Link>
              <Link href="/kontakt" className="text-white py-3 px-4 rounded-xl hover:bg-white/[0.05] transition-colors" onClick={() => setMobileMenuOpen(false)}>Kontakt</Link>
              <div className="h-px bg-white/[0.06] my-2" />
              <Link href="/login"><Button variant="outline" className="w-full">Logg inn</Button></Link>
              <Link href="/prov-gratis"><Button className="w-full shadow-lg shadow-botsy-lime/20">Prøv gratis</Button></Link>
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-24">
        <div className="container">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeInUp}>
              <Badge className="mb-6">
                <Sparkles className="h-3 w-3 mr-1.5" />
                Alt du trenger for smart kundeservice
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight"
            >
              Funksjoner som
              <br />
              <span className="text-gradient">faktisk virker</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg lg:text-xl text-[#A8B4C8] mb-12 leading-relaxed max-w-2xl mx-auto"
            >
              Skriv inn firmanavn og nettside – Botsy lærer bransjen din og blir
              ekspert på akkurat din bedrift. Fullt tilpassbar fra navn til logo og tone.
            </motion.p>

            {/* Quick stats */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap justify-center gap-8 lg:gap-16"
            >
              {[
                { value: '< 10s', label: 'Responstid' },
                { value: '100%', label: 'Norsk språk' },
                { value: '24/7', label: 'Tilgjengelighet' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-white mb-1 font-display">{stat.value}</div>
                  <div className="text-[#6B7A94] text-sm">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== SIMPLE SETUP SECTION ===== */}
      <section className="py-16 lg:py-24 relative">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4">
                <Zap className="h-3 w-3 mr-1.5" />
                Kom i gang på minutter
              </Badge>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-4xl font-bold text-white mb-4 font-display"
            >
              Bare to ting trengs
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-[#A8B4C8]">
              Firmanavn og nettside. Det er alt. Botsy analyserer nettsiden din,
              lærer om bransjen din, og blir klar til å svare kunder – automatisk.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {[
              {
                step: '1',
                title: 'Skriv inn nettside',
                desc: 'Oppgi firmanavn og URL. Botsy scanner alle sider automatisk.'
              },
              {
                step: '2',
                title: 'Botsy lærer bransjen',
                desc: 'AI-en analyserer innhold, produkter, tjenester og terminologi.'
              },
              {
                step: '3',
                title: 'Klar til bruk',
                desc: 'Legg til widget på siden din. Botsy svarer kunder 24/7.'
              }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="p-6 text-center h-full relative overflow-hidden group">
                  <div className="absolute -top-6 -right-6 text-[120px] font-bold text-white/[0.02] group-hover:text-botsy-lime/[0.05] transition-colors">
                    {item.step}
                  </div>
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-botsy-lime/10 border border-botsy-lime/20 flex items-center justify-center text-botsy-lime font-bold text-lg mx-auto mb-4">
                      {item.step}
                    </div>
                    <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                    <p className="text-[#6B7A94] text-sm">{item.desc}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== MAIN FEATURES - Interactive ===== */}
      <section className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-botsy-dark-deep/50 to-transparent" />
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Feature Selector */}
            <div className="space-y-4 lg:sticky lg:top-32">
              {mainFeatures.map((feature, i) => (
                <motion.button
                  key={feature.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActiveFeature(i)}
                  className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 ${
                    activeFeature === i
                      ? 'bg-white/[0.03] border-botsy-lime/30'
                      : 'bg-transparent border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                      activeFeature === i
                        ? 'bg-botsy-lime/20 text-botsy-lime'
                        : 'bg-white/[0.05] text-[#A8B4C8]'
                    }`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold mb-1 transition-colors ${
                        activeFeature === i ? 'text-white' : 'text-[#A8B4C8]'
                      }`}>
                        {feature.title}
                      </h3>
                      <p className="text-[#6B7A94] text-sm">{feature.subtitle}</p>
                    </div>
                    <ChevronRight className={`h-5 w-5 transition-all ${
                      activeFeature === i ? 'text-botsy-lime rotate-90' : 'text-[#6B7A94]'
                    }`} />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Feature Detail */}
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:pt-4"
            >
              <Card className="p-8 lg:p-10">
                <div className="h-14 w-14 rounded-xl bg-botsy-lime/10 flex items-center justify-center text-botsy-lime mb-6">
                  {(() => {
                    const Icon = mainFeatures[activeFeature].icon
                    return <Icon className="h-7 w-7" />
                  })()}
                </div>

                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4 font-display">
                  {mainFeatures[activeFeature].title}
                </h2>

                <p className="text-lg text-[#A8B4C8] mb-8 leading-relaxed">
                  {mainFeatures[activeFeature].description}
                </p>

                <div className="space-y-4">
                  {mainFeatures[activeFeature].features.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="h-5 w-5 rounded-full bg-botsy-lime/10 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-botsy-lime" />
                      </div>
                      <span className="text-white">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== ALL FEATURES GRID ===== */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-16 lg:mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4">Alle funksjoner</Badge>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-5xl font-bold text-white mb-6 font-display"
            >
              Og det er bare begynnelsen
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-[#A8B4C8]">
              Alt du trenger for å levere eksepsjonell kundeservice.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {[
              { icon: Clock, title: '24/7 tilgjengelighet', desc: 'Aldri gå glipp av en kunde' },
              { icon: Zap, title: 'Lynrask respons', desc: 'Svar på under 10 sekunder' },
              { icon: Shield, title: 'GDPR-compliant', desc: 'Data trygt i EU' },
              { icon: Languages, title: 'Flerspråklig', desc: 'Tilpasser seg kundens språk' },
              { icon: Bell, title: 'Smarte varsler', desc: 'Bli varslet når det trengs' },
              { icon: Users, title: 'Ubegrenset team', desc: 'Hele teamet inkludert' },
              { icon: Code, title: 'Enkel integrasjon', desc: 'Én kodelinje på siden' },
              { icon: Target, title: 'Instruksjoner', desc: 'Sanntids-oppdateringer' },
              { icon: FileText, title: 'Kunnskapsbase', desc: 'Ubegrenset FAQs' },
              { icon: BarChart3, title: 'Detaljert analyse', desc: 'Se hva som fungerer' },
              { icon: Smartphone, title: 'Responsiv widget', desc: 'Perfekt på alle enheter' },
              { icon: Settings, title: 'Full kontroll', desc: 'Tilpass alt selv' },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="p-6 h-full group">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center mb-4 text-[#A8B4C8] group-hover:text-botsy-lime group-hover:bg-botsy-lime/10 transition-colors">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                  <p className="text-[#6B7A94] text-sm">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
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
                src="/images/skysystem.png"
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
                {[
                  { title: 'GDPR-compliant', desc: 'Full oversikt over databehandling. Eksporter eller slett data når som helst.' },
                  { title: 'Ende-til-ende-kryptering', desc: 'All sensitiv data krypteres med AES-256 både i transit og lagring.' },
                  { title: 'Norsk hosting', desc: 'Data lagres på servere i EU/EØS for å overholde europeiske personvernregler.' },
                  { title: 'To-faktor autentisering', desc: 'Ekstra sikkerhet for admins som håndterer sensitiv informasjon.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-6 w-6 rounded-full bg-botsy-lime/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-botsy-lime" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-1">{item.title}</h4>
                      <p className="text-sm text-[#6B7A94]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
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
                Klar til å oppleve det selv?
              </h2>
              <p className="text-lg text-[#A8B4C8] mb-10 max-w-xl mx-auto">
                Start din gratis prøveperiode i dag. Ingen kredittkort nødvendig.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/prov-gratis">
                  <Button size="xl" className="group">
                    Start 14 dager gratis
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/kontakt">
                  <Button size="xl" variant="outline">
                    Snakk med oss
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
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex items-center gap-6 text-sm text-[#6B7A94]">
              <Link href="/personvern" className="hover:text-white transition-colors">Personvern</Link>
              <Link href="/vilkar" className="hover:text-white transition-colors">Vilkår</Link>
              <Link href="/kontakt" className="hover:text-white transition-colors">Kontakt</Link>
              <span>© {new Date().getFullYear()} Botsy AS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
