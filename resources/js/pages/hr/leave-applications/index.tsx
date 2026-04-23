// pages/hr/leave-applications/index.tsx
import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, CheckCircle, XCircle, Eye, Edit, Trash2, Calendar, FileText } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';

export default function LeaveApplications() {
  const { t } = useTranslation();
  const { auth, leaveApplications, employees, leaveTypes, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || 'all');
  const [selectedLeaveType, setSelectedLeaveType] = useState(pageFilters.leave_type_id || 'all');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm !== '' || selectedEmployee !== 'all' || selectedLeaveType !== 'all' || selectedStatus !== 'all';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (searchTerm ? 1 : 0) + (selectedEmployee !== 'all' ? 1 : 0) + (selectedLeaveType !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.leave-applications.index'), {
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
      leave_type_id: selectedLeaveType !== 'all' ? selectedLeaveType : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.leave-applications.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
      leave_type_id: selectedLeaveType !== 'all' ? selectedLeaveType : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        setFormMode('view');
        setIsFormModalOpen(true);
        break;
      case 'edit':
        setFormMode('edit');
        setIsFormModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'approve':
        handleStatusUpdate(item, 'approved');
        break;
      case 'reject':
        handleStatusUpdate(item, 'rejected');
        break;
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {
      toast.loading(t('Creating leave application...'));

      router.post(route('hr.leave-applications.store'), formData, {
        onSuccess: (page: any) => {
          setIsFormModalOpen(false);
          toast.dismiss();
          if (page.props?.flash?.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props?.flash?.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to create leave application: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      toast.loading(t('Updating leave application...'));

      router.put(route('hr.leave-applications.update', currentItem.id), formData, {
        onSuccess: (page: any) => {
          setIsFormModalOpen(false);
          toast.dismiss();
          if (page.props?.flash?.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props?.flash?.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to update leave application: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    toast.loading(t('Deleting leave application...'));

    router.delete(route('hr.leave-applications.destroy', currentItem.id), {
      onSuccess: (page: any) => {
        setIsDeleteModalOpen(false);
        toast.dismiss();
        if (page.props?.flash?.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props?.flash?.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to delete leave application: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleStatusUpdate = (application: any, status: string) => {
    const statusText = status === 'approved' ? t('Approving') : t('Rejecting');
    toast.loading(`${statusText} leave application...`);

    router.put(route('hr.leave-applications.update-status', application.id), { 
      status,
      manager_comments: '' // Add empty manager_comments to avoid undefined key error
    }, {
      onSuccess: (page: any) => {
        toast.dismiss();
        if (page.props?.flash?.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props?.flash?.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to update leave application status: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedEmployee('all');
    setSelectedLeaveType('all');
    setSelectedStatus('all');
    setShowFilters(false);

    router.get(route('hr.leave-applications.index'), {
      page: 1,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  // Define page actions
  const pageActions = [];

  // Add the "Add New Leave Application" button if user has permission
  if (hasPermission(permissions, 'create-leave-applications')) {
    pageActions.push({
      label: t('Add Leave Application'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Leave Management'), href: route('hr.leave-applications.index') },
    { title: t('Leave Applications') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'employee',
      label: t('Employee'),
      render: (value: any, row: any) => row.employee?.name || '-'
    },
    {
      key: 'manager',
      label: t('Reporting Manager'),
      render: (value: any, row: any) => row.manager?.name || '-'
    },
    {
      key: 'leave_type',
      label: t('Leave Type'),
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: row.leave_type?.color }}
          />
          <span>{row.leave_type?.name || '-'}</span>
        </div>
      )
    },
    {
      key: 'start_date',
      label: t('Start Date'),
      sortable: true,
      // render: (value: string) => new Date(value).toLocaleDateString()
      render: (value: string) => window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString()
      
    },
    {
      key: 'end_date',
      label: t('End Date'),
      sortable: true,
      // render: (value: string) => new Date(value).toLocaleDateString()
      render: (value: string) => window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString()
    },
    {
      key: 'total_days',
      label: t('Days'),
      render: (value: number) => (
        <span className="font-mono">{value}</span>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string, item: any) => {
        const statuses: any = {
          pending_manager: { label: t('Pending Manager'), color: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
          pending_hr: { label: t('Pending HR'), color: 'bg-purple-50 text-purple-700 ring-purple-600/20' },
          pending: { label: t('Pending'), color: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' },
          approved: { label: t('Approved'), color: 'bg-green-50 text-green-700 ring-green-600/20' },
          rejected: { label: t('Rejected'), color: 'bg-red-50 text-red-700 ring-red-600/20' }
        };

        let displayStatus = value;
        // If manager rejected but HR hasn't acted, show as Rejected (but keep in HR queue)
        if (value === 'pending_hr' && item.manager_status === 'rejected') {
          displayStatus = 'rejected';
        }

        const status = statuses[displayStatus] || { label: displayStatus, color: 'bg-gray-50 text-gray-700 ring-gray-600/20' };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${status.color}`}>
            {value === 'pending_hr' && item.manager_status === 'rejected' ? `${status.label} (${t('Pending HR')})` : status.label}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: t('Applied On'),
      sortable: true,
      render: (value: string) => window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString()
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-leave-applications'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-leave-applications',
      condition: (item: any) => item.status === 'pending_manager' || item.status === 'pending'
    },
    {
      label: t('Approve (Manager)'),
      icon: 'CheckCircle',
      action: 'approve',
      className: 'text-green-500',
      requiredPermission: 'approve-leave-applications',
      condition: (item: any) => item.status === 'pending_manager' && item.manager_id == auth?.user?.id
    },
    {
      label: t('Reject (Manager)'),
      icon: 'XCircle',
      action: 'reject',
      className: 'text-red-500',
      requiredPermission: 'reject-leave-applications',
      condition: (item: any) => item.status === 'pending_manager' && item.manager_id == auth?.user?.id
    },
    {
      label: t('Approve (HR)'),
      icon: 'CheckCircle',
      action: 'approve',
      className: 'text-indigo-500',
      requiredPermission: 'approve-leave-applications',
      condition: (item: any) => item.status === 'pending_hr' && (auth?.roles?.includes('company') || auth?.roles?.includes('hr'))
    },
    {
      label: t('Reject (HR)'),
      icon: 'XCircle',
      action: 'reject',
      className: 'text-red-500',
      requiredPermission: 'reject-leave-applications',
      condition: (item: any) => item.status === 'pending_hr' && (auth?.roles?.includes('company') || auth?.roles?.includes('hr'))
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-leave-applications'
    }
  ];

  // Prepare options for filters and forms
  const employeeOptions = [
    { value: 'all', label: t('All Employees'), disabled: true },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: emp.name
    }))
  ];

  const leaveTypeOptions = [
    { value: 'all', label: t('All Leave Types'), disabled: true },
    ...(leaveTypes || []).map((type: any) => ({
      value: type.id.toString(),
      label: type.name
    }))
  ];

  const statusOptions = [
    { value: 'all', label: t('All Statuses'), disabled: true },
    { value: 'pending_manager', label: t('Pending Manager') },
    { value: 'pending_hr', label: t('Pending HR') },
    { value: 'approved', label: t('Approved') },
    { value: 'rejected', label: t('Rejected') }
  ];

  return (
    <PageTemplate
      title={t("Leave Applications")}
      url="/hr/leave-applications"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 p-4">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              value: selectedEmployee,
              onChange: setSelectedEmployee,
              options: employeeOptions,
              searchable: true
            },
            {
              name: 'leave_type_id',
              label: t('Leave Type'),
              type: 'select',
              value: selectedLeaveType,
              onChange: setSelectedLeaveType,
              options: leaveTypeOptions,
              searchable: true
            },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              value: selectedStatus,
              onChange: setSelectedStatus,
              options: statusOptions
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
          onApplyFilters={applyFilters}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.leave-applications.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
              leave_type_id: selectedLeaveType !== 'all' ? selectedLeaveType : undefined,
              status: selectedStatus !== 'all' ? selectedStatus : undefined
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* Content section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={leaveApplications?.data || []}
          from={leaveApplications?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-leave-applications',
            create: 'create-leave-applications',
            edit: 'edit-leave-applications',
            delete: 'delete-leave-applications'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={leaveApplications?.from || 0}
          to={leaveApplications?.to || 0}
          total={leaveApplications?.total || 0}
          links={leaveApplications?.links}
          entityName={t("leave applications")}
          onPageChange={(url) => router.get(url)}
        />
      </div>

      {/* Form Modal */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              required: true,
              searchable: true,
              disabled: (formData: any) => {
                if (formMode !== 'create') return (auth?.roles?.includes('manager') || auth?.roles?.includes('hr') || auth?.roles?.includes('company'));
                return !(auth?.roles?.includes('hr') || auth?.roles?.includes('company'));
              },
              options: employees ? employees.map((emp: any) => ({
                value: emp.id.toString(),
                label: emp.name
              })) : []
            },
            {
              name: 'reporting_manager',
              label: t('Reporting Manager'),
              type: 'custom',
              render: (field, formData) => {
                const selectedEmpId = formData.employee_id;
                const emp = employees?.find((e: any) => e.id.toString() === selectedEmpId?.toString());
                return (
                  <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm">
                    <span className="text-muted-foreground">{t('Applications will be reviewed by')}:</span>
                    <span className="font-semibold text-primary">{emp?.manager_name || t('System Admin')}</span>
                  </div>
                );
              }
            },
            {
              name: 'leave_type_id',
              label: t('Leave Type'),
              type: 'select',
              required: true,
              searchable: true,
              disabled: (formData: any) => formMode !== 'create' && (auth?.roles?.includes('manager') || auth?.roles?.includes('hr') || auth?.roles?.includes('company')),
              options: leaveTypes ? leaveTypes.map((type: any) => ({
                value: type.id.toString(),
                label: type.name
              })) : []
            },
            { 
              name: 'start_date', 
              label: t('Start Date'), 
              type: 'date', 
              required: true,
              disabled: (formData: any) => formMode !== 'create' && (auth?.roles?.includes('manager') || auth?.roles?.includes('hr') || auth?.roles?.includes('company'))
            },
            { 
              name: 'end_date', 
              label: t('End Date'), 
              type: 'date', 
              required: true,
              disabled: (formData: any) => formMode !== 'create' && (auth?.roles?.includes('manager') || auth?.roles?.includes('hr') || auth?.roles?.includes('company'))
            },
            { 
              name: 'reason', 
              label: t('Reason'), 
              type: 'textarea', 
              required: true,
              disabled: (formData: any) => formMode !== 'create' && (auth?.roles?.includes('manager') || auth?.roles?.includes('hr') || auth?.roles?.includes('company'))
            },
            { 
              name: 'attachment', 
              label: t('Attachment'), 
              type: 'custom',
              render: (field, formData, handleChange) => (
                <div>
                  <MediaPicker
                    value={String(formData[field.name] || '')}
                    onChange={(url) => handleChange(field.name, url)}
                    placeholder={t('Select attachment file...')}
                  />
                </div>
              ),
              helpText: t('Upload PDF, DOC, DOCX, JPG, JPEG, PNG files')
            },
            {
              name: 'manager_status',
              label: t('Manager Status'),
              type: 'select',
              options: [
                { value: 'pending', label: t('Pending') },
                { value: 'approved', label: t('Approved') },
                { value: 'rejected', label: t('Rejected') }
              ],
              condition: (formData) => (formMode !== 'create' || auth?.roles?.includes('manager') || auth?.roles?.includes('hr') || auth?.roles?.includes('company')),
              disabled: (formData: any) => !auth?.roles?.includes('manager')
            },
            {
              name: 'manager_comments',
              label: t('Manager Comments'),
              type: 'textarea',
              condition: (formData) => (formMode !== 'create' || auth?.roles?.includes('manager') || auth?.roles?.includes('hr') || auth?.roles?.includes('company')),
              disabled: (formData: any) => !auth?.roles?.includes('manager')
            },
            {
              name: 'hr_status',
              label: t('HR Status'),
              type: 'select',
              options: [
                { value: 'pending', label: t('Pending') },
                { value: 'approved', label: t('Approved') },
                { value: 'rejected', label: t('Rejected') }
              ],
              condition: (formData) => (formMode !== 'create' || auth?.roles?.includes('hr') || auth?.roles?.includes('company')),
              disabled: (formData: any) => !(auth?.roles?.includes('hr') || auth?.roles?.includes('company'))
            },
            {
              name: 'hr_comments',
              label: t('HR Comments'),
              type: 'textarea',
              condition: (formData) => (formMode !== 'create' || auth?.roles?.includes('hr') || auth?.roles?.includes('company')),
              disabled: (formData: any) => !(auth?.roles?.includes('hr') || auth?.roles?.includes('company'))
            }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem 
          ? {
              ...currentItem,
              start_date: currentItem.start_date ? window.appSettings?.formatDateTimeSimple(currentItem.start_date, false) : currentItem.start_date,
              end_date: currentItem.end_date ? window.appSettings?.formatDateTimeSimple(currentItem.end_date, false) : currentItem.end_date
            } 
          : (formMode === 'create' ? { employee_id: auth?.user?.id?.toString() } : null)
        }
        title={
          formMode === 'create'
            ? t('Add New Leave Application')
            : formMode === 'edit'
              ? t('Edit Leave Application')
              : t('View Leave Application')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.employee?.name} - ${currentItem?.leave_type?.name}` || ''}
        entityName="leave application"
      />
    </PageTemplate>
  );
}