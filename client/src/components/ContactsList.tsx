import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Phone, PhoneOff, Video, X, Check } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  contactId?: string; // userId for messaging from external API
  company?: string;
  role?: string;
  invitation_status: 'Invited' | 'Accepted' | 'Declined' | 'Expired';
}

interface ContactsListProps {
  onSelectiveAction?: (action: any, toolName: string) => void;
}

export default function ContactsList({
  onSelectiveAction,
}: ContactsListProps = {}) {
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewContactModal, setShowNewContactModal] = useState(false);

  const [newContactForm, setNewContactForm] = useState({
    email: '',
    phone: '',
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const { user } = useAuth();

  // Communicate selected contacts count to parent for button state management
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('contactsSelected', {
        detail: { count: selectedContacts.length },
      }),
    );
  }, [selectedContacts]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts/all'],
  });

  const filteredContacts = contacts.filter((contact) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.name.toLowerCase().includes(searchLower) ||
      contact.company?.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower) ||
      contact.role?.toLowerCase().includes(searchLower)
    );
  });

  // Debug logging to see what contacts we're getting
  console.log('Contacts received:', contacts?.length, contacts);
  console.log('Filtered contacts:', filteredContacts?.length, filteredContacts);
  console.log(
    'Raw contact names:',
    contacts?.map((c) => c.name),
  );

  const createContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          email: contactData.email || null,
          phone: contactData.phone || null,
          roleId: 1, // Default role ID to 1
          invitation_status: 'Invited',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save contact');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/all'] });
      setShowNewContactModal(false);
      setNewContactForm({
        email: '',
        phone: '',
      });
      toast({
        title: 'Success',
        description: 'Contact added successfully!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add contact',
        variant: 'destructive',
      });
    },
  });

  const handleContactSelect = (contactId: number) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId],
    );
  };

  const handleChatNow = () => {
    if (selectedContacts.length > 0) {
      const selectedContactsData = selectedContacts
        .map((id) => contacts.find((contact) => contact.id === id))
        .filter(Boolean);

      // Dispatch global event to open chat window in main chatbot
      const chatEvent = new CustomEvent('chatNow', {
        detail: { selectedContacts: selectedContactsData },
      });
      window.dispatchEvent(chatEvent);
    }
  };

  // Listen for chatNow selective action events
  useEffect(() => {
    const handleChatNowAction = (event: CustomEvent) => {
      if (event.detail?.action?.onClickEvent === 'chatNow') {
        handleChatNow();
      }
    };

    window.addEventListener('selectiveAction' as any, handleChatNowAction);

    return () => {
      window.removeEventListener('selectiveAction' as any, handleChatNowAction);
    };
  }, [selectedContacts, contacts]);

  const handleNewContactSubmit = async () => {
    // Validate required fields - either email or phone must be provided
    if (!newContactForm.email && !newContactForm.phone) {
      toast({
        title: 'Validation Error',
        description: 'Either Email or Phone is required.',
        variant: 'destructive',
      });
      return;
    }

    // Validate consent checkbox
    if (!consentChecked) {
      toast({
        title: 'Consent Required',
        description:
          'You must consent to have Ironfleet send an invite on your behalf.',
        variant: 'destructive',
      });
      return;
    }

    createContactMutation.mutate(newContactForm);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 w-full">
        <div className="loading-shimmer rounded-lg p-4">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full card-enhanced">
      {/* Header with search and add contact */}
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">Contacts</h3>
          <Button
            onClick={() => setShowNewContactModal(true)}
            className="btn-enhanced"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        <div className="relative">
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-enhanced pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Contacts list */}
      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        {filteredContacts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-muted-foreground">No contacts found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add some contacts to get started
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-4 hover:bg-accent transition-colors duration-200 cursor-pointer ${
                  selectedContacts.includes(contact.id)
                    ? 'bg-primary/5 border-l-4 border-primary'
                    : ''
                }`}
                onClick={() => handleContactSelect(contact.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleContactSelect(contact.id)}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-foreground truncate">
                          {contact.name}
                        </h4>
                        {contact.invitation_status === 'Accepted' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium status-operational">
                            Active
                          </span>
                        )}
                        {contact.invitation_status === 'Invited' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium status-scheduled">
                            Invited
                          </span>
                        )}
                        {contact.invitation_status === 'Declined' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium status-grounded">
                            Declined
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.email}
                      </p>
                      {contact.company && (
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.company}
                          {contact.role && ` • ${contact.role}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {contact.phone && (
                      <button
                        className="btn-enhanced p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle phone call
                        }}
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      className="btn-enhanced p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle video call
                      }}
                      title="Video Call"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {filteredContacts.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {selectedContacts.length} contact
              {selectedContacts.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedContacts([])}
                disabled={selectedContacts.length === 0}
                className="btn-enhanced"
              >
                Clear
              </Button>
              <Button
                onClick={handleChatNow}
                disabled={selectedContacts.length === 0}
                className="btn-enhanced"
              >
                <Check className="w-4 h-4 mr-2" />
                Chat Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Contact Modal */}
      <Dialog open={showNewContactModal} onOpenChange={setShowNewContactModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Add a new contact to your network. They will receive an invitation
              to join.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                value={newContactForm.email}
                onChange={(e) =>
                  setNewContactForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="input-enhanced"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={newContactForm.phone}
                onChange={(e) =>
                  setNewContactForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                className="input-enhanced"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent"
                checked={consentChecked}
                onCheckedChange={(checked) =>
                  setConsentChecked(checked as boolean)
                }
              />
              <Label htmlFor="consent" className="text-sm">
                I consent to have Ironfleet send an invitation on my behalf
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewContactModal(false)}
              className="btn-enhanced"
            >
              Cancel
            </Button>
            <Button
              onClick={handleNewContactSubmit}
              disabled={createContactMutation.isPending}
              className="btn-enhanced"
            >
              {createContactMutation.isPending ? 'Adding...' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
