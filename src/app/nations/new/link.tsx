"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

function NewLink() {
  return (
    <Button variant="outline" size="icon" asChild>
      <Link href="/nations">
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  )
}

export default NewLink
