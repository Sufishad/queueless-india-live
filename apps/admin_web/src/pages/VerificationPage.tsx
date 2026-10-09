import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileCheck, 
  AlertTriangle,
  Building,
  Search,
  History
} from 'lucide-react';
import { MerchantVerification } from '../types';
import { maskMobile } from '../utils/masking';

interface VerificationPageProps {
  verifications: MerchantVerification[];
  onApprove: (id: string) => void;
  onRevoke: (id: string) => void;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({
  verifications,
  onApprove,
  onRevoke,
}) => {
  const [selectedItem, setSelectedItem] = useState<MerchantVerification | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = verifications.filter((v) => {
    const matchesStatus = filterStatus === 'ALL' || v.status === filterStatus;
    const matchesSearch =
      v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#F97316]">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Merchant Partner Trust & Safety Pipeline
            </h2>
            <p className="text-xs text-[#8B98AD] mt-0.5">
              Mandatory DPDP Act 2023, Aadhaar/PAN KYC, and GSTIN verification prior to token activation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search size={15} className="absolute left-3 top-3 text-[#8B98AD]" />
            <input
              type="text"
              placeholder="Search partner or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#8B98AD] focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316]"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending (Action Required)</option>
            <option value="APPROVED">Approved</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Verification Table */}
      <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F1626] border-b border-[#1E293B] text-[#8B98AD] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Merchant Business</th>
                <th className="py-3.5 px-4">Authorized Signatory</th>
                <th className="py-3.5 px-4">KYC Status</th>
                <th className="py-3.5 px-4">GSTIN Validation</th>
                <th className="py-3.5 px-4">DPDP Data-Safety</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 text-white">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#151F33]/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{item.businessName}</div>
                    <div className="text-[11px] text-[#8B98AD]">
                      {item.category} &bull; {item.city}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-white font-medium">{item.ownerName}</div>
                    <div className="text-[11px] font-mono text-[#8B98AD]">
                      {maskMobile(item.ownerMobile)}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.kycVerified ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 size={12} />
                        <span>KYC &check;</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Clock size={12} />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.gstVerified ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 size={12} />
                        <span>GST &check;</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <AlertTriangle size={12} />
                        <span>Unverified</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.dataSafetyCertified ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <FileCheck size={12} />
                        <span>Data-Safety &check;</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                        <XCircle size={12} />
                        <span>Missing</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.status === 'APPROVED' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        APPROVED
                      </span>
                    )}
                    {item.status === 'PENDING' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        PENDING REVIEW
                      </span>
                    )}
                    {item.status === 'REVOKED' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/40">
                        REVOKED
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="px-2.5 py-1 rounded bg-[#1E293B] text-[#8B98AD] hover:text-white hover:bg-[#2A374F] text-[11px] transition-colors"
                    >
                      Dossier
                    </button>
                    {item.status !== 'APPROVED' && (
                      <button
                        onClick={() => onApprove(item.id)}
                        className="px-2.5 py-1 rounded bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/50 text-[11px] font-semibold transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {item.status === 'APPROVED' && (
                      <button
                        onClick={() => onRevoke(item.id)}
                        className="px-2.5 py-1 rounded bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/40 text-[11px] font-semibold transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Dossier Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center space-x-2.5">
                <Building size={20} className="text-[#F97316]" />
                <h3 className="font-bold text-white text-base">
                  {selectedItem.businessName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-[#8B98AD] hover:text-white text-sm"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B] space-y-1.5">
                <div className="text-[#8B98AD]">Authorized Signatory</div>
                <div className="text-white font-medium">{selectedItem.ownerName}</div>
                <div className="text-[#8B98AD] font-mono">
                  Mobile (DPDP Masked): {maskMobile(selectedItem.ownerMobile)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded bg-[#151F33] border border-[#1E293B]">
                  <span className="text-[#8B98AD]">Aadhaar / PAN KYC</span>
                  <span className="text-emerald-400 font-semibold">&check; Verified via NSDL Sandbox</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-[#151F33] border border-[#1E293B]">
                  <span className="text-[#8B98AD]">GSTIN Record</span>
                  <span className="text-emerald-400 font-semibold">&check; Active GSTIN in {selectedItem.city}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-[#151F33] border border-[#1E293B]">
                  <span className="text-[#8B98AD]">DPDP Act 2023 Consent Agreement</span>
                  <span className="text-emerald-400 font-semibold">&check; Signed E-Agreement on file</span>
                </div>
              </div>

              <div className="text-[11px] text-[#8B98AD] flex items-center space-x-1.5 pt-2">
                <History size={13} />
                <span>Submitted at: {selectedItem.appliedAt}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1E293B]">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-lg bg-[#1E293B] text-xs text-white hover:bg-[#2A374F]"
              >
                Close
              </button>
              {selectedItem.status !== 'APPROVED' ? (
                <button
                  onClick={() => {
                    onApprove(selectedItem.id);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Approve Verification
                </button>
              ) : (
                <button
                  onClick={() => {
                    onRevoke(selectedItem.id);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-500"
                >
                  Revoke Verification
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
