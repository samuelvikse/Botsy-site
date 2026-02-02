import ExcelJS from 'exceljs'
import { Timestamp } from 'firebase/firestore'

// Botsy brand colors
const BOTSY_LIME = 'CCFF00'
const BOTSY_DARK = '0A0F1C'
const BOTSY_GRAY = '6B7A94'

interface ContactData {
  identifier: string
  channel: 'sms' | 'widget' | 'email' | 'messenger'
  firstContact: Date
  lastContact: Date
  conversationCount: number
  messageCount: number
}

interface AnalyticsData {
  period: string
  totalConversations: number
  totalMessages: number
  smsCount: number
  widgetCount: number
  emailCount: number
  messengerCount: number
  avgMessagesPerConversation: number
}

interface DailyStats {
  date: string
  conversations: number
  messages: number
}

export async function generateContactListExcel(contacts: ContactData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Botsy'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Kontaktliste', {
    properties: { tabColor: { argb: BOTSY_LIME } },
  })

  // Define columns
  sheet.columns = [
    { header: 'Kontakt', key: 'identifier', width: 25 },
    { header: 'Kanal', key: 'channel', width: 15 },
    { header: 'Første kontakt', key: 'firstContact', width: 18 },
    { header: 'Siste kontakt', key: 'lastContact', width: 18 },
    { header: 'Antall samtaler', key: 'conversationCount', width: 15 },
    { header: 'Antall meldinger', key: 'messageCount', width: 16 },
  ]

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: BOTSY_DARK } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: BOTSY_LIME },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 24

  // Channel display names
  const channelNames: Record<string, string> = {
    sms: 'SMS',
    widget: 'Widget',
    email: 'E-post',
    messenger: 'Messenger',
  }

  // Add data rows
  contacts.forEach((contact) => {
    const row = sheet.addRow({
      identifier: contact.identifier,
      channel: channelNames[contact.channel] || contact.channel,
      firstContact: formatDate(contact.firstContact),
      lastContact: formatDate(contact.lastContact),
      conversationCount: contact.conversationCount,
      messageCount: contact.messageCount,
    })
    row.alignment = { vertical: 'middle' }
  })

  // Add borders to all cells
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }
    })
  })

  // Add summary at the bottom
  sheet.addRow([])
  const summaryRow = sheet.addRow(['Totalt', '', '', '',
    contacts.reduce((sum, c) => sum + c.conversationCount, 0),
    contacts.reduce((sum, c) => sum + c.messageCount, 0),
  ])
  summaryRow.font = { bold: true }
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F5F5F5' },
  }

  // Add metadata
  sheet.addRow([])
  sheet.addRow([`Eksportert fra Botsy: ${formatDate(new Date())}`])

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateAnalyticsExcel(
  analytics: AnalyticsData,
  dailyStats: DailyStats[],
  channelBreakdown: { channel: string; count: number; percentage: number }[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Botsy'
  workbook.created = new Date()

  // === Summary Sheet ===
  const summarySheet = workbook.addWorksheet('Oversikt', {
    properties: { tabColor: { argb: BOTSY_LIME } },
  })

  summarySheet.columns = [
    { header: 'Metrikk', key: 'metric', width: 30 },
    { header: 'Verdi', key: 'value', width: 20 },
  ]

  // Style header
  const summaryHeader = summarySheet.getRow(1)
  summaryHeader.font = { bold: true, color: { argb: BOTSY_DARK } }
  summaryHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: BOTSY_LIME },
  }
  summaryHeader.alignment = { vertical: 'middle', horizontal: 'center' }
  summaryHeader.height = 24

  // Add summary data
  const summaryData = [
    { metric: 'Periode', value: analytics.period },
    { metric: 'Totale samtaler', value: analytics.totalConversations },
    { metric: 'Totale meldinger', value: analytics.totalMessages },
    { metric: 'Gjennomsnittlig meldinger per samtale', value: analytics.avgMessagesPerConversation.toFixed(1) },
    { metric: '', value: '' },
    { metric: 'SMS-samtaler', value: analytics.smsCount },
    { metric: 'Widget-samtaler', value: analytics.widgetCount },
    { metric: 'E-post-samtaler', value: analytics.emailCount },
    { metric: 'Messenger-samtaler', value: analytics.messengerCount },
  ]

  summaryData.forEach((row) => {
    const dataRow = summarySheet.addRow(row)
    dataRow.alignment = { vertical: 'middle' }
  })

  // === Daily Stats Sheet ===
  const dailySheet = workbook.addWorksheet('Daglig aktivitet', {
    properties: { tabColor: { argb: '3B82F6' } },
  })

  dailySheet.columns = [
    { header: 'Dato', key: 'date', width: 15 },
    { header: 'Samtaler', key: 'conversations', width: 15 },
    { header: 'Meldinger', key: 'messages', width: 15 },
  ]

  // Style header
  const dailyHeader = dailySheet.getRow(1)
  dailyHeader.font = { bold: true, color: { argb: 'FFFFFF' } }
  dailyHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '3B82F6' },
  }
  dailyHeader.alignment = { vertical: 'middle', horizontal: 'center' }
  dailyHeader.height = 24

  // Add daily data
  dailyStats.forEach((day) => {
    const row = dailySheet.addRow(day)
    row.alignment = { vertical: 'middle' }
  })

  // Add borders
  dailySheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }
    })
  })

  // === Channel Breakdown Sheet ===
  const channelSheet = workbook.addWorksheet('Kanaler', {
    properties: { tabColor: { argb: '25D366' } },
  })

  channelSheet.columns = [
    { header: 'Kanal', key: 'channel', width: 20 },
    { header: 'Antall samtaler', key: 'count', width: 18 },
    { header: 'Andel (%)', key: 'percentage', width: 15 },
  ]

  // Style header
  const channelHeader = channelSheet.getRow(1)
  channelHeader.font = { bold: true, color: { argb: 'FFFFFF' } }
  channelHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '25D366' },
  }
  channelHeader.alignment = { vertical: 'middle', horizontal: 'center' }
  channelHeader.height = 24

  // Add channel data
  channelBreakdown.forEach((ch) => {
    const row = channelSheet.addRow({
      channel: ch.channel,
      count: ch.count,
      percentage: `${ch.percentage}%`,
    })
    row.alignment = { vertical: 'middle' }
  })

  // Add borders
  channelSheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }
    })
  })

  // Add metadata to summary sheet
  summarySheet.addRow([])
  summarySheet.addRow([`Eksportert fra Botsy: ${formatDate(new Date())}`])

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Helper to convert Firestore Timestamp to Date
export function timestampToDate(timestamp: unknown): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  if (timestamp instanceof Date) {
    return timestamp
  }
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp)
  }
  return new Date()
}
