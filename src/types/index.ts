// FAQ item
export interface FAQ {
  id: string
  question: string
  answer: string
  source: 'extracted' | 'user' | 'generated'
  confirmed: boolean
}

// Tone configuration for precise control over Botsy's communication style
export type HumorLevel = 'none' | 'subtle' | 'moderate' | 'playful'

export interface ToneConfig {
  customInstructions?: string // User's detailed description of how Botsy should communicate
  personality?: string // Specific personality traits (e.g., "entusiastisk", "rolig og tillitsfull")
  avoidPhrases?: string[] // Phrases Botsy should NOT use
  preferredPhrases?: string[] // Phrases Botsy SHOULD use
  exampleResponses?: string[] // Example responses showing ideal tone
  tone?: 'formal' | 'friendly' | 'casual' // Base tone setting
  greeting?: string // Welcome message for chat widget
  useEmojis?: boolean // Whether Botsy should use emojis
  humorLevel?: HumorLevel // How much humor Botsy should use
}

// Contact information extracted from website
export interface ContactInfo {
  email: string | null
  phone: string | null
  address: string | null
  openingHours: string | null
}

// Staff member information
export interface StaffMember {
  name: string
  role: string
  specialty?: string
}

// Business Profile - generated from website analysis
export interface BusinessProfile {
  websiteUrl: string
  businessName: string
  industry: string
  contactInfo?: ContactInfo // Email, phone, address, opening hours
  pricing?: Array<{ item: string; price: string }> // Pricing information from website
  staff?: StaffMember[] // Team/employees
  tone: 'formal' | 'friendly' | 'casual'
  toneReason?: string // Why Botsy recommends this tone
  toneConfig?: ToneConfig // Custom tone configuration
  language?: string // Detected website language (ISO code, e.g., 'no', 'en', 'sv')
  languageName?: string // Human-readable language name (e.g., 'Norsk', 'English')
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
// Channel Types (All messaging channels)
// ============================================

export type ChannelType = 'sms' | 'whatsapp' | 'messenger' | 'email'

// SMS Types
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

// WhatsApp Types
export type WhatsAppProvider = 'meta' | 'twilio' | 'none'

export interface WhatsAppCredentials {
  accessToken?: string     // Meta Graph API
  phoneNumberId?: string   // Meta
  businessAccountId?: string // Meta
  accountSid?: string      // Twilio
  authToken?: string       // Twilio
}

export interface WhatsAppChannel {
  id: string
  provider: WhatsAppProvider
  phoneNumber: string      // E.164 format
  isActive: boolean
  isVerified: boolean
  credentials: WhatsAppCredentials
  createdAt: Date
  updatedAt: Date
}

// Messenger Types
export interface MessengerCredentials {
  pageAccessToken?: string
  pageId?: string
  appSecret?: string
}

export interface MessengerChannel {
  id: string
  pageName: string
  pageId: string
  isActive: boolean
  isVerified: boolean
  credentials: MessengerCredentials
  createdAt: Date
  updatedAt: Date
}

// Email Types
export type EmailProvider = 'sendgrid' | 'mailgun' | 'smtp' | 'none'

export interface EmailCredentials {
  apiKey?: string          // SendGrid/Mailgun
  domain?: string          // Mailgun
  smtpHost?: string        // SMTP
  smtpPort?: number        // SMTP
  smtpUser?: string        // SMTP
  smtpPass?: string        // SMTP
}

export interface EmailChannel {
  id: string
  provider: EmailProvider
  emailAddress: string
  isActive: boolean
  isVerified: boolean
  credentials: EmailCredentials
  createdAt: Date
  updatedAt: Date
}

// Unified Channel Config (for Firestore)
export interface ChannelConfig {
  sms?: {
    provider: SMSProvider
    phoneNumber: string
    isActive: boolean
    isVerified: boolean
    credentials: SMSCredentials
  }
  whatsapp?: {
    provider: WhatsAppProvider
    phoneNumber: string
    isActive: boolean
    isVerified: boolean
    credentials: WhatsAppCredentials
  }
  messenger?: {
    pageName: string
    pageId: string
    isActive: boolean
    isVerified: boolean
    credentials: MessengerCredentials
  }
  email?: {
    provider: EmailProvider
    emailAddress: string
    isActive: boolean
    isVerified: boolean
    credentials: EmailCredentials
  }
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

// ============================================
// Knowledge Document Types
// ============================================

export interface KnowledgeDocument {
  id: string
  fileName: string
  fileUrl: string
  fileType: 'pdf' | 'txt' | 'docx' | 'md'
  fileSize: number
  extractedContent: string
  analyzedData: {
    faqs: Array<{ question: string; answer: string }>
    rules: string[]
    policies: string[]
    importantInfo: string[]
    summary: string
  }
  status: 'processing' | 'ready' | 'error'
  errorMessage?: string
  uploadedAt: Date
  processedAt?: Date
  uploadedBy: string
}

export interface KnowledgeDocumentDoc {
  fileName: string
  fileUrl: string
  fileType: 'pdf' | 'txt' | 'docx' | 'md'
  fileSize: number
  extractedContent: string
  analyzedData: {
    faqs: Array<{ question: string; answer: string }>
    rules: string[]
    policies: string[]
    importantInfo: string[]
    summary: string
  }
  status: 'processing' | 'ready' | 'error'
  errorMessage?: string
  uploadedAt: unknown // Firestore Timestamp
  processedAt?: unknown // Firestore Timestamp
  uploadedBy: string
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

// ============================================
// Role & Permission Types
// ============================================

export type UserRole = 'owner' | 'admin' | 'employee'

export interface EmployeePermissions {
  knowledgebase: boolean
  documents: boolean
  instructions: boolean
  analytics: boolean
}

export interface AdminPermissions {
  channels: boolean
}

export type MembershipPermissions = EmployeePermissions | AdminPermissions | Record<string, never>

export interface Membership {
  id: string
  userId: string
  companyId: string
  role: UserRole
  permissions: MembershipPermissions
  invitedBy: string
  joinedAt: Date
  status: 'active' | 'suspended'
}

export interface MembershipDoc {
  userId: string
  companyId: string
  role: UserRole
  permissions: MembershipPermissions
  invitedBy: string
  joinedAt: unknown // Firestore Timestamp
  status: 'active' | 'suspended'
}

export interface Invitation {
  id: string
  companyId: string
  email: string
  role: 'admin' | 'employee'
  permissions: EmployeePermissions | AdminPermissions
  invitedBy: string
  inviterName: string
  companyName: string
  createdAt: Date
  expiresAt: Date
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  token: string
}

export interface InvitationDoc {
  companyId: string
  email: string
  role: 'admin' | 'employee'
  permissions: EmployeePermissions | AdminPermissions
  invitedBy: string
  inviterName: string
  companyName: string
  createdAt: unknown // Firestore Timestamp
  expiresAt: unknown // Firestore Timestamp
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  token: string
}

export interface OwnershipTransfer {
  id: string
  companyId: string
  fromUserId: string
  toUserId: string
  createdAt: Date
  expiresAt: Date
  fromUserConfirmed: boolean
  toUserConfirmed: boolean
  fromUserToken: string
  toUserToken: string
  status: 'pending' | 'completed' | 'expired' | 'cancelled'
}

export interface OwnershipTransferDoc {
  companyId: string
  fromUserId: string
  toUserId: string
  createdAt: unknown // Firestore Timestamp
  expiresAt: unknown // Firestore Timestamp
  fromUserConfirmed: boolean
  toUserConfirmed: boolean
  fromUserToken: string
  toUserToken: string
  status: 'pending' | 'completed' | 'expired' | 'cancelled'
}

// Panel names for access control
export type PanelName =
  | 'dashboard'
  | 'conversations'
  | 'knowledge'
  | 'documents'
  | 'instructions'
  | 'widget'
  | 'tone'
  | 'channels'
  | 'analytics'
  | 'security'
  | 'settings'
  | 'employees'

// Team member with user details for display
export interface TeamMember {
  membership: Membership
  user: {
    email: string
    displayName: string
    avatarUrl?: string
  }
}
