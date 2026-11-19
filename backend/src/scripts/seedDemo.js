/**
 * Fills a development database with demo data: 5 approved agencies, each with published
 * Umrah packages departing in the coming months, plus one pilgrim (customer) account with a few
 * seat requests, and one new vendor who has not started onboarding yet, so the catalogue,
 * both dashboards and the onboarding wizard have something to show.
 *
 *   npm run seed:demo                     # password for every demo account: Umrah2026
 *   DEMO_PASSWORD=Secret123 npm run seed:demo
 *
 * Agencies and owners are fictional; hotels are real, with their distance from the Haram as
 * the package form's hotel search computes it. Demo accounts use the reserved .test domain, so
 * they can never receive mail. Re-running replaces the previous demo data (and only that).
 * Refuses to run when NODE_ENV=production.
 */
const env = require('../config/env');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { User, Agency, AgencyDocument, Package, Quotation } = require('../models');
const { packageBody } = require('../validators/package.validator');
const { password: passwordRule } = require('../validators/common');
const { ROLES, VENDOR_TYPES, AGENCY_STATUS, PACKAGE_STATUS } = require('../constants');

const DEMO_DOMAIN = 'umrahconnect-demo.test';
const DAY_MS = 24 * 60 * 60 * 1000;

const DEMO_CUSTOMER = { login: 'pilgrim', fullName: 'Ayesha Siddiqui', phone: '+923000001201' };
// Seat requests from the demo customer: [agency login, package index, seats, status, message].
const DEMO_REQUESTS = [
  ['alnoor', 0, 4, 'PENDING', 'We are a family of four (two adults, two children). Can we get adjoining rooms?'],
  ['baitullah', 2, 2, 'CONFIRMED', 'Travelling with my husband. Please confirm the flight timings.'],
  ['labbaik', 1, 3, 'PENDING', ''],
  ['rahmat', 0, 2, 'DECLINED', 'Is a wheelchair available for my mother?'],
];

// Real hotels; distances in metres from the Haram (straight line to its nearest edge).
const MAKKAH = {
  anjum: { name: 'Anjum Hotel', distanceMeters: 80, stars: 5 },
  tawhid: { name: 'Dar Al Tawhid InterContinental', distanceMeters: 140, stars: 5 },
  meridien: { name: 'Le Meridien Makkah Hotel', distanceMeters: 220, stars: 4 },
  hyatt: { name: 'Jabal Omar Hyatt Regency Makkah', distanceMeters: 240, stars: 5 },
  hilton: { name: 'Hilton Suites Jabal Omar Makkah', distanceMeters: 260, stars: 5 },
  maqam: { name: 'Swissôtel Al Maqam Makkah', distanceMeters: 260, stars: 5 },
  hajar: { name: 'Mövenpick Hotel & Residence Hajar Tower Makkah', distanceMeters: 290, stars: 5 },
  retaj: { name: 'Retaj Al-Safwa Hotel', distanceMeters: 290, stars: 3 },
  swiss: { name: 'Swissôtel Makkah', distanceMeters: 300, stars: 5 },
  makkahHotel: { name: 'Makkah Hotel', distanceMeters: 1070, stars: 3 },
  rizq: { name: 'Rizq Palace Hotel', distanceMeters: 2030, stars: 3 },
  elaf: { name: 'Elaf Bakkah Hotel', distanceMeters: 2190, stars: 3 },
};
const MADINAH = {
  taqwa: { name: 'Dar Al-Taqwa Hotel', distanceMeters: 20, stars: 5 },
  anwar: { name: 'Anwar Al-Madinah Mövenpick Hotel', distanceMeters: 40, stars: 5 },
  iman: { name: 'Dar Al Iman InterContinental', distanceMeters: 40, stars: 5 },
  taibaFront: { name: 'Taiba Front Hotel', distanceMeters: 40, stars: 4 },
  makarem: { name: 'Makarem Haram View Suites', distanceMeters: 50, stars: 4 },
  eiman: { name: 'Dar Al-Eiman Al-Haram Hotel', distanceMeters: 130, stars: 4 },
  pullman: { name: 'ZamZam Pullman Madinah', distanceMeters: 180, stars: 5 },
  sham: { name: 'Province Al-Sham Hotel', distanceMeters: 240, stars: 3 },
  crowne: { name: 'Crowne Plaza Madinah', distanceMeters: 240, stars: 5 },
  shaza: { name: 'Shaza Regency Plaza Hotel', distanceMeters: 310, stars: 4 },
  zahra: { name: 'Anwar Al-Zahra Hotel', distanceMeters: 330, stars: 3 },
};

