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
              Sist oppdatert: 4. februar 2026
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
                e-postintegrasjon, Messenger-integrasjon, og et administrasjonspanel for å konfigurere
                og overvåke chatboten.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Nettside-analyse og synkronisering</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Ved å oppgi din bedrifts nettside-URL, gir du Botsy tillatelse til å:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2">
                <li>Analysere offentlig tilgjengelig innhold på nettsiden</li>
                <li>Ekstrahere informasjon som FAQs, produkter, tjenester og bedriftsinformasjon</li>
                <li>Automatisk synkronisere kunnskapsbasen med oppdateringer på nettsiden</li>
                <li>Bruke AI til å generere svar basert på nettsidens innhold</li>
              </ul>
              <p className="text-[#A8B4C8] leading-relaxed mt-4">
                Denne analysen er begrenset til offentlig tilgjengelig informasjon og krever ingen
                innlogging eller tilgang til beskyttede områder. Du kan når som helst deaktivere
                automatisk synkronisering i administrasjonspanelet.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Brukerkontoer</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                For å bruke Botsy må du opprette en konto. Du er ansvarlig for å holde kontoinformasjonen
                din konfidensiell og for all aktivitet som skjer under kontoen din. Du må varsle oss
                umiddelbart hvis du oppdager uautorisert bruk av kontoen din.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Akseptabel bruk</h2>
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
              <h2 className="text-2xl font-semibold text-white mb-4">6. Abonnement og priser</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Botsy tilbys som et månedlig abonnement. Gjeldende pris er 699 kr/måned ekskl. mva.
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2 mb-4">
                <li><strong>Prøveperiode:</strong> Nye kunder får 14 dagers gratis prøveperiode. Du belastes ikke før prøveperioden utløper.</li>
                <li><strong>Fakturering:</strong> Abonnementet faktureres månedlig på forhånd.</li>
                <li><strong>Prisendringer:</strong> Vi varsler om eventuelle prisendringer minst 30 dager i forkant via e-post.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Betaling</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Vi tilbyr følgende betalingsmetoder:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2 mb-4">
                <li><strong>Bankkort:</strong> Visa, Mastercard og American Express via Stripe</li>
                <li><strong>Vipps:</strong> Månedlig trekk via Vipps Faste betalinger</li>
              </ul>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Ved betaling med Vipps opprettes en avtale om faste betalinger. Du godkjenner avtalen
                i Vipps-appen, og beløpet trekkes automatisk hver måned. Du kan når som helst
                administrere eller stoppe avtalen i Vipps-appen eller i Botsy sitt administrasjonspanel.
              </p>
              <p className="text-[#A8B4C8] leading-relaxed">
                Ved manglende betaling vil vi forsøke å belaste betalingsmetoden på nytt i opptil 5 dager.
                Dersom betalingen fortsatt feiler, kan vi suspendere tilgangen til tjenesten.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Oppsigelse og refusjon</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Du kan når som helst si opp abonnementet ditt:
              </p>
              <ul className="list-disc list-inside text-[#A8B4C8] space-y-2 mb-4">
                <li>Oppsigelse kan gjøres i administrasjonspanelet under Fakturering</li>
                <li>Ved oppsigelse beholder du tilgang til tjenesten ut inneværende betalingsperiode</li>
                <li>For Vipps-avtaler kan du også stoppe avtalen direkte i Vipps-appen</li>
                <li>Vi tilbyr ikke refusjon for delvis brukte perioder</li>
              </ul>
              <p className="text-[#A8B4C8] leading-relaxed">
                Vi forbeholder oss retten til å avslutte kontoer som bryter disse vilkårene uten refusjon.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Angrerett</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                I henhold til angrerettloven har forbrukere rett til å angre kjøpet innen 14 dager.
                Merk at angreretten bortfaller hvis du har tatt tjenesten i bruk i angreperioden og
                uttrykkelig samtykket til dette. Prøveperioden gir deg mulighet til å teste tjenesten
                uten kostnad før du forplikter deg.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Ansvarsfraskrivelse</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Botsy leveres &quot;som den er&quot; uten garantier av noe slag. Vi garanterer ikke at tjenesten
                vil være feilfri eller uavbrutt. Vi er ikke ansvarlige for indirekte tap eller skader
                som følge av bruk av tjenesten.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Endringer i vilkårene</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Vi kan oppdatere disse vilkårene fra tid til annen. Ved vesentlige endringer vil vi
                varsle deg via e-post eller gjennom tjenesten. Fortsatt bruk av tjenesten etter
                endringer betyr at du godtar de nye vilkårene.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Verneting og lovvalg</h2>
              <p className="text-[#A8B4C8] leading-relaxed">
                Disse vilkårene er underlagt norsk lov. Eventuelle tvister skal søkes løst i minnelighet.
                Dersom dette ikke fører frem, skal tvisten avgjøres ved de ordinære domstoler med
                Bergen tingrett som verneting.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">13. Kontakt</h2>
              <p className="text-[#A8B4C8] leading-relaxed mb-4">
                Har du spørsmål om disse vilkårene eller tjenesten? Ta kontakt med oss:
              </p>
              <div className="text-[#A8B4C8] space-y-1">
                <p><strong>Botsy AS</strong></p>
                <p>Org.nr: 933 606 553</p>
                <p>Adresse: Inndalsveien 28, 5063 Bergen</p>
                <p>Telefon:{' '}
                  <a href="tel:+4794414444" className="text-botsy-lime hover:underline">
                    +47 944 14 444
                  </a>
                </p>
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
          <p>© {new Date().getFullYear()} Botsy AS. Alle rettigheter reservert.</p>
        </div>
      </footer>
    </div>
  )
}
