"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { withPermission } from "@/lib/with-permission";
import { VendorForm } from "../components/vendor-form";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });

  useEffect(() => {
    setMounted(true);
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/vendors");
      if (!response.ok) throw new Error("Failed to fetch vendors");
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error(t('finance.vendors.fetchError', 'Failed to load vendors'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = () => {
    router.push("/finance/accounts-payable/vendors/create");
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsEditDialogOpen(true);
  };

  const handleDeleteVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedVendor) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/vendors?id=${selectedVendor.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || t('finance.vendors.deleteError', 'Failed to delete vendor'));
      }
      
      toast.success(t('finance.vendors.deleteSuccess', 'Vendor deleted successfully'));
      fetchVendors();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast.error(error instanceof Error ? error.message : t('finance.vendors.deleteError', 'Failed to delete vendor'));
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    fetchVendors();
  };

  const toggleVendorStatus = async (vendor: Vendor) => {
    try {
      const response = await fetch("/api/vendors", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: vendor.id,
          name: vendor.name,
          isActive: !vendor.isActive,
        }),
      });

      if (!response.ok) throw new Error(t('finance.vendors.statusUpdateError', 'Failed to update vendor status'));
      
      toast.success(
        vendor.isActive 
          ? t('finance.vendors.deactivated', 'Vendor deactivated') 
          : t('finance.vendors.activated', 'Vendor activated')
      );
      fetchVendors();
    } catch (error) {
      console.error("Error updating vendor status:", error);
      toast.error(t('finance.vendors.statusUpdateError', 'Failed to update vendor status'));
    }
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="container mx-auto py-6">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('finance.vendors.title', 'Vendors')}</h1>
        <Button onClick={handleCreateVendor}>
          <Plus className="h-4 w-4 mr-2" />
          {t('finance.vendors.addVendor', 'Add Vendor')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('finance.vendors.vendorList', 'Vendor List')}</CardTitle>
          <CardDescription>
            {t('finance.vendors.description', 'Manage your suppliers and service providers')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">{t('finance.vendors.loadingVendors', 'Loading vendors...')}</div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t('finance.vendors.noVendorsFound', 'No vendors found')}</h3>
              <p className="text-muted-foreground mt-2">
                {t('finance.vendors.getStarted', 'Get started by adding your first vendor')}
              </p>
              <Button onClick={handleCreateVendor} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {t('finance.vendors.addVendor', 'Add Vendor')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('finance.vendors.name', 'Name')}</TableHead>
                    <TableHead>{t('finance.vendors.contact', 'Contact')}</TableHead>
                    <TableHead>{t('finance.vendors.taxId', 'Tax ID')}</TableHead>
                    <TableHead>{t('finance.vendors.status', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>
                        {vendor.email && <div>{vendor.email}</div>}
                        {vendor.phone && <div>{vendor.phone}</div>}
                      </TableCell>
                      <TableCell>{vendor.taxId || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={vendor.isActive ? "success" : "destructive"}
                          className="cursor-pointer"
                          onClick={() => toggleVendorStatus(vendor)}
                        >
                          {vendor.isActive ? t('finance.vendors.active', 'Active') : t('finance.vendors.inactive', 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditVendor(vendor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVendor(vendor)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('finance.vendors.editVendor', 'Edit Vendor')}</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <VendorForm
              vendor={selectedVendor}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.vendors.confirmDelete', 'Confirm Deletion')}</DialogTitle>
            <DialogDescription>
              {t('finance.vendors.deleteWarning', 'Are you sure you want to delete this vendor? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withPermission(VendorsPage, "finance.vendors.view"); 