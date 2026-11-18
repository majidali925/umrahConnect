import { ROLES, AGENCY_STATUS } from '@/constants';

/** Route a vendor should land on for a given verification status. */
export function agencyRouteForStatus(status) {
  switch (status) {
    case AGENCY_STATUS.PENDING:
    case AGENCY_STATUS.UNDER_REVIEW:
      return '/agency/pending-approval';
    case AGENCY_STATUS.REJECTED:
      return '/agency/rejected';
    case AGENCY_STATUS.SUSPENDED:
      return '/agency/suspended';
    case AGENCY_STATUS.APPROVED:
      return '/agency/profile';
    case AGENCY_STATUS.DRAFT:
    default:
      return '/agency/onboarding';
  }
}

/**
 * Role-based landing route. Uses the role and agency status returned by the server;
 * the backend still enforces every permission independently.
 */
export function homeRouteFor(user, agency) {
  if (!user) return '/login';
  switch (user.role) {
    case ROLES.AGENCY:
      return agencyRouteForStatus(agency?.verificationStatus);
    case ROLES.CUSTOMER:
    default:
      return '/account';
  }
}

/** Only allow same-origin relative redirects (prevents open redirects via ?next=). */
export function safeNextPath(next) {
  // Must be a path on this site: reject "//host" and "/\host", which browsers treat as another origin.
  if (typeof next !== 'string' || !/^\/(?![/\\])/.test(next)) return null;
  return next;
}
