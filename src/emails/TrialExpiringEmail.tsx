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

interface TrialExpiringEmailProps {
  customerName: string
  companyName: string
  daysLeft: number
  trialEndDate: string
  price: string
  currency: string
  billingUrl: string
}

export function TrialExpiringEmail({
  customerName = 'Kunde',
  companyName = 'Bedriften AS',
  daysLeft = 3,
  trialEndDate = '4. mars 2026',
  price = '699',
  currency = 'NOK',
  billingUrl = 'https://botsy.no/admin/fakturering',
}: TrialExpiringEmailProps) {
  const isUrgent = daysLeft <= 1
  const urgentColor = isUrgent ? styles.colors.error : styles.colors.warning

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
        {isUrgent
          ? `⚠️ Din Botsy-prøveperiode utløper ${daysLeft === 0 ? 'i dag' : 'i morgen'}!`
          : `Din Botsy-prøveperiode utløper om ${daysLeft} dager`}
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
              {/* Warning Icon */}
              <Section style={{ textAlign: 'center' as const }}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px 0' }}>
                  {isUrgent ? '⚠️' : '⏰'}
                </Text>
              </Section>

              <Heading style={styles.heading}>
                {isUrgent
                  ? daysLeft === 0
                    ? 'Prøveperioden utløper i dag!'
                    : 'Prøveperioden utløper i morgen!'
                  : `${daysLeft} dager igjen av prøveperioden`}
              </Heading>

              <Text style={styles.subheading}>
                Hei <strong style={{ color: styles.colors.textPrimary }}>{customerName}</strong>!
                {' '}Prøveperioden for <strong style={{ color: styles.colors.lime }}>{companyName}</strong> på Botsy
                {isUrgent
                  ? daysLeft === 0
                    ? ' utløper i dag.'
                    : ' utløper i morgen.'
                  : ` utløper ${trialEndDate}.`}
              </Text>

              {/* Urgency Alert Box */}
              <Section style={{
                backgroundColor: `rgba(${isUrgent ? '231, 76, 60' : '253, 203, 110'}, 0.1)`,
                border: `1px solid rgba(${isUrgent ? '231, 76, 60' : '253, 203, 110'}, 0.3)`,
                borderRadius: '12px',
                padding: '20px 24px',
                margin: '0 0 24px 0',
              }}>
                <Text style={{
                  color: urgentColor,
                  fontSize: '14px',
                  fontWeight: '500',
                  lineHeight: '1.6',
                  margin: '0',
                }}>
                  {isUrgent
                    ? '⚡ Legg til betalingsmetode nå for å sikre uavbrutt tilgang til chatboten din.'
                    : '💡 Legg til betalingsmetode før prøveperioden utløper for å fortsette uten avbrudd.'}
                </Text>
              </Section>

              {/* What happens next */}
              <Section style={styles.infoCard}>
                <Text style={{ ...styles.infoLabel, marginBottom: '16px' }}>
                  Hva skjer når prøveperioden utløper?
                </Text>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  <tr>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', width: '24px' }}>
                      <Text style={{ margin: 0, color: styles.colors.lime }}>✓</Text>
                    </td>
                    <td style={{ padding: '8px 0', fontSize: '14px', color: styles.colors.textSecondary }}>
                      <strong style={{ color: styles.colors.textPrimary }}>Med betalingsmetode:</strong> Abonnementet fortsetter sømløst, og du belastes {price} {currency}/mnd.
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', width: '24px' }}>
                      <Text style={{ margin: 0, color: styles.colors.error }}>✗</Text>
                    </td>
                    <td style={{ padding: '8px 0', fontSize: '14px', color: styles.colors.textSecondary }}>
                      <strong style={{ color: styles.colors.textPrimary }}>Uten betalingsmetode:</strong> Chatboten deaktiveres og kundene dine kan ikke lenger få hjelp.
                    </td>
                  </tr>
                </table>
              </Section>

              {/* Price reminder */}
              <Section style={styles.infoCardHighlight}>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  <tr>
                    <td>
                      <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Din plan</Text>
                      <Text style={{ ...styles.infoValueLime, margin: 0 }}>Botsy Standard</Text>
                    </td>
                    <td style={{ textAlign: 'right' as const }}>
                      <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Pris etter prøveperioden</Text>
                      <Text style={{ ...styles.infoValue, margin: 0 }}>{price} {currency}/mnd</Text>
                    </td>
                  </tr>
                </table>
              </Section>

              {/* CTA Button */}
              <Section style={styles.buttonContainer}>
                <Link href={billingUrl} style={{
                  ...styles.button,
                  backgroundColor: isUrgent ? styles.colors.error : styles.colors.lime,
                  color: isUrgent ? '#ffffff' : styles.colors.darkDeep,
                }}>
                  {isUrgent ? 'Legg til betalingsmetode nå' : 'Gå til fakturering'}
                </Link>
              </Section>

              {/* Reassurance */}
              <Text style={{
                ...styles.paragraph,
                fontSize: '13px',
                textAlign: 'center' as const,
                color: styles.colors.textMuted,
              }}>
                Du kan kansellere når som helst. Ingen bindingstid.
              </Text>

              <Hr style={styles.divider} />

              {/* What you'll keep */}
              <Text style={{ ...styles.infoLabel, marginBottom: '12px', textAlign: 'center' as const }}>
                Alt dette beholder du med Botsy
              </Text>
              <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                {[
                  { icon: '💬', text: 'Ubegrenset meldinger' },
                  { icon: '🤖', text: 'AI-drevet chatbot' },
                  { icon: '📱', text: 'Alle kanaler (Web, E-post, SMS, Messenger)' },
                  { icon: '👥', text: 'Opptil 20 teammedlemmer' },
                ].map((item, index) => (
                  <tr key={index}>
                    <td style={{
                      padding: '6px 0',
                      fontSize: '14px',
                      color: styles.colors.textSecondary,
                      textAlign: 'center' as const,
                    }}>
                      <span style={{ marginRight: '8px' }}>{item.icon}</span>
                      {item.text}
                    </td>
                  </tr>
                ))}
              </table>
            </Section>

            {/* Footer */}
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                Denne e-posten ble sendt fra{' '}
                <Link href="https://botsy.no" style={styles.footerLink}>
                  Botsy
                </Link>
                {' '}fordi prøveperioden din nærmer seg slutten.
              </Text>
              <Text style={{ ...styles.footerText, marginTop: '8px' }}>
                Har du spørsmål? Kontakt oss på{' '}
                <Link href="mailto:hei@botsy.no" style={styles.footerLink}>
                  hei@botsy.no
                </Link>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default TrialExpiringEmail
