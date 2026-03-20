
import type { Metadata } from 'next';
import { getLoan, getAllCooperativeLoanIds } from '@/services/cooperativeLoanService';
import LoanDetailPageClient from './client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { toDateSafe } from '@/lib/timestamp';

export const dynamic = 'force-static';
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const ids = await getAllCooperativeLoanIds();
    if (ids.length === 0) {
      return [{ id: 'default' }];
    }
    return ids;
  } catch (error) {
    console.error("Error fetching static params for loans:", error);
    return [{ id: 'default' }];
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  if (params.id === 'default') {
      return { title: 'Loan Details' };
  }
  const loan = await getLoan(params.id);
  if (!loan) {
    return { title: 'Loan Not Found' };
  }
  return {
    title: `Loan: ${loan.loanCode}`,
    description: `Details for loan ${loan.loanCode}`,
  };
}

export default async function LoanPage({ params }: { params: { id: string } }) {
  const { id } = params;

  if (id === 'default') {
      return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p className="text-2xl font-semibold mb-4">Loading Loan Details...</p>
                <p>This is a placeholder page for static export. Please navigate from the loans list.</p>
            </div>
      );
  }

  const loan = await getLoan(id);

  if (!loan) {
    return (
        <div className="flex justify-center items-center h-screen">
            <h1>Loan not found</h1>
        </div>
    );
  }

  return <LoanDetailPageClient initialLoan={loan} />;
}
