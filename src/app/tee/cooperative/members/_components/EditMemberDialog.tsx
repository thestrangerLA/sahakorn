"use client";

import { useState, useEffect } from 'react';
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
import { Calendar as CalendarIcon } from "lucide-react";
import { format, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { CooperativeMember, CurrencyValues } from '@/lib/types';
import { updateCooperativeMember } from '@/services/cooperativeMemberService';

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: CooperativeMember;
  onMemberUpdate: (updatedMember: CooperativeMember) => void;
}

export function EditMemberDialog({ open, onOpenChange, member, onMemberUpdate }: EditMemberDialogProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState(member);
    
    useEffect(() => {
        setFormData(member);
    }, [member, open]);

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleDepositChange = (currency: keyof Omit<CurrencyValues, 'cny'>, value: string) => {
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
                joinDate: startOfDay(new Date(formData.joinDate)),
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
                        <div className="grid grid-cols-2 gap-2">
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
