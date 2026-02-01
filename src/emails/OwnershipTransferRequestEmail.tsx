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

interface OwnershipTransferRequestEmailProps {
  ownerName: string
  companyName: string
  newOwnerName: string
  newOwnerEmail: string
  confirmUrl: string
  expiresAt: string
}

export function OwnershipTransferRequestEmail({
  ownerName = 'Ola Nordmann',
  companyName = 'Bedriften AS',
  newOwnerName = 'Kari Nordmann',
  newOwnerEmail = 'kari@bedriften.no',
  confirmUrl = 'https://botsy.no/transfer/abc123?type=from',
  expiresAt = '24 timer',
}: OwnershipTransferRequestEmailProps) {
  return (
    <Html>
      <Head>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
          `}
        </style>
      </Head>
      <Preview>Bekreft overføring av eierskap for {companyName}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.wrapper}>
            {/* Header */}
            <Section style={styles.header}>
              <Img
                src="https://botsy.no/email/botsy-logo.png"
                width="120"
                height="40"
                alt="Botsy"
                style={styles.logo}
              />
            </Section>

            {/* Content */}
            <Section style={styles.content}>
              {/* Icon - using emoji as fallback */}
              <Section style={{ textAlign: 'center' as const }}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px 0' }}>⚠️</Text>
              </Section>

              <Heading style={styles.heading}>
                Bekreft overføring av eierskap
              </Heading>

              <Text style={styles.subheading}>
                Du har startet en overføring av eierskap for{' '}
                <strong style={{ color: styles.colors.lime }}>{companyName}</strong>.
              </Text>

              {/* Warning box */}
              <Section style={styles.alertBox}>
                <Text style={styles.alertText}>
                  ⚠️ Dette er en irreversibel handling. Ved å bekrefte gir du bort full kontroll over bedriftskontoen. Du vil bli nedgradert til administrator.
                </Text>
              </Section>

              {/* Transfer details */}
              <Section style={styles.infoCard}>
                <Text style={styles.infoLabel}>Overføres til</Text>
                <Text style={{ ...styles.infoValue, marginBottom: '4px' }}>
                  {newOwnerName}
                </Text>
                <Text style={{ ...styles.paragraph, margin: '0', fontSize: '14px' }}>
                  {newOwnerEmail}
                </Text>
              </Section>

              {/* CTA Button */}
              <Section style={styles.buttonContainer}>
                <Link href={confirmUrl} style={{
                  ...styles.button,
                  backgroundColor: styles.colors.warning,
                  color: '#000',
                }}>
                  Bekreft overføring
                </Link>
              </Section>

              {/* Expiry notice */}
              <Text style={styles.expiryNotice}>
                ⏱️ Overføringen utløper om {expiresAt}
              </Text>

              <Hr style={styles.divider} />

              {/* Info section */}
              <Section style={styles.infoCard}>
                <Text style={{ ...styles.paragraph, margin: '0', fontSize: '14px' }}>
                  <strong style={{ color: styles.colors.textPrimary }}>Hva skjer videre?</strong>
                </Text>
                <Text style={{ ...styles.paragraph, margin: '12px 0 0 0', fontSize: '14px' }}>
                  1. Du bekrefter overføringen via denne lenken<br />
                  2. {newOwnerName} bekrefter via sin lenke<br />
                  3. Når begge har bekreftet, fullføres overføringen automatisk
                </Text>
              </Section>

              {/* Alternative link */}
              <Text style={{ ...styles.paragraph, fontSize: '13px', color: styles.colors.textMuted }}>
                Hvis knappen ikke fungerer, kopier og lim inn denne lenken i nettleseren din:
              </Text>
              <Text style={{
                ...styles.paragraph,
                fontSize: '12px',
                color: styles.colors.lime,
                wordBreak: 'break-all' as const,
                backgroundColor: styles.colors.darkCard,
                padding: '12px 16px',
                borderRadius: '8px',
              }}>
                {confirmUrl}
              </Text>
            </Section>

            {/* Footer */}
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                Denne e-posten ble sendt fra{' '}
                <Link href="https://botsy.no" style={styles.footerLink}>
                  Botsy
                </Link>
                .
              </Text>
              <Text style={{ ...styles.footerText, marginTop: '8px' }}>
                Hvis du ikke startet denne overføringen, ignorer denne e-posten.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default OwnershipTransferRequestEmail
