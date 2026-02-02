import * as React from 'react'

interface DailySummaryEmailProps {
  companyName: string
  date: string
  stats: {
    totalConversations: number
    resolvedByBot: number
    escalatedToHuman: number
    avgResponseTime: string
  }
  employeeOfTheDay?: {
    name: string
    points: number
    conversationsHandled: number
    avatar?: string
  }
  insights: string[]
  recentEscalations: Array<{
    customerName: string
    message: string
    time: string
    channel: string
  }>
  unsubscribeUrl: string
}

export function DailySummaryEmail({
  companyName,
  date,
  stats,
  employeeOfTheDay,
  insights,
  recentEscalations,
  unsubscribeUrl,
}: DailySummaryEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Daglig Oppsummering - {companyName}</title>
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: '#0B1120',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: '#ffffff',
        lineHeight: 1.6,
      }}>
        {/* Main Container */}
        <table
          cellPadding="0"
          cellSpacing="0"
          style={{
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#0B1120',
          }}
        >
          {/* Header */}
          <tr>
            <td style={{
              padding: '32px 24px 24px',
              textAlign: 'center',
              borderBottom: '1px solid rgba(191, 255, 0, 0.1)',
            }}>
              {/* Logo */}
              <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
                <tr>
                  <td style={{
                    backgroundColor: '#BFFF00',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    display: 'inline-block',
                  }}>
                    <span style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#0B1120',
                      letterSpacing: '-0.5px',
                    }}>
                      Botsy
                    </span>
                  </td>
                </tr>
              </table>

              {/* Title */}
              <h1 style={{
                margin: '24px 0 8px',
                fontSize: '28px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.5px',
              }}>
                Daglig Oppsummering
              </h1>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6B7A94',
              }}>
                {date} • {companyName}
              </p>
            </td>
          </tr>

          {/* Stats Grid */}
          <tr>
            <td style={{ padding: '32px 24px' }}>
              <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                <tr>
                  {/* Total Conversations */}
                  <td style={{
                    width: '50%',
                    padding: '0 8px 16px 0',
                    verticalAlign: 'top',
                  }}>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '20px',
                    }}>
                      <p style={{
                        margin: '0 0 4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#6B7A94',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Samtaler i dag
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '32px',
                        fontWeight: 700,
                        color: '#BFFF00',
                      }}>
                        {stats.totalConversations}
                      </p>
                    </div>
                  </td>

                  {/* Resolved by Bot */}
                  <td style={{
                    width: '50%',
                    padding: '0 0 16px 8px',
                    verticalAlign: 'top',
                  }}>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '20px',
                    }}>
                      <p style={{
                        margin: '0 0 4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#6B7A94',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Løst av bot
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '32px',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}>
                        {stats.resolvedByBot}%
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  {/* Escalated to Human */}
                  <td style={{
                    width: '50%',
                    padding: '0 8px 0 0',
                    verticalAlign: 'top',
                  }}>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '20px',
                    }}>
                      <p style={{
                        margin: '0 0 4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#6B7A94',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Eskalert til ansatt
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '32px',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}>
                        {stats.escalatedToHuman}%
                      </p>
                    </div>
                  </td>

                  {/* Average Response Time */}
                  <td style={{
                    width: '50%',
                    padding: '0 0 0 8px',
                    verticalAlign: 'top',
                  }}>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '20px',
                    }}>
                      <p style={{
                        margin: '0 0 4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#6B7A94',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Snitt responstid
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '32px',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}>
                        {stats.avgResponseTime}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {/* Employee of the Day */}
          {employeeOfTheDay && (
            <tr>
              <td style={{ padding: '0 24px 32px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(191, 255, 0, 0.15) 0%, rgba(191, 255, 0, 0.05) 100%)',
                  border: '1px solid rgba(191, 255, 0, 0.3)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                }}>
                  {/* Trophy Icon */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 16px',
                    backgroundColor: '#BFFF00',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}>
                    🏆
                  </div>

                  <p style={{
                    margin: '0 0 4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#BFFF00',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    Dagens Beste Ansatt
                  </p>

                  <h2 style={{
                    margin: '8px 0 16px',
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}>
                    {employeeOfTheDay.name}
                  </h2>

                  <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                    <tr>
                      <td style={{ textAlign: 'center', padding: '0 8px' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '24px',
                          fontWeight: 700,
                          color: '#BFFF00',
                        }}>
                          {employeeOfTheDay.points}
                        </p>
                        <p style={{
                          margin: '4px 0 0',
                          fontSize: '12px',
                          color: '#6B7A94',
                        }}>
                          poeng
                        </p>
                      </td>
                      <td style={{
                        width: '1px',
                        backgroundColor: 'rgba(191, 255, 0, 0.2)',
                      }} />
                      <td style={{ textAlign: 'center', padding: '0 8px' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '24px',
                          fontWeight: 700,
                          color: '#ffffff',
                        }}>
                          {employeeOfTheDay.conversationsHandled}
                        </p>
                        <p style={{
                          margin: '4px 0 0',
                          fontSize: '12px',
                          color: '#6B7A94',
                        }}>
                          samtaler
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
          )}

          {/* Insights Section */}
          {insights.length > 0 && (
            <tr>
              <td style={{ padding: '0 24px 32px' }}>
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#6B7A94',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  💡 Innsikt
                </h3>

                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '20px',
                }}>
                  {insights.map((insight, index) => (
                    <p
                      key={index}
                      style={{
                        margin: index === insights.length - 1 ? 0 : '0 0 12px',
                        fontSize: '14px',
                        color: '#ffffff',
                        paddingLeft: '20px',
                        position: 'relative' as const,
                      }}
                    >
                      <span style={{
                        position: 'absolute' as const,
                        left: 0,
                        color: '#BFFF00',
                      }}>
                        •
                      </span>
                      {insight}
                    </p>
                  ))}
                </div>
              </td>
            </tr>
          )}

          {/* Recent Escalations */}
          {recentEscalations.length > 0 && (
            <tr>
              <td style={{ padding: '0 24px 32px' }}>
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#6B7A94',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  🔔 Nylige eskaleringer
                </h3>

                {recentEscalations.map((escalation, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: index === recentEscalations.length - 1 ? 0 : '8px',
                    }}
                  >
                    <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                      <tr>
                        <td>
                          <p style={{
                            margin: '0 0 4px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#ffffff',
                          }}>
                            {escalation.customerName}
                          </p>
                          <p style={{
                            margin: 0,
                            fontSize: '13px',
                            color: '#6B7A94',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' as const,
                            maxWidth: '300px',
                          }}>
                            {escalation.message}
                          </p>
                        </td>
                        <td style={{
                          textAlign: 'right',
                          verticalAlign: 'top',
                          whiteSpace: 'nowrap' as const,
                        }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(191, 255, 0, 0.1)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#BFFF00',
                            textTransform: 'uppercase',
                          }}>
                            {escalation.channel}
                          </span>
                          <p style={{
                            margin: '8px 0 0',
                            fontSize: '12px',
                            color: '#6B7A94',
                          }}>
                            {escalation.time}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </div>
                ))}
              </td>
            </tr>
          )}

          {/* Call to Action */}
          <tr>
            <td style={{ padding: '0 24px 32px', textAlign: 'center' }}>
              <a
                href="https://botsy.no/admin"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#BFFF00',
                  color: '#0B1120',
                  fontSize: '14px',
                  fontWeight: 600,
                  padding: '14px 32px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                Åpne Dashboard →
              </a>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td style={{
              padding: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
            }}>
              <p style={{
                margin: '0 0 8px',
                fontSize: '12px',
                color: '#6B7A94',
              }}>
                Du mottar denne e-posten fordi du har aktivert daglige oppsummeringer.
              </p>
              <a
                href={unsubscribeUrl}
                style={{
                  fontSize: '12px',
                  color: '#6B7A94',
                  textDecoration: 'underline',
                }}
              >
                Avslutt abonnement
              </a>

              <p style={{
                margin: '24px 0 0',
                fontSize: '11px',
                color: '#4a5568',
              }}>
                © {new Date().getFullYear()} Botsy. Alle rettigheter reservert.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}

// Helper function to render the email to HTML string
export function renderDailySummaryEmail(props: DailySummaryEmailProps): string {
  const ReactDOMServer = require('react-dom/server')
  return '<!DOCTYPE html>' + ReactDOMServer.renderToStaticMarkup(
    <DailySummaryEmail {...props} />
  )
}

export default DailySummaryEmail
