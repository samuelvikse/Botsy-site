// FAQ item
export interface FAQ {
  id: string
  question: string
  answer: string
  source: 'extracted' | 'user' | 'generated'
  confirmed: boolean
}

// Tone configuration for precise control over Botsy's communication style
export interface ToneConfig {
  customInstructions?: string // User's detailed description of how Botsy should communicate
  personality?: string // Specific personality traits (e.g., "entusiastisk", "rolig og tillitsfull")
  avoidPhrases?: string[] // Phrases Botsy should NOT use
  preferredPhrases?: string[] // Phrases Botsy SHOULD use
  exampleResponses?: string[] // Example responses showing ideal tone
}

// Business Profile - generated from website analysis
export interface BusinessProfile {
  websiteUrl: string
  businessName: string
  industry: string
  tone: 'formal' | 'friendly' | 'casual'
  toneReason?: string // Why Botsy recommends this tone
  toneConfig?: ToneConfig // Custom tone configuration
  services: string[]
  products: string[]
  terminology: string[]
  description: string
  targetAudience?: string
  brandPersonality?: string
  faqs: FAQ[]
  lastAnalyzed: Date
}

// Instruction categories for customer service
export type InstructionCategory = 'promotion' | 'availability' | 'policy' | 'general'
export type InstructionPriority = 'high' | 'medium' | 'low'

// Instructions - owner-defined rules for Botsy
export interface Instruction {
  id: string
  content: string
  category: InstructionCategory
  priority: InstructionPriority
  isActive: boolean
  startsAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  createdBy: string
}

// Owner chat message history
export interface OwnerChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  instructionCreated?: string // ID of instruction if one was created
}

// Scraped website content
export interface ScrapedContent {
  url: string
  title: string
  metaDescription: string
  headings: string[]
  mainContent: string
  links: string[]
  footerContent?: string
  faqContent?: string
  rawFaqs?: Array<{ question: string; answer: string }>
}

// API request/response types
export interface AnalyzeWebsiteRequest {
  url: string
  businessName: string
}

export interface AnalyzeWebsiteResponse {
  success: boolean
  profile?: BusinessProfile
  error?: string
}

export interface OwnerChatRequest {
  message: string
  companyId: string
  history: OwnerChatMessage[]
}

export interface OwnerChatResponse {
  reply: string
  instructionCreated?: Instruction
}

// Firestore document types (use unknown for Timestamp compatibility)
export interface InstructionDoc {
  content: string
  category: InstructionCategory
  priority: InstructionPriority
  isActive: boolean
  startsAt: unknown // Firestore Timestamp or null
  expiresAt: unknown // Firestore Timestamp or null
  createdAt: unknown // Firestore Timestamp
  createdBy: string
}

export interface OwnerChatDoc {
  role: 'user' | 'assistant'
  content: string
  timestamp: unknown // Firestore Timestamp
  instructionCreated?: string
}

// ============================================
// SMS Types
// ============================================

export type SMSProvider = 'twilio' | 'messagebird' | 'none'

export interface SMSCredentials {
  accountSid?: string      // Twilio
  authToken?: string       // Twilio
  apiKey?: string          // MessageBird
}

export interface SMSChannel {
  id: string
  provider: SMSProvider
  phoneNumber: string      // E.164 format: +4712345678
  isActive: boolean
  isVerified: boolean
  credentials: SMSCredentials
  createdAt: Date
  updatedAt: Date
}

export interface SMSMessage {
  id: string
  direction: 'inbound' | 'outbound'
  from: string
  to: string
  body: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  providerMessageId?: string
  timestamp: Date
}

export interface SMSChat {
  customerPhone: string
  messages: SMSMessage[]
  lastMessageAt: Date
  createdAt: Date
}

// Firestore document types for SMS
export interface SMSChannelDoc {
  provider: SMSProvider
  phoneNumber: string
  isActive: boolean
  isVerified: boolean
  credentials: SMSCredentials
  createdAt: unknown // Firestore Timestamp
  updatedAt: unknown // Firestore Timestamp
}

export interface SMSMessageDoc {
  direction: 'inbound' | 'outbound'
  from: string
  to: string
  body: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  providerMessageId?: string
  timestamp: unknown // Firestore Timestamp
}
