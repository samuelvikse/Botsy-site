'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, isConfigured } from '@/lib/firebase'

interface UserData {
  email: string
  displayName: string
  role: 'owner' | 'admin' | 'employee'
  companyId: string
  createdAt: Date
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
  signUp: (email: string, password: string, name: string, companyData: {
    name: string
    industry: string
    employeeCount: string
  }) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        } catch (err) {
          console.error('Error fetching user data:', err)
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
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
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
      const errorMessage = getFirebaseErrorMessage(err)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

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
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        clearError,
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
    default:
      return 'En feil oppstod. Prøv igjen'
  }
}
