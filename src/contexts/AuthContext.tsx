'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  PhoneAuthProvider,
  multiFactor,
  PhoneMultiFactorGenerator,
  getMultiFactorResolver,
  MultiFactorResolver,
  MultiFactorError,
  reauthenticateWithCredential,
  EmailAuthProvider,
  reauthenticateWithPopup,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db, isConfigured } from '@/lib/firebase'

interface UserData {
  email: string
  displayName: string
  role: 'owner' | 'admin' | 'employee'
  companyId: string
  createdAt: Date
  phone?: string
  twoFactorEnabled?: boolean
}

interface CompanyData {
  name: string
  industry: string
  employeeCount: string
  ownerId: string
  createdAt: Date
  settings: {
    botName: string
    tone: string
    useEmojis: boolean
    useHumor: boolean
    responseLength: string
  }
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  error: string | null
  isConfigured: boolean
  confirmationResult: ConfirmationResult | null
  mfaResolver: MultiFactorResolver | null
  signUp: (email: string, password: string, name: string, companyData: {
    name: string
    industry: string
    employeeCount: string
  }) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: (allowNewUsers?: boolean) => Promise<void>
  signInWithApple: () => Promise<void>
  signInWithMicrosoft: () => Promise<void>
  sendPhoneVerification: (phoneNumber: string, recaptchaContainerId: string) => Promise<void>
  verifyPhoneCode: (code: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  clearError: () => void
  // 2FA Functions
  setupTwoFactor: (phoneNumber: string, recaptchaContainerId: string) => Promise<void>
  verifyTwoFactorSetup: (code: string) => Promise<void>
  disableTwoFactor: () => Promise<void>
  sendMfaCode: () => Promise<void>
  verifyMfaCode: (code: string) => Promise<void>
  reauthenticate: (password?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null)
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null)
  const [pendingMfaPhoneNumber, setPendingMfaPhoneNumber] = useState<string | null>(null)

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user && db) {
        // Fetch user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData)
          }
        } catch {
          // Silent fail - user data will be null
        }
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signUp = async (
    email: string,
    password: string,
    name: string,
    companyData: { name: string; industry: string; employeeCount: string }
  ) => {
    if (!auth || !db) {
      throw new Error('Firebase er ikke konfigurert')
    }

    try {
      setError(null)
      setLoading(true)

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update display name
      await updateProfile(user, { displayName: name })

      // Create company document in Firestore
      const companyRef = doc(db, 'companies', user.uid)
      await setDoc(companyRef, {
        name: companyData.name,
        industry: companyData.industry,
        employeeCount: companyData.employeeCount,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        settings: {
          botName: 'Botsy',
          tone: 'friendly',
          useEmojis: true,
          useHumor: false,
          responseLength: 'medium',
        },
      } as Omit<CompanyData, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> })

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: name,
        role: 'owner',
        companyId: user.uid,
        createdAt: serverTimestamp(),
      })

    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase er ikke konfigurert')
    }

    try {
      setError(null)
      setLoading(true)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: unknown) {
      // Check if this is an MFA challenge
      const firebaseError = err as { code?: string }
      if (firebaseError.code === 'auth/multi-factor-auth-required') {
        handleMfaError(err as MultiFactorError)
        throw new Error('MFA_REQUIRED')
      }
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async (allowNewUsers: boolean = true) => {
    if (!auth || !db) {
      throw new Error('Firebase er ikke konfigurert')
    }

    try {
      setError(null)
      setLoading(true)
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid))

      if (!userDoc.exists()) {
        if (!allowNewUsers) {
          // Sign out the new user and throw an error
          await firebaseSignOut(auth)
          throw new Error('Denne Google-kontoen er ikke registrert. Vennligst registrer deg først.')
        }

        // Create company and user documents for new Google users
        const companyRef = doc(db, 'companies', user.uid)
        await setDoc(companyRef, {
          name: '',
          industry: '',
          employeeCount: '',
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          settings: {
            botName: 'Botsy',
            tone: 'friendly',
            useEmojis: true,
            useHumor: false,
            responseLength: 'medium',
          },
        })

        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName || '',
          role: 'owner',
          companyId: user.uid,
          createdAt: serverTimestamp(),
        })
      }
    } catch (err: unknown) {
      // Check if this is an MFA challenge
      const firebaseError = err as { code?: string }
      if (firebaseError.code === 'auth/multi-factor-auth-required') {
        handleMfaError(err as MultiFactorError)
        throw new Error('MFA_REQUIRED')
      }
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signInWithApple = async () => {
    if (!auth || !db) {
      throw new Error('Firebase er ikke konfigurert')
    }

    try {
      setError(null)
      setLoading(true)
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid))

      if (!userDoc.exists()) {
        // Create company and user documents for new Apple users
        const companyRef = doc(db, 'companies', user.uid)
        await setDoc(companyRef, {
          name: '',
          industry: '',
          employeeCount: '',
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          settings: {
            botName: 'Botsy',
            tone: 'friendly',
            useEmojis: true,
            useHumor: false,
            responseLength: 'medium',
          },
        })

        await setDoc(doc(db, 'users', user.uid), {
          email: user.email || '',
          displayName: user.displayName || '',
          role: 'owner',
          companyId: user.uid,
          createdAt: serverTimestamp(),
        })
      }
    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signInWithMicrosoft = async () => {
    if (!auth || !db) {
      throw new Error('Firebase er ikke konfigurert')
    }

    try {
      setError(null)
      setLoading(true)
      const provider = new OAuthProvider('microsoft.com')
      provider.addScope('user.read')
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid))

      if (!userDoc.exists()) {
        // Create company and user documents for new Microsoft users
        const companyRef = doc(db, 'companies', user.uid)
        await setDoc(companyRef, {
          name: '',
          industry: '',
          employeeCount: '',
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          settings: {
            botName: 'Botsy',
            tone: 'friendly',
            useEmojis: true,
            useHumor: false,
            responseLength: 'medium',
          },
        })

        await setDoc(doc(db, 'users', user.uid), {
          email: user.email || '',
          displayName: user.displayName || '',
          role: 'owner',
          companyId: user.uid,
          createdAt: serverTimestamp(),
        })
      }
    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Phone Authentication
  const sendPhoneVerification = async (phoneNumber: string, recaptchaContainerId: string) => {
    if (!auth) {
      throw new Error('Firebase er ikke konfigurert')
    }

    try {
      setError(null)
      setLoading(true)

      // Clear any existing recaptcha
      if (recaptchaVerifier) {
        recaptchaVerifier.clear()
      }

      // Create new recaptcha verifier
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
      })
      setRecaptchaVerifier(verifier)

      // Send verification code
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier)
      setConfirmationResult(confirmation)
    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const verifyPhoneCode = async (code: string) => {
    if (!confirmationResult || !db) {
      throw new Error('Ingen verifiseringskode sendt')
    }

    try {
      setError(null)
      setLoading(true)

      const result = await confirmationResult.confirm(code)
      const user = result.user

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid))

      if (!userDoc.exists()) {
        // Create company and user documents for new phone users
        const companyRef = doc(db, 'companies', user.uid)
        await setDoc(companyRef, {
          name: '',
          industry: '',
          employeeCount: '',
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          settings: {
            botName: 'Botsy',
            tone: 'friendly',
            useEmojis: true,
            useHumor: false,
            responseLength: 'medium',
          },
        })

        await setDoc(doc(db, 'users', user.uid), {
          email: user.email || '',
          phone: user.phoneNumber || '',
          displayName: user.displayName || '',
          role: 'owner',
          companyId: user.uid,
          createdAt: serverTimestamp(),
        })
      }

      setConfirmationResult(null)
    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Two-Factor Authentication Functions
  const setupTwoFactor = useCallback(async (phoneNumber: string, recaptchaContainerId: string) => {
    if (!auth || !auth.currentUser) {
      throw new Error('Du må være logget inn for å aktivere 2FA')
    }

    try {
      setError(null)
      console.log('[Auth] Setting up 2FA for:', phoneNumber)

      // Clear any existing recaptcha
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear()
        } catch {
          // Ignore clear errors
        }
        setRecaptchaVerifier(null)
      }

      // Clear the container element
      const container = document.getElementById(recaptchaContainerId)
      if (container) {
        container.innerHTML = ''
      }

      // Create new recaptcha verifier
      console.log('[Auth] Creating recaptcha verifier...')
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
      })
      setRecaptchaVerifier(verifier)

      // Get multi-factor session
      console.log('[Auth] Getting MFA session...')
      const multiFactorSession = await multiFactor(auth.currentUser).getSession()
      console.log('[Auth] MFA session obtained')

      // Generate phone info options
      const phoneInfoOptions = {
        phoneNumber: phoneNumber,
        session: multiFactorSession,
      }

      // Get phone auth provider
      console.log('[Auth] Verifying phone number...')
      const phoneAuthProvider = new PhoneAuthProvider(auth)
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, verifier)
      console.log('[Auth] Phone verification ID obtained')

      // Store verification ID for later use
      setPendingMfaPhoneNumber(phoneNumber)
      setConfirmationResult({ verificationId } as unknown as ConfirmationResult)
      console.log('[Auth] 2FA setup step 1 complete')
    } catch (err: unknown) {
      console.error('[Auth] 2FA setup error:', err)
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [recaptchaVerifier])

  const verifyTwoFactorSetup = useCallback(async (code: string) => {
    if (!auth || !auth.currentUser || !confirmationResult || !pendingMfaPhoneNumber) {
      throw new Error('2FA-oppsett ikke startet')
    }

    try {
      setError(null)
      setLoading(true)

      const verificationId = (confirmationResult as unknown as { verificationId: string }).verificationId
      const cred = PhoneAuthProvider.credential(verificationId, code)
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred)

      // Enroll the phone number as a second factor
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion, 'Telefon')

      // Update user document
      if (db && auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          twoFactorEnabled: true,
          phone: pendingMfaPhoneNumber,
        })

        // Update local userData
        setUserData(prev => prev ? { ...prev, twoFactorEnabled: true, phone: pendingMfaPhoneNumber } : null)
      }

      setConfirmationResult(null)
      setPendingMfaPhoneNumber(null)
    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [confirmationResult, pendingMfaPhoneNumber])

  const disableTwoFactor = useCallback(async () => {
    if (!auth || !auth.currentUser) {
      throw new Error('Du må være logget inn')
    }

    try {
      setError(null)
      setLoading(true)

      // Get enrolled factors
      const enrolledFactors = multiFactor(auth.currentUser).enrolledFactors

      if (enrolledFactors.length > 0) {
        // Unenroll the first (and usually only) phone factor
        await multiFactor(auth.currentUser).unenroll(enrolledFactors[0])
      }

      // Update user document
      if (db) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          twoFactorEnabled: false,
        })

        // Update local userData
        setUserData(prev => prev ? { ...prev, twoFactorEnabled: false } : null)
      }
    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-authenticate user (required for sensitive operations like 2FA setup)
  const reauthenticate = useCallback(async (password?: string) => {
    if (!auth || !auth.currentUser) {
      throw new Error('Du må være logget inn')
    }

    try {
      setError(null)
      const user = auth.currentUser
      const providerId = user.providerData[0]?.providerId

      if (providerId === 'google.com') {
        // Re-authenticate with Google popup
        const provider = new GoogleAuthProvider()
        await reauthenticateWithPopup(user, provider)
      } else if (providerId === 'password' && password) {
        // Re-authenticate with email/password
        const credential = EmailAuthProvider.credential(user.email!, password)
        await reauthenticateWithCredential(user, credential)
      } else {
        throw new Error('Kunne ikke re-autentisere. Vennligst logg ut og inn igjen.')
      }

      console.log('[Auth] Re-authentication successful')
    } catch (err: unknown) {
      console.error('[Auth] Re-authentication error:', err)
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  // Send MFA verification code during sign-in
  const sendMfaCode = useCallback(async () => {
    if (!mfaResolver || !auth) {
      throw new Error('Ingen MFA-utfordring aktiv')
    }

    try {
      setError(null)

      // Clear any existing recaptcha
      if (recaptchaVerifier) {
        recaptchaVerifier.clear()
      }

      // Create new recaptcha verifier
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      })
      setRecaptchaVerifier(verifier)

      // Get the phone hint for the enrolled factor
      const phoneInfoOptions = {
        multiFactorHint: mfaResolver.hints[0],
        session: mfaResolver.session,
      }

      const phoneAuthProvider = new PhoneAuthProvider(auth)
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, verifier)

      // Store verification ID for later use
      setConfirmationResult({ verificationId } as unknown as ConfirmationResult)
    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [mfaResolver, recaptchaVerifier])

  // Verify MFA code during sign-in
  const verifyMfaCode = useCallback(async (code: string) => {
    if (!mfaResolver || !auth) {
      throw new Error('Ingen MFA-utfordring aktiv')
    }

    try {
      setError(null)
      setLoading(true)

      // If we don't have a verification ID yet, we need to send the code first
      if (!confirmationResult) {
        await sendMfaCode()
        // Wait a moment for the code to be sent, then throw to prompt user
        throw new Error('Kode sendt til telefonen din. Skriv inn koden.')
      }

      const verificationId = (confirmationResult as unknown as { verificationId: string }).verificationId
      const cred = PhoneAuthProvider.credential(verificationId, code)
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred)
      await mfaResolver.resolveSignIn(multiFactorAssertion)

      setMfaResolver(null)
      setConfirmationResult(null)
    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [mfaResolver, confirmationResult, sendMfaCode])

  // Handle MFA error during sign-in
  const handleMfaError = useCallback((error: MultiFactorError) => {
    const resolver = getMultiFactorResolver(auth!, error)
    setMfaResolver(resolver)
    setError('Tofaktorautentisering kreves. Skriv inn koden sendt til telefonen din.')
    return resolver
  }, [])

  const signOut = async () => {
    if (!auth) {
      throw new Error('Firebase er ikke konfigurert')
    }

    try {
      setError(null)
      await firebaseSignOut(auth)
    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const resetPassword = async (email: string) => {
    if (!auth) {
      throw new Error('Firebase er ikke konfigurert')
    }

    try {
      setError(null)
      await sendPasswordResetEmail(auth, email)
    } catch (err: unknown) {
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        error,
        isConfigured,
        confirmationResult,
        mfaResolver,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signInWithMicrosoft,
        sendPhoneVerification,
        verifyPhoneCode,
        signOut,
        resetPassword,
        clearError,
        setupTwoFactor,
        verifyTwoFactorSetup,
        disableTwoFactor,
        sendMfaCode,
        verifyMfaCode,
        reauthenticate,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper function to convert Firebase error codes to Norwegian messages
function getFirebaseErrorMessage(error: unknown): string {
  const firebaseError = error as { code?: string }
  switch (firebaseError.code) {
    case 'auth/email-already-in-use':
      return 'Denne e-postadressen er allerede i bruk'
    case 'auth/invalid-email':
      return 'Ugyldig e-postadresse'
    case 'auth/operation-not-allowed':
      return 'Denne operasjonen er ikke tillatt'
    case 'auth/weak-password':
      return 'Passordet er for svakt. Bruk minst 6 tegn'
    case 'auth/user-disabled':
      return 'Denne brukerkontoen er deaktivert'
    case 'auth/user-not-found':
      return 'Ingen bruker funnet med denne e-postadressen'
    case 'auth/wrong-password':
      return 'Feil passord'
    case 'auth/invalid-credential':
      return 'Feil e-post eller passord'
    case 'auth/too-many-requests':
      return 'For mange forsøk. Prøv igjen senere'
    case 'auth/popup-closed-by-user':
      return 'Innlogging ble avbrutt'
    // Phone auth errors
    case 'auth/invalid-phone-number':
      return 'Ugyldig telefonnummer. Bruk format +47XXXXXXXX'
    case 'auth/missing-phone-number':
      return 'Telefonnummer mangler'
    case 'auth/quota-exceeded':
      return 'SMS-kvote overskredet. Prøv igjen senere'
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA-verifisering mislyktes'
    case 'auth/invalid-verification-code':
      return 'Ugyldig verifiseringskode'
    case 'auth/code-expired':
      return 'Verifiseringskoden har utløpt. Be om en ny kode'
    case 'auth/credential-already-in-use':
      return 'Denne legitimasjonen er allerede knyttet til en annen konto'
    // MFA errors
    case 'auth/multi-factor-auth-required':
      return 'Tofaktorautentisering kreves'
    case 'auth/second-factor-already-in-use':
      return 'Dette telefonnummeret er allerede registrert for 2FA'
    case 'auth/maximum-second-factor-count-exceeded':
      return 'Maksimalt antall 2FA-faktorer nådd'
    case 'auth/unsupported-first-factor':
      return 'Denne innloggingsmetoden støtter ikke 2FA'
    case 'auth/requires-recent-login':
      return 'REQUIRES_RECENT_LOGIN'
    default:
      return 'En feil oppstod. Prøv igjen'
  }
}
