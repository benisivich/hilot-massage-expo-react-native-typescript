import { useCallback, useEffect, useState } from 'react';

import { useApp } from '@/context/store';
import { fetchAdminBundle, type AdminLists } from '@/services/admin';

export function useAdminData() {
  const { role } = useApp();
  const [data, setData] = useState<AdminLists | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    if (role !== 'admin') return;
    let cancelled = false;
    void fetchAdminBundle().then((next) => {
      if (cancelled) return;
      setError(next.error ?? '');
      setData(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [role, version]);

  return {
    customers: data?.customers ?? [],
    therapists: data?.therapists ?? [],
    bookings: data?.bookings ?? [],
    complaints: data?.complaints ?? [],
    treatments: data?.treatments ?? [],
    areas: data?.areas ?? [],
    error,
    loading,
    reload,
  };
}
