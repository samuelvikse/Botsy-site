'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-botsy-dark">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-botsy-dark-deep/50">
        <div className="container mx-auto h-16 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/brand/botsy-full-logo.svg"
              alt="Botsy"
              width={100}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <Link href="/" className="text-[#6B7A94] hover:text-white text-sm mb-6 flex items-center gap-1 inline-flex">
            <ArrowLeft className="h-4 w-4" />
            Tilbake til forsiden
          </Link>

          <h1 className="text-4xl font-bold text-white mb-8">Personvernerklæring</h1>

          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <p className="text-[#A8B4C8] text-lg">
              Sist oppdatert: {new Date().toLocaleDateString('nb-NO')}
            </p>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Innledning</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Botsy AS (&quot;vi&quot;, &quot;oss&quot;, &quot;vår&quot;) er opptatt av å beskytte personvernet ditt.
                Denne personvernerklæringen forklarer hvordan vi samler inn, bruker og beskytter
                personopplysningene dine når du bruker våre tjenester.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Hvilke data samler vi inn?</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Vi samler inn følgende typer data:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li><strong className="text-white">Kontoinformasjon:</strong> Navn, e-postadresse, bedriftsnavn</li>
                <li><strong className="text-white">Brukerdata:</strong> Samtalelogger, FAQs, chatbot-konfigurasjon</li>
                <li><strong className="text-white">Teknisk data:</strong> IP-adresse, nettlesertype, enhetsinfo</li>
                <li><strong className="text-white">Betalingsinformasjon:</strong> Behandles av vår betalingsleverandør</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Hvordan bruker vi dataene?</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Vi bruker dataene til å:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li>Levere og forbedre tjenestene våre</li>
                <li>Behandle betalinger og administrere abonnementer</li>
                <li>Sende viktige meldinger om tjenesten</li>
                <li>Analysere bruksmønstre for å forbedre produktet</li>
                <li>Overholde juridiske forpliktelser</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. GDPR og dine rettigheter</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Under GDPR har du følgende rettigheter:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li><strong className="text-white">Innsyn:</strong> Rett til å se hvilke data vi har om deg</li>
                <li><strong className="text-white">Retting:</strong> Rett til å korrigere feil i dataene</li>
                <li><strong className="text-white">Sletting:</strong> Rett til å be om sletting av data</li>
                <li><strong className="text-white">Dataportabilitet:</strong> Rett til å få utlevert dataene dine</li>
                <li><strong className="text-white">Innsigelse:</strong> Rett til å motsette deg behandling</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Datalagring</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Alle data lagres på servere innenfor EU/EØS. Vi bruker Firebase (Google Cloud Platform)
                med datalagring i Europa. Data krypteres både under overføring og ved lagring.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Deling av data</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Vi deler kun data med:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li><strong className="text-white">Tjenesteleverandører:</strong> Firebase, Groq (AI), betalingsleverandører</li>
                <li><strong className="text-white">Myndigheter:</strong> Kun ved lovpålagt krav</li>
              </ul>
              <p className="text-[#A8B4C8] leading-relaxed mt-4">
                Vi selger aldri personopplysninger til tredjeparter.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Informasjonskapsler (cookies)</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Vi bruker nødvendige informasjonskapsler for å få tjenesten til å fungere.
                Disse inkluderer sesjonskapsler for innlogging og preferansekapsler for
                brukerinnstillinger. Du kan administrere cookies i nettleserinnstillingene dine.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Sikkerhet</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Vi tar sikkerheten på alvor og bruker bransjestandard sikkerhetstiltak,
                inkludert kryptering (AES-256), sikker autentisering, og regelmessige
                sikkerhetsgjennomganger.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Kontakt oss</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Har du spørsmål om personvern eller ønsker å utøve rettighetene dine?
                Kontakt oss på{' '}
                <a href="mailto:personvern@botsy.no" className="text-botsy-lime hover:underline">
                  personvern@botsy.no
                </a>
              </p>
              <div className="mt-4 p-4 bg-white/[0.03] rounded-xl">
                <p className="text-[#A8B4C8]">
                  <strong className="text-white">Behandlingsansvarlig:</strong><br />
                  Botsy AS<br />
                  Org.nr: [Organisasjonsnummer]<br />
                  E-post: personvern@botsy.no
                </p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 mt-12">
        <div className="container mx-auto text-center text-[#6B7A94] text-sm">
          <p>© {new Date().getFullYear()} Botsy AS. Alle rettigheter reservert.</p>
        </div>
      </footer>
    </div>
  )
}
