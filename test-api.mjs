// Test API endpoints
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3000';

async function testAPI() {
  console.log('=== Testing ClipNote API ===\n');

  try {
    // Test 1: Create a project
    console.log('1. Testing POST /api/projects...');
    const createResponse = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl: 'https://youtu.be/h2-NqwdfvQc?si=OkkwYRIN9XJ91bot',
        title: 'Test Project from API',
      }),
    });

    const createData = await createResponse.json();
    console.log('   Status:', createResponse.status);
    console.log('   Response:', JSON.stringify(createData, null, 2));

    if (createResponse.ok) {
      console.log('   ✅ Project created successfully!');
    } else {
      console.log('   ❌ Failed to create project');
      console.log('   Error:', createData.error);
    }

    // Test 2: List projects
    console.log('\n2. Testing GET /api/projects...');
    const listResponse = await fetch(`${API_BASE}/api/projects`);
    const listData = await listResponse.json();
    console.log('   Status:', listResponse.status);
    console.log('   Projects found:', listData.data?.length || 0);
    
    if (listData.data?.length > 0) {
      console.log('   ✅ Projects listed successfully!');
      listData.data.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.title} (${p.platform})`);
      });
    }

    // Test 3: Check JSON-DB files
    console.log('\n3. Checking .dev-db files...');
    const dbPath = path.join(process.cwd(), '.dev-db');
    
    if (fs.existsSync(dbPath)) {
      const users = JSON.parse(fs.readFileSync(path.join(dbPath, 'users.json'), 'utf-8'));
      const projects = JSON.parse(fs.readFileSync(path.join(dbPath, 'projects.json'), 'utf-8'));
      
      console.log(`   Users: ${users.length}`);
      console.log(`   Projects: ${projects.length}`);
      
      if (users.length > 0) {
        console.log(`   Dev user points: ${users[0].points}`);
      }
    } else {
      console.log('   ⚠️  .dev-db folder not found');
    }

    console.log('\n=== Test completed ===');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Wait a bit for server to be ready
setTimeout(testAPI, 2000);
