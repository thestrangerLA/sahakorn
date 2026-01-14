
"use client";

import { useState, useEffect, useMemo } from 'react';
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
import type { Loan, CooperativeMember, CurrencyValues, IslamicLoanType } from '@/lib/types';
import { addLoan } from '@/services/cooperativeLoanService';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { useClientRouter } from '@/hooks/useClientRouter';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const formatCurrency = (value: number) => new Intl.NumberFormat('lo-LA').format(value);
const initialCurrencyValues: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };
const currencies: (keyof Omit<CurrencyValues, 'cny'>)[] = ['kip', 'thb', 'usd'];

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
    
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [loanType, setLoanType] = useState<IslamicLoanType>('QARD_HASAN');
    const [principalAmount, setPrincipalAmount] = useState<Omit<CurrencyValues, 'cny'>>({ ...initialCurrencyValues });
    const [murabahaProfitAmount, setMurabahaProfitAmount] = useState<Omit<CurrencyValues, 'cny'>>({ ...initialCurrencyValues });
    const [purpose, setPurpose] = useState('');
    const [applicationDate, setApplicationDate] = useState<Date | undefined>();
    const [durationYears, setDurationYears] = useState<number>(1);
    const [loanCode, setLoanCode] = useState('');
    const [debtorName, setDebtorName] = useState('');
    const [borrowerType, setBorrowerType] = useState<'member' | 'debtor'>('member');


     useEffect(() => {
        setApplicationDate(new Date());
    }, []);

    const repaymentAmount = useMemo(() => {
        if (loanType === 'MURABAHA') {
            return {
                kip: (principalAmount.kip || 0) + (murabahaProfitAmount.kip || 0),
                thb: (principalAmount.thb || 0) + (murabahaProfitAmount.thb || 0),
                usd: (principalAmount.usd || 0) + (murabahaProfitAmount.usd || 0),
            };
        }
        return principalAmount;
    }, [principalAmount, murabahaProfitAmount, loanType]);

    useEffect(() => {
        const unsubscribeMembers = listenToCooperativeMembers(setMembers);
        return () => {
            unsubscribeMembers();
        };
    }, []);

    const handleAmountChange = (stateSetter: React.Dispatch<React.SetStateAction<Omit<CurrencyValues, 'cny'>>>, currency: keyof Omit<CurrencyValues, 'cny'>, value: string) => {
        stateSetter(prev => ({
            ...prev,
            [currency]: Number(value) || 0,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const isNegativeAmount = Object.values(principalAmount).some(v => v < 0) || Object.values(repaymentAmount).some(v => v < 0);
        if(isNegativeAmount) {
            toast({ title: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ", description: "ຈຳນວນເງິນຕ້ອງບໍ່ຕິດລົບ", variant: "destructive" });
            return;
        }

        const totalAmount = (principalAmount.kip || 0) + (principalAmount.thb || 0) + (principalAmount.usd || 0);
        if ((borrowerType === 'member' && !selectedMemberId) || (borrowerType === 'debtor' && !debtorName) || totalAmount === 0 || !applicationDate || !loanCode) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບທຸກຊ່ອງ", variant: "destructive" });
            return;
        }

        const loanData: Omit<Loan, 'id' | 'createdAt' | 'status'> = {
            memberId: borrowerType === 'member' ? selectedMemberId : undefined,
            debtorName: borrowerType === 'debtor' ? debtorName : undefined,
            loanCode,
            amount: { ...principalAmount, cny: 0 },
            repaymentAmount: { ...repaymentAmount, cny: 0 },
            purpose,
            applicationDate: startOfDay(applicationDate),
            loanType: loanType,
            durationYears: loanType === 'QARD_HASAN' ? 0 : durationYears,
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
                <Card className="w-full max-w-4xl">
                    <CardHeader>
                        <CardTitle>ແບບຟອມຄຳຮ້ອງຂໍສິນເຊື່ອ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="grid gap-2">
                                    <Label>ປະເພດຜູ້ກູ້ຢືມ</Label>
                                    <RadioGroup value={borrowerType} onValueChange={(v) => {
                                        setBorrowerType(v as 'member' | 'debtor');
                                        setSelectedMemberId(null);
                                        setDebtorName('');
                                    }} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="member" id="r-member" />
                                            <Label htmlFor="r-member">ສະມາຊິກ</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="debtor" id="r-debtor" />
                                            <Label htmlFor="r-debtor">ບຸກຄົນພາຍນອກ</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                
                                {borrowerType === 'member' ? (
                                    <div className="grid gap-2">
                                        <Label>ສະມາຊິກ</Label>
                                        <MemberSelector members={members} selectedMemberId={selectedMemberId} onSelectMember={setSelectedMemberId} />
                                    </div>
                                ) : (
                                    <div className="grid gap-2">
                                        <Label htmlFor="debtorName">ຊື່ຜູ້ກູ້ຢືມ</Label>
                                        <Input id="debtorName" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="ຊື່ ແລະ ນາມສະກຸນ" required />
                                    </div>
                                )}


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
                                    <Label htmlFor="loanCode">ລະຫັດກູ້ຢືມ</Label>
                                    <Input id="loanCode" value={loanCode} onChange={e => setLoanCode(e.target.value)} placeholder="ຕົວຢ່າງ: LN-001" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label>ປະເພດສິນເຊື່ອ</Label>
                                     <Select value={loanType} onValueChange={(v) => setLoanType(v as IslamicLoanType)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="QARD_HASAN">Qard Hasan (ບໍ່ມີກຳໄລ)</SelectItem>
                                            <SelectItem value="MURABAHA">Murabaha (ມີກຳໄລ)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {loanType !== 'QARD_HASAN' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="durationYears">ໄລຍະເວລາກູ້ຢືມ (ປີ)</Label>
                                        <Input id="durationYears" type="number" value={durationYears} onChange={e => setDurationYears(Number(e.target.value))} placeholder="1" required />
                                    </div>
                                )}
                                 <div className="grid gap-2">
                                    <Label>ຈຸດປະສົງ</Label>
                                    <Input id="purpose" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="ເພື່ອຊຳລະໜີ້, ເພື່ອການສຶກສາ, ..." />
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="grid gap-2 md:col-span-1">
                                    <Label>ຈຳນວນເງິນກູ້ (ເງິນຕົ້ນ)</Label>
                                    <div className="grid grid-cols-2 gap-2 p-2 border rounded-md">
                                        {currencies.map(c => (
                                            <div key={c}>
                                                <Label htmlFor={`amount-${c}`} className="text-xs uppercase">{c}</Label>
                                                <Input id={`amount-${c}`} type="number" value={principalAmount[c] || ''} onChange={e => handleAmountChange(setPrincipalAmount, c, e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {loanType === 'MURABAHA' ? (
                                    <div className="grid gap-2 md:col-span-1">
                                        <Label>ກຳໄລ (Murabaha Profit)</Label>
                                        <div className="grid grid-cols-2 gap-2 p-2 border rounded-md">
                                            {currencies.map(c => (
                                                <div key={c}>
                                                    <Label htmlFor={`profit-${c}`} className="text-xs uppercase">{c}</Label>
                                                    <Input id={`profit-${c}`} type="number" value={murabahaProfitAmount[c] || ''} onChange={e => handleAmountChange(setMurabahaProfitAmount, c, e.target.value)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-2 md:col-span-1">
                                        <Label>ຈຳນວນເງິນຍອດຈ່າຍທັງໝົດ</Label>
                                        <div className="grid grid-cols-2 gap-2 p-2 border rounded-md bg-muted/50">
                                            {currencies.map(c => (
                                                <div key={c}>
                                                    <Label htmlFor={`repayment-${c}`} className="text-xs uppercase">{c}</Label>
                                                    <Input id={`repayment-${c}`} type="number" value={repaymentAmount[c] || ''} disabled className="bg-white"/>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
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

