"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState } from "react";
import { archiveNationByName, nationsDiff } from "@/actions/util";
import { Label } from "../ui/label";

export const NationsCheck = () => {
  const [nations, setNations] = useState<string>("");
  const [missing, setMissing] = useState<string[]>([]);
  const [toArchive, setToArchive] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Check Nations</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check Nations</DialogTitle>
          <DialogDescription>
            Input a string list of nations to get a list of the nations to be
            added.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            id="nations"
            value={nations}
            onChange={(e) => setNations(e.target.value)}
            className="col-span-3"
            placeholder="Ravhavan Union,Awalentse,Xie"
          />
        </div>
        <div className="mb-4 flex flex-col gap-2 max-h-[60vh] overflow-y-scroll">
          <h1 className="text-xl text-bold">To Create</h1>
          {missing.map((v) => (
            <p key={v} className="text-sm">
              {v}
            </p>
          ))}
          <h1 className="text-xl text-bold">To Archive</h1>
          {toArchive.map((v) => (
            <div key={v} className="flex justify-between">
              <Label htmlFor={`${v}-archive-button`} className="text-sm">
                {v}
              </Label>
              <Button
                id={`${v}-archive-button`}
                value={v}
                variant="destructive"
                size="sm"
                onClick={(e) =>
                  archiveNationByName(e.currentTarget.value)
                    .then((result) => {
                      if (result.success)
                        setToArchive((old) => old.filter((n) => n !== v));
                      else setError(result.message);
                    })
                    .catch(() => setError("Unable to archive nation"))
                }
              >
                Archive
              </Button>
            </div>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="submit"
            onClick={(e) => {
              nationsDiff(nations.split(",")).then(([miss, extra]) => {
                setMissing(miss);
                setToArchive(extra);
              });
            }}
          >
            Check
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
