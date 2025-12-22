
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Landmark, Users } from "lucide-react"
import Link from 'next/link'
import { Button } from "@/components/ui/button"


export default function TeePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Button variant="outline" size="icon" className="h-8 w-8" asChild>
          <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">ກັບໄປໜ້າຫຼັກ</span>
          </Link>
        </Button>
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight font-headline">ທຸລະກິດ Tee</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 w-full max-w-4xl">
          <Link href="/tee/central-account">
            <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold font-headline">ບັນຊີກອງກາງ</CardTitle>
                <Landmark className="h-8 w-8 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  ຈັດການບັນຊີກອງກາງ
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/tee/student-account">
            <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold font-headline">ບັນຊີນັກສຶກສາ</CardTitle>
                <Users className="h-8 w-8 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  ຈັດການບັນຊີນັກສຶກສາ
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
