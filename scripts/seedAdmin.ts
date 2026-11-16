import { connectDB, disconnectDB } from '../src/config/db';
import { User } from '../src/models/user.model';
import { hashPassword } from '../src/utils/password';

const EMAIL = process.env.SEED_EMAIL ?? 'ragina.dev@gmail.com';
const FULL_NAME = process.env.SEED_FULLNAME ?? 'Ragina Dev';
const PASSWORD = process.env.SEED_PASSWORD ?? 'Ragina@2026';

async function main(): Promise<void> {
  await connectDB();

  const passwordHash = await hashPassword(PASSWORD);
  const existing = await User.findOne({ email: EMAIL });

  if (existing) {
    existing.fullName = FULL_NAME;
    existing.password = passwordHash;
    existing.role = 'admin';
    existing.isEmailVerified = true;
    await existing.save();
    console.log('✅ Promoted existing user to admin:');
    console.log({
      id: existing._id.toString(),
      email: existing.email,
      fullName: existing.fullName,
      role: existing.role,
      isEmailVerified: existing.isEmailVerified,
    });
  } else {
    const user = await User.create({
      fullName: FULL_NAME,
      email: EMAIL,
      password: passwordHash,
      role: 'admin',
      isEmailVerified: true,
    });
    console.log('✅ Created new admin user:');
    console.log({
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    });
  }

  await disconnectDB();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
