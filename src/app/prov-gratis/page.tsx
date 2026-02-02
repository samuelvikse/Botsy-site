'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Zap,
  Clock,
  Shield,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  Globe,
  HeartHandshake,
  BarChart3
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

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } }
}

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } }
}

export default function TryFreePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

          <div className="hidden lg:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-[#A8B4C8] hover:text-white">
                Logg inn
              </Button>
            </Link>
            <Link href="/registrer">
              <Button size="sm" className="shadow-lg shadow-botsy-lime/20">
                Opprett konto
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
              <Link href="/login"><Button variant="outline" className="w-full">Logg inn</Button></Link>
              <Link href="/registrer"><Button className="w-full shadow-lg shadow-botsy-lime/20">Opprett konto</Button></Link>
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
                  14 dager gratis - ingen forpliktelser
                </Badge>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight"
              >
                Sov godt.
                <br />
                <span className="text-gradient">Botsy tar nattskiftet.</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg lg:text-xl text-[#A8B4C8] mb-10 leading-relaxed max-w-xl"
              >
                Botsy svarer kundene dine 24/7, lærer bedriften din på 5 minutter,
                og koster mindre enn en kaffekopp per dag.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="/registrer">
                  <Button size="xl" className="w-full sm:w-auto group">
                    Start gratis nå
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/#how-it-works">
                  <Button size="xl" variant="outline" className="w-full sm:w-auto">
                    Se hvordan det fungerer
                  </Button>
                </Link>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-6 mt-8 text-sm text-[#6B7A94]">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-botsy-lime" />
                  <span>Ingen kredittkort</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-botsy-lime" />
                  <span>Klar på 5 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-botsy-lime" />
                  <span>Kanseller når som helst</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Hero Image */}
            <motion.div
              variants={slideInRight}
              initial="hidden"
              animate="visible"
              className="relative lg:ml-auto"
            >
              <Image
                src="/images/8.png"
                alt="Botsy jobber for deg"
                width={700}
                height={500}
                priority
                className="w-full h-auto feathered-image"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 lg:py-32 relative">
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
              <Badge variant="secondary" className="mb-4">Så enkelt er det</Badge>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-5xl font-bold text-white mb-6 font-display"
            >
              Tre steg til frihet
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
                src="/images/registerscreen.png"
                alt="Registrer og koble til"
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
                Koble til nettsiden din
              </h3>
              <p className="text-[#A8B4C8] text-lg leading-relaxed mb-6">
                Legg inn bedriftsnavn og nettside-URL. Botsy analyserer innholdet og lærer
                alt om produktene, tjenestene og tonen din automatisk.
              </p>
              <ul className="space-y-3">
                {['Automatisk analyse av nettsiden', 'Fanger opp tone og personlighet', 'Identifiserer produkter og tjenester'].map((item) => (
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
                src="/images/boble.png"
                alt="Tilpass personligheten"
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
                Tilpass personligheten
              </h3>
              <p className="text-[#A8B4C8] text-lg leading-relaxed mb-6">
                Juster tone, legg til FAQs og gi Botsy spesifikke instruksjoner.
                Gjør den til din egen - formell, avslappet eller noe midt imellom.
              </p>
              <ul className="space-y-3">
                {['Velg mellom formell, vennlig eller avslappet', 'Legg til ofte stilte spørsmål', 'Sett regler og begrensninger'].map((item) => (
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
                src="/images/jobberhardere.png"
                alt="Lanser Botsy"
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
                Lanser på sekunder
              </h3>
              <p className="text-[#A8B4C8] text-lg leading-relaxed mb-6">
                Kopier én enkel kodelinje og lim inn på nettsiden din. Botsy er live
                og begynner å svare kunder umiddelbart. Du kan følge med i sanntid.
              </p>
              <ul className="space-y-3">
                {['Én kodelinje - ferdig', 'Live på under 30 sekunder', 'Sanntids-dashboard for oversikt'].map((item) => (
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

      {/* ===== FEATURES GRID ===== */}
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
              <Badge variant="secondary" className="mb-4">Hvorfor Botsy?</Badge>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-5xl font-bold text-white mb-6 font-display"
            >
              Bygget for norske bedrifter
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-[#A8B4C8]">
              Ikke bare en chatbot. En AI-kollega som faktisk forstår deg.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="24/7 tilgjengelighet"
              description="Aldri gå glipp av en kunde igjen. Botsy svarer uansett tidspunkt, året rundt."
            />
            <FeatureCard
              icon={<Globe className="h-6 w-6" />}
              title="Automatisk språktilpasning"
              description="Identifiserer kundens språk og svarer på samme språk. Støtter norsk, engelsk, svensk og flere."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Under 10 sekunder"
              description="Lynrask responstid på alle henvendelser. Kundene dine venter aldri."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="GDPR-sikker"
              description="Data lagres i EU med full GDPR-compliance. Trygt for deg og kundene dine."
            />
            <FeatureCard
              icon={<HeartHandshake className="h-6 w-6" />}
              title="Din personlighet"
              description="Tilpass tonen til merkevaren din. Formell, avslappet eller noe midt imellom."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Innsikt og analyse"
              description="Se hva kundene spør om og hvordan Botsy presterer i sanntids-dashboardet."
            />
          </motion.div>
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
              <p className="text-3xl lg:text-4xl font-bold text-white font-display">100%</p>
              <p className="text-sm text-[#6B7A94] mt-1">Norsk språk</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-white/10" />
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-botsy-lime font-display">14 dager</p>
              <p className="text-sm text-[#6B7A94] mt-1">Gratis prøveperiode</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== PRICING PREVIEW ===== */}
      <section className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-mesh-gradient" />
        <div className="container relative">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <Card glow className="p-8 lg:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-botsy-lime/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

              <div className="relative grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
                  <Badge className="mb-4">PRØVEPERIODE</Badge>

                  <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-display">
                    14 dager helt gratis
                  </h3>

                  <p className="text-[#A8B4C8] mb-6 lg:mb-8">
                    Test alt Botsy har å tilby uten risiko. Ingen kredittkort,
                    ingen forpliktelser, ingen skjulte kostnader.
                  </p>

                  <Link href="/registrer" className="w-full lg:w-auto">
                    <Button size="xl" className="w-full lg:w-auto shadow-lg shadow-botsy-lime/20 group">
                      Start gratis prøveperiode
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>

                  <p className="text-sm text-[#6B7A94] mt-4">
                    Deretter kun 699 kr/mnd
                  </p>
                </div>

                <div>
                  <p className="text-white font-semibold mb-5 text-center lg:text-left">Alt inkludert i prøveperioden:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      'Ubegrenset meldinger',
                      'Alle kanaler inkludert',
                      'Ubegrenset FAQs',
                      'Sanntids-dashboard',
                      'Statistikk og rapporter',
                      'Full support',
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
                Ingen kredittkort nødvendig. Ingen forpliktelser.
                Start gratis i dag.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/registrer">
                  <Button size="xl" className="group">
                    Start 14 dagers gratis prøveperiode
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/kontakt">
                  <Button size="xl" variant="outline">
                    Snakk med oss
                  </Button>
                </Link>
              </div>
              <p className="text-[#6B7A94] text-sm mt-6">
                Ingen kredittkort nødvendig • Setup på 5 min • Kanseller når som helst
              </p>
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
