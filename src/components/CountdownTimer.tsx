"use client"

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, AlertCircle } from 'lucide-react'

interface CountdownTimerProps {
  endTime: string
  showIcon?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  className?: string
}

export default function CountdownTimer({ 
  endTime, 
  showIcon = true, 
  variant = 'default',
  className = ''
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [isEnded, setIsEnded] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now()
      const end = new Date(endTime).getTime()
      const difference = end - now

      if (difference <= 0) {
        setTimeLeft(0)
        setIsEnded(true)
        return
      }

      setTimeLeft(Math.floor(difference / 1000))
      setIsEnded(false)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [endTime])

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "Auction Ended"
    
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  const getVariant = () => {
    if (isEnded) return 'destructive'
    if (timeLeft < 3600) return 'destructive' // Less than 1 hour
    if (timeLeft < 86400) return 'outline' // Less than 1 day
    return variant
  }

  const getIcon = () => {
    if (isEnded) return <AlertCircle className="h-3 w-3" />
    if (timeLeft < 3600) return <AlertCircle className="h-3 w-3" />
    if (timeLeft < 86400) return <Clock className="h-3 w-3" />
    return <Calendar className="h-3 w-3" />
  }

  return (
    <Badge variant={getVariant()} className={`${className} font-mono text-xs`}>
      {showIcon && getIcon()}
      <span className="ml-1">{formatTime(timeLeft)}</span>
    </Badge>
  )
}

// ✅ Hook version for custom usage
export function useCountdown(endTime: string) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [isEnded, setIsEnded] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now()
      const end = new Date(endTime).getTime()
      const difference = end - now

      if (difference <= 0) {
        setTimeLeft(0)
        setIsEnded(true)
        return
      }

      setTimeLeft(Math.floor(difference / 1000))
      setIsEnded(false)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [endTime])

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "Ended"
    
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  return {
    timeLeft,
    isEnded,
    formatted: formatTime(timeLeft),
    days: Math.floor(timeLeft / 86400),
    hours: Math.floor((timeLeft % 86400) / 3600),
    minutes: Math.floor((timeLeft % 3600) / 60),
    seconds: timeLeft % 60
  }
}