'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { parseElectricianServiceAddress } from '@/lib/electrician-profile-address';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';
import { ELECTRICIAN_SUPPORT_EMAIL } from '@/lib/electrician-ui';

const NOTIFICATION_EXAMPLES = [
  {
    title: 'New booking',
    body: 'New booking request from [Customer name] — [issue summary]. Respond within 2 hours.',
  },
  {
    title: 'Order nearby',
    body: '[Product] was just ordered in [Area], [X] km from you. This customer may need service soon.',
  },
  {
    title: 'Booking expiry',
    body: 'Reminder: You have a booking request expiring in 30 minutes. Tap to respond.',
  },
  {
    title: 'New review',
    body: '[Customer name] left you a [X]-star review. Tap to read it.',
  },
  {
    title: 'Account approved',
    body: 'Welcome to E vision! Your account has been approved. Go online to start receiving job requests.',
  },
];

function skillsToList(skills: unknown): string[] {
  if (Array.isArray(skills)) return skills.map(String);
  const s = String(skills || '').trim();
  if (!s) return [];
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j)) return j.map(String);
  } catch {
    /* comma list */
  }
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

export default function ElectricianSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountStatus, setAccountStatus] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [skillsCsv, setSkillsCsv] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await electricianApi.me();
        const row = (data || {}) as Record<string, unknown>;
        setAccountStatus(String(row.status || ''));
        const skills = skillsToList(row.skills);
        const parsed = parseElectricianServiceAddress(String(row.address || ''));
        setExperienceYears(parsed.experienceYears != null ? String(parsed.experienceYears) : '');
        setServiceArea(parsed.areaLabel === '—' ? '' : parsed.areaLabel);
        setSkillsCsv(skills.join(', '));
      } catch (e) {
        toast.error(getApiErrorMessage(e, 'Failed to load profile'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const approved = String(accountStatus).toLowerCase() === 'approved';

  const onSaveSkills = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approved) {
      toast.error('You can edit skills after your account is approved.');
      return;
    }
    const y = Number(String(experienceYears).replace(/\D/g, '').slice(0, 2));
    const area = serviceArea.trim();
    if (!Number.isFinite(y) || y < 1 || y > 60) {
      toast.error('Enter years of experience (1–60).');
      return;
    }
    if (!area) {
      toast.error('Enter your service area (city, PIN code, etc.).');
      return;
    }
    const skills = skillsCsv.split(',').map((s) => s.trim()).filter(Boolean);
    if (skills.length > 25) {
      toast.error('At most 25 services.');
      return;
    }
    for (const s of skills) {
      if (s.length > 60) {
        toast.error('Each service name must be 60 characters or less.');
        return;
      }
    }
    try {
      setSaving(true);
      await electricianApi.updateProfile({
        experience_years: y,
        service_area: area,
        skills,
      });
      toast.success('Skills and experience saved.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save changes.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ElectricianShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="ev-card p-6 sm:p-8 space-y-5">
          <h1 className="text-2xl font-bold text-ev-text">Settings</h1>
          <p className="text-ev-muted text-sm leading-relaxed">
            You sign in with a code sent to your mobile number. There is no separate password for your technician
            account on the web app.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/electrician/profile" className="ev-btn-secondary inline-flex text-sm py-2.5 px-4">
              View profile
            </Link>
          </div>
        </div>

        <div className="ev-card p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-semibold text-ev-text">Skills &amp; experience</h2>
          <p className="text-ev-muted text-sm leading-relaxed">
            Keep your years of experience, service area, and services accurate so customers know what you offer.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-ev-muted py-6">
              <Loader2 className="h-5 w-5 animate-spin text-ev-primary" />
              Loading…
            </div>
          ) : !approved ? (
            <p className="text-sm text-ev-muted border-l-2 border-amber-400/60 pl-3">
              You can update skills and your service area after your account is approved.
            </p>
          ) : (
            <form className="space-y-5" onSubmit={(e) => void onSaveSkills(e)}>
              <div>
                <label className="ev-label" htmlFor="ev-tech-exp">
                  Years of experience
                </label>
                <input
                  id="ev-tech-exp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={2}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="ev-input mt-1 max-w-[8rem]"
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="ev-label" htmlFor="ev-tech-area">
                  Service area
                </label>
                <textarea
                  id="ev-tech-area"
                  rows={3}
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  className="ev-input mt-1 min-h-[5.5rem] resize-y"
                  placeholder="City, PIN code, India (same style as registration)"
                  maxLength={500}
                />
              </div>
              <div>
                <label className="ev-label" htmlFor="ev-tech-skills">
                  Services you offer
                </label>
                <textarea
                  id="ev-tech-skills"
                  rows={3}
                  value={skillsCsv}
                  onChange={(e) => setSkillsCsv(e.target.value)}
                  className="ev-input mt-1 min-h-[5.5rem] resize-y font-mono text-sm"
                  placeholder="Comma-separated, e.g. AC repair, Wiring, Inverter install"
                />
                <p className="mt-1.5 text-ev-subtle text-xs">Separate services with commas. Up to 25 tags.</p>
              </div>
              <button type="submit" className="ev-btn-primary text-sm py-2.5 px-5 inline-flex items-center gap-2" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save skills &amp; experience
              </button>
            </form>
          )}
        </div>

        <div className="ev-card p-8 space-y-4">
          <h2 className="text-ev-text font-semibold flex items-center gap-2">
            <Bell size={20} className="text-ev-primary" />
            Push notifications you receive
          </h2>
          <p className="text-ev-muted text-xs leading-relaxed">
            When you enable notifications on your device, you may see alerts like the examples below (wording may vary
            slightly by platform). Booking expiry reminders may be added as scheduled notifications in a future release.
          </p>
          <ul className="space-y-3">
            {NOTIFICATION_EXAMPLES.map((n) => (
              <li key={n.title} className="rounded-xl border border-ev-border bg-ev-surface2/40 p-4">
                <p className="text-ev-text text-sm font-semibold">{n.title}</p>
                <p className="text-ev-muted text-xs mt-1 leading-relaxed">{n.body}</p>
              </li>
            ))}
          </ul>
          <a
            href={`mailto:${ELECTRICIAN_SUPPORT_EMAIL}`}
            className="ev-btn-secondary text-sm py-2 px-4 inline-flex w-fit mt-2"
          >
            Email support
          </a>
          <p className="text-ev-subtle text-xs mt-2 font-mono">{ELECTRICIAN_SUPPORT_EMAIL}</p>
        </div>
      </div>
    </ElectricianShell>
  );
}
