const { db } = require('./src/lib/db');

console.log("Running Profile Expansion Migration...");

try {
    db.exec(`
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
        ALTER TABLE profiles ADD COLUMN bio TEXT;
        ALTER TABLE profiles ADD COLUMN skills TEXT; -- JSON string
        ALTER TABLE profiles ADD COLUMN experience TEXT; -- JSON string
        ALTER TABLE profiles ADD COLUMN projects TEXT; -- JSON string
        ALTER TABLE profiles ADD COLUMN resume_url TEXT;
        ALTER TABLE profiles ADD COLUMN social_links TEXT; -- JSON string
    `);
    console.log("Migration Successful: Profiles table expanded.");
} catch (err) {
    if (err.message.includes('duplicate column name')) {
        console.log("Migration Skipped: Columns already exist.");
    } else {
        console.error("Migration Failed:", err.message);
    }
}
process.exit(0);
