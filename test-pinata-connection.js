#!/usr/bin/env node

const { config } = require('dotenv');
config();

async function testPinataConnection() {
  console.log('🔍 Testing Pinata IPFS connection...');
  console.log('====================================');
  
  // Check environment variables
  const JWT = process.env.JWT;
  const GATEWAY = process.env.GATEWAY;
  
  if (!JWT) {
    console.error('❌ JWT token not found in .env file');
    process.exit(1);
  }
  
  console.log('✅ JWT token found:', JWT.substring(0, 20) + '...');
  console.log('✅ Gateway:', GATEWAY || 'gateway.pinata.cloud');
  
  try {
    // Test authentication
    console.log('\n🔐 Testing authentication...');
    const authResponse = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      headers: {
        'Authorization': `Bearer ${JWT}`
      }
    });
    
    if (!authResponse.ok) {
      console.error('❌ Authentication failed:', authResponse.status, authResponse.statusText);
      process.exit(1);
    }
    
    const authData = await authResponse.json();
    console.log('✅ Authentication successful!');
    console.log('   Message:', authData.message);
    
    // Test simple upload with text file
    console.log('\n📤 Testing file upload...');
    const testContent = `Test upload at ${new Date().toISOString()}`;
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    const formData = new FormData();
    formData.append('file', testFile, 'test.txt');
    
    const metadata = {
      name: 'test-upload',
      keyvalues: {
        type: 'test',
        uploadedAt: new Date().toISOString()
      }
    };
    formData.append('pinataMetadata', JSON.stringify(metadata));
    
    const uploadResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT}`,
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('❌ Upload failed:', uploadResponse.status, errorData);
      process.exit(1);
    }
    
    const uploadData = await uploadResponse.json();
    console.log('✅ Upload successful!');
    console.log('   IPFS Hash:', uploadData.IpfsHash);
    
    const gateway = GATEWAY || 'gateway.pinata.cloud';
    const fileUrl = `https://${gateway}/ipfs/${uploadData.IpfsHash}`;
    console.log('   File URL:', fileUrl);
    
    // Test access to uploaded file
    console.log('\n🌐 Testing file access...');
    const accessResponse = await fetch(fileUrl);
    
    if (!accessResponse.ok) {
      console.error('❌ File access failed:', accessResponse.status, accessResponse.statusText);
    } else {
      const content = await accessResponse.text();
      console.log('✅ File access successful!');
      console.log('   Content:', content.substring(0, 50) + '...');
    }
    
    console.log('\n🎉 All tests passed!');
    console.log('✅ Pinata IPFS is ready for image uploads');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPinataConnection();