"use client"

import { useState, useEffect } from 'react'
import { useWallet } from '@/context/walletContext'

interface UserProfile {
  id: number
  name: string
  description: string
  w_address: string
  m_img: string
  b_img: string
  created_at: string
  updated_at: string
}

export function useUserProfile() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const { address, isConnected } = useWallet()

  const fetchUserProfile = async () => {
    if (!address || !isConnected) {
      setUser(null)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/users?address=${address}`)
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        console.error('Failed to fetch user profile')
        setUser(null)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserProfile()
  }, [address, isConnected])

  return {
    user,
    loading,
    refreshProfile: fetchUserProfile
  }
}