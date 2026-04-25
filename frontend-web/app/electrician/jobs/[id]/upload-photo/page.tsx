'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';

export default function ElectricianUploadPhotoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = String(params.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please choose a photo');
      return;
    }
    try {
      setUploading(true);
      await electricianApi.uploadWorkPhoto(bookingId, file);
      toast.success('Work photo uploaded');
      router.push(`/electrician/bookings/${bookingId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ElectricianShell>
      <div className="max-w-xl ev-card p-8">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Upload completion photo</h1>
        <p className="text-ev-muted text-sm mb-6">Booking: {bookingId}</p>
        <form onSubmit={upload} className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="ev-input"
          />
          <button type="submit" className="ev-btn-primary w-full inline-flex items-center justify-center gap-2" disabled={uploading}>
            {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : 'Upload Photo'}
          </button>
        </form>
      </div>
    </ElectricianShell>
  );
}
