import * as Yup from 'yup';
import { PAKISTAN_PROVINCES } from '@/constants';

// Client-side rules mirror the API for fast feedback; the API remains authoritative.
export const PK_MOBILE_REGEX = /^(?:\+92|0092|92|0)?3\d{9}$/;
export const PK_PHONE_REGEX = /^(?:\+92|0092|92|0)\d{9,10}$/;

const stripPhone = (value) => (value ? value.replace(/[\s-()]/g, '') : value);

export const pakistaniMobile = (label = 'Mobile number') =>
  Yup.string()
    .trim()
    .required(`${label} is required`)
    .test('pk-mobile', `Enter a valid Pakistani mobile number (e.g. 0300 1234567)`, (v) =>
      v ? PK_MOBILE_REGEX.test(stripPhone(v)) : false,
    );

export const optionalPakistaniPhone = (label = 'Phone number') =>
  Yup.string()
    .trim()
    .test('pk-phone', `Enter a valid ${label.toLowerCase()} (e.g. 042 1234567)`, (v) =>
      !v ? true : PK_PHONE_REGEX.test(stripPhone(v)) || PK_MOBILE_REGEX.test(stripPhone(v)),
    );

export const email = Yup.string().trim().email('Enter a valid email address').required('Email is required');

export const password = Yup.string()
  .required('Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .matches(/[A-Za-z]/, 'Password must contain at least one letter')
  .matches(/\d/, 'Password must contain at least one number');

export const confirmPassword = Yup.string()
  .required('Please confirm your password')
  .oneOf([Yup.ref('password')], 'Passwords do not match');

export const identifier = Yup.string().trim().required('Email or mobile number is required');

export const otp = Yup.string()
  .trim()
  .required('Enter the 6-digit code')
  .matches(/^\d{6}$/, 'The code must be 6 digits');

/* ---------------- Agency onboarding steps ---------------- */

export const businessInfoSchema = Yup.object({
  businessName: Yup.string().trim().required('Business name is required').min(2).max(150),
  vendorType: Yup.string().required('Vendor type is required'),
  ownerName: Yup.string().trim().required('Owner name is required').min(2).max(100),
  description: Yup.string()
    .trim()
    .required('Business description is required')
    .min(30, 'Description must be at least 30 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  experience: Yup.number()
    .typeError('Enter a number')
    .required('Years of experience is required')
    .integer('Enter whole years')
    .min(0, 'Cannot be negative')
    .max(100, 'Enter a realistic number'),
});

export const contactInfoSchema = Yup.object({
  email,
  phone: pakistaniMobile('Mobile number'),
  whatsapp: pakistaniMobile('WhatsApp number'),
  officePhone: optionalPakistaniPhone('Office phone'),
  website: Yup.string()
    .trim()
    .url('Enter a valid URL starting with http:// or https://')
    .max(200),
});

export const addressSchema = Yup.object({
  country: Yup.string().trim().required('Country is required'),
  province: Yup.string()
    .trim()
    .required('Province is required')
    .when('country', {
      is: (c) => c?.toLowerCase() === 'pakistan',
      then: (s) => s.oneOf(PAKISTAN_PROVINCES, 'Select a valid province'),
    }),
  city: Yup.string().trim().required('City is required').min(2).max(80),
  address: Yup.string().trim().required('Office address is required').min(10, 'Enter the complete address').max(300),
  postalCode: Yup.string()
    .trim()
    .matches(/^\d{5}$/, { message: 'Postal code must be 5 digits', excludeEmptyString: true }),
});

/* ---------------- Packages ---------------- */

const wholeNumber = (label, min, max) =>
  Yup.number()
    .typeError(`${label} must be a number`)
    .required(`${label} is required`)
    .integer(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

const hotel = (city) =>
  Yup.object({
    name: Yup.string().trim().required(`${city} hotel name is required`).min(2).max(150),
    stars: wholeNumber('Star rating', 1, 5),
    distanceMeters: wholeNumber('Distance', 0, 50000),
    nights: wholeNumber(`Nights in ${city}`, 0, 60),
  });

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const packageSchema = Yup.object({
  title: Yup.string().trim().required('Title is required').min(5, 'Title must be at least 5 characters').max(150),
  description: Yup.string()
    .trim()
    .required('Description is required')
    .min(20, 'Description must be at least 20 characters')
    .max(3000),
  departureCity: Yup.string().trim().required('Departure city is required').min(2).max(80),
  departureDate: Yup.date()
    .typeError('Departure date is required')
    .required('Departure date is required')
    .test('future', 'Departure date must be in the future', (v) => !v || v > endOfToday()),
  returnDate: Yup.date()
    .typeError('Return date is required')
    .required('Return date is required')
    .when('departureDate', ([dep], s) => (dep instanceof Date && !Number.isNaN(+dep) ? s.min(new Date(+dep + 1), 'Return date must be after the departure date') : s)),
  makkahHotel: hotel('Makkah'),
  madinahHotel: hotel('Madinah'),
  roomType: Yup.string().required('Room sharing is required'),
  pricePerPerson: wholeNumber('Price per person', 1000, 10000000),
  inclusions: Yup.array().of(Yup.string()),
  totalSeats: wholeNumber('Seat quota', 1, 1000),
}).test('nights', 'Add at least one night in Makkah or Madinah', function nights(v) {
  const total = Number(v?.makkahHotel?.nights || 0) + Number(v?.madinahHotel?.nights || 0);
  return total > 0 || this.createError({ path: 'makkahHotel.nights', message: 'Add at least one night in Makkah or Madinah' });
});

export const seatRequestSchema = (available) =>
  Yup.object({
    seats: wholeNumber('Number of persons', 1, Math.max(available, 1)),
    message: Yup.string().trim().max(1000, 'Message must be at most 1000 characters'),
  });
