
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getSpsMeatStockItem } from '@/services/spsMeatStockService';
import type { MeatStockItem } from '@/lib/types';
import SpsMeatStockClientPage from './client-page';
import { Skeleton } from '@/components/ui/skeleton';

export default function SpsMeatStockPage() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<MeatStockItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && id !== 'default') {
      setLoading(true);
      getSpsMeatStockItem(id).then(itemData => {
        setItem(itemData);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to fetch stock item:", err);
        setLoading(false);
      });
    } else {
        setLoading(false);
    }
  }, [id]);

  if (loading) {
      return (
            <div className="flex flex-col items-center justify-center h-screen">
                 <div className="w-full max-w-4xl p-4 space-y-4">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
      );
  }
  
  if (!item) {
    return (
        <div className="flex justify-center items-center h-screen">
            <h1>Stock Item not found</h1>
        </div>
    );
  }

  return <SpsMeatStockClientPage initialItem={item} />;
}
