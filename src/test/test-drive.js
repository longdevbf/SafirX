const { google } = require('googleapis')

async function testDrive() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: 'longda5k48gtb-gmail-com@oasis-market-464706.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCXgUZwwoep6hJw\nJBntjn0F+fXZBgXcl+O40P9HfebdtWq6BwSbSx8Cqv95tf0V9inL/hbPDo+gbiNc\nGJ1FScmNB/dOzJjZCC1u9hS2gO7W6epFhi4xabu1sC6I6vb/+rwyL97Ayk3QXKXs\ndt0zMtyyX5kSCPhxaHPldODXGwabXE/yTDwPpRTJmuVuBs+VCmhiOwnQyltjW5Pb\noLSeYa6tiEx11eKijURztgmSIrOkd4ZNlsdl/Zja0Gj/GGZOElVFUpGv15AqTh9/\nljJdqdTnavQWhpM+o8L4Hij3oKS7NJPAFnd4CHt+Us4k7yGVikB5tu9GzT0Bdk+j\nsM1hCcjtAgMBAAECggEAONM3HXIJOlTeJ4uS4gQwpn4zlPvqVOvvcNGK/kCdyAiU\niEO7mZeagQCsI/V7gLI8yRN7cJwQiObmglOFIYjkfO5A9yBMMBMeH2FTMYS4kIlZ\n4kvKpaP30NTND3O5wxdDYTuNPBhlCULGxSNsIhjwqEKtAhO1Q6we1DB7aJLtbnWk\nMq06z+yc0qDADgTohGlN8lDnyHirxkdUh5pwx+o3TM5OuCcDKaD7/tauhINgv1bC\nHRjRYLxJj+yZ3MViNAfCNOFrMFqCA3zMwnYr2wm4esivnoE3ozAjDNtry6g0c2em\n7fYZFTMAfDBFAdz7YfpZwlB1gh3gyLx2UECgj/zdLQKBgQDTyh0PuAlmC1gpnYbq\nYbStkioe8AM5alKucD+/PExlJ7UJOFwkbf1ADyL8+9xlU2Z4G3R+nKPwbJWz8c80\nnX4jAynJTIl/j0Hc2bD4zEYfklEZ2DXZJv/oC4y6zXzrJA1MZo62dWwC56oYR6kL\n0f23ROpkt8yqk6hjQyP06vDC2wKBgQC3IZkK25uswGPC8L5QhOSfv9IojI+kNQ19\nsPVp9brwUmmnVwkgkGWCRn16GA0omR6e8vsW5SPFHCvhD1XDxTM5WBX5LrRHotxZ\n0VMlqd4653ce+joK5QRtQku1Y44RGPg+PbPL7pVJzevR2MuuJmLEFUrvHZAd4jne\nnLHfBshZ1wKBgQCYmKPf04ZSFBJtyaaP8d4wwYO/zsdD8yunrBECRPv2VmnGPumF\nBgrWwRFAnmfqSfEm0QFayJoGfPZQNQZKrr9Xksvk0lSvqBSYf/FXEjfkP5RXvsTt\ntX/lPY0kezJqagt65Nom9OviG/EelWNjtOXNysXn09aPgNxuyM17hlv6yQKBgQCV\nrA0EFcafI0Kl4dL5xhOBCOq/n1oK0B1tnAKIDoExx3l4ficEiV+dYPVOo3eltbeU\nG2ziInbgs4ydTcY/0d1ywa570RMg9Vd4xR9aygHKTMFL/SERJGpAzg1Ie8xx5uGF\nJTLcuusivf09rh2SAOd58RkkYxoVgn7flVu+tzFqUwKBgH4K1Yh1mkGyRvy8YLKD\nVqtpvOyFrwN8BGvEjycSic/g323SBVFDabUjhqlRhm+KGE5N7uh9wvau402AiDZz\n0+Lv1VmC/77Q55VHwgovUumSqx4zF51eVPIpX1lgkt8zu8hKG3WnrSL8n8oG0GuV\nV0sZJvty6GI/v5pfEXv4JC5/\n-----END PRIVATE KEY-----\n',
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  const drive = google.drive({ version: 'v3', auth })
  
  // First, let's create a new folder for the app
  try {
    console.log('Creating new folder for oasis-market...')
    const folder = await drive.files.create({
      requestBody: {
        name: 'oasis-market-uploads',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [] // Create in root directory
      },
    })

    console.log('Folder created successfully!')
    console.log('Folder ID:', folder.data.id)
    console.log('Folder Name:', folder.data.name)
    
    // Make folder publicly accessible (optional)
    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })

    console.log('Folder permissions set to public')
    console.log('Use this Folder ID in your .env file:', folder.data.id)

    // Test access to the newly created folder
    const folderCheck = await drive.files.get({
      fileId: folder.data.id,
      fields: 'id, name, parents'
    })
    console.log('Folder verification:', folderCheck.data)

  } catch (error) {
    console.error('Error:', error)
  }
}

testDrive()