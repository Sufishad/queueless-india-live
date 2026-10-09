import React, { useState } from 'react';
import { 
  Power, 
  AlertTriangle, 
  Radio, 
  ShieldAlert, 
  Info,
  RotateCcw
} from 'lucide-react';
import { BranchHealth } from '../types';

interface KillSwitchPageProps {
  branches: BranchHealth[];
  onTogglePause: (branchId: string, shouldPause: boolean, reason: string) => void;
}

export const KillSwitchPage: React.FC<KillSwitchPageProps> = ({
  branches,
  onTogglePause,
}) => {
  const [targetBranch, setTargetBranch] = useState<BranchHealth | null>(null);
  const [modalAction, setModalAction] = useState<'PAUSE' | 'RESUME'>('PAUSE');
  const [emergencyReason, setEmergencyReason] = useState<string>(
    'Emergency pause: Power fluctuation / Doctor emergency. Queue will resume shortly.'
  );
  const [broadcastLog, setBroadcastLog] = useState<Array<{
    id: string;
    time: string;
    branchName: string;
    action: string;
    message: string;
    tokensImpacted: number;
  }>>([
    {
      id: 'b1',
      time: '10:45 AM IST',
      branchName: 'Lilavati OPD Bandra',
      action: 'RESUME_BROADCAST',
      message: 'Queue resumed. Doctor consultation active.',
      tokensImpacted: 34,
    },
  ]);

  const handleOpenModal = (branch: BranchHealth, action: 'PAUSE' | 'RESUME') => {
    setTargetBranch(branch);
    setModalAction(action);
    if (action === 'PAUSE') {
      setEmergencyReason(
        `Emergency halt for ${branch.name}: Unexpected delay. Token validity preserved.`
      );
    } else {
      setEmergencyReason(
        `Normal queue operations resumed for ${branch.name}. Please proceed to counter.`
      );
    }
  };

  const handleConfirmAction = () => {
    if (!targetBranch) return;

    const isPausing = modalAction === 'PAUSE';
    onTogglePause(targetBranch.id, isPausing, emergencyReason);

    // Add entry to broadcast log
    setBroadcastLog((prev) => [
      {
        id: `bc-${Date.now()}`,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
        branchName: targetBranch.name,
        action: isPausing ? 'EMERGENCY_PAUSE' : 'RESUME_BROADCAST',
        message: emergencyReason,
        tokensImpacted: targetBranch.tokensWaiting,
      },
      ...prev,
    ]);

    setTargetBranch(null);
  };

  const pausedCount = branches.filter((b) => b.isPaused).length;

  return (
    <div className="space-y-6">
      {/* Warning Alert Banner */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex items-start space-x-4">
        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
          <ShieldAlert size={22} />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-red-400">
            Platform Emergency Kill-Switch & Broadcasting Authority
          </h2>
          <p className="text-xs text-[#8B98AD] mt-1">
            Pausing a queue halts counter dispatch, notifies all waiting mobile devices via
            high-priority Firebase Cloud Messaging + WebSocket live stream, and updates Android TV Calling Boards.
            Currently <span className="text-white font-bold">{pausedCount}</span> branches are paused across the network.
          </p>
        </div>
      </div>

      {/* Branch Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className={`bg-[#121A2B] rounded-xl p-5 border transition-all ${
              branch.isPaused
                ? 'border-red-500/60 bg-red-950/10 shadow-lg shadow-red-950/20'
                : 'border-[#1E293B]'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">{branch.name}</h3>
                <p className="text-xs text-[#8B98AD] mt-0.5">{branch.city} &bull; Zone {branch.zone}</p>
              </div>
              {branch.isPaused ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                  HALTED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-[#10B981] border border-emerald-500/40">
                  RUNNING
                </span>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#1E293B] grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[11px] text-[#8B98AD]">Waiting Tokens</div>
                <div className="font-mono font-bold text-white mt-0.5">
                  {branch.tokensWaiting} consumers
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#8B98AD]">Active Counters</div>
                <div className="font-mono font-bold text-white mt-0.5">
                  {branch.activeQueues} desks
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#1E293B] flex items-center justify-between">
              <span className="text-[11px] text-[#8B98AD] font-mono">
                p95: {branch.p95LatencyMs}ms
              </span>
              {branch.isPaused ? (
                <button
                  onClick={() => handleOpenModal(branch, 'RESUME')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Resume Queue</span>
                </button>
              ) : (
                <button
                  onClick={() => handleOpenModal(branch, 'PAUSE')}
                  className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Power size={13} />
                  <span>Kill Switch</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Broadcast History Log */}
      <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl p-5">
        <div className="flex items-center space-x-2 pb-3 border-b border-[#1E293B]">
          <Radio size={16} className="text-[#F97316]" />
          <h3 className="font-bold text-white text-sm">
            Emergency Broadcast Transmission Log
          </h3>
        </div>

        <div className="mt-3 divide-y divide-[#1E293B]/60 text-xs">
          {broadcastLog.map((log) => (
            <div key={log.id} className="py-3 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white">{log.branchName}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      log.action === 'EMERGENCY_PAUSE'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-emerald-500/20 text-[#10B981]'
                    }`}
                  >
                    {log.action}
                  </span>
                </div>
                <p className="text-[#8B98AD] mt-1 text-[11px]">{log.message}</p>
              </div>

              <div className="text-right">
                <div className="text-white font-mono">{log.time}</div>
                <div className="text-[11px] text-[#8B98AD]">
                  {log.tokensImpacted} tokens alerted
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {targetBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 pb-3 border-b border-[#1E293B]">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  modalAction === 'PAUSE' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-[#10B981]'
                }`}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  Confirm {modalAction === 'PAUSE' ? 'Emergency Pause' : 'Queue Resumption'}
                </h3>
                <p className="text-xs text-[#8B98AD]">{targetBranch.name} ({targetBranch.city})</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#F8FAFC]">
                {modalAction === 'PAUSE' ? (
                  <>
                    Are you sure you want to pause queue for{' '}
                    <span className="text-[#F97316] font-semibold">{targetBranch.name}</span>?
                    All <span className="text-white font-bold">{targetBranch.tokensWaiting}</span> waiting
                    customers will receive instant WebSocket/FCM alerts.
                  </>
                ) : (
                  <>
                    Resume counter dispatch for{' '}
                    <span className="text-[#10B981] font-semibold">{targetBranch.name}</span>?
                    Waiting customers will be re-notified of active service.
                  </>
                )}
              </p>

              <div>
                <label className="block text-[#8B98AD] mb-1 font-medium">
                  Broadcast Message to Customers (English + Hindi push notification):
                </label>
                <textarea
                  rows={3}
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg p-2.5 text-xs text-white placeholder-[#8B98AD] focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="p-3 rounded bg-[#0B0F19] border border-[#1E293B] text-[11px] text-[#8B98AD] flex items-center space-x-2">
                <Info size={14} className="text-[#F97316] flex-shrink-0" />
                <span>
                  Tokens will maintain their ordinal queue numbers. No tokens will be cancelled or deleted.
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1E293B]">
              <button
                onClick={() => setTargetBranch(null)}
                className="px-4 py-2 rounded-lg bg-[#1E293B] text-xs text-white hover:bg-[#2A374F]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white ${
                  modalAction === 'PAUSE'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                Confirm &amp; Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
