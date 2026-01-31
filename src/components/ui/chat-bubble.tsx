'use client'

import { motion } from 'framer-motion'
import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatBubbleProps {
  role: 'botsy' | 'user'
  children?: React.ReactNode
  timestamp?: string
  isTyping?: boolean
  className?: string
  animate?: boolean
}

export function ChatBubble({
  role,
  children,
  timestamp,
  isTyping = false,
  className,
  animate = true,
}: ChatBubbleProps) {
  const isBotsy = role === 'botsy'

  const containerVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }
    },
  }

  return (
    <motion.div
      initial={animate ? 'hidden' : 'visible'}
      animate="visible"
      variants={containerVariants}
      className={cn(
        'flex gap-3 group',
        isBotsy ? 'flex-row' : 'flex-row-reverse',
        className
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center',
            isBotsy
              ? 'bg-botsy-lime/15 border border-botsy-lime/25'
              : 'bg-white/10 border border-white/10'
          )}
        >
          {isBotsy ? (
            <Bot className="h-4 w-4 text-botsy-lime" />
          ) : (
            <User className="h-4 w-4 text-white/70" />
          )}
        </div>
      </div>

      {/* Message Bubble */}
      <div className={cn('flex flex-col max-w-[85%]', isBotsy ? 'items-start' : 'items-end')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl',
            isBotsy
              ? 'bg-white/[0.06] border border-white/[0.08] rounded-bl-sm'
              : 'bg-botsy-lime text-botsy-dark rounded-br-sm'
          )}
        >
          {isTyping ? (
            <TypingIndicator />
          ) : (
            <p className={cn(
              'text-sm whitespace-pre-wrap leading-relaxed',
              isBotsy ? 'text-white/90' : 'text-botsy-dark font-medium'
            )}>
              {children}
            </p>
          )}
        </div>

        {timestamp && (
          <span className="text-[11px] mt-1.5 px-1 text-[#6B7A94]">
            {timestamp}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#6B7A94]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  )
}

// Botsy avatar component
export function BotsyAvatar({
  size = 'md',
  animated = false,
  showGlow = false,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  showGlow?: boolean
}) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center',
        'bg-botsy-lime/15 border border-botsy-lime/30',
        sizes[size]
      )}
    >
      <Bot className={cn(iconSizes[size], 'text-botsy-lime')} />
    </div>
  )
}

// Message container with staggered children animation
export function ChatContainer({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className={cn('space-y-4', className)}
    >
      {children}
    </motion.div>
  )
}
