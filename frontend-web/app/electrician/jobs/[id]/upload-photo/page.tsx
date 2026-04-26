'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
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
      await electricianApi.updateJobStatus(bookingId, 'completed');
      toast.success(
        'Job closed. The customer has been notified and will receive a review prompt. Great work!',
      );
      router.push('/electrician/bookings/history');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ElectricianShell>
      <div className="max-w-xl mx-auto ev-card p-8 space-y-4">
        <h1 className="text-2xl font-bold text-ev-text">Upload completion photo</h1>
        <p className="text-ev-muted text-sm leading-relaxed">
          A photo of the finished work is required before the job can be marked complete.
        </p>
        <form onSubmit={upload} className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="ev-input"
          />
          <button
            type="submit"
            className="ev-btn-primary w-full inline-flex items-center justify-center gap-2 py-3"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading…
              </>
            ) : (
              'Submit photo & close job'
            )}
          </button>
        </form>
        <Link href={`/electrician/bookings/${bookingId}`} className="ev-btn-secondary text-sm py-2.5 px-4 inline-flex mt-4">
          Back to job
        </Link>
      </div>
    </ElectricianShell>
  );
}
