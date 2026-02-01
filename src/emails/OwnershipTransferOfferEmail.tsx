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

interface OwnershipTransferOfferEmailProps {
  recipientName: string
  currentOwnerName: string
  companyName: string
  acceptUrl: string
  expiresAt: string
}

export function OwnershipTransferOfferEmail({
  recipientName = 'Kari Nordmann',
  currentOwnerName = 'Ola Nordmann',
  companyName = 'Bedriften AS',
  acceptUrl = 'https://botsy.no/transfer/abc123?type=to',
  expiresAt = '24 timer',
}: OwnershipTransferOfferEmailProps) {
  return (
    <Html>
      <Head>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
          `}
        </style>
      </Head>
      <Preview>Du blir tilbudt eierskap av {companyName}</Preview>
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
                <Text style={{ fontSize: '48px', margin: '0 0 8px 0' }}>👑</Text>
              </Section>

              <Heading style={styles.heading}>
                Du blir tilbudt eierskap!
              </Heading>

              <Text style={styles.subheading}>
                <strong style={{ color: styles.colors.textPrimary }}>{currentOwnerName}</strong> ønsker å overføre eierskapet av{' '}
                <strong style={{ color: styles.colors.lime }}>{companyName}</strong> til deg.
              </Text>

              {/* Highlight card */}
              <Section style={{
                ...styles.infoCardHighlight,
                backgroundColor: 'rgba(253, 203, 110, 0.08)',
                border: '1px solid rgba(253, 203, 110, 0.2)',
              }}>
                <Text style={styles.infoLabel}>Du vil bli</Text>
                <Text style={{ ...styles.infoValue, color: styles.colors.warning, marginBottom: '12px' }}>
                  Eier
                </Text>
                <Text style={{ ...styles.paragraph, margin: '0', fontSize: '14px' }}>
                  Full kontroll over bedriftskontoen, inkludert innstillinger, fakturering og team-administrasjon.
                </Text>
              </Section>

              {/* Info section */}
              <Section style={styles.infoCard}>
                <Text style={{ ...styles.paragraph, margin: '0', fontSize: '14px' }}>
                  <strong style={{ color: styles.colors.textPrimary }}>Som eier får du:</strong>
                </Text>
                <Text style={{ ...styles.paragraph, margin: '12px 0 0 0', fontSize: '14px' }}>
                  ✓ Full tilgang til alle funksjoner<br />
                  ✓ Administrere team og tilganger<br />
                  ✓ Endre innstillinger og fakturering<br />
                  ✓ Overføre eierskap til andre
                </Text>
              </Section>

              {/* CTA Button */}
              <Section style={styles.buttonContainer}>
                <Link href={acceptUrl} style={{
                  ...styles.button,
                  backgroundColor: styles.colors.warning,
                  color: '#000',
                }}>
                  Aksepter eierskap
                </Link>
              </Section>

              {/* Expiry notice */}
              <Text style={styles.expiryNotice}>
                ⏱️ Tilbudet utløper om {expiresAt}
              </Text>

              <Hr style={styles.divider} />

              {/* Note */}
              <Section style={styles.infoCard}>
                <Text style={{ ...styles.paragraph, margin: '0', fontSize: '14px' }}>
                  <strong style={{ color: styles.colors.textPrimary }}>Merk:</strong> Eierskapsoverføringen fullføres først når både du og {currentOwnerName} har bekreftet. Nåværende eier vil bli nedgradert til administrator.
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
                {acceptUrl}
              </Text>
            </Section>

            {/* Footer */}
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                Denne e-posten ble sendt fra{' '}
                <Link href="https://botsy.no" style={styles.footerLink}>
                  Botsy
                </Link>
                {' '}på vegne av {currentOwnerName}.
              </Text>
              <Text style={{ ...styles.footerText, marginTop: '8px' }}>
                Hvis du ikke forventet dette tilbudet, kan du trygt ignorere denne e-posten.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default OwnershipTransferOfferEmail
