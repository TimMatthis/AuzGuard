// Seed script to create initial users, groups, and product access groups
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create Product Access Groups
  console.log('\nCreating Product Access Groups...');
  
  const fullAccessGroup = await prisma.productAccessGroup.upsert({
    where: { name: 'Full Access' },
    update: {},
    create: {
      name: 'Full Access',
      description: 'Access to all products and features',
      products: [
        'dashboard',
        'policies',
        'simulator',
        'audit',
        'routing_config',
        'models',
        'decisions',
        'chat',
        'chat_ui',
        'user_groups',
        'settings'
      ]
    }
  });
  console.log('✓ Created: Full Access');

  const chatOnlyGroup = await prisma.productAccessGroup.upsert({
    where: { name: 'Chat Only' },
    update: {},
    create: {
      name: 'Chat Only',
      description: 'Access to chat interface only',
      products: ['chat_ui']
    }
  });
  console.log('✓ Created: Chat Only');

  const developerAccessGroup = await prisma.productAccessGroup.upsert({
    where: { name: 'Developer Access' },
    update: {},
    create: {
      name: 'Developer Access',
      description: 'Access to development and testing features',
      products: [
        'dashboard',
        'policies',
        'simulator',
        'audit',
        'models',
        'decisions'
      ]
    }
  });
  console.log('✓ Created: Developer Access');

  // Create Routing Profiles
  console.log('\nCreating Routing Profiles...');
  
  const speedProfile = await prisma.routeProfile.upsert({
    where: { name: 'Speed Optimized' },
    update: {},
    create: {
      name: 'Speed Optimized',
      basic: {
        optimize_speed: true
      },
      preferences: {
        minimize_latency: true,
        max_latency_ms: 1000
      }
    }
  });
  console.log('✓ Created: Speed Optimized');

  const onshoreProfile = await prisma.routeProfile.upsert({
    where: { name: 'Australian Onshore' },
    update: {},
    create: {
      name: 'Australian Onshore',
      basic: {
        keep_onshore: true
      },
      preferences: {
        required_data_residency: 'AU'
      }
    }
  });
  console.log('✓ Created: Australian Onshore');

  // Create User Groups
  console.log('\nCreating User Groups...');
  
  const adminGroup = await prisma.userGroup.upsert({
    where: { name: 'Administrators' },
    update: {},
    create: {
      name: 'Administrators',
      product_access_group_id: fullAccessGroup.id,
      route_profile_id: speedProfile.id
    }
  });
  console.log('✓ Created: Administrators');

  const developerGroup = await prisma.userGroup.upsert({
    where: { name: 'Developers' },
    update: {},
    create: {
      name: 'Developers',
      product_access_group_id: developerAccessGroup.id,
      route_profile_id: speedProfile.id
    }
  });
  console.log('✓ Created: Developers');

  const chatUserGroup = await prisma.userGroup.upsert({
    where: { name: 'Chat Users' },
    update: {},
    create: {
      name: 'Chat Users',
      product_access_group_id: chatOnlyGroup.id,
      route_profile_id: onshoreProfile.id
    }
  });
  console.log('✓ Created: Chat Users');

  // Create Users
  console.log('\nCreating Users...');
  
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@auzguard.com' },
    update: {},
    create: {
      email: 'admin@auzguard.com',
      password_hash: adminPassword,
      role: 'admin',
      user_group_id: adminGroup.id,
      is_active: true
    }
  });
  console.log('✓ Created: admin@auzguard.com (password: admin123)');

  const devPassword = await bcrypt.hash('dev123', 12);
  const devUser = await prisma.user.upsert({
    where: { email: 'developer@auzguard.com' },
    update: {},
    create: {
      email: 'developer@auzguard.com',
      password_hash: devPassword,
      role: 'developer',
      user_group_id: developerGroup.id,
      is_active: true
    }
  });
  console.log('✓ Created: developer@auzguard.com (password: dev123)');

  const chatPassword = await bcrypt.hash('chat123', 12);
  const chatUser = await prisma.user.upsert({
    where: { email: 'chat@auzguard.com' },
    update: {},
    create: {
      email: 'chat@auzguard.com',
      password_hash: chatPassword,
      role: 'chat',
      user_group_id: chatUserGroup.id,
      is_active: true
    }
  });
  console.log('✓ Created: chat@auzguard.com (password: chat123)');

  console.log('\n✅ Database seeding completed successfully!');
  console.log('\nTest Accounts:');
  console.log('  Admin:     admin@auzguard.com / admin123');
  console.log('  Developer: developer@auzguard.com / dev123');
  console.log('  Chat User: chat@auzguard.com / chat123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

