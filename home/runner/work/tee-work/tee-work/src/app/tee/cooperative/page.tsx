
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Landmark, Users, FilePieChart, Handshake } from "lucide-react"
import Link from 'next/link'
import { Button } from "@/components/ui/button"


export default function CooperativePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Button variant="outline" size="icon" className="h-8 w-8" asChild>
          <Link href="/tee">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">ກັບໄປໜ້າຫຼັກ</span>
          </Link>
        </Button>
        <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-500" />
            <h1 className="text-xl font-bold tracking-tight font-headline">ລະບົບສະຫະກອນອິດສະລາມ</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl">
          <Link href="/tee/cooperative/accountancy">
            <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold font-headline">ຈັດການບັນຊີ</CardTitle>
                <Landmark className="h-8 w-8 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  ຕິດຕາມລາຍຮັບ-ລາຍຈ່າຍ ແລະ ສະຫຼຸບພາບລວມການເງິນຂອງສະຫະກອນ
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/tee/cooperative/members">
            <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold font-headline">ສະມາຊິກ ແລະ ເງິນຝາກ</CardTitle>
                <Users className="h-8 w-8 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  ຈັດການຂໍ້ມູນສະມາຊິກ ແລະ ບັນທຶກເງິນຝາກ
                </p>
              </CardContent>
            </Card>
          </Link>
            <Link href="/tee/cooperative/reports">
            <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold font-headline">ລາຍງານ</CardTitle>
                <FilePieChart className="h-8 w-8 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  ເບິ່ງລາຍງານ ແລະ ສະຫຼຸບຜົນປະກອບການ
                </p>
              </CardContent>
            </Card>
          </Link>
           <Link href="/tee/cooperative/loans">
            <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold font-headline">ລະບົບສິນເຊື່ອ</CardTitle>
                <Handshake className="h-8 w-8 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  ຈັດການສິນເຊື່ອ, ສັນຍາ ແລະ ການຊຳລະຄືນ (Murabahah, Ijarah)
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
