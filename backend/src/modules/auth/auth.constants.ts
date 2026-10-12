export const AUTH_CONSTANTS = {
  ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'dev_access_secret_change_me_in_prod',
  ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me_in_prod',
  REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
