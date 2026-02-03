import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientFormValues = {
  name: string;
  contact: string;
  email: string;
  phone: string;
  rate: string;
  status: "active" | "at-risk" | "inactive";
};

type ClientFormProps = {
  visible: boolean;
  values: ClientFormValues;
  onUpdate: <K extends keyof ClientFormValues>(
    key: K,
    value: ClientFormValues[K]
  ) => void;
  onClose: () => void;
  onSave: () => void;
};

export function ClientForm({
  visible,
  values,
  onUpdate,
  onClose,
  onSave,
}: ClientFormProps) {
  if (!visible) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">New Client</h3>
          <p className="text-xs text-muted-foreground">
            Add a client record to start tracking work.
          </p>
        </div>
        <Button size="xs" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Client Name</Label>
          <Input value={values.name} onChange={(event) => onUpdate("name", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Primary Contact</Label>
          <Input
            value={values.contact}
            onChange={(event) => onUpdate("contact", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={values.email}
            onChange={(event) => onUpdate("email", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <Input
            value={values.phone}
            onChange={(event) => onUpdate("phone", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Rate (per hour)</Label>
          <Input
            value={values.rate}
            onChange={(event) => onUpdate("rate", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <select
            value={values.status}
            onChange={(event) => onUpdate("status", event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="active">active</option>
            <option value="at-risk">at risk</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
      </div>
      <Button size="sm" onClick={onSave}>
        Save Client
      </Button>
    </div>
  );
}
