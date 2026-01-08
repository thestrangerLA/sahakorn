
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trash2, PlusCircle, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, getYear } from "date-fns";
import type { CooperativeMember, CooperativeDeposit } from '@/lib/types';
import { getCooperativeMember, listenToCooperativeDepositsForMember, updateCooperativeMember } from '@/services/cooperativeMemberService';
import { addCooperativeDeposit, deleteCooperativeDeposit } from '@/services/cooperativeDepositService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from "lucide-react";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { startOfDay } from 'date-fns';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const AddDepositDialog = ({ open, onOpenChange, onAddDeposit, memberName }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDeposit: (deposit: Omit<CooperativeDeposit, 'id' | 'createdAt' | 'memberName' | 'memberId'>) => Promise<void>;
  memberName: string;
}) => {
    const { toast } = useToast();
    const [depositDate, setDepositDate] = useState<Date | undefined>(new Date());
    const [kip, setKip] = useState(0);
    const [thb, setThb] = useState(0);
    const [usd, setUsd] = useState(0);

    const handleSubmit = async () => {
        if (!depositDate) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາເລືອກວັນທີ", variant: "destructive" });
            return;
        }

        try {
            await onAddDeposit({
                date: startOfDay(depositDate),
                kip,
                thb,
                usd,
            });
            toast({ title: "ບັນທຶກເງິນຝາກສຳເລັດ" });
            onOpenChange(false);
            setDepositDate(new Date());
            setKip(0);
            setThb(0);
            setUsd(0);
        } catch (error) {
            console.error("Error adding deposit:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ເພີ່ມເງິນຝາກ: {memberName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>ວັນທີຝາກ</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {depositDate ? format(depositDate, "PPP") : <span>ເລືອກວັນທີ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={depositDate} onSelect={setDepositDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid gap-2">
                        <Label>ຈຳນວນເງິນ (KIP)</Label>
                        <Input type="number" value={kip || ''} onChange={e => setKip(Number(e.target.value))} />
                    </div>
                     <div className="grid gap-2">
                        <Label>ຈຳນວນເງິນ (THB)</Label>
                        <Input type="number" value={thb || ''} onChange={e => setThb(Number(e.target.value))} />
                    </div>
                     <div className="grid gap-2">
                        <Label>ຈຳນວນເງິນ (USD)</Label>
                        <Input type="number" value={usd || ''} onChange={e => setUsd(Number(e.target.value))} />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ຍົກເລີກ</Button>
                    <Button onClick={handleSubmit}>ບັນທຶກ</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const EditMemberDialog = ({ open, onOpenChange, member, onMemberUpdate }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: CooperativeMember;
  onMemberUpdate: (updatedMember: CooperativeMember) => void;
}) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState(member);
    
    useEffect(() => {
        setFormData(member);
    }, [member, open]);

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleDepositChange = (currency: 'kip' | 'thb' | 'usd', value: string) => {
        setFormData(prev => ({
            ...prev,
            deposits: {
                ...prev.deposits,
                [currency]: Number(value) || 0
            }
        }));
    };

    const handleSave = async () => {
        try {
            const dataToUpdate = {
                memberId: formData.memberId,
                name: formData.name,
                joinDate: startOfDay(formData.joinDate),
                deposits: formData.deposits
            };
            await updateCooperativeMember(member.id, dataToUpdate);
            onMemberUpdate(formData); // Update local state in parent
            toast({ title: 'ອັບເດດຂໍ້ມູນສະມາຊິກສຳເລັດ' });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update member:", error);
            toast({ title: 'ເກີດຂໍ້ຜິດພາດ', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ແກ້ໄຂຂໍ້ມູນສະມາຊິກ</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="grid gap-2">
                        <Label htmlFor="edit-memberId">ລະຫັດສະມາຊິກ</Label>
                        <Input id="edit-memberId" value={formData.memberId} onChange={e => handleChange('memberId', e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-name">ຊື່-ນາມສະກຸນ</Label>
                        <Input id="edit-name" value={formData.name} onChange={e => handleChange('name', e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-joinDate">ວັນທີສະໝັກ</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.joinDate ? format(new Date(formData.joinDate), "PPP") : <span>ເລືອກວັນທີ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={new Date(formData.joinDate)} onSelect={(d) => handleChange('joinDate', d)} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-2">
                        <Label>ຍອດເງິນຝາກເລີ່ມຕົ້ນ</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <Input placeholder="KIP" type="number" value={formData.deposits.kip || ''} onChange={(e) => handleDepositChange('kip', e.target.value)} />
                            <Input placeholder="THB" type="number" value={formData.deposits.thb || ''} onChange={(e) => handleDepositChange('thb', e.target.value)} />
                            <Input placeholder="USD" type="number" value={formData.deposits.usd || ''} onChange={(e) => handleDepositChange('usd', e.target.value)} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ຍົກເລີກ</Button>
                    <Button onClick={handleSave}>ບັນທຶກ</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function MemberDetailPage() {
    const { toast } = useToast();
    const params = useParams();
    const id = params.id as string;
    
    const [member, setMember] = useState<CooperativeMember | null>(null);
    const [deposits, setDeposits] = useState<CooperativeDeposit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDepositOpen, setAddDepositOpen] = useState(false);
    const [isEditMemberOpen, setEditMemberOpen] = useState(false);

     useEffect(() => {
        if (!id) return;
        setLoading(true);
        
        getCooperativeMember(id).then(memberData => {
            if (memberData) {
                setMember(memberData);
                const unsubscribe = listenToCooperativeDepositsForMember(id, setDeposits);
                setLoading(false);
                return () => unsubscribe();
            } else {
                setLoading(false);
            }
        });
    }, [id]);

    const totalDeposits = useMemo(() => {
        if (!member) return { kip: 0, thb: 0, usd: 0 };
        return deposits.reduce((sum, d) => {
            sum.kip += d.kip || 0;
            sum.thb += d.thb || 0;
            sum.usd += d.usd || 0;
            return sum;
        }, { 
            kip: member.deposits?.kip || 0, 
            thb: member.deposits?.thb || 0, 
            usd: member.deposits?.usd || 0 
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
    
    const handleDeleteDeposit = async (id: string) => {
        if (!window.confirm("ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການຝາກເງິນນີ້?")) return;
        try {
            await deleteCooperativeDeposit(id);
            toast({ title: "ລຶບລາຍການສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };
    
    if (loading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 sm:px-6 md:gap-8">
                 <Skeleton className="h-14 w-full" />
                 <Skeleton className="h-[100px] w-full mt-4" />
                 <Skeleton className="h-[400px] w-full mt-4" />
            </div>
        );
    }
    
    if (!member) {
        return <div className="flex justify-center items-center h-screen"><h1>ບໍ່ພົບຂໍ້ມູນສະມາຊິກ</h1></div>
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
                    <CardContent className="grid grid-cols-3 gap-4">
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
                                        <TableHead className="text-right">KIP</TableHead>
                                        <TableHead className="text-right">THB</TableHead>
                                        <TableHead className="text-right">USD</TableHead>
                                        <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deposits.length > 0 ? deposits.map(deposit => (
                                        <TableRow key={deposit.id}>
                                            <TableCell>{format(deposit.date, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(deposit.kip || 0)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(deposit.thb || 0)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(deposit.usd || 0)}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteDeposit(deposit.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">ຍັງບໍ່ມີປະຫວັດການຝາກເງິນ</TableCell>
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
            <EditMemberDialog
                open={isEditMemberOpen}
                onOpenChange={setEditMemberOpen}
                member={member}
                onMemberUpdate={setMember}
            />
        </div>
    );
}
