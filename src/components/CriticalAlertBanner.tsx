import React, { useState } from 'react';
import type { CriticalAlert } from '../types/report';
import {
  AlertOctagon,
  CheckCircle2,
  PhoneCall,
  Clock,
  ShieldAlert,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CriticalAlertBannerProps {
  alert: CriticalAlert;
  onDocumentNotification: (details: {
    physicianName: string;
    readbackConfirmed: boolean;
    contactMethod: string;
    timestamp: string;
  }) => void;
}

export const CriticalAlertBanner: React.FC<CriticalAlertBannerProps> = ({
  alert,
  onDocumentNotification,
}) => {
  const [isExpanded, setIsExpanded] = useState(!alert.notified);
  const [physicianName, setPhysicianName] = useState(
    alert.physicianName || 'Dr. Rajesh Sharma (ED Attending)'
  );
  const [contactMethod, setContactMethod] = useState(
    alert.contactMethod || 'Direct Telephone Call'
  );
  const [readbackConfirmed, setReadbackConfirmed] = useState(
    alert.readbackConfirmed ?? true
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    onDocumentNotification({
      physicianName: physicianName.trim(),
      readbackConfirmed,
      contactMethod,
      timestamp,
    });
    setIsExpanded(false);
  };

  if (alert.notified) {
    return (
      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-300 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded-full bg-emerald-900/60 border border-emerald-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-emerald-200">
                ACR Critical Result Communicated & Logged
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-300 font-mono">
                Read-back Verified
              </span>
            </div>
            <p className="text-[11px] text-emerald-400/90 m-0 mt-0.5">
              Notified: <span className="font-semibold">{alert.physicianName}</span> via{' '}
              {alert.contactMethod} at {alert.timestamp}.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[11px] text-emerald-400 hover:text-emerald-200 underline cursor-pointer"
        >
          {isExpanded ? 'Hide Details' : 'View Audit Log'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-rose-950/30 border border-rose-800/80 text-xs text-rose-200 shadow-md shadow-rose-950/40 overflow-hidden">
      {/* Alert Header */}
      <div className="p-3 flex items-start justify-between bg-rose-950/50 border-b border-rose-800/60">
        <div className="flex items-start space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-900/80 border border-rose-700 flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
            <AlertOctagon className="w-4 h-4 text-rose-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-rose-100 text-xs">
                ACR Actionable Finding: Direct Verbal Communication Required
              </span>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-900 text-rose-200 border border-rose-700">
                {alert.urgency.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-rose-300/90 m-0 mt-0.5">
              {alert.categoryName}:{' '}
              <span className="font-semibold text-rose-100">"{alert.findingText}"</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-rose-400 hover:text-rose-200 transition cursor-pointer"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Verbal Notification Form */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="p-3 bg-slate-950/80 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Ordering / Attending Physician:
              </label>
              <input
                type="text"
                value={physicianName}
                onChange={(e) => setPhysicianName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-medium"
                placeholder="Dr. Rajesh Sharma (ED)"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Communication Method:
              </label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded px-2.5 py-1.5 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="Direct Telephone Call">Direct Telephone Call (Verbal Read-Back)</option>
                <option value="In-Person Discussion">In-Person Discussion</option>
                <option value="Critical Results Pager / Call Center">
                  Critical Results Pager / Call Center
                </option>
                <option value="STAT PACS EMR Alert">STAT PACS EMR Critical Alert</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="readback"
              checked={readbackConfirmed}
              onChange={(e) => setReadbackConfirmed(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="readback" className="text-xs text-slate-300 cursor-pointer">
              I certify verbal read-back of the acute critical findings was completed and confirmed.
            </label>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-[10px] text-slate-500 flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>Attestation will be appended to the final Impression for legal compliance.</span>
            </span>

            <button
              type="submit"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-950 transition cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Record Read-Back & Append to Report</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
