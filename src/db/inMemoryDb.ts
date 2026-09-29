/**
 * DriveGuard AI — Data Persistence & Storage Layer
 * 
 * Provides relational storage with in-memory SQLite-compatible store,
 * seeded with realistic enterprise fleet data, active trips, and safety incidents.
 */

import {
  User,
  Driver,
  Vehicle,
  TripSession,
  SafetyEvent,
  DriverBaseline,
  RiskEngineWeights
} from '../types';
import { DEFAULT_WEIGHTS } from '../engine/riskEngine';

export interface AlertNotification {
  id: string;
  eventId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  timestamp: string;
  message: string;
  severity: 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  channel: 'FLEET_DASHBOARD' | 'EMAIL_SIMULATED' | 'SMS_SIMULATED';
}

class DatabaseStore {
  public users: User[] = [
    {
      id: 'usr-admin-1',
      name: 'Alexander Cross',
      email: 'admin@driveguard.ai',
      role: 'FLEET_ADMIN',
      phone: '+1 (555) 019-2834',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    },
    {
      id: 'usr-driver-1',
      name: 'Marcus Vance',
      email: 'marcus.driver@driveguard.ai',
      role: 'DRIVER',
      phone: '+1 (555) 302-8841',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
    },
    {
      id: 'usr-driver-2',
      name: 'Sarah Chen',
      email: 'sarah.chen@driveguard.ai',
      role: 'DRIVER',
      phone: '+1 (555) 441-9201',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80'
    },
    {
      id: 'usr-driver-3',
      name: 'David Rodriguez',
      email: 'david.rodriguez@driveguard.ai',
      role: 'DRIVER',
      phone: '+1 (555) 782-1194',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
    }
  ];

  public baselines: DriverBaseline[] = [
    {
      id: 'base-marcus-1',
      driverId: 'drv-1',
      calibratedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      baselineEAR: 0.312,
      baselineMAR: 0.088,
      baselineBlinkRate: 17,
      baselineHeadPitch: 2.1,
      baselineHeadYaw: 0.5,
      isCalibrated: true
    },
    {
      id: 'base-sarah-1',
      driverId: 'drv-2',
      calibratedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      baselineEAR: 0.295,
      baselineMAR: 0.092,
      baselineBlinkRate: 19,
      baselineHeadPitch: -1.0,
      baselineHeadYaw: 1.2,
      isCalibrated: true
    }
  ];

  public drivers: Driver[] = [
    {
      id: 'drv-1',
      userId: 'usr-driver-1',
      name: 'Marcus Vance',
      email: 'marcus.driver@driveguard.ai',
      licenseNumber: 'CDL-TX-994821',
      experienceYears: 8,
      assignedVehicleId: 'veh-1',
      safetyScoreAverage: 92,
      totalTrips: 148,
      status: 'ON_DUTY',
      baseline: this.baselines[0]
    },
    {
      id: 'drv-2',
      userId: 'usr-driver-2',
      name: 'Sarah Chen',
      email: 'sarah.chen@driveguard.ai',
      licenseNumber: 'CDL-CA-772190',
      experienceYears: 6,
      assignedVehicleId: 'veh-2',
      safetyScoreAverage: 96,
      totalTrips: 112,
      status: 'ON_DUTY',
      baseline: this.baselines[1]
    },
    {
      id: 'drv-3',
      userId: 'usr-driver-3',
      name: 'David Rodriguez',
      email: 'david.rodriguez@driveguard.ai',
      licenseNumber: 'CDL-IL-552019',
      experienceYears: 12,
      assignedVehicleId: 'veh-3',
      safetyScoreAverage: 84,
      totalTrips: 230,
      status: 'REST_BREAK'
    }
  ];

