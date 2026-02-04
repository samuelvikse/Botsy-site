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

interface WelcomeToTeamEmailProps {
  memberName: string
  companyName: string
  role: 'admin' | 'employee'
  inviterName: string
  dashboardUrl: string
}

export function WelcomeToTeamEmail({
  memberName = 'Nytt medlem',
  companyName = 'Bedriften AS',
  role = 'employee',
  inviterName = 'Admin',
  dashboardUrl = 'https://botsy.no/admin',
}: WelcomeToTeamEmailProps) {
  const roleName = role === 'admin' ? 'Administrator' : 'Ansatt'
  const roleDescription = role === 'admin'
    ? 'Som administrator kan du invitere nye medlemmer, administrere tilganger og se all statistikk.'
    : 'Som ansatt kan du svare på kundehenvendelser og se din egen statistikk.'

  return (
    <Html>
      <Head>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
          `}
        </style>
      </Head>
      <Preview>Velkommen til {companyName} på Botsy!</Preview>
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
              {/* Celebration Icon */}
              <Section style={{ textAlign: 'center' as const }}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px 0' }}>
                  🎉
                </Text>
              </Section>

              <Heading style={styles.heading}>
                Velkommen til teamet!
              </Heading>

              <Text style={styles.subheading}>
                Hei <strong style={{ color: styles.colors.textPrimary }}>{memberName}</strong>!
                {' '}Du er nå en del av{' '}
                <strong style={{ color: styles.colors.lime }}>{companyName}</strong> på Botsy.
              </Text>

              {/* Role info */}
              <Section style={styles.infoCardHighlight}>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  <tr>
                    <td style={{ verticalAlign: 'top', width: '48px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: role === 'admin' ? 'rgba(116, 185, 255, 0.1)' : 'rgba(186, 213, 50, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ margin: 0, fontSize: '20px' }}>
                          {role === 'admin' ? '🛡️' : '👤'}
                        </Text>
                      </div>
                    </td>
                    <td style={{ paddingLeft: '12px' }}>
                      <Text style={{
                        color: styles.colors.textPrimary,
                        fontSize: '16px',
                        fontWeight: '600',
                        margin: '0 0 4px 0',
                      }}>
                        Du er {roleName}
                      </Text>
                      <Text style={{
                        color: styles.colors.textSecondary,
                        fontSize: '14px',
                        margin: 0,
                        lineHeight: '1.5',
                      }}>
                        {roleDescription}
                      </Text>
                    </td>
                  </tr>
                </table>
              </Section>

              {/* Quick start guide */}
              <Section style={styles.infoCard}>
                <Text style={{ ...styles.infoLabel, marginBottom: '16px' }}>
                  Kom i gang
                </Text>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  <tr>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', width: '32px' }}>
                      <Text style={{ margin: 0, fontSize: '16px' }}>📥</Text>
                    </td>
                    <td style={{ padding: '8px 0' }}>
                      <Text style={{
                        color: styles.colors.textPrimary,
                        fontSize: '14px',
                        fontWeight: '500',
                        margin: '0 0 2px 0',
                      }}>
                        Sjekk innboksen
                      </Text>
                      <Text style={{
                        color: styles.colors.textMuted,
                        fontSize: '13px',
                        margin: 0,
                      }}>
                        Se og svar på kundehenvendelser
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', width: '32px' }}>
                      <Text style={{ margin: 0, fontSize: '16px' }}>🏆</Text>
                    </td>
                    <td style={{ padding: '8px 0' }}>
                      <Text style={{
                        color: styles.colors.textPrimary,
                        fontSize: '14px',
                        fontWeight: '500',
                        margin: '0 0 2px 0',
                      }}>
                        Konkurrer med kollegaene
                      </Text>
                      <Text style={{
                        color: styles.colors.textMuted,
                        fontSize: '13px',
                        margin: 0,
                      }}>
                        Få poeng og klatre på topplisten
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', width: '32px' }}>
                      <Text style={{ margin: 0, fontSize: '16px' }}>⚙️</Text>
                    </td>
                    <td style={{ padding: '8px 0' }}>
                      <Text style={{
                        color: styles.colors.textPrimary,
                        fontSize: '14px',
                        fontWeight: '500',
                        margin: '0 0 2px 0',
                      }}>
                        Oppdater profilen din
                      </Text>
                      <Text style={{
                        color: styles.colors.textMuted,
                        fontSize: '13px',
                        margin: 0,
                      }}>
                        Legg til bilde og kontaktinfo
                      </Text>
                    </td>
                  </tr>
                </table>
              </Section>

              {/* CTA Button */}
              <Section style={styles.buttonContainer}>
                <Link href={dashboardUrl} style={styles.button}>
                  Gå til dashboardet
                </Link>
              </Section>

              <Hr style={styles.divider} />

              <Text style={{
                ...styles.paragraph,
                fontSize: '13px',
                textAlign: 'center' as const,
                color: styles.colors.textMuted,
              }}>
                Du ble invitert av {inviterName}
              </Text>
            </Section>

            {/* Footer */}
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                Velkommen til{' '}
                <Link href="https://botsy.no" style={styles.footerLink}>
                  Botsy
                </Link>
                -familien!
              </Text>
              <Text style={{ ...styles.footerText, marginTop: '8px' }}>
                Trenger du hjelp? Kontakt oss på{' '}
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

export default WelcomeToTeamEmail
