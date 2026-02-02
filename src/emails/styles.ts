/**
 * Botsy Email Design System
 *
 * A sophisticated dark theme with electric lime accents.
 * Typography: Geist for a modern, technical feel.
 */

export const colors = {
  // Core brand
  lime: '#bad532',
  limeDark: '#a5c02d',
  limeLight: '#c8e048',

  // Dark theme
  darkDeep: '#0a0e17',
  darkSurface: '#12171f',
  darkCard: '#181d27',
  darkBorder: '#252a36',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#a0a8b8',
  textMuted: '#6b7280',

  // Accents
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#E74C3C',
  info: '#74B9FF',
}

export const fonts = {
  primary: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: 'Geist Mono, SF Mono, Monaco, monospace',
}

// Base container for all emails
export const container = {
  backgroundColor: colors.darkDeep,
  margin: '0 auto',
  padding: '40px 0',
  width: '100%',
}

export const main = {
  backgroundColor: colors.darkDeep,
  fontFamily: fonts.primary,
}

export const wrapper = {
  backgroundColor: colors.darkSurface,
  border: `1px solid ${colors.darkBorder}`,
  borderRadius: '16px',
  margin: '0 auto',
  maxWidth: '560px',
  overflow: 'hidden' as const,
}

// Header section with logo
export const header = {
  backgroundColor: colors.darkCard,
  borderBottom: `1px solid ${colors.darkBorder}`,
  padding: '32px 40px',
  textAlign: 'center' as const,
}

export const logo = {
  margin: '0 auto',
  objectFit: 'contain' as const,
}

// Content section
export const content = {
  padding: '40px',
}

export const heading = {
  color: colors.textPrimary,
  fontSize: '28px',
  fontWeight: '600',
  letterSpacing: '-0.02em',
  lineHeight: '1.3',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
}

export const subheading = {
  color: colors.textSecondary,
  fontSize: '16px',
  fontWeight: '400',
  lineHeight: '1.6',
  margin: '0 0 32px 0',
  textAlign: 'center' as const,
}

export const paragraph = {
  color: colors.textSecondary,
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 24px 0',
}

// Info cards
export const infoCard = {
  backgroundColor: colors.darkCard,
  border: `1px solid ${colors.darkBorder}`,
  borderRadius: '12px',
  margin: '0 0 24px 0',
  padding: '24px',
}

export const infoCardHighlight = {
  backgroundColor: `rgba(186, 213, 50, 0.08)`,
  border: `1px solid rgba(186, 213, 50, 0.2)`,
  borderRadius: '12px',
  margin: '0 0 24px 0',
  padding: '24px',
}

export const infoLabel = {
  color: colors.textMuted,
  fontSize: '12px',
  fontWeight: '500',
  letterSpacing: '0.05em',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
}

export const infoValue = {
  color: colors.textPrimary,
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
}

export const infoValueLime = {
  color: colors.lime,
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
}

// Primary CTA button
export const button = {
  backgroundColor: colors.lime,
  borderRadius: '10px',
  color: colors.darkDeep,
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  letterSpacing: '-0.01em',
  padding: '14px 32px',
  textAlign: 'center' as const,
  textDecoration: 'none',
}

export const buttonContainer = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

// Secondary/outline button
export const buttonSecondary = {
  backgroundColor: 'transparent',
  border: `2px solid ${colors.darkBorder}`,
  borderRadius: '10px',
  color: colors.textPrimary,
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '500',
  padding: '12px 28px',
  textAlign: 'center' as const,
  textDecoration: 'none',
}

// Divider
export const divider = {
  borderColor: colors.darkBorder,
  borderStyle: 'solid' as const,
  borderWidth: '1px 0 0 0',
  margin: '32px 0',
}

// Footer
export const footer = {
  backgroundColor: colors.darkCard,
  borderTop: `1px solid ${colors.darkBorder}`,
  padding: '24px 40px',
}

export const footerText = {
  color: colors.textMuted,
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0',
  textAlign: 'center' as const,
}

export const footerLink = {
  color: colors.lime,
  textDecoration: 'none',
}

// Warning/Alert box
export const alertBox = {
  backgroundColor: 'rgba(231, 76, 60, 0.08)',
  border: '1px solid rgba(231, 76, 60, 0.2)',
  borderRadius: '12px',
  margin: '24px 0',
  padding: '20px 24px',
}

export const alertText = {
  color: colors.error,
  fontSize: '14px',
  fontWeight: '500',
  lineHeight: '1.5',
  margin: '0',
}

// Role badge
export const roleBadge = {
  backgroundColor: colors.darkCard,
  border: `1px solid ${colors.darkBorder}`,
  borderRadius: '8px',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '500',
  padding: '8px 16px',
}

export const roleBadgeAdmin = {
  ...roleBadge,
  backgroundColor: 'rgba(116, 185, 255, 0.1)',
  border: '1px solid rgba(116, 185, 255, 0.3)',
  color: colors.info,
}

export const roleBadgeEmployee = {
  ...roleBadge,
  backgroundColor: 'rgba(160, 168, 184, 0.1)',
  border: '1px solid rgba(160, 168, 184, 0.3)',
  color: colors.textSecondary,
}

export const roleBadgeOwner = {
  ...roleBadge,
  backgroundColor: 'rgba(253, 203, 110, 0.1)',
  border: '1px solid rgba(253, 203, 110, 0.3)',
  color: colors.warning,
}

// Icon containers
export const iconContainer = {
  backgroundColor: `rgba(186, 213, 50, 0.1)`,
  border: `1px solid rgba(186, 213, 50, 0.2)`,
  borderRadius: '16px',
  display: 'inline-block',
  margin: '0 auto 24px auto',
  padding: '20px',
}

export const iconContainerWarning = {
  backgroundColor: 'rgba(231, 76, 60, 0.1)',
  border: '1px solid rgba(231, 76, 60, 0.2)',
  borderRadius: '16px',
  display: 'inline-block',
  margin: '0 auto 24px auto',
  padding: '20px',
}

export const iconContainerSuccess = {
  backgroundColor: 'rgba(0, 184, 148, 0.1)',
  border: '1px solid rgba(0, 184, 148, 0.2)',
  borderRadius: '16px',
  display: 'inline-block',
  margin: '0 auto 24px auto',
  padding: '20px',
}

// Expiry notice
export const expiryNotice = {
  backgroundColor: colors.darkCard,
  borderRadius: '8px',
  color: colors.textMuted,
  fontSize: '13px',
  margin: '24px 0 0 0',
  padding: '12px 16px',
  textAlign: 'center' as const,
}

// Preview text (hidden)
export const preview = {
  display: 'none',
  maxHeight: '0',
  maxWidth: '0',
  overflow: 'hidden',
}
