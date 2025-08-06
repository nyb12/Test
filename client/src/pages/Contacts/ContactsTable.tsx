import React, { useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ListFilter,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';

interface Contact {
  id?: string | number;
  contactId?: string | number;
  name?: string;
  contactFirstName?: string;
  contactLastName?: string;
  email?: string;
  contactEmail?: string;
  phone?: string;
  contactPhone?: string;
  jobTitle?: string;
  avatar?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  members?: any[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  creatorName?: string;
  isActive?: boolean;
}

interface CombinedItem {
  id: string | number;
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  avatar?: string;
  type: 'contact' | 'group';
  memberCount?: number;
  description?: string;
  contactId?: string | number;
}

interface ContactsTableProps {
  refreshTrigger?: number;
  onEditContact?: (contact: Contact) => void;
}

const ContactsTable: React.FC<ContactsTableProps> = ({
  refreshTrigger = 0,
  onEditContact,
}) => {
  const [combinedData, setCombinedData] = useState<CombinedItem[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load contacts using React Query
  const {
    data: contacts = [],
    isLoading: isLoadingContacts,
    error: contactsError,
  } = useQuery({
    queryKey: ['contacts', refreshTrigger],
    queryFn: async () => {
      console.log('Fetching contacts...');
      const response = await fetch('/api/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const contactsData = await response.json();
      console.log('Contacts API response:', contactsData);
      return contactsData || [];
    },
  });

  console.log('Contacts data:', contacts);
  console.log('Contacts error:', contactsError);

  // Load groups using React Query
  const {
    data: groups = [],
    isLoading: isLoadingGroups,
    error: groupsError,
  } = useQuery({
    queryKey: ['user-groups', user?.id, refreshTrigger],
    queryFn: async () => {
      if (!user?.id) return [];
      console.log('Fetching groups for user:', user.id);
      const res = await fetch('/api/user-groups/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          pageNumber: 1,
          pageSize: 100,
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch user groups');
      const result = await res.json();
      console.log('Groups API response:', result);
      return result?.data?.data?.items ?? [];
    },
    enabled: !!user?.id,
  });

  console.log('User:', user);
  console.log('Groups query enabled:', !!user?.id);
  console.log('Groups data:', groups);
  console.log('Groups error:', groupsError);

  // Combine contacts and groups data
  useEffect(() => {
    const combined: CombinedItem[] = [
      // Add contacts
      ...contacts.map((contact: Contact) => ({
        id: contact.id || contact.contactId || '',
        name:
          contact.name ||
          `${contact.contactFirstName || ''} ${
            contact.contactLastName || ''
          }`.trim() ||
          contact.email ||
          contact.phone ||
          'Unknown',
        email: contact.email || contact.contactEmail,
        phone: contact.phone || contact.contactPhone,
        jobTitle: contact.jobTitle,
        avatar: contact.avatar,
        type: 'contact' as const,
        contactId: contact.contactId,
      })),
      // Add groups
      ...groups.map((group: Group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        memberCount: group.memberCount || group.members?.length || 0,
        type: 'group' as const,
      })),
    ];

    setCombinedData(combined);
    console.log('Combined data:', combined);
    console.log('Groups:', groups);
    console.log('Contacts:', contacts);
  }, [contacts, groups]);

  const columns: ColumnDef<CombinedItem>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const item = row.original;
        const displayName = item.name || 'Unknown';
        const initials = displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={item.avatar} alt={displayName} />
              <AvatarFallback
                className={`text-sm font-medium ${
                  item.type === 'group'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-purple-100 text-purple-600'
                }`}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{displayName}</span>
              {item.type === 'group' && item.memberCount !== undefined && (
                <span className="text-xs text-gray-500">
                  {item.memberCount} member{item.memberCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const item = row.original;
        if (item.type === 'group') {
          return (
            <span className="text-gray-600">{item.description || 'N/A'}</span>
          );
        }
        return <span className="text-gray-600">{item.email || 'N/A'}</span>;
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone/Type',
      cell: ({ row }) => {
        const item = row.original;
        if (item.type === 'group') {
          return <span className="text-gray-600">Group</span>;
        }
        return <span className="text-gray-600">{item.phone || 'N/A'}</span>;
      },
    },
    {
      accessorKey: 'jobTitle',
      header: 'Job Title',
      cell: ({ row }) => {
        const item = row.original;
        if (item.type === 'group') {
          return <span className="text-gray-600">-</span>;
        }
        return <span className="text-gray-600">{item.jobTitle || 'N/A'}</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const contact = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(contact)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Edit className="h-4 w-4 text-gray-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(contact)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Trash2 className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: combinedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  console.log('Table data:', combinedData);
  console.log('Table rows:', table.getRowModel().rows);

  const handleEdit = async (contact: Contact) => {
    try {
      if (onEditContact) {
        onEditContact(contact);
      } else {
        toast({
          title: 'Edit Contact',
          description: `Editing contact: ${
            contact.name || contact.contactFirstName
          }`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to edit contact',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    const bodycontact = {
      userId: contactToDelete.contactId,
    };

    try {
      const response = await fetch(`/api/contacts/${contactToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodycontact),
      });

      if (response.ok) {
        // Remove from combined data
        setCombinedData((prev) =>
          prev.filter(
            (item) =>
              !(item.type === 'contact' && item.id === contactToDelete.id),
          ),
        );
        toast({
          title: 'Success',
          description: 'Contact deleted successfully',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete contact');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete contact',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Global Search and Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-1/2">
          <Input
            placeholder="Search by name, phone number, email..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <ListFilter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white">
        <Table>
          <TableHeader className="rounded-t-2xl">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="bg-gray-50">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoadingContacts || isLoadingGroups ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">
                      Loading contacts...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-gray-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No contacts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex items-center gap-1 bg-white cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex items-center gap-1 bg-white cursor-pointer"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>
                {contactToDelete?.name ||
                  `${contactToDelete?.contactFirstName} ${contactToDelete?.contactLastName}`}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContactsTable;
