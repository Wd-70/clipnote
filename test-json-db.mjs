// Test script for JSON-DB functionality
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '.dev-db');
const USERS_FILE = path.join(DB_PATH, 'users.json');
const PROJECTS_FILE = path.join(DB_PATH, 'projects.json');

console.log('=== Testing JSON-DB Files ===\n');

// Check if files exist
console.log('1. Checking DB files...');
console.log(`   DB Path: ${DB_PATH}`);
console.log(`   Users file exists: ${fs.existsSync(USERS_FILE)}`);
console.log(`   Projects file exists: ${fs.existsSync(PROJECTS_FILE)}`);

if (fs.existsSync(USERS_FILE)) {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  console.log(`\n2. Users in database: ${users.length}`);
  users.forEach(user => {
    console.log(`   - ${user.email} (${user.points} points, role: ${user.role})`);
  });
}

if (fs.existsSync(PROJECTS_FILE)) {
  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  console.log(`\n3. Projects in database: ${projects.length}`);
  projects.forEach(project => {
    console.log(`   - ${project.title} (${project.platform}: ${project.videoId})`);
  });
}

console.log('\n=== Test completed ===');
