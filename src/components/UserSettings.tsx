// src/components/UserSettings.tsx
"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Upload, Save, X } from "lucide-react"
import Image from "next/image"
// Thêm interface ở đầu file
interface User {
  name: string
  description: string
  w_address: string
  m_img?: string
  b_img?: string
}

// Thay đổi interface
interface UserSettingsProps {
  user: User
  onSave: (updatedUser: User) => void
  onCancel: () => void
}

export default function UserSettings({ user, onSave, onCancel }: UserSettingsProps) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    description: user.description || '',
  })
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>(user.m_img || '')
  const [bannerImagePreview, setBannerImagePreview] = useState<string>(user.b_img || '')
  const [loading, setLoading] = useState(false)

  const profileImageRef = useRef<HTMLInputElement>(null)
  const bannerImageRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBannerImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setBannerImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Display name is required.",
        variant: "destructive",
      })
      return
    }

    if (!user?.w_address) {
      toast({
        title: "Error",
        description: "No wallet address found. Please reconnect your wallet.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('address', user.w_address)
      formDataToSend.append('name', formData.name.trim())
      formDataToSend.append('description', formData.description.trim())
      
      if (profileImageFile) {
        // Validate file size (2MB max)
        if (profileImageFile.size > 2 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Profile image must be smaller than 2MB.",
            variant: "destructive",
          })
          return
        }
        formDataToSend.append('profileImage', profileImageFile)
      }
      
      if (bannerImageFile) {
        // Validate file size (5MB max)
        if (bannerImageFile.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Banner image must be smaller than 5MB.",
            variant: "destructive",
          })
          return
        }
        formDataToSend.append('bannerImage', bannerImageFile)
      }

      console.log('Sending request to /api/users with data:', {
        address: user.w_address,
        name: formData.name,
        description: formData.description,
        hasProfileImage: !!profileImageFile,
        hasBannerImage: !!bannerImageFile
      })

      const response = await fetch('/api/users', {
        method: 'POST',
        body: formDataToSend,
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        let errorMessage = 'Failed to update profile'
        try {
          const errorData = await response.json()
          console.error('Error response data:', errorData)
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          console.error('Could not parse error response:', parseError)
          // Try to read as text
          try {
            const errorText = await response.text()
            console.error('Error response text:', errorText)
            errorMessage = errorText || errorMessage
          } catch (textError) {
            console.error('Could not read error response as text:', textError)
          }
        }
        throw new Error(`${response.status}: ${errorMessage}`)
      }

      const updatedUser = await response.json()
      console.log('Updated user data:', updatedUser)
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      })

      onSave(updatedUser)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Image */}
      <Card>
        <CardHeader>
          <CardTitle>Banner Image</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div 
              className="relative h-32 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg cursor-pointer overflow-hidden"
              onClick={() => bannerImageRef.current?.click()}
            >
              {bannerImagePreview && (
                <Image
                  src={bannerImagePreview}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors">
                <Upload className="w-8 h-8 text-white" />
              </div>
            </div>
            <input
              ref={bannerImageRef}
              type="file"
              accept="image/*"
              onChange={handleBannerImageChange}
              className="hidden"
            />
            <p className="text-sm text-muted-foreground">
              Click to upload a new banner image. Recommended size: 1200x300px
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Image */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div 
                className="relative cursor-pointer"
                onClick={() => profileImageRef.current?.click()}
              >
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profileImagePreview} />
                  <AvatarFallback className="text-2xl">
                    {formData.name.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60 transition-colors">
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={() => profileImageRef.current?.click()}
                >
                  Change Picture
                </Button>
                <p className="text-sm text-muted-foreground mt-1">
                  JPG, PNG or GIF. Max size 2MB
                </p>
              </div>
            </div>
            <input
              ref={profileImageRef}
              type="file"
              accept="image/*"
              onChange={handleProfileImageChange}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your display name"
            />
          </div>
          <div>
            <Label htmlFor="description">Bio</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={loading} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  )
}