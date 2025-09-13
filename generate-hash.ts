// generate-hash.ts
import * as bcrypt from 'bcrypt';

async function generateHash() {
  const hashed = await bcrypt.hash('1234', 10); // 1234 - sizning superAdmin parolingiz
  console.log(hashed);
}

generateHash();
