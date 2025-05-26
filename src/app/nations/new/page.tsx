import { NationForm } from "@/components/forms/NationForm";
import NewLink from "./link";

export default async function NewNationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <NewLink />
          <h1 className="text-3xl font-bold">New Nation</h1>
          <p className="text-muted-foreground">
            Create a new nation to track its population statistics
          </p>
        </div>
      </div>
      <NationForm />
    </div>
  );
} 
