import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { EmployeePerformance, EmployeePerformanceDoc, LeaderboardEntry } from '@/types'

// Get current month in YYYY-MM format
export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Convert Firestore doc to EmployeePerformance
function toEmployeePerformance(id: string, data: EmployeePerformanceDoc): EmployeePerformance {
  return {
    id,
    userId: data.userId,
    companyId: data.companyId,
    month: data.month,
    answeredCustomers: data.answeredCustomers,
    positiveFeedback: data.positiveFeedback,
    totalScore: data.totalScore,
    lastUpdated: (data.lastUpdated as Timestamp).toDate(),
  }
}

// Get performance for a specific user in current month
export async function getEmployeePerformance(
  userId: string,
  companyId: string,
  month?: string
): Promise<EmployeePerformance | null> {
  if (!db) return null

  const targetMonth = month || getCurrentMonth()
  const docId = `${companyId}_${userId}_${targetMonth}`

  try {
    const docRef = doc(db, 'employeePerformance', docId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return toEmployeePerformance(docSnap.id, docSnap.data() as EmployeePerformanceDoc)
    }

    return null
  } catch (error) {
    console.error('Error getting employee performance:', error)
    return null
  }
}

// Increment answered customers count
export async function incrementAnsweredCustomers(
  userId: string,
  companyId: string
): Promise<void> {
  if (!db) return

  const month = getCurrentMonth()
  const docId = `${companyId}_${userId}_${month}`

  try {
    const docRef = doc(db, 'employeePerformance', docId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as EmployeePerformanceDoc
      await setDoc(docRef, {
        ...data,
        answeredCustomers: data.answeredCustomers + 1,
        totalScore: data.answeredCustomers + 1 + data.positiveFeedback * 5, // 1 point per answer, 5 points per positive feedback
        lastUpdated: Timestamp.now(),
      })
    } else {
      await setDoc(docRef, {
        userId,
        companyId,
        month,
        answeredCustomers: 1,
        positiveFeedback: 0,
        totalScore: 1,
        lastUpdated: Timestamp.now(),
      })
    }
  } catch (error) {
    console.error('Error incrementing answered customers:', error)
  }
}

// Increment positive feedback count
export async function incrementPositiveFeedback(
  userId: string,
  companyId: string
): Promise<void> {
  if (!db) return

  const month = getCurrentMonth()
  const docId = `${companyId}_${userId}_${month}`

  try {
    const docRef = doc(db, 'employeePerformance', docId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as EmployeePerformanceDoc
      await setDoc(docRef, {
        ...data,
        positiveFeedback: data.positiveFeedback + 1,
        totalScore: data.answeredCustomers + (data.positiveFeedback + 1) * 5,
        lastUpdated: Timestamp.now(),
      })
    } else {
      await setDoc(docRef, {
        userId,
        companyId,
        month,
        answeredCustomers: 0,
        positiveFeedback: 1,
        totalScore: 5,
        lastUpdated: Timestamp.now(),
      })
    }
  } catch (error) {
    console.error('Error incrementing positive feedback:', error)
  }
}

// Get top performers for a company in current month
export async function getLeaderboard(
  companyId: string,
  topCount: number = 3,
  month?: string
): Promise<LeaderboardEntry[]> {
  if (!db) return []

  const targetMonth = month || getCurrentMonth()

  try {
    const performanceRef = collection(db, 'employeePerformance')
    const q = query(
      performanceRef,
      where('companyId', '==', companyId),
      where('month', '==', targetMonth),
      orderBy('totalScore', 'desc'),
      limit(topCount)
    )

    const snapshot = await getDocs(q)
    const performances: EmployeePerformance[] = []

    snapshot.forEach((doc) => {
      performances.push(toEmployeePerformance(doc.id, doc.data() as EmployeePerformanceDoc))
    })

    // Get user details for each performer
    const leaderboard: LeaderboardEntry[] = []
    let rank = 1

    for (const perf of performances) {
      // Fetch user data
      const userRef = doc(db, 'users', perf.userId)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const userData = userSnap.data()
        leaderboard.push({
          userId: perf.userId,
          displayName: userData.displayName || userData.email || 'Ukjent',
          avatarUrl: userData.avatarUrl,
          answeredCustomers: perf.answeredCustomers,
          positiveFeedback: perf.positiveFeedback,
          totalScore: perf.totalScore,
          rank: rank++,
        })
      }
    }

    return leaderboard
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    return []
  }
}

// Get all performances for a company in current month
export async function getAllPerformances(
  companyId: string,
  month?: string
): Promise<EmployeePerformance[]> {
  if (!db) return []

  const targetMonth = month || getCurrentMonth()

  try {
    const performanceRef = collection(db, 'employeePerformance')
    const q = query(
      performanceRef,
      where('companyId', '==', companyId),
      where('month', '==', targetMonth),
      orderBy('totalScore', 'desc')
    )

    const snapshot = await getDocs(q)
    const performances: EmployeePerformance[] = []

    snapshot.forEach((doc) => {
      performances.push(toEmployeePerformance(doc.id, doc.data() as EmployeePerformanceDoc))
    })

    return performances
  } catch (error) {
    console.error('Error getting all performances:', error)
    return []
  }
}
