'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

export default function DPAPage() {
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

          <h1 className="text-4xl font-bold text-white mb-8">Databehandleravtale</h1>

          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <p className="text-[#A8B4C8] text-lg">
              Sist oppdatert: {new Date().toLocaleDateString('nb-NO')}
            </p>

            <div className="p-4 bg-botsy-lime/5 border border-botsy-lime/20 rounded-xl">
              <p className="text-[#A8B4C8] text-sm">
                Denne databehandleravtalen (&quot;Avtalen&quot;) er inngått mellom deg som behandlingsansvarlig
                (&quot;Kunden&quot;) og Vikse Bruvik Technology som databehandler (&quot;Botsy&quot;), i samsvar med GDPR
                artikkel 28.
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Bakgrunn og formål</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Kunden bruker Botsys AI-kundeserviceplattform for å håndtere kundehenvendelser.
                I den forbindelse behandler Botsy personopplysninger på vegne av Kunden.
                Denne avtalen regulerer Botsys behandling av personopplysninger i henhold til
                personopplysningsloven og GDPR (forordning (EU) 2016/679).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Definisjoner</h2>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li><strong className="text-white">Behandlingsansvarlig (Kunden):</strong> Den bedriften som bruker Botsy til å håndtere kundeservice, og som bestemmer formålet med behandlingen av personopplysninger.</li>
                <li><strong className="text-white">Databehandler (Botsy):</strong> Vikse Bruvik Technology, org.nr 837 094 682, som behandler personopplysninger på vegne av Kunden.</li>
                <li><strong className="text-white">Registrerte:</strong> Kundens sluttkunder hvis personopplysninger behandles gjennom Botsys tjenester.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Behandlingens art og formål</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Botsy behandler personopplysninger for å levere AI-basert kundeservice på vegne av Kunden.
                Behandlingen omfatter:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2 mb-4">
                <li>Mottak og lagring av chatmeldinger fra sluttbrukere</li>
                <li>AI-analyse av meldinger for å generere relevante svar</li>
                <li>Lagring av samtalehistorikk</li>
                <li>Videreformidling av henvendelser via e-post, SMS, Messenger og Instagram</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Kategorier av personopplysninger</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Følgende kategorier personopplysninger kan behandles:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li><strong className="text-white">Kontaktinformasjon:</strong> Navn, e-post, telefonnummer (hvis oppgitt av sluttkunden)</li>
                <li><strong className="text-white">Samtaleinnhold:</strong> Meldinger, spørsmål og svar i chat</li>
                <li><strong className="text-white">Teknisk data:</strong> IP-adresse, enhetstype, nettleserinfo</li>
                <li><strong className="text-white">Sosiale medier-ID:</strong> Facebook/Instagram bruker-ID ved Messenger/Instagram-integrasjon</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Botsys forpliktelser</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Botsy forplikter seg til å:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li>Kun behandle personopplysninger i henhold til Kundens dokumenterte instrukser</li>
                <li>Sikre at personer som har tilgang til personopplysningene er underlagt taushetsplikt</li>
                <li>Iverksette nødvendige tekniske og organisatoriske sikkerhetstiltak (GDPR Art. 32)</li>
                <li>Ikke engasjere underleverandører uten skriftlig forhåndsgodkjenning fra Kunden (se punkt 7)</li>
                <li>Bistå Kunden med å oppfylle de registrertes rettigheter (innsyn, sletting, etc.)</li>
                <li>Slette eller tilbakelevere alle personopplysninger ved opphør av avtalen</li>
                <li>Gi Kunden tilgang til nødvendig informasjon for å dokumentere etterlevelse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Sikkerhetstiltak</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Botsy implementerer følgende sikkerhetstiltak:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li><strong className="text-white">Kryptering:</strong> All data krypteres under overføring (TLS 1.2+) og ved lagring (AES-256)</li>
                <li><strong className="text-white">Tilgangskontroll:</strong> Rollebasert tilgangsstyring med Firebase Authentication</li>
                <li><strong className="text-white">Logging:</strong> Alle datatilganger logges for revisjon</li>
                <li><strong className="text-white">Infrastruktur:</strong> Data lagres i EU via Google Cloud Platform (Firebase)</li>
                <li><strong className="text-white">Sikkerhetsoppdateringer:</strong> Regelmessige oppdateringer av alle systemkomponenter</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Underleverandører</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Kunden godkjenner herved følgende underleverandører (underdatabehandlere):
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="py-3 pr-4 text-white font-semibold">Leverandør</th>
                      <th className="py-3 pr-4 text-white font-semibold">Formål</th>
                      <th className="py-3 text-white font-semibold">Lokasjon</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#A8B4C8]">
                    <tr className="border-b border-white/[0.04]">
                      <td className="py-3 pr-4">Google Cloud (Firebase)</td>
                      <td className="py-3 pr-4">Database, autentisering, lagring</td>
                      <td className="py-3">EU</td>
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="py-3 pr-4">Google Gemini</td>
                      <td className="py-3 pr-4">AI-tekstgenerering</td>
                      <td className="py-3">EU/USA (SCC)</td>
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="py-3 pr-4">Groq</td>
                      <td className="py-3 pr-4">AI-tekstgenerering (reserve)</td>
                      <td className="py-3">USA (SCC)</td>
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="py-3 pr-4">Stripe</td>
                      <td className="py-3 pr-4">Betalingsbehandling</td>
                      <td className="py-3">EU/USA (SCC)</td>
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="py-3 pr-4">Twilio</td>
                      <td className="py-3 pr-4">SMS-tjenester</td>
                      <td className="py-3">USA (SCC)</td>
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="py-3 pr-4">SendGrid</td>
                      <td className="py-3 pr-4">E-posttjenester</td>
                      <td className="py-3">USA (SCC)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[#A8B4C8] leading-relaxed mt-4">
                Botsy vil informere Kunden om eventuelle endringer i underleverandører med
                minst 30 dagers varsel. Kunden har rett til å protestere mot nye underleverandører.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Overføring til tredjeland</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Enkelte underleverandører behandler data i USA. Slik overføring skjer med hjemmel
                i GDPR artikkel 46(2)(c) gjennom EUs Standard Contractual Clauses (SCC).
                Botsy har gjennomført Transfer Impact Assessment (TIA) og vurdert at tilstrekkelig
                beskyttelsesnivå er sikret gjennom tekniske og organisatoriske tiltak.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Sikkerhetsbrudd</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Ved brudd på sikkerheten som medfører utilsiktet eller ulovlig tilintetgjøring, tap,
                endring, uautorisert utlevering av eller tilgang til personopplysninger, skal Botsy
                varsle Kunden uten ugrunnet opphold og senest innen 24 timer etter at bruddet ble
                oppdaget. Varselet skal inneholde beskrivelse av bruddet, berørte kategorier data,
                antall berørte registrerte, sannsynlige konsekvenser, og tiltak iverksatt eller foreslått.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Revisjon og kontroll</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Kunden har rett til å gjennomføre revisjoner for å verifisere at Botsy overholder
                denne avtalen. Revisjon skal varsles minst 30 dager i forveien og gjennomføres
                på en måte som minimerer forstyrrelsen av Botsys virksomhet.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Varighet og opphør</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Denne avtalen gjelder så lenge Botsy behandler personopplysninger på vegne av Kunden.
                Ved opphør av tjenesteavtalen vil Botsy:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li>Slette alle personopplysninger innen 30 dager etter opphør</li>
                <li>På forespørsel tilbakelevere data i et maskinlesbart format før sletting</li>
                <li>Bekrefte skriftlig at sletting er gjennomført</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Kontakt</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                For spørsmål om denne databehandleravtalen, kontakt:
              </p>
              <div className="text-[#A8B4C8] space-y-1">
                <p><strong>Vikse Bruvik Technology</strong></p>
                <p>Org.nr: 837 094 682</p>
                <p>Haugesund, Rogaland</p>
                <p>E-post:{' '}
                  <a href="mailto:hei@botsy.no" className="text-botsy-lime hover:underline">
                    hei@botsy.no
                  </a>
                </p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 mt-12">
        <div className="container mx-auto text-center text-[#6B7A94] text-sm">
          <p>&copy; {new Date().getFullYear()} Botsy. Alle rettigheter reservert.</p>
        </div>
      </footer>
    </div>
  )
}
