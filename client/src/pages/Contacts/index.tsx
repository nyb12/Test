import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlusIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import ContactsTable from './ContactsTable';
import MobileContacts from './mobileContacts';
import { Textarea } from '@/components/ui/textarea';

const Contacts = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [newContactData, setNewContactData] = useState({
    fullName: '',
    company: '',
    email: '',
    phone: '',
    notes: '',
    hasConsent: false,
  });
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    selectedMembers: [] as string[],
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Load contacts on component mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const response = await fetch('/api/contacts');
        if (response.ok) {
          const contactsData = await response.json();
          setAvailableContacts(contactsData || []);
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    };

    loadContacts();
  }, []);

  const handleEditContact = (contact: any) => {
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
    setActiveTab('contact');
    setShowAddDialog(true);
  };

  const handleNewContact = async () => {
    // Validation: require either email or phone and consent
    if (
      !newContactData.fullName.trim() ||
      !newContactData.email.trim() ||
      !newContactData.phone.trim() ||
      !newContactData.hasConsent
    ) {
      toast({
        title: 'Validation Error',
        description:
          'Full name, email, and phone are required, and consent must be given.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const url = isEditing
        ? `/api/contacts/${editingContact.contactId}`
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
          // Update existing contact in the list
          setAvailableContacts((prev) =>
            prev.map((contact) =>
              contact.id === editingContact.id ? result : contact,
            ),
          );
        } else {
          // Add new contact to the list
          setAvailableContacts((prev) => [...prev, result]);
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

        // Trigger table refresh
        setRefreshTrigger((prev) => prev + 1);
      } else {
        const errorData = await response.json();
        console.error(
          isEditing ? 'Contact update failed:' : 'Contact creation failed:',
          errorData,
        );
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

  const handleNewGroup = async () => {
    if (!user?.id) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create a group',
        variant: 'destructive',
      });
      return;
    }

    if (!newGroupData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a group name',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingGroup(true);
    try {
      const response = await fetch('/api/messaging/createGroup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || '',
          name: newGroupData.name,
          description: newGroupData.description,
          initialMemberIds: newGroupData.selectedMembers,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setNewGroupData({ name: '', description: '', selectedMembers: [] });
          setShowAddDialog(false);

          toast({
            title: 'Success',
            description: 'Group created successfully!',
          });

          // Trigger table refresh
          setRefreshTrigger((prev) => prev + 1);
        }
      } else {
        const errorData = await response.json();
        console.error('Group creation failed:', errorData);
        toast({
          title: 'Error',
          description: 'Failed to create group. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description:
          'Network error. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // If mobile, render mobile component
  if (isMobile) {
    return (
      <MobileContacts
        refreshTrigger={refreshTrigger}
        onEditContact={handleEditContact}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-6 justify-between items-center">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Contacts</TabsTrigger>
            <TabsTrigger value="frequently-contacted">
              Frequently contacted
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          className="bg-[#1d273e] hover:bg-[#1d273e]/90 text-white"
          onClick={() => {
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
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <ContactsTable
        refreshTrigger={refreshTrigger}
        onEditContact={handleEditContact}
      />

      {/* Add Contact/Group Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Contact' : 'Add New'}</DialogTitle>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="contact">Add New Connection</TabsTrigger>
              <TabsTrigger value="group">Create New Group</TabsTrigger>
            </TabsList>

            <TabsContent value="contact" className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContactData.email}
                    onChange={(e) =>
                      setNewContactData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="col-span-3"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fullName" className="text-right">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={newContactData.fullName}
                    onChange={(e) =>
                      setNewContactData((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    className="col-span-3"
                    placeholder="Full Name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="company" className="text-right">
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={newContactData.company}
                    onChange={(e) =>
                      setNewContactData((prev) => ({
                        ...prev,
                        company: e.target.value,
                      }))
                    }
                    className="col-span-3"
                    placeholder="Company"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={newContactData.phone}
                    onChange={(e) =>
                      setNewContactData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="col-span-3"
                    placeholder="+1-555-0123"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Message (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={newContactData.notes}
                    onChange={(e) =>
                      setNewContactData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="col-span-3"
                    placeholder="Message"
                  />
                </div>
                {/* Consent Checkbox */}
                <div className="grid grid-cols-4 items-start gap-4">
                  <div></div>
                  <div className="col-span-3">
                    <div className="flex items-start space-x-2">
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
                        I confirm this person has given consent to be added to
                        my aviation network and to receive communications.
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="group" className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="groupName" className="text-right">
                    Group Name
                  </Label>
                  <Input
                    id="groupName"
                    value={newGroupData.name}
                    onChange={(e) =>
                      setNewGroupData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="col-span-3"
                    placeholder="Enter group name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="groupDescription" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="groupDescription"
                    value={newGroupData.description}
                    onChange={(e) =>
                      setNewGroupData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="col-span-3"
                    placeholder="Optional description"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right mt-2">Members</Label>
                  <div className="col-span-3">
                    <ScrollArea className="h-32 border rounded p-2">
                      <div className="space-y-2">
                        {availableContacts.map((contact) => (
                          <div
                            key={contact.id || contact.contactId}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={contact.id || contact.contactId}
                              checked={newGroupData.selectedMembers.includes(
                                contact.contactId || contact.id,
                              )}
                              onCheckedChange={(checked) => {
                                const memberId =
                                  contact.contactId || contact.id;
                                if (checked) {
                                  setNewGroupData((prev) => ({
                                    ...prev,
                                    selectedMembers: [
                                      ...prev.selectedMembers,
                                      memberId,
                                    ],
                                  }));
                                } else {
                                  setNewGroupData((prev) => ({
                                    ...prev,
                                    selectedMembers:
                                      prev.selectedMembers.filter(
                                        (id) => id !== memberId,
                                      ),
                                  }));
                                }
                              }}
                            />
                            <Label
                              htmlFor={contact.id || contact.contactId}
                              className="text-sm"
                            >
                              {contact.name ||
                                `${contact.contactFirstName || ''} ${
                                  contact.contactLastName || ''
                                }`.trim() ||
                                contact.email ||
                                contact.phone}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-end sm:gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            {activeTab === 'contact' ? (
              <Button
                onClick={handleNewContact}
                disabled={
                  !newContactData.hasConsent ||
                  (!newContactData.email && !newContactData.phone)
                }
                className="mb-2 primary-button"
              >
                {isEditing ? 'Update Contact' : 'Add Contact'}
              </Button>
            ) : (
              <Button
                onClick={handleNewGroup}
                disabled={isCreatingGroup || !newGroupData.name.trim()}
                className="mb-2 primary-button"
              >
                {isCreatingGroup ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Group'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contacts;
