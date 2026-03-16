const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Verifying admin users...');
db.all("SELECT id, full_name, email, is_admin FROM users", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.table(rows);
    }
    db.close();
});
