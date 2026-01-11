
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, isWithinInterval, startOfMonth, endOfMonth, getYear, setMonth, getMonth } from "date-fns";
import { ArrowLeft, Users, Calendar as CalendarIcon, Trash2, PlusCircle, MoreHorizontal, PiggyBank, ChevronDown, Search } from "lucide-react";
import type { CooperativeMember, CooperativeDeposit } from '@/lib/types';
import { listenToCooperativeMembers, addCooperativeMember, deleteCooperativeMember } from '@/services/cooperativeMemberService';
import { listenToCooperativeDeposits, addCooperativeDeposit, deleteCooperativeDeposit } from '@/services/cooperativeDepositService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const AddMemberDialog = ({ onAddMember }: { onAddMember: (member: Omit<CooperativeMember, 'id' | 'createdAt'>) => Promise<void> }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [memberId, setMemberId] = useState('');
    const [name, setName] = useState('');
    const [joinDate, setJoinDate] = useState<Date | undefined>(new Date());
    const [deposits, setDeposits] = useState({ kip: 0, thb: 0, usd: 0 });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memberId || !name || !joinDate) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", variant: "destructive" });
            return;
        }

        try {
            await onAddMember({
                memberId,
                name,
                joinDate: startOfDay(joinDate),
                deposits,
            });
            toast({ title: "ເພີ່ມສະມາຊິກສຳເລັດ" });
            setOpen(false);
            // Reset form
            setMemberId('');
            setName('');
            setJoinDate(new Date());
            setDeposits({ kip: 0, thb: 0, usd: 0 });
        } catch (error) {
            console.error("Error adding member:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມສະມາຊິກ</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ເພີ່ມສະມາຊິກໃໝ່</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="memberId">ລະຫັດສະມາຊິກ</Label>
                        <Input id="memberId" value={memberId} onChange={e => setMemberId(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="name">ຊື່-ນາມສະກຸນ</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="joinDate">ວັນທີສະໝັກ</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {joinDate ? format(joinDate, "PPP") : <span>ເລືອກວັນທີ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={joinDate} onSelect={setJoinDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid gap-2">
                        <Label>ເງິນຝາກເລີ່ມຕົ້ນ</Label>
                        <div className="grid grid-cols-3 gap-2">
                           <Input type="number" placeholder="KIP" value={deposits.kip || ''} onChange={e => setDeposits(p => ({...p, kip: Number(e.target.value)}))} />
                           <Input type="number" placeholder="THB" value={deposits.thb || ''} onChange={e => setDeposits(p => ({...p, thb: Number(e.target.value)}))} />
                           <Input type="number" placeholder="USD" value={deposits.usd || ''} onChange={e => setDeposits(p => ({...p, usd: Number(e.target.value)}))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>ຍົກເລີກ</Button>
                        <Button type="submit">ບັນທຶກ</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
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

export default function CooperativeMembersPage() {
    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [deposits, setDeposits] = useState<CooperativeDeposit[]>([]);
    const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
    const [selectedMember, setSelectedMember] = useState<CooperativeMember | null>(null);
    const [isAddDepositOpen, setAddDepositOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribeMembers = listenToCooperativeMembers(setMembers);
        const unsubscribeDeposits = listenToCooperativeDeposits(setDeposits);
        return () => {
            unsubscribeMembers();
            unsubscribeDeposits();
        };
    }, []);
    
    const membersWithTotalDeposits = useMemo(() => {
        const filteredMembers = members.filter(member => 
            member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.memberId.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return filteredMembers.map(member => {
            const memberDeposits = deposits.filter(d => d.memberId === member.id);
            const totalDeposits = {
                kip: (member.deposits?.kip || 0) + memberDeposits.reduce((sum, d) => sum + (d.kip || 0), 0),
                thb: (member.deposits?.thb || 0) + memberDeposits.reduce((sum, d) => sum + (d.thb || 0), 0),
                usd: (member.deposits?.usd || 0) + memberDeposits.reduce((sum, d) => sum + (d.usd || 0), 0),
            };
            const shares = Math.floor(totalDeposits.kip / 100000);
            return { ...member, totalDeposits, shares, deposits: memberDeposits };
        }).sort((a,b) => (a.memberId > b.memberId) ? 1 : -1);
    }, [members, deposits, searchQuery]);
    
    const filteredDeposits = (memberDeposits: CooperativeDeposit[]) => {
        const start = startOfMonth(displayMonth);
        const end = endOfMonth(displayMonth);
        return memberDeposits.filter(d => isWithinInterval(d.date, { start, end }));
    };
    
    const grandTotalDeposits = useMemo(() => {
        return membersWithTotalDeposits.reduce((sum, m) => {
            sum.kip += m.totalDeposits.kip;
            sum.thb += m.totalDeposits.thb;
            sum.usd += m.totalDeposits.usd;
            return sum;
        }, { kip: 0, thb: 0, usd: 0 });
    }, [membersWithTotalDeposits]);


    const handleAddMember = async (member: Omit<CooperativeMember, 'id' | 'createdAt'>) => {
        await addCooperativeMember(member);
    };

    const handleDeleteMember = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບສະມາຊິກຄົນນີ້? ການກະທຳນີ້ຈະລຶບຂໍ້ມູນເງິນຝາກທັງໝົດຂອງສະມາຊິກຄົນນີ້ອອກໄປນຳ.")) {
            await deleteCooperativeMember(id);
            toast({ title: "ລຶບສະມາຊິກສຳເລັດ" });
        }
    };
    
    const handleDeleteDeposit = async (id: string) => {
        if (window.confirm("ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການຝາກເງິນນີ້?")) {
            await deleteCooperativeDeposit(id);
            toast({ title: "ລຶບລາຍການສຳເລັດ" });
        }
    };
    
    const handleAddDeposit = async (deposit: Omit<CooperativeDeposit, 'id' | 'createdAt' | 'memberName' | 'memberId'>) => {
        if (!selectedMember) return;
        try {
            await addCooperativeDeposit({
                memberId: selectedMember.id,
                memberName: selectedMember.name,
                ...deposit
            });
            toast({ title: "ເພີ່ມເງິນຝາກສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };
    
    const openAddDepositDialog = (member: CooperativeMember) => {
        setSelectedMember(member);
        setAddDepositOpen(true);
    }
    
    const MonthYearSelector = () => {
        const currentYear = getYear(new Date());
        const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
        years.push(2025);
        const uniqueYears = [...new Set(years)].sort();

        const months = Array.from({ length: 12 }, (_, i) => setMonth(new Date(), i));

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                        {displayMonth ? format(displayMonth, "LLLL yyyy") : 'Select Month'}
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {uniqueYears.map(year => (
                         <DropdownMenuSub key={year}>
                            <DropdownMenuSubTrigger>
                                <span>{year + 543}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    {months.map(month => (
                                        <DropdownMenuItem 
                                            key={getMonth(month)} 
                                            onClick={() => {
                                                const newDate = new Date(year, getMonth(month), 1);
                                                setDisplayMonth(newDate);
                                            }}
                                        >
                                            {format(month, "LLLL")}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                             </DropdownMenuPortal>
                        </DropdownMenuSub>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ລະບົບບັນຊີສະມາຊິກ ແລະ ເງິນຝາກ</h1>
                 <div className="ml-auto flex items-center gap-2">
                    <MonthYearSelector />
                    <AddMemberDialog onAddMember={handleAddMember} />
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0">
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ສະມາຊິກທັງໝົດ</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{members.length} ຄົນ</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ຍອດເງິນຝາກລວມທັງໝົດ</CardTitle>
                            <PiggyBank className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-x-4">
                            <p className="text-lg font-bold">KIP: {formatCurrency(grandTotalDeposits.kip)}</p>
                            <p className="text-lg font-bold">THB: {formatCurrency(grandTotalDeposits.thb)}</p>
                            <p className="text-lg font-bold">USD: {formatCurrency(grandTotalDeposits.usd)}</p>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>ລາຍຊື່ສະມາຊິກ</CardTitle>
                                <CardDescription>ກົດທີ່ລາຍການເພື່ອເບິ່ງປະຫວັດການຝາກເງິນ</CardDescription>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="ຄົ້ນຫາຕາມຊື່ ຫຼື ລະຫັດ..."
                                    className="pl-8 sm:w-[300px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                             {membersWithTotalDeposits.map(member => {
                                const monthlyDeposits = filteredDeposits(member.deposits);
                                return (
                                <AccordionItem value={member.id} key={member.id}>
                                    <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                                        <div className="flex justify-between items-center w-full">
                                            <div className="text-left">
                                                <p className="font-semibold">{member.name} <span className="font-mono text-xs text-muted-foreground">({member.memberId})</span></p>
                                                <p className="text-sm text-muted-foreground">ສະໝັກວັນທີ: {format(new Date(member.joinDate), 'dd/MM/yyyy')}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right text-sm">
                                                    <p className="font-bold text-blue-600">{member.shares} ຫຸ້ນ</p>
                                                </div>
                                                <div className="text-right text-xs">
                                                    <p>KIP: <span className="font-semibold">{formatCurrency(member.totalDeposits.kip)}</span></p>
                                                    <p>THB: <span className="font-semibold">{formatCurrency(member.totalDeposits.thb)}</span></p>
                                                    <p>USD: <span className="font-semibold">{formatCurrency(member.totalDeposits.usd)}</span></p>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuLabel>ການດຳເນີນການ</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => window.location.href = `/tee/cooperative/members/${member.id}`}>ເບິ່ງໜ້າລາຍລະອຽດ</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => openAddDepositDialog(member)}>ເພີ່ມເງິນຝາກ</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-500" onSelect={(e) => handleDeleteMember(e, member.id)}>ລຶບສະມາຊິກ</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-muted/20">
                                         <h4 className="font-semibold mb-2">ປະຫວັດການຝາກເງິນເດືອນ {displayMonth ? format(displayMonth, 'LLLL') : ''}</h4>
                                         {monthlyDeposits.length > 0 ? (
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
                                                    {monthlyDeposits.map(deposit => (
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
                                                    ))}
                                                </TableBody>
                                            </Table>
                                         ) : (
                                             <p className="text-sm text-muted-foreground text-center py-4">ບໍ່ມີການຝາກເງິນໃນເດືອນນີ້.</p>
                                         )}
                                    </AccordionContent>
                                </AccordionItem>
                            )})}
                        </Accordion>
                         {membersWithTotalDeposits.length === 0 && (
                            <div className="text-center text-muted-foreground py-16">
                                ຍັງບໍ່ມີສະມາຊິກ. ກົດ "ເພີ່ມສະມາຊິກ" ເພື່ອເລີ່ມຕົ້ນ.
                            </div>
                         )}
                    </CardContent>
                </Card>
            </main>
            {selectedMember && (
                <AddDepositDialog
                    open={isAddDepositOpen}
                    onOpenChange={setAddDepositOpen}
                    onAddDeposit={handleAddDeposit}
                    memberName={selectedMember.name}
                />
            )}
        </div>
    );
}
