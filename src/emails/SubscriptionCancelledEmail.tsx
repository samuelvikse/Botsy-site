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

interface SubscriptionCancelledEmailProps {
  customerName: string
  companyName: string
  cancellationDate: string
  accessUntil: string
  reason?: string
  reactivateUrl: string
}

export function SubscriptionCancelledEmail({
  customerName = 'Kunde',
  companyName = 'Bedriften AS',
  cancellationDate = '1. mars 2026',
  accessUntil = '31. mars 2026',
  reason,
  reactivateUrl = 'https://botsy.no/admin/fakturering',
}: SubscriptionCancelledEmailProps) {
  return (
    <Html>
      <Head>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
          `}
        </style>
      </Head>
      <Preview>Abonnementet ditt er kansellert - {companyName}</Preview>
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
              {/* Icon */}
              <Section style={{ textAlign: 'center' as const }}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px 0' }}>
                  👋
                </Text>
              </Section>

              <Heading style={styles.heading}>
                Abonnementet er kansellert
              </Heading>

              <Text style={styles.subheading}>
                Hei <strong style={{ color: styles.colors.textPrimary }}>{customerName}</strong>,
                {' '}vi bekrefter at abonnementet for{' '}
                <strong style={{ color: styles.colors.lime }}>{companyName}</strong>{' '}
                er kansellert.
              </Text>

              {/* Cancellation details */}
              <Section style={styles.infoCard}>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  <tr>
                    <td style={{ padding: '8px 0' }}>
                      <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Kansellert</Text>
                      <Text style={{ ...styles.infoValue, margin: 0, fontSize: '16px' }}>{cancellationDate}</Text>
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right' as const }}>
                      <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Tilgang til</Text>
                      <Text style={{ ...styles.infoValue, margin: 0, fontSize: '16px' }}>{accessUntil}</Text>
                    </td>
                  </tr>
                </table>
              </Section>

              {/* What happens next */}
              <Section style={styles.infoCard}>
                <Text style={{ ...styles.infoLabel, marginBottom: '16px' }}>
                  Hva skjer nå?
                </Text>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  <tr>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', width: '24px' }}>
                      <Text style={{ margin: 0, color: styles.colors.lime }}>1.</Text>
                    </td>
                    <td style={{ padding: '8px 0', fontSize: '14px', color: styles.colors.textSecondary }}>
                      Du beholder full tilgang til <strong style={{ color: styles.colors.textPrimary }}>{accessUntil}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', width: '24px' }}>
                      <Text style={{ margin: 0, color: styles.colors.lime }}>2.</Text>
                    </td>
                    <td style={{ padding: '8px 0', fontSize: '14px', color: styles.colors.textSecondary }}>
                      Chatboten blir <strong style={{ color: styles.colors.textPrimary }}>deaktivert</strong> etter denne datoen
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', width: '24px' }}>
                      <Text style={{ margin: 0, color: styles.colors.lime }}>3.</Text>
                    </td>
                    <td style={{ padding: '8px 0', fontSize: '14px', color: styles.colors.textSecondary }}>
                      Data lagres i <strong style={{ color: styles.colors.textPrimary }}>30 dager</strong>, deretter slettes alt
                    </td>
                  </tr>
                </table>
              </Section>

              {reason && (
                <Section style={{
                  backgroundColor: 'rgba(107, 114, 128, 0.1)',
                  border: '1px solid rgba(107, 114, 128, 0.2)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  margin: '0 0 24px 0',
                }}>
                  <Text style={{
                    color: styles.colors.textMuted,
                    fontSize: '13px',
                    margin: 0,
                  }}>
                    <strong style={{ color: styles.colors.textSecondary }}>Årsak til kansellering:</strong> {reason}
                  </Text>
                </Section>
              )}

              {/* Win-back section */}
              <Section style={styles.infoCardHighlight}>
                <Text style={{
                  color: styles.colors.textPrimary,
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: '0 0 8px 0',
                  textAlign: 'center' as const,
                }}>
                  Vi savner deg allerede! 💚
                </Text>
                <Text style={{
                  color: styles.colors.textSecondary,
                  fontSize: '14px',
                  margin: '0 0 16px 0',
                  textAlign: 'center' as const,
                }}>
                  Ombestemte du deg? Du kan reaktivere abonnementet når som helst før {accessUntil}.
                </Text>
                <div style={{ textAlign: 'center' as const }}>
                  <Link href={reactivateUrl} style={styles.button}>
                    Reaktiver abonnementet
                  </Link>
                </div>
              </Section>

              <Hr style={styles.divider} />

              {/* Data export reminder */}
              <Text style={{
                ...styles.paragraph,
                fontSize: '13px',
                textAlign: 'center' as const,
                color: styles.colors.textMuted,
              }}>
                Husk at du kan eksportere dataene dine før tilgangen utløper via{' '}
                <Link href="https://botsy.no/admin/innstillinger" style={styles.footerLink}>
                  Innstillinger
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                Takk for at du brukte{' '}
                <Link href="https://botsy.no" style={styles.footerLink}>
                  Botsy
                </Link>
                . Vi håper å se deg igjen!
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

export default SubscriptionCancelledEmail
