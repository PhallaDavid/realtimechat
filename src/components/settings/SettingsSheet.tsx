import React, { useEffect, useState } from 'react';
import {
  Check, Copy, Edit2, Key, LayoutDashboard, Loader2, Moon, Shield, Sun,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/src/contexts/auth-context';
import { APP_NAME, DEFAULT_ABOUT, USER_ID_LABEL } from '@/src/lib/brand';
import { useContacts } from '@/src/hooks/use-contacts';
import { useTheme } from '@/hooks/use-theme';
import type { UserProfile } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeSelector } from '@/src/components/theme/ThemeSelector';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewImage: (url: string) => void;
}

export function SettingsSheet({ open, onOpenChange, onViewImage }: SettingsSheetProps) {
  const { currentUser, updateProfile, changePassword } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const { contacts } = useContacts(currentUser?.id, currentUser?.contacts);

  const [updateData, setUpdateData] = useState<Partial<UserProfile>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && currentUser) {
      setUpdateData({ ...currentUser });
      setProfileSaveMessage('');
      setPasswordMessage('');
    }
  }, [open, currentUser?.id]);

  if (!currentUser) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    const payload = {
      username: updateData.username || currentUser.username,
      about: updateData.about || currentUser.about,
      github_username: updateData.github_username || currentUser.github_username,
      img_link: updateData.img_link || currentUser.img_link,
      email: updateData.email || currentUser.email,
      privacy: updateData.privacy || currentUser.privacy || { about: true, email: true, github: true },
    };
    const msg = await updateProfile(payload);
    setProfileSaveMessage(msg);
    setIsUpdating(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = await changePassword(newPassword);
    setPasswordMessage(msg);
    if (msg.includes('success')) {
      setCurrentPassword('');
      setNewPassword('');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <SheetTitle>Dashboard</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your account & preferences</p>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex flex-1 flex-col min-h-0 gap-0">
          <div className="px-4 pt-4 pb-2 border-b shrink-0">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="gap-1.5">
                <LayoutDashboard size={14} />
                <span className="sr-only sm:not-sr-only sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1.5">
                <UserIcon size={14} />
                <span className="sr-only sm:not-sr-only sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5">
                <Shield size={14} />
                <span className="sr-only sm:not-sr-only sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <TabsContent value="overview" className="mt-0 px-4 py-5 space-y-4">
              <div className="flex flex-col items-center text-center pb-2">
                <button
                  type="button"
                  className="relative group cursor-pointer mb-3"
                  onClick={() => onViewImage(currentUser.img_link)}
                >
                  <Avatar className="h-24 w-24 ring-2 ring-border">
                    <AvatarImage src={currentUser.img_link} />
                    <AvatarFallback className="text-2xl">{currentUser.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 size={18} className="text-white" />
                  </div>
                </button>
                <p className="font-semibold">{currentUser.username}</p>
                <p className="text-sm text-muted-foreground line-clamp-2 max-w-[260px]">
                  {currentUser.about || DEFAULT_ABOUT}
                </p>
              </div>

              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Your {USER_ID_LABEL}</CardTitle>
                  <CardDescription>Share this ID so others can find you</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-muted px-4 py-3">
                    <span className="font-mono text-lg font-semibold tracking-wider">{currentUser.XyncId}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.XyncId);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card size="sm" className="py-4">
                  <CardContent className="pt-0 text-center">
                    <p className="text-2xl font-semibold">{contacts.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Contacts</p>
                  </CardContent>
                </Card>
                <Card size="sm" className="py-4">
                  <CardContent className="pt-0 text-center">
                    <p className="text-2xl font-semibold">{isDark ? 'Dark' : 'Light'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Theme</p>
                  </CardContent>
                </Card>
              </div>

              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {isDark ? <Moon size={15} /> : <Sun size={15} />}
                    Appearance
                  </CardTitle>
                  <CardDescription>Choose light, dark, or match your system</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ThemeSelector theme={theme} setTheme={setTheme} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="mt-0 px-4 py-5">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
                    <UserIcon size={15} className="text-muted-foreground" />
                    Edit Profile
                  </h3>
                  <p className="text-xs text-muted-foreground">Update how others see you on {APP_NAME}</p>
                </div>

                {[
                  { id: 'u-name', label: 'Display Name', key: 'username', type: 'text', placeholder: 'Your name' },
                  { id: 'u-about', label: 'About', key: 'about', type: 'text', placeholder: 'A short bio…' },
                  { id: 'u-email', label: 'Email', key: 'email', type: 'email', placeholder: 'you@example.com' },
                  { id: 'u-photo', label: 'Photo URL', key: 'img_link', type: 'url', placeholder: 'https://…' },
                  { id: 'u-github', label: 'GitHub Username', key: 'github_username', type: 'text', placeholder: 'username' },
                ].map(({ id, label, key, type, placeholder }) => (
                  <div key={id} className="space-y-1.5">
                    <Label htmlFor={id}>{label}</Label>
                    <Input
                      id={id}
                      type={type}
                      placeholder={placeholder}
                      value={(updateData as Record<string, string>)[key] || ''}
                      onChange={(e) => setUpdateData({ ...updateData, [key]: e.target.value })}
                    />
                  </div>
                ))}

                <Separator />
                <div>
                  <p className="text-sm font-medium mb-3">Privacy</p>
                  <div className="space-y-3">
                    {(['about', 'email', 'github'] as const).map((field) => (
                      <div key={field} className="flex items-center justify-between">
                        <Label htmlFor={`priv-${field}`} className="capitalize font-normal">
                          Show {field}
                        </Label>
                        <Switch
                          id={`priv-${field}`}
                          checked={updateData.privacy?.[field] ?? true}
                          onCheckedChange={(v) =>
                            setUpdateData({
                              ...updateData,
                              privacy: {
                                ...(updateData.privacy || { about: true, email: true, github: true }),
                                [field]: v,
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {profileSaveMessage && (
                  <p
                    className={`text-sm ${profileSaveMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                  >
                    {profileSaveMessage}
                  </p>
                )}

                <Button type="submit" disabled={isUpdating} className="w-full">
                  {isUpdating ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  Save Profile
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="security" className="mt-0 px-4 py-5 space-y-6">
              <div>
                <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
                  <Key size={15} className="text-muted-foreground" />
                  Change Password
                </h3>
                <p className="text-xs text-muted-foreground">Use a strong password you do not use elsewhere</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="current-pw">Current password</Label>
                  <Input
                    id="current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-pw">New password</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                {passwordMessage && (
                  <p
                    className={`text-sm ${passwordMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                  >
                    {passwordMessage}
                  </p>
                )}
                <Button type="submit" variant="outline" className="w-full">
                  Update Password
                </Button>
              </form>

              <Separator />

              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {isDark ? <Moon size={15} /> : <Sun size={15} />}
                    Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ThemeSelector theme={theme} setTheme={setTheme} />
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
