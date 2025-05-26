'use client'

import { useState } from "react"
import { Input } from "./input"

function ArmyCalculator({pop}: {pop: number}) {
  const [rate, setRate] = useState(0.01)
  return (
    <div className="flex gap-4">
        <Input className="max-w-24" value={rate}  type="number" step={0.01} onChange={(e)=>setRate(parseFloat(e.currentTarget.value))}/>
        <p className="text-muted-foreground">{rate * 100}%: {(pop * rate).toLocaleString() || '-'}</p>
    </div>
  )
}

export default ArmyCalculator
