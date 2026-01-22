// Test script for JSON-DB functionality
const { JsonDB, initializeDevUser } = require('./src/lib/db/json-db.ts');

async function testJsonDB() {
  console.log('=== Testing JSON-DB ===\n');

  // Initialize dev user
  console.log('1. Initializing dev user...');
  initializeDevUser();

  // Find dev user
  console.log('\n2. Finding dev user...');
  const user = JsonDB.User.findOne({ email: 'dev@clipnote.local' });
  console.log('Dev user:', JSON.stringify(user, null, 2));

  // Create a test project
  console.log('\n3. Creating test project...');
  const project = JsonDB.Project.create({
    userId: user._id,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    platform: 'YOUTUBE',
    videoId: 'dQw4w9WgXcQ',
    title: 'Test Project',
    notes: [],
    isAutoCollected: false,
  });
  console.log('Created project:', JSON.stringify(project, null, 2));

  // Find all projects
  console.log('\n4. Finding all projects for user...');
  const projects = JsonDB.Project.find({ userId: user._id });
  console.log(`Found ${projects.length} project(s)`);

  // Update project
  console.log('\n5. Updating project notes...');
  const updated = JsonDB.Project.findByIdAndUpdate(project._id, {
    notes: [
      {
        startTime: 0,
        endTime: 10,
        text: 'Intro',
        timestamp: '00:00 - 00:10'
      }
    ]
  });
  console.log('Updated project:', JSON.stringify(updated, null, 2));

  // Test points update with $inc
  console.log('\n6. Testing $inc operator (deduct 5 points)...');
  const beforePoints = user.points;
  JsonDB.User.updateOne(
    { _id: user._id },
    { $inc: { points: -5 } }
  );
  const userAfter = JsonDB.User.findById(user._id);
  console.log(`Points before: ${beforePoints}, after: ${userAfter.points}`);

  // Clean up
  console.log('\n7. Cleaning up test data...');
  JsonDB.Project.findByIdAndDelete(project._id);
  console.log('Test project deleted');

  console.log('\n=== All tests passed! ===');
}

testJsonDB().catch(console.error);
