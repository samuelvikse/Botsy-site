/**
 * Stripe Error Code Mapping
 * Maps Stripe error codes to user-friendly Norwegian messages
 */

export interface StripeErrorMapping {
  title: string
  message: string
  suggestion?: string
  recoverable: boolean
}

// Stripe error codes mapped to Norwegian user-friendly messages
export const STRIPE_ERROR_CODES: Record<string, StripeErrorMapping> = {
  // Card errors
  card_declined: {
    title: 'Kortet ble avvist',
    message: 'Betalingen ble avvist av kortutstederen.',
    suggestion: 'Prøv et annet kort eller kontakt banken din.',
    recoverable: true,
  },
  insufficient_funds: {
    title: 'Utilstrekkelige midler',
    message: 'Det er ikke nok penger på kortet.',
    suggestion: 'Bruk et annet kort eller sørg for at det er dekning.',
    recoverable: true,
  },
  expired_card: {
    title: 'Utløpt kort',
    message: 'Kortet har utløpt.',
    suggestion: 'Vennligst bruk et annet gyldig kort.',
    recoverable: true,
  },
  incorrect_cvc: {
    title: 'Feil CVC-kode',
    message: 'Sikkerhetskoden (CVC) er feil.',
    suggestion: 'Sjekk CVC-koden på baksiden av kortet og prøv igjen.',
    recoverable: true,
  },
  incorrect_number: {
    title: 'Ugyldig kortnummer',
    message: 'Kortnummeret er ikke gyldig.',
    suggestion: 'Sjekk at du har tastet inn kortnummeret riktig.',
    recoverable: true,
  },
  invalid_expiry_month: {
    title: 'Ugyldig utløpsmåned',
    message: 'Utløpsmåneden er ikke gyldig.',
    suggestion: 'Sjekk utløpsdatoen på kortet.',
    recoverable: true,
  },
  invalid_expiry_year: {
    title: 'Ugyldig utløpsår',
    message: 'Utløpsåret er ikke gyldig.',
    suggestion: 'Sjekk utløpsdatoen på kortet.',
    recoverable: true,
  },
  processing_error: {
    title: 'Behandlingsfeil',
    message: 'Det oppstod en feil under behandlingen av betalingen.',
    suggestion: 'Vent et øyeblikk og prøv igjen.',
    recoverable: true,
  },

  // Authentication errors
  authentication_required: {
    title: 'Autentisering påkrevd',
    message: 'Betalingen krever ekstra autentisering.',
    suggestion: 'Fullfør autentiseringen for å fortsette.',
    recoverable: true,
  },

  // Rate limiting
  rate_limit: {
    title: 'For mange forespørsler',
    message: 'Du har gjort for mange forsøk på kort tid.',
    suggestion: 'Vent 30 sekunder før du prøver igjen.',
    recoverable: true,
  },

  // Generic errors
  generic_decline: {
    title: 'Betaling avvist',
    message: 'Betalingen kunne ikke gjennomføres.',
    suggestion: 'Prøv et annet betalingskort.',
    recoverable: true,
  },

  // Network/system errors
  api_connection_error: {
    title: 'Tilkoblingsproblem',
    message: 'Kunne ikke koble til betalingssystemet.',
    suggestion: 'Sjekk internettforbindelsen og prøv igjen.',
    recoverable: true,
  },
  api_error: {
    title: 'Systemfeil',
    message: 'Det oppstod en teknisk feil.',
    suggestion: 'Prøv igjen om et øyeblikk.',
    recoverable: true,
  },

  // Fraud prevention
  fraudulent: {
    title: 'Betaling blokkert',
    message: 'Betalingen ble blokkert av sikkerhetssystemet.',
    suggestion: 'Kontakt kundeservice hvis du mener dette er feil.',
    recoverable: false,
  },

  // Lost/stolen
  lost_card: {
    title: 'Kort rapportert tapt',
    message: 'Dette kortet er rapportert som tapt.',
    suggestion: 'Vennligst bruk et annet kort.',
    recoverable: false,
  },
  stolen_card: {
    title: 'Kort rapportert stjålet',
    message: 'Dette kortet er rapportert som stjålet.',
    suggestion: 'Vennligst bruk et annet kort.',
    recoverable: false,
  },
}

/**
 * Get user-friendly error message from Stripe error
 */
export function getStripeErrorMessage(error: unknown): StripeErrorMapping {
  // Default error
  const defaultError: StripeErrorMapping = {
    title: 'Noe gikk galt',
    message: 'Det oppstod en uventet feil.',
    suggestion: 'Vennligst prøv igjen eller kontakt kundeservice.',
    recoverable: true,
  }

  if (!error || typeof error !== 'object') {
    return defaultError
  }

  const err = error as Record<string, unknown>

  // Check for Stripe error code
  const code = err.code as string | undefined
  if (code && STRIPE_ERROR_CODES[code]) {
    return STRIPE_ERROR_CODES[code]
  }

  // Check for decline code
  const declineCode = err.decline_code as string | undefined
  if (declineCode && STRIPE_ERROR_CODES[declineCode]) {
    return STRIPE_ERROR_CODES[declineCode]
  }

  // Check message for common patterns
  const message = (err.message as string)?.toLowerCase() || ''

  if (message.includes('card was declined')) {
    return STRIPE_ERROR_CODES.card_declined
  }
  if (message.includes('insufficient funds')) {
    return STRIPE_ERROR_CODES.insufficient_funds
  }
  if (message.includes('expired')) {
    return STRIPE_ERROR_CODES.expired_card
  }
  if (message.includes('cvc') || message.includes('security code')) {
    return STRIPE_ERROR_CODES.incorrect_cvc
  }
  if (message.includes('rate limit')) {
    return STRIPE_ERROR_CODES.rate_limit
  }

  return defaultError
}

/**
 * Format error for API response
 */
export function formatStripeError(error: unknown): {
  error: string
  errorCode: string
  recoverable: boolean
  suggestion?: string
} {
  const mapping = getStripeErrorMessage(error)

  return {
    error: mapping.message,
    errorCode: mapping.title,
    recoverable: mapping.recoverable,
    suggestion: mapping.suggestion,
  }
}
