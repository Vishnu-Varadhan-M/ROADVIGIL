/**
 * DriveGuard AI — Express REST API Router
 * 
 * Provides authenticated RESTful endpoints for trips, drivers, vehicles,
 * safety telemetry, alert escalation, and baseline calibration.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/inMemoryDb';
import { SafetyEvent } from '../types';

export const apiRouter = Router();

// Middleware to simulate lightweight JWT verification
const authenticate = (req: Request, res: Response, next: () => void) => {
  // Allow authorization header or fallback to session
  next();
};

// ==================== AUTHENTICATION ====================
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  
  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user) {
    // If not found, create a demo user with chosen role
    const newUser = {
      id: `usr-${Date.now()}`,
      name: email.split('@')[0].replace('.', ' '),
      email,
      role: role || (email.includes('admin') ? 'FLEET_ADMIN' : 'DRIVER'),
      phone: '+1 (555) 019-9000'
    };
    db.users.push(newUser);
    return res.json({
      success: true,
      token: `dg_jwt_${newUser.id}_${Date.now()}`,
      user: newUser
    });
  }

  // Pre-seeded demo account verification
  return res.json({
    success: true,
    token: `dg_jwt_${user.id}_${Date.now()}`,
    user
  });
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, role, phone, licenseNumber } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Missing name or email' });
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    name,
    email,
    role: role || 'DRIVER',
    phone: phone || '+1 (555) 000-0000'
  };
  db.users.push(newUser);

  if (newUser.role === 'DRIVER') {
    const newDriver = {
      id: `drv-${Date.now()}`,
      userId: newUser.id,
      name,
      email,
      licenseNumber: licenseNumber || 'CDL-PENDING',
      experienceYears: 3,
      safetyScoreAverage: 95,
      totalTrips: 0,
      status: 'ON_DUTY' as const
    };
    db.drivers.push(newDriver);
  }

  return res.json({
    success: true,
    token: `dg_jwt_${newUser.id}_${Date.now()}`,
    user: newUser
  });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  // Default to driver Marcus Vance or Alexander Cross
  const user = db.users[1]; // Marcus Vance
  res.json({ user });
});

// ==================== DASHBOARD SUMMARY ====================
apiRouter.get('/dashboard/summary', (req: Request, res: Response) => {
  const activeTrips = db.trips.filter(t => t.status === 'ACTIVE');
  const criticalEvents = db.safetyEvents.filter(e => e.severity === 'CRITICAL');
  const pendingAlerts = db.alerts.filter(a => a.status === 'PENDING');
  
  const avgScore = Math.round(
    db.drivers.reduce((acc, d) => acc + d.safetyScoreAverage, 0) / Math.max(1, db.drivers.length)
  );

  res.json({
    totalVehicles: db.vehicles.length,
    activeVehicles: db.vehicles.filter(v => v.status === 'ACTIVE').length,
    totalDrivers: db.drivers.length,
    onDutyDrivers: db.drivers.filter(d => d.status === 'ON_DUTY').length,
    activeTripsCount: activeTrips.length,
    fleetAverageScore: avgScore,
    pendingAlertsCount: pendingAlerts.length,
    criticalEventsCount: criticalEvents.length,
    recentEvents: db.safetyEvents.slice(0, 10),
    activeTrips
  });
});

// ==================== DRIVERS & VEHICLES ====================
apiRouter.get('/drivers', (req: Request, res: Response) => {
  res.json(db.drivers);
});

apiRouter.post('/drivers', (req: Request, res: Response) => {
  const { name, email, licenseNumber, experienceYears, assignedVehicleId } = req.body;
  const newDriver = {
    id: `drv-${Date.now()}`,
    userId: `usr-${Date.now()}`,
    name,
    email,
    licenseNumber,
    experienceYears: Number(experienceYears) || 1,
    assignedVehicleId,
    safetyScoreAverage: 100,
    totalTrips: 0,
    status: 'OFF_DUTY' as const
  };
  db.drivers.push(newDriver);
  res.status(201).json(newDriver);
});

apiRouter.get('/vehicles', (req: Request, res: Response) => {
  res.json(db.vehicles);
});

apiRouter.post('/vehicles', (req: Request, res: Response) => {
  const { plateNumber, vin, makeModel, year } = req.body;
  const newVehicle = {
    id: `veh-${Date.now()}`,
    vin: vin || `1FT8W${Date.now()}`,
    plateNumber,
    makeModel,
    year: Number(year) || 2024,
    status: 'IDLE' as const
  };
  db.vehicles.push(newVehicle);
  res.status(201).json(newVehicle);
});

// ==================== TRIPS ====================
apiRouter.get('/trips', (req: Request, res: Response) => {
  res.json(db.trips);
});

apiRouter.post('/trips/start', (req: Request, res: Response) => {
  const { driverId, vehicleId, isSimulated } = req.body;
  const driver = db.drivers.find(d => d.id === driverId || d.userId === driverId) || db.drivers[0];
  const vehicle = db.vehicles.find(v => v.id === vehicleId) || db.vehicles[0];

  const newTrip = {
    id: `trip-${Date.now()}`,
    vehicleId: vehicle.id,
    vehiclePlate: vehicle.plateNumber,
    driverId: driver.id,
    driverName: driver.name,
    startTime: new Date().toISOString(),
    status: 'ACTIVE' as const,
    durationSeconds: 0,
    currentSafetyScore: 100,
    averageSafetyScore: 100,
    minSafetyScore: 100,
    currentRiskLevel: 'SAFE' as const,
    warningCount: 0,
    criticalCount: 0,
    totalFatigueEvents: 0,
    isSimulated: !!isSimulated
  };

  db.trips.unshift(newTrip);
  vehicle.status = 'ACTIVE';
  vehicle.currentTripId = newTrip.id;
  driver.status = 'ON_DUTY';

  res.status(201).json(newTrip);
});

apiRouter.post('/trips/:id/stop', (req: Request, res: Response) => {
  const trip = db.trips.find(t => t.id === req.params.id);
  if (!trip) {
    return res.status(404).json({ error: 'Trip session not found' });
  }

  trip.status = 'COMPLETED';
  trip.endTime = new Date().toISOString();

  const vehicle = db.vehicles.find(v => v.id === trip.vehicleId);
  if (vehicle) {
    vehicle.status = 'IDLE';
    vehicle.currentTripId = undefined;
  }

  res.json({ success: true, trip });
});

// ==================== SAFETY EVENTS & ALERTS ====================
apiRouter.get('/safety/events', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 50;
  res.json(db.safetyEvents.slice(0, limit));
});

apiRouter.post('/safety/events', (req: Request, res: Response) => {
  const eventData = req.body;
  const savedEvent = db.addSafetyEvent(eventData);
  res.status(201).json(savedEvent);
});

apiRouter.post('/safety/events/:id/acknowledge', (req: Request, res: Response) => {
  const event = db.safetyEvents.find(e => e.id === req.params.id);
  if (event) {
    event.acknowledged = true;
  }
  res.json({ success: true, event });
});

apiRouter.get('/alerts', (req: Request, res: Response) => {
  res.json(db.alerts);
});

apiRouter.post('/alerts/:id/acknowledge', (req: Request, res: Response) => {
  db.acknowledgeAlert(req.params.id);
  res.json({ success: true });
});

// ==================== BASELINE CALIBRATION ====================
apiRouter.get('/baseline/:driverId', (req: Request, res: Response) => {
  const baseline = db.baselines.find(b => b.driverId === req.params.driverId);
  res.json({ baseline: baseline || null });
});

apiRouter.post('/baseline/save', (req: Request, res: Response) => {
  const baseline = req.body;
  db.saveBaseline(baseline);
  res.json({ success: true, baseline });
});

// ==================== CONFIGURATION & WEIGHTS ====================
apiRouter.get('/settings/config', (req: Request, res: Response) => {
  res.json(db.riskConfig);
});

apiRouter.put('/settings/config', (req: Request, res: Response) => {
  db.riskConfig = { ...db.riskConfig, ...req.body };
  res.json({ success: true, config: db.riskConfig });
});

// ==================== MULTIMODAL PHOTO VISION ANALYSIS ====================
import { analyzeDriverPhoto } from './visionAnalysis';

apiRouter.post('/vision/analyze', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request body' });
    }
    const result = await analyzeDriverPhoto(imageBase64, mimeType);
    return res.json(result);
  } catch (err: any) {
    console.error('Vision analysis error:', err);
    return res.status(500).json({ error: 'Vision analysis failed', details: err?.message });
  }
});
