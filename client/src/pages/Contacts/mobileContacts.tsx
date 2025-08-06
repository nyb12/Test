import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  PlusIcon,
  SearchIcon,
  ArrowLeftIcon,
  UserPlusIcon,
  DownloadIcon,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

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

interface MobileContactsProps {
  refreshTrigger?: number;
  onEditContact?: (contact: Contact) => void;
  onBack?: () => void;
}

const MobileContacts: React.FC<MobileContactsProps> = ({
  refreshTrigger = 0,
  onEditContact,
  onBack,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'frequents'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContactData, setNewContactData] = useState({
    fullName: '',
    company: '',
    email: '',
    phone: '',
    notes: '',
    hasConsent: false,
  });
  const { toast } = useToast();
  const { user } = useAuth();

  // Listen for native app contacts-result event
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        if (type === 'contacts-result') {
          const nativeContacts = payload || [];
          const mapped = nativeContacts.map((c: any, index: number) => ({
            id: `native-${index}`,
            name: c.name,
            phone: c.phone,
          }));
          setContacts((prev) => [...prev, ...mapped]);
        }
      } catch (err) {
        console.error('Error parsing contact data:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Close FAB menu when clicking outside

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.fab-container')) {
        setShowFabMenu(false);
      }
    };

    if (showFabMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFabMenu]);

  // Load contacts
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const response = await fetch('/api/contacts');
        if (response.ok) {
          const contactsData = await response.json();
          setContacts(contactsData || []);
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
        // Add sample contacts for demo purposes when API fails
        setContacts([
          {
            id: 1,
            contactId: 1,
            contactFirstName: 'Olivia',
            contactLastName: 'Rhye',
            email: 'olivia@example.com',
            phone: '+1-555-0123',
            avatar:
              'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
          },
          {
            id: 2,
            contactId: 2,
            contactFirstName: 'Phoenix',
            contactLastName: 'Baker',
            email: 'phoenix@example.com',
            phone: '+1-555-0124',
            avatar:
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          },
          {
            id: 3,
            contactId: 3,
            contactFirstName: 'Lana',
            contactLastName: 'Steiner',
            email: 'lana@example.com',
            phone: '+1-555-0125',
          },
          {
            id: 4,
            contactId: 4,
            contactFirstName: 'Demi',
            contactLastName: 'Wilkinson',
            email: 'demi@example.com',
            phone: '+1-555-0126',
          },
          {
            id: 5,
            contactId: 5,
            contactFirstName: 'Candice',
            contactLastName: 'Wu',
            email: 'candice@example.com',
            phone: '+1-555-0127',
            avatar:
              'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
          },
          {
            id: 6,
            contactId: 6,
            contactFirstName: 'Natali',
            contactLastName: 'Craig',
            email: 'natali@example.com',
            phone: '+1-555-0128',
          },
          {
            id: 7,
            contactId: 7,
            contactFirstName: 'Emily',
            contactLastName: 'Parker',
            email: 'emily@example.com',
            phone: '+1-555-0129',
            avatar:
              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
          },
          {
            id: 8,
            contactId: 8,
            contactFirstName: 'Ethan',
            contactLastName: 'Mitchell',
            email: 'ethan@example.com',
            phone: '+1-555-0130',
            avatar:
              'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          },
          {
            id: 9,
            contactId: 9,
            contactFirstName: 'James',
            contactLastName: 'Carter',
            email: 'james@example.com',
            phone: '+1-555-0131',
          },
          {
            id: 10,
            contactId: 10,
            contactFirstName: 'Sophia',
            contactLastName: 'Bennett',
            email: 'sophia@example.com',
            phone: '+1-555-0132',
          },
          {
            id: 11,
            contactId: 11,
            contactFirstName: 'Emma',
            contactLastName: 'James',
            email: 'emma@example.com',
            phone: '+1-555-0133',
          },
        ]);
      }
    };

    loadContacts();
  }, [refreshTrigger]);

  // Filter contacts based on search and tab
  useEffect(() => {
    let filtered = contacts;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((contact) => {
        const name =
          contact.name ||
          `${contact.contactFirstName || ''} ${
            contact.contactLastName || ''
          }`.trim() ||
          contact.email ||
          contact.phone ||
          '';
        const email = contact.email || contact.contactEmail || '';
        const phone = contact.phone || contact.contactPhone || '';

        return (
          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          phone.includes(searchQuery)
        );
      });
    }

    // Filter by tab (for now, just show all - you can implement frequent contacts logic later)
    if (activeTab === 'frequents') {
      // TODO: Implement frequent contacts logic
      filtered = filtered.slice(0, 5); // Just show first 5 for demo
    }

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, activeTab]);

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setNewContactData({
      fullName:
        contact.name ||
        `${contact.contactFirstName || ''} ${
          contact.contactLastName || ''
        }`.trim() ||
        '',
      company: contact.jobTitle || '',
      email: contact.email || contact.contactEmail || '',
      phone: contact.phone || contact.contactPhone || '',
      notes: '',
      hasConsent: true, // Assume consent for existing contacts
    });
    setIsEditing(true);
    setShowAddDialog(true);
  };

  const handleNewContact = async () => {
    if (
      !newContactData.fullName.trim() ||
      !newContactData.email.trim() ||
      !newContactData.hasConsent
    ) {
      toast({
        title: 'Validation Error',
        description:
          'Full name and email are required, and consent must be given.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const url = isEditing
        ? `/api/contacts/${editingContact?.contactId}`
        : '/api/contacts';

      const method = isEditing ? 'PUT' : 'POST';

      // Split fullName into firstName and lastName
      const nameParts = newContactData.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          firstName: firstName,
          lastName: lastName,
          company: newContactData.company,
          email: newContactData.email,
          phone: newContactData.phone || null,
          notes: newContactData.notes,
          roleId: 1,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (isEditing) {
          setContacts((prev) =>
            prev.map((contact) =>
              contact.id === editingContact?.id ? result : contact,
            ),
          );
        } else {
          setContacts((prev) => [...prev, result]);
        }

        setNewContactData({
          fullName: '',
          company: '',
          email: '',
          phone: '',
          notes: '',
          hasConsent: false,
        });
        setShowAddDialog(false);
        setIsEditing(false);
        setEditingContact(null);

        toast({
          title: 'Success',
          description: isEditing
            ? 'Contact updated successfully!'
            : 'Contact added successfully!',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create contact. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: 'Error',
        description:
          'Network error. Please check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (contact: Contact) => {
    const name =
      contact.name ||
      `${contact.contactFirstName || ''} ${
        contact.contactLastName || ''
      }`.trim() ||
      contact.email ||
      contact.phone ||
      'Unknown';

    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = (contact: Contact) => {
    return (
      contact.name ||
      `${contact.contactFirstName || ''} ${
        contact.contactLastName || ''
      }`.trim() ||
      contact.email ||
      contact.phone ||
      'Unknown'
    );
  };

  // Updated handleImportContacts with robust WebView guard and mock fallback
  const handleImportContacts = () => {
    const message = JSON.stringify({ type: 'request-contacts' });

    if (
      typeof window !== 'undefined' &&
      window.ReactNativeWebView &&
      typeof window.ReactNativeWebView.postMessage === 'function'
    ) {
      window.ReactNativeWebView.postMessage(message);
    } else {
      console.warn(
        'ReactNativeWebView not available — running in browser? Mocking...',
      );
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'contacts-result',
            payload: [
              { name: 'Browser User', phone: '+91-9999999999' },
              { name: 'Test Contact', phone: '+91-8888888888' },
            ],
          }),
        }),
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-1 h-8 w-8"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold text-gray-900">Contacts</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 py-2 border-b border-gray-200">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('frequents')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'frequents'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Frequents
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone number, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="bg-white">
        <div className="px-4 py-2 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">Name</span>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => {
              const displayName = getDisplayName(contact);
              const initials = getInitials(contact);

              return (
                <div
                  key={contact.id || contact.contactId}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEditContact(contact)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.avatar} alt={displayName} />
                    <AvatarFallback className="bg-purple-100 text-purple-600 text-sm font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayName}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? 'No contacts found matching your search.'
                  : 'No contacts yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-6 z-50 fab-container">
        <div className="relative">
          {/* FAB Menu */}
          {showFabMenu && (
            <div className="absolute bottom-16 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[160px]">
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setIsEditing(false);
                  setEditingContact(null);
                  setNewContactData({
                    fullName: '',
                    company: '',
                    email: '',
                    phone: '',
                    notes: '',
                    hasConsent: false,
                  });
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <UserPlusIcon className="h-4 w-4" />
                Add Contact
              </button>
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  handleImportContacts();
                }}
                className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <DownloadIcon className="h-4 w-4" />
                Import Contacts
              </button>
            </div>
          )}

          {/* FAB Button */}
          <Button
            onClick={() => setShowFabMenu(!showFabMenu)}
            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            <PlusIcon className="h-6 w-6 text-white" />
          </Button>
        </div>
      </div>

      {/* Add/Edit Contact Bottom Sheet */}
      <Sheet open={showAddDialog} onOpenChange={setShowAddDialog}>
        <SheetContent
          side="bottom"
          className="h-[538px] max-h-[90vh] rounded-t-[11px] border-0 shadow-[0px_5.57px_23.68px_0px_rgba(0,0,0,0.25)]"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="text-center pb-6">
              <SheetTitle className="text-[16px] font-semibold text-[#212121]">
                {isEditing ? 'Edit Contact' : 'Invite a Contact'}
              </SheetTitle>
            </SheetHeader>

            {/* Content */}
            <div className="flex-1 space-y-6 px-4 h-full overflow-scroll">
              {/* Full Name Field */}
              <div className="space-y-2">
                <Label className="text-[14px] font-medium text-[#676767]">
                  Full Name
                </Label>
                <Input
                  value={newContactData.fullName}
                  onChange={(e) =>
                    setNewContactData((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                  className="h-[44px] bg-[rgba(255,255,255,0.9)] border-[#CBCBCB] rounded-[6px] text-[14px] text-[#1D273E] placeholder:text-gray-400"
                  placeholder="Full Name"
                />
              </div>

              {/* Company Field */}
              <div className="space-y-2">
                <Label className="text-[14px] font-medium text-[#676767]">
                  Company
                </Label>
                <Input
                  value={newContactData.company}
                  onChange={(e) =>
                    setNewContactData((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                  className="h-[44px] bg-[rgba(255,255,255,0.9)] border-[#CBCBCB] rounded-[6px] text-[14px] text-[#1D273E] placeholder:text-gray-400"
                  placeholder="Company"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label className="text-[14px] font-medium text-[#676767]">
                  Email
                </Label>
                <Input
                  type="email"
                  value={newContactData.email}
                  onChange={(e) =>
                    setNewContactData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="h-[44px] bg-[rgba(255,255,255,0.9)] border-[#CBCBCB] rounded-[6px] text-[14px] text-[#1D273E] placeholder:text-gray-400"
                  placeholder="Email"
                />
              </div>

              {/* Phone Number Field */}
              <div className="space-y-2">
                <Label className="text-[14px] font-medium text-[#676767]">
                  Phone Number
                </Label>
                <Input
                  type="tel"
                  value={newContactData.phone}
                  onChange={(e) =>
                    setNewContactData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="h-[44px] bg-[rgba(255,255,255,0.9)] border-[#CBCBCB] rounded-[6px] text-[14px] text-[#1D273E] placeholder:text-gray-400"
                  placeholder="Phone Number"
                />
              </div>

              {/* Message Field */}
              <div className="space-y-2">
                <Label className="text-[14px] font-medium text-[#676767]">
                  Message (Optional)
                </Label>
                <textarea
                  value={newContactData.notes}
                  onChange={(e) =>
                    setNewContactData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="w-full h-[118px] bg-[rgba(255,255,255,0.9)] border border-[#CBCBCB] rounded-[6px] p-[18px] text-[14px] text-[#1D273E] placeholder:text-gray-400 resize-none"
                  placeholder="Message"
                />
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start space-x-2  pb-4">
                <Checkbox
                  id="consent"
                  checked={newContactData.hasConsent}
                  onCheckedChange={(checked) =>
                    setNewContactData((prev) => ({
                      ...prev,
                      hasConsent: checked as boolean,
                    }))
                  }
                />
                <Label
                  htmlFor="consent"
                  className="text-xs text-gray-600 leading-tight"
                >
                  I confirm this person has given consent to be added to my
                  aviation network and to receive communications.
                </Label>
              </div>
            </div>

            {/* Footer */}
            <SheetFooter className="flex-row gap-3 px-4 pb-6">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="flex-1 h-[40px] bg-white border-[#1D273E] text-[#1D273E] font-semibold text-[14px] rounded-[6px] opacity-92"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNewContact}
                disabled={
                  !newContactData.hasConsent ||
                  !newContactData.fullName.trim() ||
                  !newContactData.email.trim()
                }
                className="flex-1 h-[40px] bg-[#1D273E] hover:bg-[#1D273E]/90 text-white font-semibold text-[14px] rounded-[6px]"
              >
                {isEditing ? 'Update Contact' : 'Invite'}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileContacts;
