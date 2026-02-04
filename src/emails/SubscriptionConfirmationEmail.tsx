import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as styles from './styles'

interface SubscriptionConfirmationEmailProps {
  customerName: string
  companyName: string
  planName: string
  price: string
  currency: string
  billingPeriod: string
  trialEndDate?: string | null
  nextBillingDate: string
  invoiceUrl?: string | null
  dashboardUrl: string
}

export function SubscriptionConfirmationEmail({
  customerName = 'Kunde',
  companyName = 'Bedriften AS',
  planName = 'Botsy Standard',
  price = '699',
  currency = 'NOK',
  billingPeriod = 'månedlig',
  trialEndDate = null,
  nextBillingDate = '4. mars 2026',
  invoiceUrl = null,
  dashboardUrl = 'https://botsy.no/admin',
}: SubscriptionConfirmationEmailProps) {
  const isTrialing = !!trialEndDate

  return (
    <Html>
      <Head>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
          `}
        </style>
      </Head>
      <Preview>
        {isTrialing
          ? `Velkommen til Botsy! Din prøveperiode er aktivert for ${companyName}`
          : `Betalingsbekreftelse - Ditt Botsy-abonnement er aktivt`}
      </Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.wrapper}>
            {/* Header */}
            <Section style={styles.header}>
              <Img
                src="https://botsy.no/email/botsy-logo.png"
                width="140"
                height="48"
                alt="Botsy"
                style={styles.logo}
              />
            </Section>

            {/* Content */}
            <Section style={styles.content}>
              {/* Success Icon */}
              <Section style={{ textAlign: 'center' as const }}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px 0' }}>
                  {isTrialing ? '🚀' : '✅'}
                </Text>
              </Section>

              <Heading style={styles.heading}>
                {isTrialing ? 'Velkommen til Botsy!' : 'Betaling bekreftet!'}
              </Heading>

              <Text style={styles.subheading}>
                {isTrialing ? (
                  <>
                    Hei <strong style={{ color: styles.colors.textPrimary }}>{customerName}</strong>! Din prøveperiode for{' '}
                    <strong style={{ color: styles.colors.lime }}>{companyName}</strong> er nå aktiv.
                  </>
                ) : (
                  <>
                    Takk for betalingen, <strong style={{ color: styles.colors.textPrimary }}>{customerName}</strong>! Ditt abonnement for{' '}
                    <strong style={{ color: styles.colors.lime }}>{companyName}</strong> er nå aktivt.
                  </>
                )}
              </Text>

              {/* Subscription Details Card */}
              <Section style={styles.infoCardHighlight}>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  <tr>
                    <td style={{ paddingBottom: '16px' }}>
                      <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Abonnement</Text>
                      <Text style={{ ...styles.infoValueLime, margin: 0 }}>{planName}</Text>
                    </td>
                    <td style={{ paddingBottom: '16px', textAlign: 'right' as const }}>
                      <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Pris</Text>
                      <Text style={{ ...styles.infoValue, margin: 0 }}>
                        {price} {currency}/{billingPeriod === 'månedlig' ? 'mnd' : 'år'}
                      </Text>
                    </td>
                  </tr>
                </table>

                <Hr style={{ ...styles.divider, margin: '16px 0' }} />

                {isTrialing ? (
                  <>
                    <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                      <tr>
                        <td>
                          <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Prøveperiode avsluttes</Text>
                          <Text style={{ ...styles.infoValue, margin: 0, color: styles.colors.info }}>
                            {trialEndDate}
                          </Text>
                        </td>
                        <td style={{ textAlign: 'right' as const }}>
                          <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Første faktura</Text>
                          <Text style={{ ...styles.infoValue, margin: 0 }}>{nextBillingDate}</Text>
                        </td>
                      </tr>
                    </table>
                    <Text style={{ ...styles.paragraph, margin: '16px 0 0 0', fontSize: '13px', color: styles.colors.textMuted }}>
                      Du vil ikke bli belastet før prøveperioden er over. Du kan kansellere når som helst.
                    </Text>
                  </>
                ) : (
                  <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                    <tr>
                      <td>
                        <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Neste fakturadato</Text>
                        <Text style={{ ...styles.infoValue, margin: 0 }}>{nextBillingDate}</Text>
                      </td>
                      <td style={{ textAlign: 'right' as const }}>
                        <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Status</Text>
                        <Text style={{
                          ...styles.infoValue,
                          margin: 0,
                          color: styles.colors.success,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          ● Aktivt
                        </Text>
                      </td>
                    </tr>
                  </table>
                )}
              </Section>

              {/* What's included */}
              <Section style={styles.infoCard}>
                <Text style={{ ...styles.infoLabel, marginBottom: '16px' }}>Dette er inkludert</Text>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  {[
                    { icon: '💬', text: 'Ubegrenset meldinger' },
                    { icon: '🤖', text: 'AI-drevet chatbot' },
                    { icon: '📱', text: 'Alle kanaler (Web, E-post, SMS, Messenger)' },
                    { icon: '👥', text: 'Opptil 20 teammedlemmer' },
                    { icon: '📊', text: 'Analyser og innsikt' },
                    { icon: '⚡', text: 'Prioritert support' },
                  ].map((item, index) => (
                    <tr key={index}>
                      <td style={{
                        padding: '8px 0',
                        fontSize: '14px',
                        color: styles.colors.textSecondary,
                      }}>
                        <span style={{ marginRight: '12px' }}>{item.icon}</span>
                        {item.text}
                      </td>
                    </tr>
                  ))}
                </table>
              </Section>

              {/* CTA Buttons */}
              <Section style={styles.buttonContainer}>
                <Link href={dashboardUrl} style={styles.button}>
                  Gå til Dashboard
                </Link>
              </Section>

              {invoiceUrl && (
                <Text style={{ textAlign: 'center' as const, margin: '0 0 24px 0' }}>
                  <Link
                    href={invoiceUrl}
                    style={{
                      color: styles.colors.lime,
                      textDecoration: 'underline',
                      fontSize: '14px',
                    }}
                  >
                    Last ned kvittering (PDF)
                  </Link>
                </Text>
              )}

              <Hr style={styles.divider} />

              {/* Help section */}
              <Text style={{ ...styles.paragraph, fontSize: '14px', textAlign: 'center' as const }}>
                Har du spørsmål? Vi er her for å hjelpe!
              </Text>
              <Text style={{ ...styles.paragraph, fontSize: '14px', textAlign: 'center' as const, margin: 0 }}>
                Kontakt oss på{' '}
                <Link href="mailto:hei@botsy.no" style={{ color: styles.colors.lime, textDecoration: 'none' }}>
                  hei@botsy.no
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                Denne e-posten ble sendt fra{' '}
                <Link href="https://botsy.no" style={styles.footerLink}>
                  Botsy
                </Link>
                {' '}fordi du opprettet et abonnement.
              </Text>
              <Text style={{ ...styles.footerText, marginTop: '8px' }}>
                Du kan administrere abonnementet ditt i{' '}
                <Link href={`${dashboardUrl}/fakturering`} style={styles.footerLink}>
                  faktureringsoversikten
                </Link>
                .
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default SubscriptionConfirmationEmail
