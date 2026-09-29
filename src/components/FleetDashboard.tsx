/**
 * DriveGuard AI — Owner & Fleet Management Console
 */

import React, { useState } from 'react';
import {
  Truck,
  Users,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  Radio,
  FileText,
  Mail,
  Search,
  ChevronRight,
  X
} from 'lucide-react';
import { Vehicle, Driver, TripSession, SafetyEvent } from '../types';
import { AlertNotification } from '../db/inMemoryDb';

interface Props {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: TripSession[];
  safetyEvents: SafetyEvent[];
  alerts: AlertNotification[];
  onAcknowledgeAlert: (alertId: string) => void;
  onAddVehicle: (veh: Partial<Vehicle>) => void;
  onAddDriver: (drv: Partial<Driver>) => void;
}

export const FleetDashboard: React.FC<Props> = ({
  vehicles,
  drivers,
  trips,
  safetyEvents,
  alerts,
  onAcknowledgeAlert,
  onAddVehicle,
  onAddDriver
}) => {
  const [selectedTab, setSelectedTab] = useState<'OVERVIEW' | 'FLEET' | 'EVENTS' | 'ANALYTICS'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);

  // New vehicle form state
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newVin, setNewVin] = useState('');

  // New driver form state
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverLicense, setNewDriverLicense] = useState('');

  // Computations
  const activeVehicles = vehicles.filter(v => v.status === 'ACTIVE').length;
  const pendingAlerts = alerts.filter(a => a.status === 'PENDING');
  const avgSafetyScore = Math.round(
    drivers.reduce((acc, d) => acc + d.safetyScoreAverage, 0) / Math.max(1, drivers.length)
  );

  const filteredEvents = safetyEvents.filter(e =>
    e.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.eventType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Timestamp', 'Driver ID', 'Driver Name', 'Vehicle Plate', 'Event Type', 'Severity', 'Stage', 'Safety Score', 'Description'];
    const rows = safetyEvents.map(e => [
      e.timestamp,
      e.driverId,
      `"${e.driverName}"`,
      e.vehiclePlate,
      e.eventType,
      e.severity,
      e.interventionStage,
      e.safetyScoreAtEvent,
      `"${e.description}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `driveguard_safety_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate || !newModel) return;
    onAddVehicle({
      plateNumber: newPlate,
      makeModel: newModel,
      vin: newVin || `1FT8W${Date.now()}`,
      year: 2024,
      status: 'IDLE'
    });
    setNewPlate('');
    setNewModel('');
    setNewVin('');
    setIsAddVehicleOpen(false);
  };

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverEmail) return;
    onAddDriver({
      name: newDriverName,
      email: newDriverEmail,
      licenseNumber: newDriverLicense || 'CDL-PENDING',
      experienceYears: 4,
      safetyScoreAverage: 100,
      totalTrips: 0,
      status: 'OFF_DUTY'
    });
    setNewDriverName('');
    setNewDriverEmail('');
    setNewDriverLicense('');
    setIsAddDriverOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Pending Fleet Emergency Alert Banner */}
      {pendingAlerts.length > 0 && (
        <div className="bg-rose-950/80 border border-rose-500 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                    STAGE 4 FLEET ESCALATION ACTIVE ({pendingAlerts.length} PENDING)
                  </span>
                  <span className="text-xs text-rose-400">·</span>
                  <span className="text-xs text-rose-300">Automated Dispatch Protocol Triggered</span>
                </div>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {pendingAlerts[0].message}
                </p>
                <div className="flex items-center gap-3 text-xs text-rose-300 mt-1">
                  <span>Driver: {pendingAlerts[0].driverName}</span>
                  <span>·</span>
                  <span>Vehicle: {pendingAlerts[0].vehiclePlate}</span>
                  <span>·</span>
                  <span>Time: {new Date(pendingAlerts[0].timestamp).toLocaleTimeString()}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Mail className="w-3 h-3" />
                    Simulated Email dispatched to operations@logistics.com
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onAcknowledgeAlert(pendingAlerts[0].id)}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-lg transition-colors cursor-pointer"
            >
              Acknowledge & Dispatch Rest
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider">Active Fleet Units</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {activeVehicles} <span className="text-sm font-normal text-slate-500">/ {vehicles.length}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span>{vehicles.filter(v => v.status === 'IDLE').length} Idle · {vehicles.filter(v => v.status === 'MAINTENANCE').length} Maintenance</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider">Fleet Safety Index</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {avgSafetyScore} <span className="text-sm font-normal text-slate-500">/ 100</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Weighted composite across {drivers.length} registered drivers
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider">Active Trips</span>
            <Radio className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {trips.filter(t => t.status === 'ACTIVE').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Live telemetry connected via WebSocket
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider">Safety Events (24h)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {safetyEvents.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {safetyEvents.filter(e => e.severity === 'CRITICAL').length} critical · {safetyEvents.filter(e => e.severity === 'MEDIUM').length} moderate
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setSelectedTab('OVERVIEW')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              selectedTab === 'OVERVIEW' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Fleet Monitor
          </button>
          <button
            onClick={() => setSelectedTab('FLEET')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              selectedTab === 'FLEET' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Vehicles & Drivers
          </button>
          <button
            onClick={() => setSelectedTab('EVENTS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              selectedTab === 'EVENTS' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Safety Events Log
          </button>
          <button
            onClick={() => setSelectedTab('ANALYTICS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              selectedTab === 'ANALYTICS' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Risk Trends
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddVehicleOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vehicle</span>
          </button>
          <button
            onClick={() => setIsAddDriverOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Live Fleet Monitor */}
      {selectedTab === 'OVERVIEW' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.filter(t => t.status === 'ACTIVE').map(trip => {
              const driver = drivers.find(d => d.id === trip.driverId);
              const vehicle = vehicles.find(v => v.id === trip.vehicleId);
              const isHighRisk = trip.currentRiskLevel === 'HIGH' || trip.currentRiskLevel === 'CRITICAL';

              return (
                <div
                  key={trip.id}
                  className={`bg-slate-900/80 border rounded-xl p-5 relative overflow-hidden transition-all ${
                    isHighRisk ? 'border-rose-500/80 shadow-rose-950/40 shadow-lg' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono font-bold text-white text-sm">{trip.vehiclePlate}</span>
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      trip.currentRiskLevel === 'SAFE' ? 'text-emerald-300 border-emerald-600/40 bg-emerald-950/60' :
                      trip.currentRiskLevel === 'LOW' ? 'text-cyan-300 border-cyan-600/40 bg-cyan-950/60' :
                      trip.currentRiskLevel === 'MODERATE' ? 'text-amber-300 border-amber-600/40 bg-amber-950/60' :
                      'text-rose-300 border-rose-500/50 bg-rose-950/70'
                    }`}>
                      {trip.currentRiskLevel} RISK
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mb-3">
                    <div className="text-slate-200 font-semibold text-sm">{trip.driverName}</div>
                    <div>{vehicle?.makeModel || 'Commercial Heavy Vehicle'}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs mb-3">
                    <div>
                      <span className="text-slate-500 text-[10px]">Safety Score</span>
                      <div className={`font-mono font-bold text-base tabular-nums ${
                        trip.currentSafetyScore >= 85 ? 'text-emerald-400' :
                        trip.currentSafetyScore >= 65 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {trip.currentSafetyScore}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px]">Warnings</span>
                      <div className="font-mono font-bold text-base text-amber-400 tabular-nums">
                        {trip.warningCount}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px]">Critical</span>
                      <div className="font-mono font-bold text-base text-rose-400 tabular-nums">
                        {trip.criticalCount}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{Math.floor(trip.durationSeconds / 60)} min elapsed</span>
                    </span>
                    <span>Session: {trip.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Vehicles & Drivers Registry */}
      {selectedTab === 'FLEET' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vehicles list */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Registered Fleet Vehicles</h3>
              <span className="text-xs font-mono text-slate-500">{vehicles.length} Units</span>
            </div>
            <div className="space-y-2.5">
              {vehicles.map(v => (
                <div key={v.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold font-mono text-white text-sm">{v.plateNumber}</div>
                    <div className="text-slate-400">{v.makeModel} ({v.year})</div>
                    <div className="text-[10px] font-mono text-slate-500">VIN: {v.vin}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      v.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                      v.status === 'IDLE' ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Drivers list */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Certified Commercial Drivers</h3>
              <span className="text-xs font-mono text-slate-500">{drivers.length} Drivers</span>
            </div>
            <div className="space-y-2.5">
              {drivers.map(d => (
                <div key={d.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white text-sm">{d.name}</div>
                    <div className="text-slate-400 font-mono">{d.licenseNumber} · {d.experienceYears} yrs exp</div>
                    <div className="text-[10px] text-slate-500">{d.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-400">Avg Score</div>
                    <div className="font-mono font-bold text-emerald-400 text-base tabular-nums">
                      {d.safetyScoreAverage}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Safety Events Log */}
      {selectedTab === 'EVENTS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search driver, vehicle, or event..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
              />
            </div>
            <span className="text-xs font-mono text-slate-400">{filteredEvents.length} events logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Driver</th>
                  <th className="py-2.5 px-4 font-semibold">Vehicle</th>
                  <th className="py-2.5 px-4 font-semibold">Event Type</th>
                  <th className="py-2.5 px-4 font-semibold">Severity</th>
                  <th className="py-2.5 px-4 font-semibold">Score</th>
                  <th className="py-2.5 px-4 font-semibold">Description</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredEvents.map(evt => (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-white font-sans font-medium">{evt.driverName}</td>
                    <td className="py-3 px-4 text-slate-300">{evt.vehiclePlate}</td>
                    <td className="py-3 px-4 text-cyan-300">{evt.eventType}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                        evt.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {evt.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 tabular-nums">{evt.safetyScoreAtEvent}</td>
                    <td className="py-3 px-4 text-slate-400 font-sans max-w-xs truncate">{evt.description}</td>
                    <td className="py-3 px-4 text-right">
                      {evt.acknowledged ? (
                        <span className="text-emerald-400 flex items-center justify-end gap-1 font-sans text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                        </span>
                      ) : (
                        <span className="text-rose-400 font-sans text-[11px] font-bold">Pending Review</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Risk Trends & Statistical Breakdown */}
      {selectedTab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Risk Level Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-medium">Nominal / Safe</span>
                  <span className="font-mono text-slate-400">76% of driving hours</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-emerald-400 h-full" style={{ width: '76%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400 font-medium">Stage 1-2 Early Fatigue & Yawning</span>
                  <span className="font-mono text-slate-400">18% of incidents</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-amber-400 h-full" style={{ width: '18%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-400 font-medium">Stage 3-4 Prolonged Closure / Escalation</span>
                  <span className="font-mono text-slate-400">6% of incidents</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-rose-500 h-full" style={{ width: '6%' }} />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Temporal filtering reduced false alarms by 84% compared to single-frame EAR thresholding.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Fatigue Event Triggers Breakdown</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500">Prolonged Closure (&gt;1.4s)</span>
                <div className="text-lg font-mono font-bold text-rose-400 tabular-nums">42%</div>
                <span className="text-[10px] text-slate-500">Primary accident precursor</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500">Elevated PERCLOS (&gt;15%)</span>
                <div className="text-lg font-mono font-bold text-amber-400 tabular-nums">28%</div>
                <span className="text-[10px] text-slate-500">Rolling drowsiness index</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500">Consecutive Yawning (MAR)</span>
                <div className="text-lg font-mono font-bold text-purple-400 tabular-nums">18%</div>
                <span className="text-[10px] text-slate-500">Early respiratory sign</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500">Gaze & Head Deviation</span>
                <div className="text-lg font-mono font-bold text-cyan-400 tabular-nums">12%</div>
                <span className="text-[10px] text-slate-500">Distraction off roadway</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateVehicle} className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Register New Fleet Vehicle</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">License Plate Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TX-889-KLM"
                  value={newPlate}
                  onChange={e => setNewPlate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Make & Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Freightliner Cascadia 126"
                  value={newModel}
                  onChange={e => setNewModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">VIN (Vehicle Identification Number)</label>
                <input
                  type="text"
                  placeholder="e.g. 1FT8W3BT9NEC..."
                  value={newVin}
                  onChange={e => setNewVin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg cursor-pointer"
              >
                Register Vehicle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Driver Modal */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateDriver} className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAddDriverOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Register Commercial Driver</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus Vance"
                  value={newDriverName}
                  onChange={e => setNewDriverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. marcus.driver@logistics.com"
                  value={newDriverEmail}
                  onChange={e => setNewDriverEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">CDL License Number</label>
                <input
                  type="text"
                  placeholder="e.g. CDL-TX-99281"
                  value={newDriverLicense}
                  onChange={e => setNewDriverLicense(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsAddDriverOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg cursor-pointer"
              >
                Enroll Driver
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
