'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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

          <h1 className="text-4xl font-bold text-white mb-8">Vilkår for bruk</h1>

          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <p className="text-[#A8B4C8] text-lg">
              Sist oppdatert: {new Date().toLocaleDateString('nb-NO')}
            </p>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Godkjenning av vilkår</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Ved å bruke Botsy sine tjenester godtar du disse vilkårene. Hvis du ikke godtar vilkårene,
                kan du ikke bruke tjenesten. Vi anbefaler at du leser gjennom vilkårene nøye før du begynner
                å bruke Botsy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Beskrivelse av tjenesten</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Botsy er en AI-drevet kundeservice-assistent som hjelper bedrifter med å svare på
                kundehenvendelser. Tjenesten inkluderer en chatbot-widget for nettsider, SMS-integrasjon,
                og et administrasjonspanel for å konfigurere og overvåke chatboten.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Brukerkontoer</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                For å bruke Botsy må du opprette en konto. Du er ansvarlig for å holde kontoinformasjonen
                din konfidensiell og for all aktivitet som skjer under kontoen din. Du må varsle oss
                umiddelbart hvis du oppdager uautorisert bruk av kontoen din.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Akseptabel bruk</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Du godtar å ikke bruke Botsy til:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li>Ulovlige aktiviteter</li>
                <li>Spam eller uønsket markedsføring</li>
                <li>Spredning av skadelig innhold</li>
                <li>Forsøk på å omgå sikkerhetsmekanismer</li>
                <li>Aktiviteter som kan skade andre brukere eller tjenesten</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Betaling og fakturering</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Betaling skjer på forhånd for hver faktureringsperiode. Priser kan endres med 30 dagers
                varsel. Ved manglende betaling kan vi suspendere eller avslutte kontoen din.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Oppsigelse</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Du kan når som helst si opp abonnementet ditt. Ved oppsigelse vil du ha tilgang til
                tjenesten ut inneværende faktureringsperiode. Vi forbeholder oss retten til å avslutte
                kontoer som bryter disse vilkårene.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Ansvarsfraskrivelse</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Botsy leveres &quot;som den er&quot; uten garantier av noe slag. Vi garanterer ikke at tjenesten
                vil være feilfri eller uavbrutt. Vi er ikke ansvarlige for indirekte tap eller skader
                som følge av bruk av tjenesten.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Endringer i vilkårene</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Vi kan oppdatere disse vilkårene fra tid til annen. Ved vesentlige endringer vil vi
                varsle deg via e-post eller gjennom tjenesten. Fortsatt bruk av tjenesten etter
                endringer betyr at du godtar de nye vilkårene.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Kontakt</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Har du spørsmål om disse vilkårene? Ta kontakt med oss på{' '}
                <a href="mailto:kontakt@botsy.no" className="text-botsy-lime hover:underline">
                  kontakt@botsy.no
                </a>
              </p>
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
