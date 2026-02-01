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

interface OwnershipTransferCompleteEmailProps {
  recipientName: string
  companyName: string
  newOwnerName: string
  isNewOwner: boolean
  dashboardUrl: string
}

export function OwnershipTransferCompleteEmail({
  recipientName = 'Ola Nordmann',
  companyName = 'Bedriften AS',
  newOwnerName = 'Kari Nordmann',
  isNewOwner = false,
  dashboardUrl = 'https://botsy.no/admin',
}: OwnershipTransferCompleteEmailProps) {
  const newRole = isNewOwner ? 'Eier' : 'Administrator'
  const roleDescription = isNewOwner
    ? 'Du har nå full kontroll over bedriftskontoen.'
    : 'Du har fortsatt tilgang til alle funksjoner unntatt innstillinger og eierskapsoverføring.'

  return (
    <Html>
      <Head>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
          `}
        </style>
      </Head>
      <Preview>Eierskap av {companyName} er overført</Preview>
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
                <Text style={{ fontSize: '48px', margin: '0 0 8px 0' }}>✅</Text>
              </Section>

              <Heading style={styles.heading}>
                {isNewOwner ? 'Gratulerer!' : 'Eierskap overført'}
              </Heading>

              <Text style={styles.subheading}>
                {isNewOwner ? (
                  <>
                    Du er nå eier av{' '}
                    <strong style={{ color: styles.colors.lime }}>{companyName}</strong>.
                  </>
                ) : (
                  <>
                    Eierskap av{' '}
                    <strong style={{ color: styles.colors.lime }}>{companyName}</strong>{' '}
                    er overført til{' '}
                    <strong style={{ color: styles.colors.textPrimary }}>{newOwnerName}</strong>.
                  </>
                )}
              </Text>

              {/* Role update card */}
              <Section style={{
                ...styles.infoCardHighlight,
                backgroundColor: isNewOwner ? 'rgba(253, 203, 110, 0.08)' : 'rgba(116, 185, 255, 0.08)',
                border: isNewOwner ? '1px solid rgba(253, 203, 110, 0.2)' : '1px solid rgba(116, 185, 255, 0.2)',
              }}>
                <Text style={styles.infoLabel}>Din nye rolle</Text>
                <Text style={{
                  ...styles.infoValue,
                  color: isNewOwner ? styles.colors.warning : styles.colors.info,
                  marginBottom: '12px',
                }}>
                  {newRole}
                </Text>
                <Text style={{ ...styles.paragraph, margin: '0', fontSize: '14px' }}>
                  {roleDescription}
                </Text>
              </Section>

              {isNewOwner && (
                <Section style={styles.infoCard}>
                  <Text style={{ ...styles.paragraph, margin: '0', fontSize: '14px' }}>
                    <strong style={{ color: styles.colors.textPrimary }}>Som eier kan du:</strong>
                  </Text>
                  <Text style={{ ...styles.paragraph, margin: '12px 0 0 0', fontSize: '14px' }}>
                    ✓ Administrere team og tilganger<br />
                    ✓ Endre innstillinger og fakturering<br />
                    ✓ Overføre eierskap til andre<br />
                    ✓ Full kontroll over alle funksjoner
                  </Text>
                </Section>
              )}

              {!isNewOwner && (
                <Section style={styles.infoCard}>
                  <Text style={{ ...styles.paragraph, margin: '0', fontSize: '14px' }}>
                    <strong style={{ color: styles.colors.textPrimary }}>Som administrator kan du:</strong>
                  </Text>
                  <Text style={{ ...styles.paragraph, margin: '12px 0 0 0', fontSize: '14px' }}>
                    ✓ Administrere kunnskapsbase og dokumenter<br />
                    ✓ Konfigurere chatbot og kanaler<br />
                    ✓ Invitere nye teammedlemmer<br />
                    ✓ Se analyser og samtaler
                  </Text>
                </Section>
              )}

              {/* CTA Button */}
              <Section style={styles.buttonContainer}>
                <Link href={dashboardUrl} style={styles.button}>
                  Gå til dashboard
                </Link>
              </Section>

              <Hr style={styles.divider} />

              {/* Summary */}
              <Section style={styles.infoCard}>
                <Text style={{ ...styles.paragraph, margin: '0', fontSize: '14px', textAlign: 'center' as const }}>
                  <strong style={{ color: styles.colors.textPrimary }}>Oppsummering</strong>
                </Text>
                <Text style={{ ...styles.paragraph, margin: '12px 0 0 0', fontSize: '14px', textAlign: 'center' as const }}>
                  {newOwnerName} er nå eier av {companyName}
                </Text>
              </Section>
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
                Har du spørsmål? Kontakt oss på{' '}
                <Link href="mailto:support@botsy.no" style={styles.footerLink}>
                  support@botsy.no
                </Link>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default OwnershipTransferCompleteEmail
