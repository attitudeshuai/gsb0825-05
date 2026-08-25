const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('112233', 10);

  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: '平台管理员',
      email: 'admin@multitenant.com',
      role: 'super_admin',
    },
  });

  console.log('Created admin:', admin.username);

  const plans = [
    {
      name: '免费版',
      description: '适合个人和小型团队使用',
      price: 0,
      billingCycle: 'monthly',
      maxUsers: 5,
      maxStorage: 1,
      features: {
        userManagement: true,
        basicReport: true,
        emailSupport: false,
        customDomain: false,
        apiAccess: false,
      },
      status: 'active',
    },
    {
      name: '专业版',
      description: '适合成长型企业使用',
      price: 299,
      billingCycle: 'monthly',
      maxUsers: 50,
      maxStorage: 50,
      features: {
        userManagement: true,
        basicReport: true,
        advancedReport: true,
        emailSupport: true,
        customDomain: true,
        apiAccess: true,
      },
      status: 'active',
    },
    {
      name: '企业版',
      description: '适合大型企业使用，支持定制化',
      price: 999,
      billingCycle: 'monthly',
      maxUsers: 1000,
      maxStorage: 500,
      features: {
        userManagement: true,
        basicReport: true,
        advancedReport: true,
        emailSupport: true,
        phoneSupport: true,
        customDomain: true,
        apiAccess: true,
        ssoIntegration: true,
        dedicatedAccountManager: true,
      },
      status: 'active',
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
    console.log('Created plan:', plan.name);
  }

  const demoTenant = await prisma.tenant.upsert({
    where: { code: 'DEMO001' },
    update: {},
    create: {
      name: '演示租户',
      code: 'DEMO001',
      contactName: '张三',
      contactEmail: 'zhangsan@demo.com',
      contactPhone: '13800138000',
      address: '北京市朝阳区科技园',
      status: 'active',
      planId: 2,
    },
  });

  console.log('Created tenant:', demoTenant.name);

  const tenantUsers = [
    {
      tenantId: demoTenant.id,
      username: 'demouser1',
      email: 'demouser1@demo.com',
      password: await bcrypt.hash('123456', 10),
      role: 'admin',
      status: 'active',
    },
    {
      tenantId: demoTenant.id,
      username: 'demouser2',
      email: 'demouser2@demo.com',
      password: await bcrypt.hash('123456', 10),
      role: 'user',
      status: 'active',
    },
  ];

  for (const user of tenantUsers) {
    await prisma.tenantUser.upsert({
      where: { username: user.username },
      update: {},
      create: user,
    });
    console.log('Created tenant user:', user.username);
  }

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const existingBills = await prisma.bill.count({
    where: { tenantId: demoTenant.id },
  });

  if (existingBills === 0) {
    const bills = [
      {
        tenantId: demoTenant.id,
        amount: 299,
        billDate: now,
        dueDate: nextMonth,
        status: 'pending',
        items: {
          planFee: { name: '专业版月费', amount: 299, quantity: 1 },
        },
        remark: '2024年1月账单',
      },
    ];

    for (const bill of bills) {
      await prisma.bill.create({
        data: bill,
      });
      console.log('Created bill for tenant:', demoTenant.name);
    }
  } else {
    console.log('Bills already exist, skipping...');
  }

  // 试用中的租户（14天后到期）
  const trialTenant = await prisma.tenant.upsert({
    where: { code: 'DEMO002' },
    update: {},
    create: {
      name: '试用租户',
      code: 'DEMO002',
      contactName: '李四',
      contactEmail: 'lisi@demo.com',
      status: 'trial',
      planId: 2,
      trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('Created trial tenant:', trialTenant.name);

  // 试用已到期的租户（启动检查时会被自动停用，标记 trial_expired）
  const expiredTrialTenant = await prisma.tenant.upsert({
    where: { code: 'DEMO003' },
    update: {},
    create: {
      name: '试用到期租户',
      code: 'DEMO003',
      contactName: '王五',
      contactEmail: 'wangwu@demo.com',
      status: 'trial',
      planId: 1,
      trialEndsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('Created expired trial tenant:', expiredTrialTenant.name);

  // 长期欠费租户：账单已逾期40天（启动检查时会被自动停用，标记 arrears）
  const arrearsTenant = await prisma.tenant.upsert({
    where: { code: 'DEMO004' },
    update: {},
    create: {
      name: '欠费租户',
      code: 'DEMO004',
      contactName: '赵六',
      contactEmail: 'zhaoliu@demo.com',
      status: 'active',
      planId: 2,
    },
  });

  const arrearsBillCount = await prisma.bill.count({
    where: { tenantId: arrearsTenant.id },
  });
  if (arrearsBillCount === 0) {
    await prisma.bill.create({
      data: {
        tenantId: arrearsTenant.id,
        amount: 299,
        billDate: new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000),
        dueDate: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
        status: 'pending',
        items: {
          planFee: { name: '专业版月费', amount: 299, quantity: 1 },
        },
        remark: '历史欠费账单（逾期40天）',
      },
    });
    console.log('Created long overdue bill for tenant:', arrearsTenant.name);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
