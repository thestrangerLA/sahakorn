"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, MinusCircle } from "lucide-react";
import { format, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { CooperativeDeposit } from '@/lib/types';

interface WithdrawDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWithdrawDeposit: (withdrawal: Omit<CooperativeDeposit, 'id' | 'createdAt' | 'memberName' | 'memberId'>) => Promise<void>;
  memberName: string;
}

export function WithdrawDepositDialog({ open, onOpenChange, onWithdrawDeposit, memberName }: WithdrawDepositDialogProps) {
    const { toast } = useToast();
    const [withdrawalDate, setWithdrawalDate] = useState<Date | undefined>(new Date());
    const [kip, setKip] = useState(0);
    const [thb, setThb] = useState(0);
    const [usd, setUsd] = useState(0);
    const [cny, setCny] = useState(0);

    const handleSubmit = async () => {
        if (!withdrawalDate) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາເລືອກວັນທີ", variant: "destructive" });
            return;
        }

        const totalWithdrawal = kip + thb + usd + cny;
        if (totalWithdrawal <= 0) {
            toast({ title: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ", description: "ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຕ້ອງການຖອນ", variant: "destructive" });
            return;
        }

        try {
            await onWithdrawDeposit({
                date: startOfDay(withdrawalDate),
                kip,
                thb,
                usd,
                cny,
            });
            toast({ title: "ບັນທຶກການຖອນເງິນສຳເລັດ" });
            onOpenChange(false);
            setWithdrawalDate(new Date());
            setKip(0);
            setThb(0);
            setUsd(0);
            setCny(0);
        } catch (error) {
            console.error("Error withdrawing deposit:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ຖອນເງິນຝາກ: {memberName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>ວັນທີຖອນ</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {withdrawalDate ? format(withdrawalDate, "PPP") : <span>ເລືອກວັນທີ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={withdrawalDate} onSelect={setWithdrawalDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
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
                         <div className="grid gap-2">
                            <Label>ຈຳນວນເງິນ (CNY)</Label>
                            <Input type="number" value={cny || ''} onChange={e => setCny(Number(e.target.value))} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ຍົກເລີກ</Button>
                    <Button onClick={handleSubmit} variant="destructive">
                        <MinusCircle className="mr-2 h-4 w-4" />
                        ຢືນຢັນການຖອນ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
