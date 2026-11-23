"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SenderList } from "@/components/app/senders/sender-list";
import { Button } from "@/components/ui/button";

export default function SendersPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button className="rounded-full" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add Gmail sender
        </Button>
      </div>
      <SenderList addDialogOpen={open} onAddDialogChange={setOpen} />
    </div>
  );
}
