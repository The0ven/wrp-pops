'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Era } from "@prisma/client";
import { deleteEra } from "@/actions/util";

interface ArchiveEraButtonProps {
  era: Era;
}

export function ArchiveEraButton({ era }: ArchiveEraButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteEra(era.id);

      if (result.success) {
        setIsOpen(false);
        router.push('/eras');
        router.refresh();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error deleting era:', error);
      // You could add a toast notification here
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Era</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{era.name}"? This action cannot be undone and will also delete all associated growths and additions.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Era'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
