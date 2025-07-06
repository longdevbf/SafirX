
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import '@rainbow-me/rainbowkit/styles.css';
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Providers } from "@/components/provider/provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Nexelra - Premier NFT Marketplace",
  description: "Discover, create, and trade extraordinary NFTs on the world's premier marketplace",
  generator: 'Thomas',
  icons: {
    icon: "/assets/NFT.jpg",
    shortcut: "/assets/NFT.jpg",
    apple: "/assets/NFT.jpg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}