const ECONOMY = ['VISA', 'FLIGHTS', 'HOTEL', 'TRANSPORT'];
const STANDARD = [...ECONOMY, 'ZIYARAT', 'GUIDE'];
const PREMIUM = [...STANDARD, 'MEALS', 'INSURANCE'];

/**
 * One package: departs `inDays` from today, `makkah` and `madinah` are [hotel, nights].
 * The trip lasts one day more than the nights in hotels (travel day home).
 */
const trip = (title, description, inDays, [mk, mkNights], [md, mdNights], roomType, price, inclusions, seats) => ({
  title,
  description,
  inDays,
  days: mkNights + mdNights + 1,
  makkahHotel: { ...mk, nights: mkNights },
  madinahHotel: { ...md, nights: mdNights },
  roomType,
  pricePerPerson: price,
  inclusions,
  totalSeats: seats,
});

const AGENCIES = [
  {
    login: 'alnoor',
    vendorType: VENDOR_TYPES.REGISTERED_AGENCY,
    businessName: 'Al-Noor Hajj & Umrah Services',
    ownerName: 'Muhammad Imran Qureshi',
    experience: 14,
    phone: '+923000001101',
    officePhone: '+92423571100',
    city: 'Lahore',
    province: 'Punjab',
    address: 'Office 12, Hafeez Centre, Gulberg III, Lahore',
    description:
      'Lahore-based Umrah specialists since 2012. We run group and family packages every month with our own guides in Makkah and Madinah, and handle visas, PIA and Saudia flights and ground transport end to end.',
    packages: [
      trip('15 Days Economy Umrah — December Group', 'Affordable group Umrah for families from Lahore. Return flights on Saudia, quad sharing rooms, AC bus transfers between Jeddah, Makkah and Madinah, and a guided Ziyarat in Madinah.', 21, [MAKKAH.rizq, 8], [MADINAH.zahra, 6], 'QUAD', 289000, ECONOMY, 40),
      trip('21 Days Standard Umrah — Winter Special', 'Three relaxed weeks with 4-star hotels close to both Harams. Includes Ziyarat in Makkah and Madinah with an Urdu-speaking guide, and Saudia flights from Lahore.', 38, [MAKKAH.meridien, 12], [MADINAH.shaza, 8], 'TRIPLE', 465000, STANDARD, 30),
      trip('10 Days Executive Umrah — Haram View', 'Short premium trip for busy professionals: 5-star hotels a few minutes from the Haram, double rooms, breakfast and dinner buffets, private car transfers.', 55, [MAKKAH.hilton, 5], [MADINAH.anwar, 4], 'DOUBLE', 735000, PREMIUM, 16),
      trip('15 Days Family Umrah — Spring Break', 'Timed with the school spring break. Triple and quad rooms for families, a guided Ziyarat in both cities and a dedicated group leader from Lahore.', 110, [MAKKAH.retaj, 8], [MADINAH.taibaFront, 6], 'QUAD', 335000, STANDARD, 45),
      trip('28 Days Extended Umrah', 'Four weeks of worship for those who want more time in the Haramain. 4-star hotels, weekly Ziyarat and a 24/7 support desk in Makkah.', 130, [MAKKAH.makkahHotel, 15], [MADINAH.eiman, 12], 'TRIPLE', 540000, STANDARD, 25),
    ],
  },
  {
    login: 'baitullah',
    vendorType: VENDOR_TYPES.REGISTERED_AGENCY,
    businessName: 'Baitullah Travels',
    ownerName: 'Syed Faisal Hashmi',
    experience: 9,
    phone: '+923000001102',
    officePhone: '+92213565200',
    city: 'Karachi',
    province: 'Sindh',
    address: 'Suite 304, Saima Trade Tower, I.I. Chundrigar Road, Karachi',
    description:
      'Karachi travel agency offering Umrah packages for every budget, from economy groups to 5-star private trips. Direct flights from Karachi and experienced Mutawwifs on every group.',
    packages: [
      trip('14 Days Economy Umrah from Karachi', 'Budget-friendly Umrah with direct PIA flights from Karachi, quad sharing and shuttle service to the Haram from the hotel.', 17, [MAKKAH.elaf, 7], [MADINAH.zahra, 6], 'QUAD', 265000, ECONOMY, 50),
      trip('17 Days Standard Umrah — January', 'Comfortable hotels within walking distance, Ziyarat in both cities and a Karachi-based group leader who travels with you.', 47, [MAKKAH.retaj, 9], [MADINAH.sham, 7], 'TRIPLE', 395000, STANDARD, 35),
      trip('12 Days 5-Star Umrah — Clock Tower', 'Stay in the Abraj Al Bait complex steps from the Haram, then Madinah right at the Prophet’s Mosque. Double rooms, buffet meals and business-class lounge access.', 75, [MAKKAH.swiss, 6], [MADINAH.taqwa, 5], 'DOUBLE', 895000, PREMIUM, 12),
      trip('21 Days Group Umrah — March', 'Three-week group journey with a balanced split between Makkah and Madinah, guided Ziyarat and full transport.', 105, [MAKKAH.makkahHotel, 12], [MADINAH.shaza, 8], 'QUAD', 375000, STANDARD, 40),
    ],
  },
  {
    login: 'labbaik',
    vendorType: VENDOR_TYPES.REGISTERED_AGENCY,
    businessName: 'Labbaik Tours & Travels',
    ownerName: 'Tariq Mehmood Abbasi',
    experience: 11,
    phone: '+923000001103',
    officePhone: '+92512870300',
    city: 'Islamabad',
    province: 'Islamabad Capital Territory',
    address: 'Plot 7, Blue Area, Jinnah Avenue, Islamabad',
    description:
      'Serving pilgrims from Islamabad and Rawalpindi for over a decade. Known for small, well-looked-after groups and premium hotels close to the Haram.',
    packages: [
      trip('10 Days Premium Umrah — Dar Al Tawhid', 'Five-star stay facing the Haram in Makkah and next to Masjid an-Nabawi in Madinah. Double rooms, all meals, private transfers.', 26, [MAKKAH.tawhid, 5], [MADINAH.iman, 4], 'DOUBLE', 980000, PREMIUM, 10),
      trip('15 Days Standard Umrah — Islamabad Group', 'Popular two-week package from Islamabad with 5-star Jabal Omar hotels at a 4-star price, triple sharing and guided Ziyarat.', 60, [MAKKAH.hyatt, 8], [MADINAH.crowne, 6], 'TRIPLE', 525000, STANDARD, 30),
      trip('21 Days Economy Umrah — February', 'Longer stay at an economical price. Shuttle service to the Haram, quad rooms and Ziyarat in Madinah.', 82, [MAKKAH.rizq, 12], [MADINAH.zahra, 8], 'QUAD', 315000, ECONOMY, 45),
      trip('7 Days Express Umrah', 'One week for those short on time: three nights in each city in 5-star hotels, double rooms and private transfers.', 96, [MAKKAH.maqam, 3], [MADINAH.anwar, 3], 'DOUBLE', 610000, PREMIUM, 14),
      trip('15 Days Family Umrah — Easter Holidays', 'Family package with connecting rooms on request, child-friendly guides and Ziyarat in both cities.', 140, [MAKKAH.meridien, 8], [MADINAH.makarem, 6], 'TRIPLE', 445000, STANDARD, 30),
    ],
  },
  {
    login: 'safamarwa',
    vendorType: VENDOR_TYPES.REGISTERED_AGENCY,
    businessName: 'Safa Marwa Travel Consultants',
    ownerName: 'Haji Gul Zaman Afridi',
    experience: 7,
    phone: '+923000001104',
    officePhone: '+92915270400',
    city: 'Peshawar',
    province: 'Khyber Pakhtunkhwa',
    address: 'First Floor, Deans Trade Centre, Saddar Road, Peshawar',
    description:
      'Peshawar agency with Pashto- and Urdu-speaking guides. We keep packages simple and honest: clear hotel names, clear distances and no hidden charges.',
    packages: [
      trip('15 Days Economy Umrah from Peshawar', 'Economy group Umrah with flights from Peshawar, quad rooms and bus transfers. Pashto-speaking guide throughout.', 33, [MAKKAH.elaf, 8], [MADINAH.sham, 6], 'QUAD', 279000, ECONOMY, 45),
      trip('21 Days Standard Umrah — Spring', 'Three weeks with 4-star hotels close to both Harams, guided Ziyarat and full transport.', 88, [MAKKAH.retaj, 12], [MADINAH.eiman, 8], 'TRIPLE', 455000, STANDARD, 30),
      trip('12 Days 5-Star Umrah — Hajar Tower', 'Premium package in the Clock Tower complex and next to Masjid an-Nabawi. Double rooms and meals included.', 118, [MAKKAH.hajar, 6], [MADINAH.taibaFront, 5], 'DOUBLE', 845000, PREMIUM, 12),
    ],
  },
  {
    login: 'rahmat',
    vendorType: VENDOR_TYPES.INDEPENDENT_OPERATOR,
    businessName: 'Rahmat Umrah Group',
    ownerName: 'Hafiz Abdul Rehman',
    experience: 5,
    phone: '+923000001105',
    city: 'Multan',
    province: 'Punjab',
    address: 'House 21, Block B, Shah Rukn-e-Alam Colony, Multan',
    description:
      'Independent Umrah group leader from Multan. I personally lead every group, help first-time pilgrims with the rites of Umrah and keep groups small.',
    packages: [
      trip('15 Days Guided Umrah — First-Timers', 'Personally led group for first-time pilgrims, with Umrah training sessions before departure, quad rooms and Ziyarat in both cities.', 40, [MAKKAH.makkahHotel, 8], [MADINAH.zahra, 6], 'QUAD', 299000, STANDARD, 25),
      trip('21 Days Umrah — Multan Group', 'Three-week group from Multan with comfortable hotels, triple sharing and a daily Dars in Makkah.', 68, [MAKKAH.retaj, 12], [MADINAH.sham, 8], 'TRIPLE', 389000, STANDARD, 25),
      trip('10 Days Comfort Umrah', 'Short trip with 5-star hotels close to both Harams, double rooms and personal guidance throughout.', 125, [MAKKAH.anjum, 5], [MADINAH.pullman, 4], 'DOUBLE', 690000, PREMIUM, 10),
      trip('28 Days Long Stay Umrah', 'A full month in the Haramain at an economical price. Shuttle to the Haram, quad rooms and Ziyarat.', 150, [MAKKAH.rizq, 15], [MADINAH.zahra, 12], 'QUAD', 410000, ECONOMY, 30),
    ],
  },
];

