"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Input } from "./input";
import { Button } from "./button";
import { useState } from "react";
import { nationsDiff } from "@/actions/util";

export const NationsCheck = () => {
  const [nations, setNations] = useState<string>("")
  const [missing, setMissing] = useState<string[]>([])

  return(
    <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            Check Nations  
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
              <DialogTitle>Check Nations</DialogTitle>
              <DialogDescription>
                Input a string list of nations to get a list of the nations to be added.
              </DialogDescription>
         </DialogHeader>
        <div className="py-4">
          <Input id="nations" value={nations} onChange={(e) => setNations(e.target.value)} className="col-span-3" placeholder="Ravhavan Union,Awalentse,Xie" />
        </div>
        <div className="mb-4 flex flex-col gap-2 max-h-[60vh] overflow-y-scroll">
            {missing.map((v) => <p key={v}>{v}</p>)}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={(e) => {
            nationsDiff(nations.split(',')).then((diff) => setMissing(diff))
          }}>
            Check
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
  )
}
