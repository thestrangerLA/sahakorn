

import { getAllCooperativeMemberIds, getCooperativeMember } from '@/services/cooperativeMemberService';
import MemberDetailPageClient from './client-page';
import { Skeleton } from '@/components/ui/skeleton';
import type { Metadata } from 'next';

export const dynamic = 'force-static';
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const ids = await getAllCooperativeMemberIds();
    if (ids.length === 0) {
      return [{ id: 'default' }];
    }
    return ids;
  } catch (error) {
    console.error("Error fetching static params for cooperative members:", error);
    return [{ id: 'default' }];
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  if (params.id === 'default') {
      return { title: 'Member Details' };
  }
  const member = await getCooperativeMember(params.id);
  
  if (!member) {
    return {
      title: 'Member Not Found',
    }
  }

  return {
    title: `Member: ${member.name}`,
    description: `Deposit details for member ${member.name}`,
  }
}


export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  if (id === 'default') {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <p className="text-2xl font-semibold mb-4">Loading Member Details...</p>
            <p>This is a placeholder page for static export.</p>
        </div>
    );
  }
  
  const member = await getCooperativeMember(id);

  if (!member) {
    return (
        <div className="flex justify-center items-center h-screen">
            <h1>Member not found</h1>
        </div>
    );
  }
  
  // Initially, we pass empty deposits. The client-side component will fetch them.
  return <MemberDetailPageClient initialMember={member} initialDeposits={[]} />;
}
