import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Check, Loader2, Users } from 'lucide-react';
import { db } from '@/src/firebase';
import { useAuth } from '@/src/contexts/auth-context';
import { useContacts } from '@/src/hooks/use-contacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { contacts, loading: contactsLoading } = useContacts(
    currentUser?.id,
    currentUser?.contacts || []
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!currentUser) return null;

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }
    if (selectedMembers.length === 0) {
      setError('Select at least one member to join the group.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const groupRef = doc(collection(db, 'groups'));
      const groupId = groupRef.id;

      const groupMembers = [currentUser.id, ...selectedMembers];
      const initialMessageText = `${currentUser.username} created group "${name}"`;

      // Save group document
      await setDoc(groupRef, {
        id: groupId,
        name: name.trim(),
        description: description.trim(),
        createdBy: currentUser.id,
        createdAt: serverTimestamp(),
        members: groupMembers,
        lastMessage: {
          text: initialMessageText,
          senderId: 'system',
          senderName: 'System',
          createdAt: serverTimestamp(),
        },
      });

      // Save initial system message in messages subcollection
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        type: 'text',
        text: initialMessageText,
        senderId: 'system',
        senderName: 'System',
        createdAt: serverTimestamp(),
      });

      // Reset state and close dialog
      setName('');
      setDescription('');
      setSelectedMembers([]);
      onOpenChange(false);

      // Navigate to the newly created group chat
      navigate(`/app/group/${groupId}`);
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group. Please check Firebase rules.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Create New Group
          </DialogTitle>
          <DialogDescription>
            Assemble a new group chat. Enter a name, description, and select members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-6 space-y-4">
            {error && <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">{error}</p>}

            <div className="space-y-1.5">
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                placeholder="e.g. Project Xync, Family, Friends"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
                maxLength={40}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="group-desc">Description</Label>
              <Input
                id="group-desc"
                placeholder="What is this group about? (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Members ({selectedMembers.length} selected)
              </Label>

              {contactsLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="animate-spin mr-2 h-4 w-4" /> Loading contacts...
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-xl px-4">
                  No contacts available to add. Please add contacts to your network first!
                </div>
              ) : (
                <div className="space-y-1.5 border rounded-xl p-2 max-h-[180px] overflow-y-auto bg-muted/10">
                  {contacts.map((contact) => {
                    const isSelected = selectedMembers.includes(contact.id);
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => toggleMember(contact.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors hover:bg-muted/50 ${
                          isSelected ? 'bg-muted/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={contact.img_link} />
                            <AvatarFallback className="text-xs">
                              {contact.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{contact.username}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{contact.email}</p>
                          </div>
                        </div>
                        <div
                          className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || contacts.length === 0}>
              {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
