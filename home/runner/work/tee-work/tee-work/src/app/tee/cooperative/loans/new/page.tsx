
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { ArrowLeft, Calendar as CalendarIcon, Check, ChevronsUpDown, Handshake } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay } from "date-fns";
import type { Loan, LoanType, CooperativeMember } from '@/lib/types';
import { addLoan, listenToCooperativeLoanTypes } from '@/services/cooperativeLoanService';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { useClientRouter } from '@/hooks/useClientRouter';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => new Intl.NumberFormat('lo-LA').format(value);

const MemberSelector = ({ members, selectedMemberId, onSelectMember }: { members: CooperativeMember[], selectedMemberId: string | null, onSelectMember: (id: string | null) => void }) => {
    const [open, setOpen] = useState(false);
    const selectedMemberName = members.find(m => m.id === selectedMemberId)?.name || "ເລືອກສະມາຊິກ...";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    {selectedMemberName}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="ຄົ້ນຫາສະມາຊິກ..." />
                    <CommandEmpty>ບໍ່ພົບສະມາຊິກ.</CommandEmpty>
                    <CommandGroup>
                        {members.map((member) => (
                            <CommandItem
                                key={member.id}
                                value={member.name}
                                onSelect={() => {
                                    onSelectMember(member.id);
                                    setOpen(false);
                                }}
                            >
                                <Check className={cn("mr-2 h-4 w-4", selectedMemberId === member.id ? "opacity-100" : "opacity-0")} />
                                {member.name} ({member.memberId})
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


export default function NewLoanPage() {
    const { toast } = useToast();
    const router = useClientRouter();

    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
    
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [selectedLoanTypeId, setSelectedLoanTypeId] = useState<string | undefined>();
    const [amount, setAmount] = useState<number>(0);
    const [purpose, setPurpose] = useState('');
    const [applicationDate, setApplicationDate] = useState<Date | undefined>(new Date());
    const [loanCode, setLoanCode] = useState('');

    useEffect(() => {
        const unsubscribeMembers = listenToCooperativeMembers(setMembers);
        const unsubscribeLoanTypes = listenToCooperativeLoanTypes(setLoanTypes);
        return () => {
            unsubscribeMembers();
            unsubscribeLoanTypes();
        };
    }, []);
    
    const selectedLoanType = loanTypes.find(lt => lt.id === selectedLoanTypeId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberId || !selectedLoanTypeId || !amount || !applicationDate || !loanCode) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບທຸກຊ່ອງ", variant: "destructive" });
            return;
        }

        const loanData: Omit<Loan, 'id' | 'createdAt' | 'status'> = {
            memberId: selectedMemberId,
            loanTypeId: selectedLoanTypeId,
            loanCode,
            amount,
            interestRate: selectedLoanType?.interestRate || 0,
            term: selectedLoanType?.maxTerm || 12,
            purpose,
            applicationDate: startOfDay(applicationDate),
        };

        try {
            const newLoanId = await addLoan(loanData);
            toast({ title: "ສ້າງຄຳຮ້ອງສິນເຊື່ອສຳເລັດ", description: `ລະຫັດ: ${loanCode}` });
            router.push(`/tee/cooperative/loans/${newLoanId}`);
        } catch (error) {
            console.error("Error creating loan application:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative/loans">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ສ້າງຄຳຮ້ອງຂໍສິນເຊື່ອໃໝ່</h1>
            </header>
             <main className="flex flex-1 items-start justify-center p-4 sm:p-6">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>ແບບຟອມຄຳຮ້ອງຂໍສິນເຊື່ອ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-2">
                                    <Label>ສະມາຊິກ</Label>
                                    <MemberSelector members={members} selectedMemberId={selectedMemberId} onSelectMember={setSelectedMemberId} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="applicationDate">ວັນທີຍື່ນຄຳຮ້ອງ</Label>
                                     <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {applicationDate ? format(applicationDate, "PPP") : <span>ເລືອກວັນທີ</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={applicationDate} onSelect={setApplicationDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid gap-2">
                                    <Label>ປະເພດສິນເຊື່ອ</Label>
                                    <Select onValueChange={setSelectedLoanTypeId} value={selectedLoanTypeId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="ເລືອກປະເພດສິນເຊື່ອ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {loanTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="loanCode">ລະຫັດກູ້ຢືມ</Label>
                                    <Input id="loanCode" value={loanCode} onChange={e => setLoanCode(e.target.value)} placeholder="ຕົວຢ່າງ: LN-001" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="amount">ຈຳນວນເງິນກູ້ (KIP)</Label>
                                    <Input id="amount" type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} required />
                                </div>
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="purpose">ຈຸດປະສົງ</Label>
                                <Textarea id="purpose" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="ເພື່ອຊຳລະໜີ້, ເພື່ອການສຶກສາ, ..." />
                            </div>
                            {selectedLoanType && (
                                <Card className="bg-muted/50">
                                    <CardHeader className="p-4"><CardTitle className="text-md">ລາຍລະອຽດປະເພດສິນເຊື່ອ</CardTitle></CardHeader>
                                    <CardContent className="p-4 pt-0 text-sm space-y-2">
                                        <div className="grid grid-cols-3 gap-2">
                                            <p><strong>ວົງເງິນສູງສຸດ:</strong> {formatCurrency(selectedLoanType.maxAmount)}</p>
                                            <p><strong>ອັດຕາດອກເບ້ຍ:</strong> {selectedLoanType.interestRate}% / ປີ</p>
                                            <p><strong>ໄລຍະເວລາສູງສຸດ:</strong> {selectedLoanType.maxTerm} ເດືອນ</p>
                                        </div>
                                        {selectedLoanType.detail && <p className="text-muted-foreground pt-2"><strong>ລາຍລະອຽດ:</strong> {selectedLoanType.detail}</p>}
                                    </CardContent>
                                </Card>
                            )}
                            <div className="flex justify-end pt-4">
                                <Button type="submit"><Handshake className="mr-2 h-4 w-4"/> ຍື່ນຄຳຮ້ອງ</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
