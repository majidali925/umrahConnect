'use client';

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { logout } from '@/features/auth/authSlice';

export function useLogout() {
  const dispatch = useDispatch();
  const router = useRouter();
  return useCallback(async () => {
    await dispatch(logout());
    router.replace('/login');
  }, [dispatch, router]);
}
