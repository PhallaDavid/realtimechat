import { useNavigate } from 'react-router-dom';
import { SettingsSheet } from '@/src/components/settings/SettingsSheet';
import { useState } from 'react';

export function SettingsPage() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <SettingsSheet
      open
      onOpenChange={(open) => {
        if (!open) navigate('/app/chats');
      }}
      onViewImage={setSelectedImage}
    />
  );
}
