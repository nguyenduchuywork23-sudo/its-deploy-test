import { PrismaClient, Role, ConnectionStatus, SyncStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const defaultPassword = 'Password@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed demo users
  const accounts = [
    {
      email: 'sysadmin@codegym.vn',
      fullName: 'Quản Trị Viên Hệ Thống (SysAdmin)',
      role: Role.SYSADMIN,
      password: hashedPassword,
    },
    {
      email: 'leadmentor@codegym.vn',
      fullName: 'Nguyễn Văn Mentor Trưởng',
      role: Role.LEAD_MENTOR,
      password: hashedPassword,
    },
    {
      email: 'mentor@codegym.vn',
      fullName: 'Trần Thị Mentor Phụ Trách',
      role: Role.MENTOR,
      password: hashedPassword,
    },
    {
      email: 'intern@codegym.vn',
      fullName: 'Lê Văn Thực Tập Sinh',
      role: Role.INTERN,
      password: hashedPassword,
    },
  ];

  let mentorUser: any = null;
  let internUser: any = null;
  for (const acc of accounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: { role: acc.role, fullName: acc.fullName },
      create: acc,
    });
    if (user.role === Role.MENTOR) {
      mentorUser = user;
    }
    if (user.role === Role.INTERN) {
      internUser = user;
    }
    console.log(`  ✅ User seeded: ${user.email} (${user.role})`);
  }

  // 2. Seed or update sample group
  let group = await prisma.group.findFirst({
    where: { code: 'CG-JAVA-01' },
  });

  if (!group) {
    group = await prisma.group.create({
      data: {
        code: 'CG-JAVA-01',
        name: 'Nhóm Thực Tập Java FullStack K24',
        memberCount: 10,
        mentorId: mentorUser?.id ?? null,
        jiraProjectKey: 'ITS',
        jiraBaseUrl: 'https://cg-ictu.atlassian.net',
        jiraConnectionStatus: ConnectionStatus.SUCCESS,
        githubConnectionStatus: ConnectionStatus.SUCCESS,
        syncStatus: SyncStatus.SUCCESS,
        repositories: {
          create: [
            {
              repoUrl: 'https://github.com/GrowthZ/Internship-Tracking-System',
              repoName: 'Internship-Tracking-System',
              repoOwner: 'GrowthZ',
              isActive: true,
            },
          ],
        },
      },
    });
    console.log(`  ✅ Group seeded: ${group.name} (${group.code})`);
  }

  // Seed sample members and link intern
  const existingMembers = await prisma.groupMember.findMany({
    where: { groupId: group.id },
  });

  if (existingMembers.length === 0) {
    const memberData = Array.from({ length: 10 }).map((_, idx) => ({
      groupId: group.id,
      userId: idx === 0 ? internUser?.id : null,
      memberCode: `CG2400${idx + 1}`,
      fullName: idx === 0 ? 'Lê Văn Thực Tập Sinh' : `Học Viên CodeGym ${idx + 1}`,
      role: idx === 0 ? 'Team Leader' : 'Developer',
    }));

    await prisma.groupMember.createMany({
      data: memberData,
    });
    console.log(`  ✅ 10 sample members created for group ${group.code}`);
  } else if (internUser) {
    await prisma.groupMember.update({
      where: { id: existingMembers[0].id },
      data: { userId: internUser.id, fullName: 'Lê Văn Thực Tập Sinh' },
    });
    console.log(`  ✅ Linked intern user to member ${existingMembers[0].memberCode}`);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
