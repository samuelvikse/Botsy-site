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

interface TeamInvitationEmailProps {
  inviterName: string
  companyName: string
  role: 'admin' | 'employee'
  inviteUrl: string
  expiresAt: string
}

export function TeamInvitationEmail({
  inviterName = 'Ola Nordmann',
  companyName = 'Bedriften AS',
  role = 'employee',
  inviteUrl = 'https://botsy.no/invite/abc123',
  expiresAt = '7 dager',
}: TeamInvitationEmailProps) {
  const roleLabel = role === 'admin' ? 'Administrator' : 'Ansatt'
  const roleDescription = role === 'admin'
    ? 'Full tilgang til alle funksjoner unntatt innstillinger og eierskapsoverføring.'
    : 'Tilgang til utvalgte funksjoner basert på tildelte rettigheter.'

  const roleBadgeStyle = role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeEmployee

  return (
    <Html>
      <Head>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
          `}
        </style>
      </Head>
      <Preview>Du er invitert til {companyName} på Botsy</Preview>
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
              {/* Icon - using emoji as fallback until image is provided */}
              <Section style={{ textAlign: 'center' as const }}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px 0' }}>🎉</Text>
              </Section>

              <Heading style={styles.heading}>
                Du er invitert!
              </Heading>

              <Text style={styles.subheading}>
                <strong style={{ color: styles.colors.textPrimary }}>{inviterName}</strong> har invitert deg til å bli med i{' '}
                <strong style={{ color: styles.colors.lime }}>{companyName}</strong> på Botsy.
              </Text>

              {/* Role card */}
              <Section style={styles.infoCardHighlight}>
                <Text style={styles.infoLabel}>Din rolle</Text>
                <Text style={{ ...styles.infoValueLime, marginBottom: '12px' }}>
                  {roleLabel}
                </Text>
                <Text style={{ ...styles.paragraph, margin: '0', fontSize: '14px' }}>
                  {roleDescription}
                </Text>
              </Section>

              {/* CTA Button */}
              <Section style={styles.buttonContainer}>
                <Link href={inviteUrl} style={styles.button}>
                  Aksepter invitasjon
                </Link>
              </Section>

              {/* Expiry notice */}
              <Text style={styles.expiryNotice}>
                ⏱️ Invitasjonen utløper om {expiresAt}
              </Text>

              <Hr style={styles.divider} />

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
                {inviteUrl}
              </Text>
            </Section>

            {/* Footer */}
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                Denne e-posten ble sendt fra{' '}
                <Link href="https://botsy.no" style={styles.footerLink}>
                  Botsy
                </Link>
                {' '}på vegne av {companyName}.
              </Text>
              <Text style={{ ...styles.footerText, marginTop: '8px' }}>
                Hvis du ikke forventet denne invitasjonen, kan du trygt ignorere denne e-posten.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default TeamInvitationEmail
