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

interface WeeklyStats {
  totalConversations: number
  conversationsChange: number // percentage change from last week
  resolvedByBot: number
  resolvedByBotChange: number
  escalatedToHuman: number
  avgResponseTime: string
  customerSatisfaction?: number // percentage
}

interface TopPerformer {
  name: string
  points: number
  conversationsHandled: number
  avatarUrl?: string
}

interface WeeklySummaryEmailProps {
  recipientName: string
  companyName: string
  weekNumber: number
  weekDateRange: string // e.g., "20. - 26. januar 2026"
  stats: WeeklyStats
  topPerformers: TopPerformer[]
  insights: string[]
  dashboardUrl: string
  unsubscribeUrl: string
}

export function WeeklySummaryEmail({
  recipientName = 'Bruker',
  companyName = 'Bedriften AS',
  weekNumber = 4,
  weekDateRange = '20. - 26. januar 2026',
  stats = {
    totalConversations: 156,
    conversationsChange: 12,
    resolvedByBot: 78,
    resolvedByBotChange: 5,
    escalatedToHuman: 22,
    avgResponseTime: '< 1 sek',
    customerSatisfaction: 94,
  },
  topPerformers = [],
  insights = [],
  dashboardUrl = 'https://botsy.no/admin',
  unsubscribeUrl = 'https://botsy.no/admin/innstillinger?tab=notifications',
}: WeeklySummaryEmailProps) {
  const formatChange = (change: number) => {
    if (change > 0) return `+${change}%`
    if (change < 0) return `${change}%`
    return '0%'
  }

  const getChangeColor = (change: number, inverse: boolean = false) => {
    if (inverse) {
      if (change > 0) return styles.colors.error
      if (change < 0) return styles.colors.success
    } else {
      if (change > 0) return styles.colors.success
      if (change < 0) return styles.colors.error
    }
    return styles.colors.textMuted
  }

  return (
    <Html>
      <Head>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
          `}
        </style>
      </Head>
      <Preview>{`Ukentlig oppsummering uke ${weekNumber} - ${companyName}`}</Preview>
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
              <Text style={{
                color: styles.colors.lime,
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                margin: '0 0 8px 0',
                textAlign: 'center' as const,
              }}>
                Ukentlig rapport
              </Text>

              <Heading style={styles.heading}>
                Uke {weekNumber} oppsummering
              </Heading>

              <Text style={styles.subheading}>
                Hei <strong style={{ color: styles.colors.textPrimary }}>{recipientName}</strong>!
                {' '}Her er en oversikt over{' '}
                <strong style={{ color: styles.colors.lime }}>{companyName}</strong> sin
                kundeservice for {weekDateRange}.
              </Text>

              {/* Stats Grid */}
              <Section style={{
                backgroundColor: styles.colors.darkCard,
                borderRadius: '12px',
                padding: '4px',
                margin: '0 0 24px 0',
              }}>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  <tr>
                    {/* Total Conversations */}
                    <td style={{
                      width: '50%',
                      padding: '20px',
                      borderRight: `1px solid ${styles.colors.darkBorder}`,
                      borderBottom: `1px solid ${styles.colors.darkBorder}`,
                    }}>
                      <Text style={{ color: styles.colors.textMuted, fontSize: '12px', margin: '0 0 4px 0' }}>
                        Totalt samtaler
                      </Text>
                      <Text style={{ color: styles.colors.textPrimary, fontSize: '28px', fontWeight: '700', margin: '0' }}>
                        {stats.totalConversations}
                      </Text>
                      <Text style={{
                        color: getChangeColor(stats.conversationsChange),
                        fontSize: '12px',
                        fontWeight: '500',
                        margin: '4px 0 0 0',
                      }}>
                        {formatChange(stats.conversationsChange)} fra forrige uke
                      </Text>
                    </td>

                    {/* Bot Resolution Rate */}
                    <td style={{
                      width: '50%',
                      padding: '20px',
                      borderBottom: `1px solid ${styles.colors.darkBorder}`,
                    }}>
                      <Text style={{ color: styles.colors.textMuted, fontSize: '12px', margin: '0 0 4px 0' }}>
                        Løst av bot
                      </Text>
                      <Text style={{ color: styles.colors.lime, fontSize: '28px', fontWeight: '700', margin: '0' }}>
                        {stats.resolvedByBot}%
                      </Text>
                      <Text style={{
                        color: getChangeColor(stats.resolvedByBotChange),
                        fontSize: '12px',
                        fontWeight: '500',
                        margin: '4px 0 0 0',
                      }}>
                        {formatChange(stats.resolvedByBotChange)} fra forrige uke
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    {/* Escalated */}
                    <td style={{
                      width: '50%',
                      padding: '20px',
                      borderRight: `1px solid ${styles.colors.darkBorder}`,
                    }}>
                      <Text style={{ color: styles.colors.textMuted, fontSize: '12px', margin: '0 0 4px 0' }}>
                        Eskalert til menneske
                      </Text>
                      <Text style={{ color: styles.colors.warning, fontSize: '28px', fontWeight: '700', margin: '0' }}>
                        {stats.escalatedToHuman}%
                      </Text>
                    </td>

                    {/* Response Time */}
                    <td style={{
                      width: '50%',
                      padding: '20px',
                    }}>
                      <Text style={{ color: styles.colors.textMuted, fontSize: '12px', margin: '0 0 4px 0' }}>
                        Gj.snitt responstid
                      </Text>
                      <Text style={{ color: styles.colors.textPrimary, fontSize: '28px', fontWeight: '700', margin: '0' }}>
                        {stats.avgResponseTime}
                      </Text>
                    </td>
                  </tr>
                </table>
              </Section>

              {/* Customer Satisfaction */}
              {stats.customerSatisfaction && (
                <Section style={styles.infoCardHighlight}>
                  <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                    <tr>
                      <td>
                        <Text style={{ ...styles.infoLabel, margin: '0 0 4px 0' }}>Kundetilfredshet</Text>
                        <Text style={{ color: styles.colors.lime, fontSize: '24px', fontWeight: '700', margin: 0 }}>
                          {stats.customerSatisfaction}%
                        </Text>
                      </td>
                      <td style={{ textAlign: 'right' as const }}>
                        <Text style={{ fontSize: '32px', margin: 0 }}>
                          {stats.customerSatisfaction >= 90 ? '😊' : stats.customerSatisfaction >= 70 ? '🙂' : '😐'}
                        </Text>
                      </td>
                    </tr>
                  </table>
                </Section>
              )}

              {/* Top Performers */}
              {topPerformers.length > 0 && (
                <>
                  <Text style={{ ...styles.infoLabel, marginBottom: '12px' }}>
                    🏆 Ukens toppscorere
                  </Text>
                  <Section style={styles.infoCard}>
                    <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                      {topPerformers.map((performer, index) => (
                        <tr key={`performer-${index}`}>
                          <td style={{
                            padding: '12px 0',
                            borderBottom: index < topPerformers.length - 1 ? `1px solid ${styles.colors.darkBorder}` : 'none',
                          }}>
                            <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                              <tr>
                                <td style={{ width: '32px', verticalAlign: 'middle' }}>
                                  <Text style={{
                                    margin: 0,
                                    fontSize: '18px',
                                    color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                                  }}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                  </Text>
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                  <Text style={{
                                    color: styles.colors.textPrimary,
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    margin: 0,
                                  }}>
                                    {performer.name}
                                  </Text>
                                  <Text style={{
                                    color: styles.colors.textMuted,
                                    fontSize: '12px',
                                    margin: '2px 0 0 0',
                                  }}>
                                    {performer.conversationsHandled} samtaler
                                  </Text>
                                </td>
                                <td style={{ textAlign: 'right' as const, verticalAlign: 'middle' }}>
                                  <Text style={{
                                    color: styles.colors.lime,
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    margin: 0,
                                  }}>
                                    {performer.points} poeng
                                  </Text>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      ))}
                    </table>
                  </Section>
                </>
              )}

              {/* AI Insights */}
              {insights.length > 0 && (
                <>
                  <Text style={{ ...styles.infoLabel, marginBottom: '12px', marginTop: '24px' }}>
                    💡 Ukens innsikter
                  </Text>
                  <Section style={styles.infoCard}>
                    <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                      {insights.map((insight, index) => (
                        <tr key={index}>
                          <td style={{
                            padding: '10px 0',
                            borderBottom: index < insights.length - 1 ? `1px solid ${styles.colors.darkBorder}` : 'none',
                          }}>
                            <Text style={{
                              color: styles.colors.textSecondary,
                              fontSize: '14px',
                              lineHeight: '1.5',
                              margin: 0,
                            }}>
                              {insight}
                            </Text>
                          </td>
                        </tr>
                      ))}
                    </table>
                  </Section>
                </>
              )}

              {/* CTA Button */}
              <Section style={styles.buttonContainer}>
                <Link href={dashboardUrl} style={styles.button}>
                  Se full rapport
                </Link>
              </Section>
            </Section>

            {/* Footer */}
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                Denne ukentlige rapporten sendes fra{' '}
                <Link href="https://botsy.no" style={styles.footerLink}>
                  Botsy
                </Link>
              </Text>
              <Text style={{ ...styles.footerText, marginTop: '8px' }}>
                <Link href={unsubscribeUrl} style={styles.footerLink}>
                  Endre varslingsinnstillinger
                </Link>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default WeeklySummaryEmail
