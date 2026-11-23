import { ROLES } from '@/constants';

/** Line shown under the name in the account menu. */
export function roleLabelFor(user, agency) {
  if (user?.role === ROLES.AGENCY) return agency?.businessName || 'Agency';
  return 'Pilgrim account';
}
