"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trash2, PlusCircle, Edit, MinusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, getYear } from "date-fns";
import type { CooperativeMember, CooperativeDeposit } from '@/lib/types';
import { listenToCooperativeDepositsForMember, updateCooperativeMember } from '@/services/cooperativeMemberService';
import { addCooperativeDeposit, deleteCooperativeDeposit } from '@/services/cooperativeDepositService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { AddDepositDialog } from './_components/AddDepositDialog';
import { EditMemberDialog } from './_components/EditMemberDialog';
import { WithdrawDepositDialog } from './_components/WithdrawDepositDialog';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function MemberDetailPageClient({ initialMember, initialDeposits }: { initialMember: CooperativeMember, initialDeposits: CooperativeDeposit[] }) {
    const { toast } = useToast();
    const [member, setMember] = useState(initialMember);
    const [deposits, setDeposits] = useState(initialDeposits);
    const [isAddDepositOpen, setAddDepositOpen] = useState(false);
    const [isWithdrawDepositOpen, setWithdrawDepositOpen] = useState(false);
    const [isEditMemberOpen, setEditMemberOpen] = useState(false);

     useEffect(() => {
        const unsubscribe = listenToCooperativeDepositsForMember(member.id, setDeposits);
        return () => unsubscribe();
    }, [member.id]);

    const totalDeposits = useMemo(() => {
        if (!member) return { kip: 0, thb: 0, usd: 0, cny: 0 };
        return deposits.reduce((sum, d) => {
            sum.kip += d.kip || 0;
            sum.thb += d.thb || 0;
            sum.usd += d.usd || 0;
            sum.cny += d.cny || 0;
            return sum;
        }, { 
            kip: member.deposits?.kip || 0, 
            thb: member.deposits?.thb || 0, 
            usd: member.deposits?.usd || 0,
            cny: member.deposits?.cny || 0,
        });
    }, [deposits, member]);

     const chartData = useMemo(() => {
        const currentYear = getYear(new Date());
        const monthlyDeposits: { [key: string]: number } = {};

        for(let i = 0; i < 12; i++) {
            const monthName = format(new Date(currentYear, i), 'MMM');
            monthlyDeposits[monthName] = 0;
        }

        deposits.forEach(deposit => {
            if (getYear(deposit.date) === currentYear) {
                const monthName = format(deposit.date, 'MMM');
                monthlyDeposits[monthName] += deposit.kip || 0; // Charting KIP for now
            }
        });

        return Object.keys(monthlyDeposits).map(month => ({
            month,
            deposit: monthlyDeposits[month],
        }));

    }, [deposits]);

    const handleAddDeposit = async (deposit: Omit<CooperativeDeposit, 'id' | 'createdAt' | 'memberName' | 'memberId'>) => {
        if (!member) return;
        try {
            await addCooperativeDeposit({
                memberId: member.id,
                memberName: member.name,
                ...deposit
            });
            toast({ title: "ເພີ່ມເງິນຝາກສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    const handleWithdrawDeposit = async (withdrawal: Omit<CooperativeDeposit, 'id' | 'createdAt' | 'memberName' | 'memberId'>) => {
        if (!member) return;
        try {
            await addCooperativeDeposit({
                memberId: member.id,
                memberName: member.name,
                date: withdrawal.date,
                kip: -Math.abs(withdrawal.kip),
                thb: -Math.abs(withdrawal.thb),
                usd: -Math.abs(withdrawal.usd),
                cny: -Math.abs(withdrawal.cny),
            });
            toast({ title: "ບັນທຶກການຖອນເງິນສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການຖອນເງິນ", variant: "destructive" });
        }
    };
    
    const handleDeleteDeposit = async (id: string) => {
        if (!window.confirm("ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການຝາກເງິນນີ້?")) return;
        try {
            await deleteCooperativeDeposit(id);
            toast({ title: "ລຶບລາຍການສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };
    
    if (!member) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 sm:px-6 md:gap-8">
                 <Skeleton className="h-14 w-full" />
                 <Skeleton className="h-[100px] w-full mt-4" />
                 <Skeleton className="h-[400px] w-full mt-4" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative/members">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">{member.name}</h1>
                </div>
                 <div className="ml-auto flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditMemberOpen(true)}><Edit className="mr-2 h-4 w-4"/> ແກ້ໄຂຂໍ້ມູນ</Button>
                    <Button size="sm" variant="destructive" onClick={() => setWithdrawDepositOpen(true)}><MinusCircle className="mr-2 h-4 w-4"/> ຖອນເງິນ</Button>
                    <Button size="sm" onClick={() => setAddDepositOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> ເພີ່ມເງິນຝາກ</Button>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>ລະຫັດສະມາຊິກ</CardDescription>
                            <CardTitle className="text-2xl">{member.memberId}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>ວັນທີສະໝັກ</CardDescription>
                            <CardTitle className="text-2xl">{format(new Date(member.joinDate), 'dd MMMM yyyy')}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
                 <Card className="mb-4">
                    <CardHeader className="pb-2">
                        <CardDescription>ຍອດເງິນຝາກລວມ</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">KIP</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDeposits.kip)}</p>
                        </div>
                         <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">THB</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDeposits.thb)}</p>
                        </div>
                         <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">USD</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDeposits.usd)}</p>
                        </div>
                         <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">CNY</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDeposits.cny)}</p>
                        </div>
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>ປະຫວັດການຝາກເງິນ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ວັນທີ</TableHead>
                                        <TableHead className="text-right">ຈຳນວນເງິນ</TableHead>
                                        <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deposits.length > 0 ? deposits.map(deposit => (
                                        <TableRow key={deposit.id}>
                                            <TableCell>{format(deposit.date, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {deposit.kip !== 0 && <div className={deposit.kip < 0 ? 'text-red-600' : ''}>{formatCurrency(deposit.kip)} KIP</div>}
                                                {deposit.thb !== 0 && <div className={deposit.thb < 0 ? 'text-red-600' : ''}>{formatCurrency(deposit.thb)} THB</div>}
                                                {deposit.usd !== 0 && <div className={deposit.usd < 0 ? 'text-red-600' : ''}>{formatCurrency(deposit.usd)} USD</div>}
                                                {deposit.cny !== 0 && <div className={deposit.cny < 0 ? 'text-red-600' : ''}>{formatCurrency(deposit.cny)} CNY</div>}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteDeposit(deposit.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">ຍັງບໍ່ມີປະຫວັດການຝາກເງິນ</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>ພາບລວມການຝາກເງິນ (KIP) ປີ {getYear(new Date()) + 543}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                                    <Tooltip formatter={(value) => `${formatCurrency(value as number)} KIP`} />
                                    <Legend />
                                    <Bar dataKey="deposit" fill="#8884d8" name="ເງິນຝາກ" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <AddDepositDialog 
                open={isAddDepositOpen} 
                onOpenChange={setAddDepositOpen}
                onAddDeposit={handleAddDeposit}
                memberName={member.name}
            />
            <WithdrawDepositDialog 
                open={isWithdrawDepositOpen} 
                onOpenChange={setWithdrawDepositOpen}
                onWithdrawDeposit={handleWithdrawDeposit}
                memberName={member.name}
            />
            <EditMemberDialog
                open={isEditMemberOpen}
                onOpenChange={setEditMemberOpen}
                member={member}
                onMemberUpdate={setMember}
            />
        </div>
    );
}