  public vehicles: Vehicle[] = [
    {
      id: 'veh-1',
      vin: '1FT8W3BT9NEC18291',
      plateNumber: 'TX-781-DKL',
      makeModel: 'Freightliner Cascadia 126',
      year: 2024,
      status: 'ACTIVE',
      assignedDriverId: 'drv-1',
      currentTripId: 'trip-live-1'
    },
    {
      id: 'veh-2',
      vin: '4V4NC9EH1PN882194',
      plateNumber: 'CA-942-XLM',
      makeModel: 'Volvo VNL 860 Sleeper',
      year: 2023,
      status: 'ACTIVE',
      assignedDriverId: 'drv-2',
      currentTripId: 'trip-live-2'
    },
    {
      id: 'veh-3',
      vin: '1XP4D49X5MD661902',
      plateNumber: 'IL-301-BTY',
      makeModel: 'Peterbilt 579 UltraLoft',
      year: 2022,
      status: 'IDLE',
      assignedDriverId: 'drv-3'
    },
    {
      id: 'veh-4',
      vin: '1FTBR1Y88PKA49182',
      plateNumber: 'TX-519-PQA',
      makeModel: 'Ford E-Transit 350 Cargo',
      year: 2024,
      status: 'MAINTENANCE'
    }
  ];

  public trips: TripSession[] = [
    {
      id: 'trip-live-1',
      vehicleId: 'veh-1',
      vehiclePlate: 'TX-781-DKL',
      driverId: 'drv-1',
      driverName: 'Marcus Vance',
      startTime: new Date(Date.now() - 42 * 60000).toISOString(),
      status: 'ACTIVE',
      durationSeconds: 42 * 60,
      currentSafetyScore: 94,
      averageSafetyScore: 93,
      minSafetyScore: 82,
      currentRiskLevel: 'SAFE',
      warningCount: 1,
      criticalCount: 0,
      totalFatigueEvents: 1,
      lastEventDescription: 'Brief drowsy blink flutter at min 18 (cleared)',
      isSimulated: false
    },
    {
      id: 'trip-live-2',
      vehicleId: 'veh-2',
      vehiclePlate: 'CA-942-XLM',
      driverId: 'drv-2',
      driverName: 'Sarah Chen',
      startTime: new Date(Date.now() - 110 * 60000).toISOString(),
      status: 'ACTIVE',
      durationSeconds: 110 * 60,
      currentSafetyScore: 98,
      averageSafetyScore: 97,
      minSafetyScore: 91,
      currentRiskLevel: 'SAFE',
      warningCount: 0,
      criticalCount: 0,
      totalFatigueEvents: 0,
      isSimulated: false
    },
    {
      id: 'trip-hist-1',
      vehicleId: 'veh-3',
      vehiclePlate: 'IL-301-BTY',
      driverId: 'drv-3',
      driverName: 'David Rodriguez',
      startTime: new Date(Date.now() - 86400000 * 1 - 240 * 60000).toISOString(),
      endTime: new Date(Date.now() - 86400000 * 1).toISOString(),
      status: 'COMPLETED',
      durationSeconds: 240 * 60,
      currentSafetyScore: 82,
      averageSafetyScore: 85,
      minSafetyScore: 54,
      currentRiskLevel: 'MODERATE',
      warningCount: 4,
      criticalCount: 1,
      totalFatigueEvents: 4,
      lastEventDescription: 'Stage 3 Critical Alert: Prolonged eye closure (1.8s) during night sector'
    }
  ];

  public safetyEvents: SafetyEvent[] = [
    {
      id: 'evt-hist-1',
      tripId: 'trip-hist-1',
      driverId: 'drv-3',
      driverName: 'David Rodriguez',
      vehicleId: 'veh-3',
      vehiclePlate: 'IL-301-BTY',
      timestamp: new Date(Date.now() - 86400000 * 1 - 45 * 60000).toISOString(),
      eventType: 'PROLONGED_CLOSURE',
      severity: 'CRITICAL',
      interventionStage: 'STAGE_3_CRITICAL_ALERT',
      riskLevel: 'HIGH',
      safetyScoreAtEvent: 46,
      description: 'Prolonged eye closure detected for 1.8 seconds. Stage 3 emergency chime sounded.',
      metricsSnapshot: {
        ear: 0.13,
        eyeClosureDurationSec: 1.82,
        perclos: 0.31,
        mar: 0.12,
        headPitch: -14.2,
        headYaw: 2.1
      },
      acknowledged: true,
      fleetAlertDispatched: true
    },
    {
      id: 'evt-hist-2',
      tripId: 'trip-hist-1',
      driverId: 'drv-3',
      driverName: 'David Rodriguez',
      vehicleId: 'veh-3',
      vehiclePlate: 'IL-301-BTY',
      timestamp: new Date(Date.now() - 86400000 * 1 - 92 * 60000).toISOString(),
      eventType: 'YAWN_FATIGUE',
      severity: 'MEDIUM',
      interventionStage: 'STAGE_1_EARLY_FATIGUE',
      riskLevel: 'LOW',
      safetyScoreAtEvent: 76,
      description: 'Consecutive yawning cycle detected (MAR 0.44 for 3.2s). Visual warning issued.',
      metricsSnapshot: {
        ear: 0.28,
        eyeClosureDurationSec: 0,
        perclos: 0.16,
        mar: 0.44,
        headPitch: 4.5,
        headYaw: 1.0
      },
      acknowledged: true,
      fleetAlertDispatched: false
    }
  ];

