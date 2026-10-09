import { PrismaClient, UserRole, BusinessCategory, BranchStatus, TokenStatus, TokenSource } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

async function main() {
  console.log('[Seed] Starting QueueLess India staging seed process...');

  // 1. Seed Reviewer & Merchant Users
  const reviewerUser = await prisma.user.upsert({
    where: { mobile: '9000000001' },
    update: {
      name: 'Google Play Reviewer',
      roles: [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.MERCHANT],
    },
    create: {
      mobile: '9000000001',
      name: 'Google Play Reviewer',
      roles: [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.MERCHANT],
    },
  });

  const merchantOwner = await prisma.user.upsert({
    where: { mobile: '9888877777' },
    update: {
      name: 'Dr. Ramesh Sharma',
      roles: [UserRole.MERCHANT],
    },
    create: {
      mobile: '9888877777',
      name: 'Dr. Ramesh Sharma',
      roles: [UserRole.MERCHANT],
    },
  });

  console.log(`[Seed] Seeded core users: Reviewer=${reviewerUser.mobile}, MerchantOwner=${merchantOwner.mobile}`);

  // 2. Define 5 Pilot Businesses & Branches (3 Bengaluru, 1 Mumbai, 1 Pune)
  const pilotBranchesData = [
    // Branch 1 - Bengaluru Healthcare
    {
      businessName: 'Apollo Clinics India',
      category: BusinessCategory.CLINIC,
      branchName: 'Apollo Clinic Indiranagar',
      city: 'Bengaluru',
      area: 'Indiranagar 100ft Road',
      address: '1082, 100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
      lat: 12.971891,
      lng: 77.641151,
      services: [
        { name: 'General Physician Consultation', avgDurationMin: 12, priceInr: 500 },
        { name: 'Blood Sample Collection & Diagnostics', avgDurationMin: 6, priceInr: 250 },
        { name: 'Pharmacy Dispensing', avgDurationMin: 5, priceInr: 0 },
      ],
      counters: [
        { label: 'Doctor Cabin 1', staffName: 'Dr. Arvind Rao' },
        { label: 'Sample Collection A', staffName: 'Nurse Sneha' },
        { label: 'Pharmacy Desk 1', staffName: 'Sunil Kumar' },
      ],
      apiKey: 'ql_live_blr_indiranagar_apollo_secret_key',
    },
    // Branch 2 - Bengaluru Healthcare / Specialist
    {
      businessName: "Dr. Mohan's Diabetes Specialities Centre",
      category: BusinessCategory.LAB,
      branchName: "Dr. Mohan's Centre Koramangala",
      city: 'Bengaluru',
      area: 'Koramangala 4th Block',
      address: '74, 17th Cross Rd, KHB Colony, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
      lat: 12.934533,
      lng: 77.626579,
      services: [
        { name: 'Diabetic Foot Screening', avgDurationMin: 15, priceInr: 750 },
        { name: 'Dietitian & Nutrition Counseling', avgDurationMin: 20, priceInr: 600 },
        { name: 'HbA1c Rapid Lab Test', avgDurationMin: 8, priceInr: 400 },
      ],
      counters: [
        { label: 'Counter 1 - Consultation', staffName: 'Dr. Mohan' },
        { label: 'Counter 2 - Screening Lab', staffName: 'Pooja Hegde' },
      ],
      apiKey: 'ql_live_blr_koramangala_mohandiab_secret_key',
    },
    // Branch 3 - Bengaluru Government Service
    {
      businessName: 'Karnataka Transport Department',
      category: BusinessCategory.GOVT,
      branchName: 'RTO Bengaluru Central (KA-01)',
      city: 'Bengaluru',
      area: 'Kasturba Road / Shanthi Nagar',
      address: 'Corporation Complex, Kasturba Rd, Shanthi Nagar, Bengaluru, Karnataka 560027',
      lat: 12.966952,
      lng: 77.595443,
      services: [
        { name: "Learner's Licence Biometric & Test", avgDurationMin: 10, priceInr: 150 },
        { name: 'Vehicle Registration RC Smartcard Transfer', avgDurationMin: 15, priceInr: 300 },
        { name: 'International Driving Permit Verification', avgDurationMin: 12, priceInr: 1000 },
      ],
      counters: [
        { label: 'Counter A - Biometrics', staffName: 'Officer Manjunath' },
        { label: 'Counter B - Document Scrutiny', staffName: 'Officer Deepa' },
        { label: 'Counter C - Fee Cashier', staffName: 'Kavitha R' },
      ],
      apiKey: 'ql_live_blr_rto_central_secret_key',
    },
    // Branch 4 - Mumbai Healthcare
    {
      businessName: 'Lilavati Hospital & Research Centre',
      category: BusinessCategory.CLINIC,
      branchName: 'Lilavati OPD & Diagnostics Bandra',
      city: 'Mumbai',
      area: 'Bandra West',
      address: 'A-791, Bandra Reclamation Rd, General Arunkumar Vaidya Nagar, Bandra West, Mumbai, Maharashtra 400050',
      lat: 19.051185,
      lng: 72.829124,
      services: [
        { name: 'Senior Consultant Cardiology OPD', avgDurationMin: 20, priceInr: 1500 },
        { name: 'X-Ray & Ultrasound Diagnostics', avgDurationMin: 15, priceInr: 1200 },
        { name: 'Emergency Triage OPD Token', avgDurationMin: 8, priceInr: 800 },
      ],
      counters: [
        { label: 'OPD Counter 101', staffName: 'Dr. Kulkarni' },
        { label: 'OPD Counter 102', staffName: 'Dr. Mehta' },
        { label: 'Diagnostics Desk 3', staffName: 'Anil Shinde' },
      ],
      apiKey: 'ql_live_mum_lilavati_bandra_secret_key',
    },
    // Branch 5 - Pune Healthcare / Diagnostic
    {
      businessName: 'Poona Hospital & Research Division',
      category: BusinessCategory.CLINIC,
      branchName: 'Poona Hospital Diagnostic Care',
      city: 'Pune',
      area: 'Sadashiv Peth',
      address: '27, Ganjwe Peth, Sadashiv Peth, Pune, Maharashtra 411030',
      lat: 18.508922,
      lng: 73.847814,
      services: [
        { name: 'General Physician Routine Check', avgDurationMin: 10, priceInr: 400 },
        { name: 'Pathology & Serology Fast Track', avgDurationMin: 5, priceInr: 350 },
        { name: 'Health Insurance Billing Desk', avgDurationMin: 18, priceInr: 0 },
      ],
      counters: [
        { label: 'Counter 1 - Billing', staffName: 'Sachin Joshi' },
        { label: 'Counter 2 - Doctor Consultation', staffName: 'Dr. Deshpande' },
        { label: 'Counter 3 - Fast Track Lab', staffName: 'Priyanka Kale' },
      ],
      apiKey: 'ql_live_pun_poonahosp_sadashiv_secret_key',
    },
  ];

  for (const branchData of pilotBranchesData) {
    // 2a. Upsert Business
    const business = await prisma.business.create({
      data: {
        name: branchData.businessName,
        category: branchData.category,
        ownerUserId: merchantOwner.id,
      },
    });

    // 2b. Create Branch
    const branch = await prisma.branch.create({
      data: {
        businessId: business.id,
        name: branchData.branchName,
        city: branchData.city,
        area: branchData.area,
        address: branchData.address,
        lat: branchData.lat,
        lng: branchData.lng,
        openHours: { open: '08:30', close: '20:30' },
        timezone: 'Asia/Kolkata',
        status: BranchStatus.LIVE,
      },
    });

    // 2c. Create Queue Settings
    await prisma.queueSettings.create({
      data: {
        branchId: branch.id,
        isPaused: false,
        voiceHi: true,
        voiceEn: true,
        avgServiceEmaMin: 10,
      },
    });

    // 2d. Create Merchant API Key
    await prisma.merchantApiKey.create({
      data: {
        branchId: branch.id,
        keyHash: hashApiKey(branchData.apiKey),
        label: `Staging Console Key - ${branchData.branchName}`,
        isActive: true,
      },
    });

    // 2e. Create Services
    const createdServices = [];
    for (let i = 0; i < branchData.services.length; i++) {
      const s = branchData.services[i];
      const service = await prisma.service.create({
        data: {
          branchId: branch.id,
          name: s.name,
          avgDurationMin: s.avgDurationMin,
          priceInr: s.priceInr,
          sortOrder: i + 1,
          isActive: true,
        },
      });
      createdServices.push(service);
    }

    // 2f. Create Counters
    const createdCounters = [];
    for (const c of branchData.counters) {
      const counter = await prisma.counter.create({
        data: {
          branchId: branch.id,
          label: c.label,
          staffName: c.staffName,
          isActive: true,
        },
      });
      createdCounters.push(counter);
    }

    // 2g. Create sample seed tokens for realism in staging
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1 Served token
    await prisma.token.create({
      data: {
        branchId: branch.id,
        serviceId: createdServices[0].id,
        calledCounterId: createdCounters[0].id,
        number: 1,
        date: todayMidnight,
        status: TokenStatus.COMPLETED,
        source: TokenSource.APP,
        customerUserId: reviewerUser.id,
        calledAt: new Date(Date.now() - 25 * 60 * 1000),
        completedAt: new Date(Date.now() - 15 * 60 * 1000),
      },
    });

    // 1 Currently Serving token
    await prisma.token.create({
      data: {
        branchId: branch.id,
        serviceId: createdServices[0].id,
        calledCounterId: createdCounters[0].id,
        number: 2,
        date: todayMidnight,
        status: TokenStatus.IN_SERVICE,
        source: TokenSource.WALKIN,
        calledAt: new Date(Date.now() - 4 * 60 * 1000),
      },
    });

    // 2 Waiting tokens
    await prisma.token.create({
      data: {
        branchId: branch.id,
        serviceId: createdServices[1].id,
        number: 3,
        date: todayMidnight,
        status: TokenStatus.WAITING,
        source: TokenSource.APP,
      },
    });

    await prisma.token.create({
      data: {
        branchId: branch.id,
        serviceId: createdServices[1].id,
        number: 4,
        date: todayMidnight,
        status: TokenStatus.WAITING,
        source: TokenSource.WALKIN,
      },
    });

    console.log(`[Seed] Successfully seeded Branch: "${branch.name}" (${branch.city}) with 3 services, ${createdCounters.length} counters, API key.`);
  }

  console.log('[Seed] Staging seed process completed successfully for all 5 pilot branches!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