/** Today's date at UTC midnight plus `days`, matching how the form stores calendar dates. */
function dayFromToday(days) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

async function removePreviousDemo() {
  const users = await User.find({ email: new RegExp(`@${DEMO_DOMAIN.replace(/\./g, '\\.')}$`) }, '_id');
  const userIds = users.map((u) => u._id);
  const agencyIds = await Agency.find({ userId: { $in: userIds } }).distinct('_id');
  await Quotation.deleteMany({ agencyId: { $in: agencyIds } });
  await Package.deleteMany({ agencyId: { $in: agencyIds } });
  await AgencyDocument.deleteMany({ agencyId: { $in: agencyIds } });
  await Agency.deleteMany({ _id: { $in: agencyIds } });
  await User.deleteMany({ _id: { $in: userIds } });
  return agencyIds.length;
}

async function run() {
  if (env.isProduction) {
    console.error('[seed:demo] Refusing to add demo data when NODE_ENV=production.');
    process.exitCode = 1;
    return;
  }
  const password = process.env.DEMO_PASSWORD || 'Umrah2026';
  if (passwordRule.validate(password).error) {
    console.error('[seed:demo] DEMO_PASSWORD must be 8+ characters with letters and numbers.');
    process.exitCode = 1;
    return;
  }

  await connectDatabase(env.mongoUri);
  try {
    const removed = await removePreviousDemo();
    if (removed) console.log(`[seed:demo] Replaced ${removed} existing demo agencies.`);

    const now = new Date();
    let packageCount = 0;
    const created = {}; // agency login -> { agency, packages }
    for (const a of AGENCIES) {
      const email = `${a.login}@${DEMO_DOMAIN}`;
      const user = await User.create({
        fullName: a.ownerName,
        email,
        phone: a.phone,
        password,
        role: ROLES.AGENCY,
        isEmailVerified: true,
        isPhoneVerified: true,
      });
      const agency = await Agency.create({
        userId: user._id,
        vendorType: a.vendorType,
        businessName: a.businessName,
        ownerName: a.ownerName,
        description: a.description,
        experience: a.experience,
        email,
        phone: a.phone,
        whatsapp: a.phone,
        officePhone: a.officePhone || '',
        province: a.province,
        city: a.city,
        address: a.address,
        verificationStatus: AGENCY_STATUS.APPROVED,
        submittedAt: new Date(now - 30 * DAY_MS),
        approvedAt: new Date(now - 25 * DAY_MS),
      });

      for (const p of a.packages) {
        const { inDays, days, ...fields } = p;
        // Same validation as the API, so demo packages are ones an agency could really create.
        const { value, error } = packageBody.validate({
          ...fields,
          departureCity: a.city,
          departureDate: dayFromToday(inDays),
          returnDate: dayFromToday(inDays + days - 1),
          status: PACKAGE_STATUS.PUBLISHED,
        });
        if (error) throw new Error(`"${p.title}": ${error.message}`);
        const pkg = await Package.create({ ...value, agencyId: agency._id, createdBy: user._id, publishedAt: now });
        (created[a.login] ||= { agency, packages: [] }).packages.push(pkg);
        packageCount += 1;
      }
      console.log(`[seed:demo] ${a.businessName} (${a.city}): ${a.packages.length} packages — login ${email}`);
    }
    const customer = await User.create({
      fullName: DEMO_CUSTOMER.fullName,
      email: `${DEMO_CUSTOMER.login}@${DEMO_DOMAIN}`,
      phone: DEMO_CUSTOMER.phone,
      password,
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
      isPhoneVerified: true,
    });
    for (const [login, index, seats, status, message] of DEMO_REQUESTS) {
      const pkg = created[login].packages[index];
      await Quotation.create({
        packageId: pkg._id,
        agencyId: pkg.agencyId,
        customerId: customer._id,
        seats,
        message,
        pricePerPerson: pkg.pricePerPerson,
        estimatedTotal: pkg.pricePerPerson * seats,
        status,
        agencyNote: status === 'DECLINED' ? 'Sorry, this group is full for wheelchair users. Please try our March group.' : undefined,
        respondedAt: status === 'PENDING' ? undefined : now,
      });
      if (status === 'CONFIRMED') await Package.updateOne({ _id: pkg._id }, { $inc: { bookedSeats: seats } });
    }
    const newVendor = await User.create({
      fullName: 'Bilal Ahmed Chaudhry',
      email: `newvendor@${DEMO_DOMAIN}`,
      phone: '+923000001301',
      password,
      role: ROLES.AGENCY,
      isEmailVerified: true,
      isPhoneVerified: true,
    });
    await Agency.create({
      userId: newVendor._id,
      vendorType: VENDOR_TYPES.REGISTERED_AGENCY,
      ownerName: newVendor.fullName,
      email: newVendor.email,
      phone: newVendor.phone,
      verificationStatus: AGENCY_STATUS.DRAFT,
    });
    console.log(`[seed:demo] New vendor (onboarding not started) — login ${newVendor.email}`);

    console.log(`[seed:demo] Customer ${customer.fullName} with ${DEMO_REQUESTS.length} seat requests — login ${customer.email}`);

    console.log(`[seed:demo] Done: ${AGENCIES.length} agencies, ${packageCount} published packages. Password: ${password}`);
  } finally {
    await disconnectDatabase();
  }
}

run().catch((err) => {
  console.error('[seed:demo] Failed:', err.message);
  process.exitCode = 1;
});