  public alerts: AlertNotification[] = [
    {
      id: 'alt-1',
      eventId: 'evt-hist-1',
      driverId: 'drv-3',
      driverName: 'David Rodriguez',
      vehicleId: 'veh-3',
      vehiclePlate: 'IL-301-BTY',
      timestamp: new Date(Date.now() - 86400000 * 1 - 45 * 60000).toISOString(),
      message: 'CRITICAL: Driver David Rodriguez experienced 1.8s prolonged eye closure in vehicle IL-301-BTY.',
      severity: 'CRITICAL',
      status: 'RESOLVED',
      channel: 'FLEET_DASHBOARD'
    }
  ];

  public riskConfig: RiskEngineWeights = { ...DEFAULT_WEIGHTS };

  // Helper methods
  public getDriver(id: string): Driver | undefined {
    return this.drivers.find(d => d.id === id || d.userId === id);
  }

  public getVehicle(id: string): Vehicle | undefined {
    return this.vehicles.find(v => v.id === id);
  }

  public getActiveTrip(driverId: string): TripSession | undefined {
    return this.trips.find(t => t.driverId === driverId && t.status === 'ACTIVE');
  }

  public addSafetyEvent(event: Omit<SafetyEvent, 'id'>): SafetyEvent {
    const fullEvent: SafetyEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    this.safetyEvents.unshift(fullEvent);

    // If critical or Stage 4, generate fleet dispatch notification
    if (fullEvent.severity === 'CRITICAL' || fullEvent.interventionStage === 'STAGE_4_OWNER_ALERT' || fullEvent.interventionStage === 'STAGE_3_CRITICAL_ALERT') {
      const alert: AlertNotification = {
        id: `alt-${Date.now()}`,
        eventId: fullEvent.id,
        driverId: fullEvent.driverId,
        driverName: fullEvent.driverName,
        vehicleId: fullEvent.vehicleId,
        vehiclePlate: fullEvent.vehiclePlate,
        timestamp: fullEvent.timestamp,
        message: fullEvent.description,
        severity: fullEvent.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        status: 'PENDING',
        channel: 'FLEET_DASHBOARD'
      };
      this.alerts.unshift(alert);
      fullEvent.fleetAlertDispatched = true;
    }

    // Update active trip counters
    const trip = this.trips.find(t => t.id === fullEvent.tripId);
    if (trip) {
      trip.totalFatigueEvents++;
      if (fullEvent.severity === 'CRITICAL') {
        trip.criticalCount++;
      } else {
        trip.warningCount++;
      }
      trip.lastEventDescription = fullEvent.description;
    }

    return fullEvent;
  }

  public acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'ACKNOWLEDGED';
    }
  }

  public saveBaseline(baseline: DriverBaseline) {
    const index = this.baselines.findIndex(b => b.driverId === baseline.driverId);
    if (index >= 0) {
      this.baselines[index] = baseline;
    } else {
      this.baselines.push(baseline);
    }
    const driver = this.drivers.find(d => d.id === baseline.driverId);
    if (driver) {
      driver.baseline = baseline;
    }
  }
}

export const db = new DatabaseStore();
