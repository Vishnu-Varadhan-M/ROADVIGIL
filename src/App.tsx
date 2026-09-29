/**
 * DriveGuard AI — Intelligent Driver Safety & Accident Prevention Platform
 * Primary Application Entry Point
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Eye,
  Truck,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  Lock,
  User,
  Activity,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import {
  UserRole,
  TripSession,
  SafetyEvent,
  DriverBaseline,
  Vehicle,
  Driver
} from './types';
import { db, AlertNotification } from './db/inMemoryDb';
import { DriverCockpit } from './components/DriverCockpit';
import { FleetDashboard } from './components/FleetDashboard';
import { DemoSimulator } from './components/DemoSimulator';
import { PhotoAnalysisLab } from './components/PhotoAnalysisLab';
import { InterviewDocs } from './components/InterviewDocs';
import { PrivacyModal } from './components/PrivacyModal';
import { soundService } from './services/soundService';
import { SimulationScenario } from './engine/simulationEngine';

type ActiveView = 'COCKPIT' | 'FLEET' | 'PHOTO_LAB' | 'SIMULATOR' | 'DOCS';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('COCKPIT');
  const [currentRole, setCurrentRole] = useState<UserRole>('DRIVER');
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false); // Starts in real live camera mode
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentScenario, setCurrentScenario] = useState<SimulationScenario>('NORMAL_DRIVING');

  // Shared application state
  const [vehicles, setVehicles] = useState<Vehicle[]>([...db.vehicles]);
  const [drivers, setDrivers] = useState<Driver[]>([...db.drivers]);
  const [trips, setTrips] = useState<TripSession[]>([...db.trips]);
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([...db.safetyEvents]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([...db.alerts]);

  // Current active driver & vehicle
  const currentDriver = drivers[0]; // Marcus Vance
  const currentVehicle = vehicles[0]; // Freightliner Cascadia

  const [activeTrip, setActiveTrip] = useState<TripSession>(
    () => db.trips.find(t => t.id === 'trip-live-1') || db.trips[0]
  );

  // WebSocket reference for live telemetry streaming
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Attempt local WebSocket connection
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'SUBSCRIBE_FLEET' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'EMERGENCY_DISPATCH_ALERT') {
            setSafetyEvents(prev => [msg.event, ...prev]);
            setAlerts([...db.alerts]);
          }
        } catch {
          // Ignore
        }
      };

      wsRef.current = ws;

      return () => {
        ws.close();
      };
    } catch (err) {
      console.warn('WebSocket unavailable in this context:', err);
    }
  }, []);

  const handleTriggerEvent = (newEvent: Omit<SafetyEvent, 'id'>) => {
    const saved = db.addSafetyEvent(newEvent);
    setSafetyEvents([...db.safetyEvents]);
    setAlerts([...db.alerts]);

    // Send through WebSocket if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'CRITICAL_SAFETY_ALERT',
        event: newEvent
      }));
    }
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    db.acknowledgeAlert(alertId);
    setAlerts([...db.alerts]);
  };

  const handleAddVehicle = (newVehData: Partial<Vehicle>) => {
    const veh: Vehicle = {
      id: `veh-${Date.now()}`,
      vin: newVehData.vin || `1FT8W${Date.now()}`,
      plateNumber: newVehData.plateNumber || 'TX-000-NEW',
      makeModel: newVehData.makeModel || 'Commercial Heavy Truck',
      year: newVehData.year || 2024,
      status: 'IDLE'
    };
    db.vehicles.push(veh);
    setVehicles([...db.vehicles]);
  };

  const handleAddDriver = (newDriverData: Partial<Driver>) => {
    const drv: Driver = {
      id: `drv-${Date.now()}`,
      userId: `usr-${Date.now()}`,
      name: newDriverData.name || 'New Commercial Driver',
      email: newDriverData.email || 'driver@driveguard.ai',
      licenseNumber: newDriverData.licenseNumber || 'CDL-PENDING',
      experienceYears: newDriverData.experienceYears || 3,
      safetyScoreAverage: 100,
      totalTrips: 0,
      status: 'OFF_DUTY'
    };
    db.drivers.push(drv);
    setDrivers([...db.drivers]);
  };

  const toggleRole = () => {
    const nextRole = currentRole === 'DRIVER' ? 'FLEET_ADMIN' : 'DRIVER';
    setCurrentRole(nextRole);
    if (nextRole === 'FLEET_ADMIN') {
      setActiveView('FLEET');
    } else {
      setActiveView('COCKPIT');
    }
  };

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundService.setMuted(next);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract (Single Row, 3 Zones) */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Zone 1: Single Text Element Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('COCKPIT'); }} className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>DriveGuard AI</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-medium hidden sm:inline">
                SAFETY PLATFORM
              </span>
            </a>
          </div>

          {/* Zone 2: Navigation Links (Single-Line Controls) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveView('COCKPIT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeView === 'COCKPIT' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Driver HUD</span>
            </button>

            <button
              onClick={() => setActiveView('FLEET')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeView === 'FLEET' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Fleet Console</span>
              {alerts.filter(a => a.status === 'PENDING').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveView('PHOTO_LAB')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeView === 'PHOTO_LAB' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Photo Lab</span>
            </button>

            <button
              onClick={() => setActiveView('SIMULATOR')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeView === 'SIMULATOR' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulator</span>
            </button>

            <button
              onClick={() => setActiveView('DOCS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeView === 'DOCS' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Architecture & Q&A</span>
              <span className="md:hidden">Docs</span>
            </button>
          </nav>

          {/* Zone 3: Primary Actions & Profile Switcher */}
          <div className="flex items-center gap-2">
            {/* Audio Mute Control */}
            <button
              onClick={handleMuteToggle}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Privacy Shield Button */}
            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Privacy & Data Minimization Architecture"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline text-slate-400">Edge Privacy</span>
            </button>

            {/* Role Switcher Pill-Free Button */}
            <button
              onClick={toggleRole}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">
                {currentRole === 'DRIVER' ? 'Marcus Vance (Driver)' : 'Alexander Cross (Fleet Admin)'}
              </span>
              <span className="sm:hidden">
                {currentRole === 'DRIVER' ? 'Driver' : 'Admin'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {activeView === 'COCKPIT' && (
          <DriverCockpit
            driverId={currentDriver.id}
            driverName={currentDriver.name}
            vehiclePlate={currentVehicle.plateNumber}
            baseline={currentDriver.baseline}
            activeTrip={activeTrip}
            onTripUpdated={setActiveTrip}
            onTriggerEvent={handleTriggerEvent}
            isSimulatedMode={isSimulatedMode}
            onToggleSimulatedMode={setIsSimulatedMode}
            onNavigateToPhotoLab={() => setActiveView('PHOTO_LAB')}
          />
        )}

        {activeView === 'FLEET' && (
          <FleetDashboard
            vehicles={vehicles}
            drivers={drivers}
            trips={trips}
            safetyEvents={safetyEvents}
            alerts={alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onAddVehicle={handleAddVehicle}
            onAddDriver={handleAddDriver}
          />
        )}

        {activeView === 'PHOTO_LAB' && (
          <PhotoAnalysisLab onTriggerEvent={handleTriggerEvent} />
        )}

        {activeView === 'SIMULATOR' && (
          <DemoSimulator
            currentScenario={currentScenario}
            onScenarioSelect={(scen) => {
              setCurrentScenario(scen);
              setIsSimulatedMode(true);
            }}
          />
        )}

        {activeView === 'DOCS' && (
          <InterviewDocs />
        )}
      </main>

      {/* Privacy Architecture Modal */}
      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            DriveGuard AI · Intelligent Driver Safety & Accident Prevention Platform · &quot;Detect Risk. Warn Early. Drive Safer.&quot;
          </div>
          <div className="text-[11px] text-slate-600">
            Client-side Edge CV · ISO 26262 explainability compliant prototype
          </div>
        </div>
      </footer>
    </div>
  );
}
