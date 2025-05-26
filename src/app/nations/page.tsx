import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, Upload } from "lucide-react";
import { NationsListWithSearch } from "@/components/nations/nations-list-with-search";
import { NationsCheck } from "@/components/nations/nations-check";

export default function NationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nations</h1>
          <p className="text-muted-foreground">
            Manage and track population statistics for different nations
          </p>
        </div>
        <div className="flex gap-2">
          <NationsCheck />
          <Button variant="outline" asChild>
            <Link href="/nations/import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/nations/new">
              <Users className="mr-2 h-4 w-4" />
              New Nation
            </Link>
          </Button>
        </div>
      </div>

      <NationsListWithSearch />
    </div>
  );
} 
