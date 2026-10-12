'use client'

export function ArmyCalculator({pop}: {pop: number}) {
  const km = Math.round((2*((0.005*pop)/(1+Math.sqrt(pop/10000000)))));
  const lm = Math.round((2.5*((0.015*pop)/Math.pow(1+(pop/10000000),0.8))));
  const kr = Math.round(km*0.4);
  const lr = Math.round(lm*0.7);
  return (
    <>
      <div className="flex gap-4">
        <p className="text-muted-foreground">Km: {km.toLocaleString() || '-'}</p>
        <p className="text-muted-foreground">Lm: {lm.toLocaleString() || '-'}</p>
      </div>
      <div className="flex gap-4">
        <p className="text-muted-foreground">Kr: {kr.toLocaleString() || '-'}</p>
        <p className="text-muted-foreground">Lr: {lr.toLocaleString() || '-'}</p>
      </div>
    </>
  )
}

export function EmpireArmyCalculator({pops}: {pops: number[]}) {
  const km = pops.reduce((acc, pop) => acc + Math.round((2*((0.005*pop)/(1+Math.sqrt(pop/10000000))))), 0);
  const lm = pops.reduce((acc, pop) => acc + Math.round((2.5*((0.015*pop)/Math.pow(1+(pop/10000000),0.8)))), 0);
  const kr = pops.reduce((acc, pop) => acc + Math.round((2*((0.005*pop)/(1+Math.sqrt(pop/10000000))))*0.4), 0);
  const lr = pops.reduce((acc, pop) => acc + Math.round((2.5*((0.015*pop)/Math.pow(1+(pop/10000000),0.8)))*0.7), 0);
  return (
    <>
      <div className="flex gap-4">
        <p className="text-muted-foreground">Km: {km.toLocaleString() || '-'}</p>
        <p className="text-muted-foreground">Lm: {lm.toLocaleString() || '-'}</p>
      </div>
      <div className="flex gap-4">
        <p className="text-muted-foreground">Kr: {kr.toLocaleString() || '-'}</p>
        <p className="text-muted-foreground">Lr: {lr.toLocaleString() || '-'}</p>
      </div>
    </>
  )
}
