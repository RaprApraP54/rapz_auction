const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin123', 10);
console.log('='.repeat(70));
console.log('PASSWORD HASH FOR admin123:');
console.log(hash);
console.log('='.repeat(70));
console.log('LENGTH:', hash.length);
