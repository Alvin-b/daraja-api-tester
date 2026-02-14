import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WifiPackage {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  speed_limit: string;
  is_active: boolean;
}

const PackageManagement = () => {
  const [packages, setPackages] = useState<WifiPackage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WifiPackage | null>(null);
  const [form, setForm] = useState({ name: '', duration_minutes: 60, price: 20, speed_limit: '5M/5M' });

  const fetchPackages = async () => {
    const { data } = await supabase.from('wifi_packages').select('*').order('price');
    if (data) setPackages(data);
  };

  useEffect(() => { fetchPackages(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;

    if (editing) {
      const { error } = await supabase
        .from('wifi_packages')
        .update(form)
        .eq('id', editing.id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('wifi_packages')
        .insert({ ...form, is_active: true });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
    }

    toast({ title: editing ? 'Package updated' : 'Package created' });
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', duration_minutes: 60, price: 20, speed_limit: '5M/5M' });
    fetchPackages();
  };

  const handleEdit = (pkg: WifiPackage) => {
    setEditing(pkg);
    setForm({ name: pkg.name, duration_minutes: pkg.duration_minutes, price: pkg.price, speed_limit: pkg.speed_limit });
    setShowForm(true);
  };

  const toggleActive = async (pkg: WifiPackage) => {
    await supabase.from('wifi_packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id);
    fetchPackages();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">WiFi Packages</h2>
        <Button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', duration_minutes: 60, price: 20, speed_limit: '5M/5M' }); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Package
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editing ? 'Edit Package' : 'New Package'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 1 Hour" />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Price (KES)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Speed Limit</Label>
                <Input value={form.speed_limit} onChange={(e) => setForm({ ...form, speed_limit: e.target.value })} placeholder="5M/5M" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>{pkg.duration_minutes >= 1440 ? `${pkg.duration_minutes / 1440} days` : pkg.duration_minutes >= 60 ? `${pkg.duration_minutes / 60} hours` : `${pkg.duration_minutes} min`}</TableCell>
                  <TableCell>KES {pkg.price}</TableCell>
                  <TableCell className="font-mono text-sm">{pkg.speed_limit}</TableCell>
                  <TableCell>
                    <Switch checked={pkg.is_active} onCheckedChange={() => toggleActive(pkg)} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(pkg)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PackageManagement;
