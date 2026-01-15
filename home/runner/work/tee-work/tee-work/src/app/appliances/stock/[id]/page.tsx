
import type { Metadata } from 'next';
import { getApplianceStockItem, getAllApplianceStockItemIds } from '@/services/applianceStockService';
import ApplianceStockClientPage from './client-page';

export const dynamic = 'force-static';
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const ids = await getAllApplianceStockItemIds();
    return ids;
  } catch (error) {
    console.error("Error fetching static params for appliance stock:", error);
    return [{ id: 'default' }];
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = await getApplianceStockItem(params.id);
  if (!item) {
    return { title: 'Stock Item Not Found' };
  }
  return {
    title: `Stock: ${item.name}`,
    description: `Details for stock item: ${item.name}`,
  };
}


export default async function ApplianceStockDetailPage({ params }: { params: { id: string } }) {
  if (params.id === 'default') {
    return (
        <div className="flex justify-center items-center h-screen">
            <h1>Loading stock data...</h1>
            <p>This is a placeholder for static builds.</p>
        </div>
    );
  }

  const item = await getApplianceStockItem(params.id);

  if (!item) {
    return (
        <div className="flex justify-center items-center h-screen">
            <h1>Stock Item not found</h1>
        </div>
    );
  }

  return <ApplianceStockClientPage initialItem={item} />;
}
