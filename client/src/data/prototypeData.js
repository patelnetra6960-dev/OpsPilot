/**
 * OpsPilot - UI/UX Visual Prototype Data Store
 *
 * NOTE: This mock data is strictly separated from production backend API data.
 * Used exclusively for UI/UX prototyping, layout verification, and design testing.
 */

export const PROTOTYPE_PROJECTS = [
  {
    id: 'PRJ-2026-01',
    name: 'Metro Logistics Distribution Center Automation',
    client: 'Metro Retail Distribution Co.',
    clientId: 'cli-01',
    status: 'in_progress', // 'in_progress' | 'on_hold' | 'completed' | 'planning'
    health: 'on_track', // 'on_track' | 'at_risk' | 'delayed'
    progress: 68,
    budget: '$145,000',
    spent: '$98,600',
    startDate: '2026-09-01',
    targetDate: '2026-12-15',
    lead: 'Alex Rivera',
    team: [
      {
        name: 'David Kim',
        role: 'Lead Tech',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      },
      {
        name: 'Emily Davis',
        role: 'Automation Specialist',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
      },
      {
        name: 'Carlos Mendez',
        role: 'Maintenance Lead',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
      }
    ],
    description:
      'Installation, sensor telemetry integration, and safety certification of automated sorter loading bays.',
    milestones: [
      {
        id: 'm1',
        title: 'Phase 1: Structural Bay Prep & Electrical Conduit',
        status: 'completed',
        date: '2026-09-20'
      },
      {
        id: 'm2',
        title: 'Phase 2: Conveyor Installation & Hydraulic Test',
        status: 'completed',
        date: '2026-10-18'
      },
      {
        id: 'm3',
        title: 'Phase 3: Sensor Calibration & Edge Gateway Link',
        status: 'in_progress',
        date: '2026-11-20'
      },
      {
        id: 'm4',
        title: 'Phase 4: Regulatory Safety Audit & Signoff',
        status: 'pending',
        date: '2026-12-15'
      }
    ]
  },
  {
    id: 'PRJ-2026-02',
    name: 'Pacific Freight Express Fleet Electrification & Charging',
    client: 'Pacific Freight Express',
    clientId: 'cli-02',
    status: 'in_progress',
    health: 'at_risk',
    progress: 42,
    budget: '$280,000',
    spent: '$142,000',
    startDate: '2026-08-15',
    targetDate: '2027-02-28',
    lead: 'Sarah Chen',
    team: [
      {
        name: 'Carlos Mendez',
        role: 'High-Voltage Tech',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
      },
      {
        name: 'Aisha Patel',
        role: 'Safety Inspector',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
      }
    ],
    description:
      'Deploying high-output DC fast chargers, power load-balancing transformers, and battery health telemetry.',
    milestones: [
      {
        id: 'm1',
        title: 'Phase 1: Grid Interconnect Permit Approval',
        status: 'completed',
        date: '2026-09-10'
      },
      {
        id: 'm2',
        title: 'Phase 2: Transformer Concrete Pad & Trenching',
        status: 'in_progress',
        date: '2026-11-15'
      },
      {
        id: 'm3',
        title: 'Phase 3: DC Fast Charger Commissioning',
        status: 'pending',
        date: '2027-01-20'
      }
    ]
  },
  {
    id: 'PRJ-2026-03',
    name: 'Harbor Cold Chain Monitoring & HVAC Overhaul',
    client: 'Harbor Cold Chain Logistics',
    clientId: 'cli-03',
    status: 'completed',
    health: 'on_track',
    progress: 100,
    budget: '$85,000',
    spent: '$81,200',
    startDate: '2026-07-01',
    targetDate: '2026-10-25',
    lead: 'Sarah Chen',
    team: [
      {
        name: 'David Kim',
        role: 'Lead Tech',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      },
      {
        name: 'Aisha Patel',
        role: 'Quality Inspector',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
      }
    ],
    description:
      'Overhaul of industrial chillers, refrigerant line pressure testing, and real-time IoT ambient temperature logs.',
    milestones: [
      {
        id: 'm1',
        title: 'Phase 1: Chiller Compressor Replacement',
        status: 'completed',
        date: '2026-08-01'
      },
      {
        id: 'm2',
        title: 'Phase 2: IoT Sensor Network Deployment',
        status: 'completed',
        date: '2026-09-15'
      },
      {
        id: 'm3',
        title: 'Phase 3: FDA Compliance Certification',
        status: 'completed',
        date: '2026-10-25'
      }
    ]
  }
];

export const PROTOTYPE_KANBAN_TASKS = [
  {
    id: 'TSK-101',
    title: 'Inspect hydraulic lift valve pressure on Bay 4',
    category: 'Maintenance',
    priority: 'urgent',
    column: 'in_progress', // 'todo' | 'in_progress' | 'review' | 'completed'
    dueDate: 'Today',
    assignedTo: {
      name: 'David Kim',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    projectId: 'PRJ-2026-01',
    commentsCount: 4,
    checklistTotal: 4,
    checklistCompleted: 3
  },
  {
    id: 'TSK-102',
    title: 'Calibrate ambient temperature sensors for cold storage',
    category: 'Inspection',
    priority: 'high',
    column: 'in_progress',
    dueDate: 'Nov 6',
    assignedTo: {
      name: 'Emily Davis',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
    },
    projectId: 'PRJ-2026-01',
    commentsCount: 2,
    checklistTotal: 5,
    checklistCompleted: 2
  },
  {
    id: 'TSK-103',
    title: 'Review emergency transformer trenching depth with city inspector',
    category: 'Compliance',
    priority: 'high',
    column: 'todo',
    dueDate: 'Nov 8',
    assignedTo: {
      name: 'Carlos Mendez',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    },
    projectId: 'PRJ-2026-02',
    commentsCount: 1,
    checklistTotal: 3,
    checklistCompleted: 0
  },
  {
    id: 'TSK-104',
    title: 'Quarterly forklift oil filter replacement and battery scrub',
    category: 'Fleet',
    priority: 'normal',
    column: 'todo',
    dueDate: 'Nov 10',
    assignedTo: {
      name: 'David Kim',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    projectId: 'PRJ-2026-01',
    commentsCount: 0,
    checklistTotal: 2,
    checklistCompleted: 0
  },
  {
    id: 'TSK-105',
    title: 'OSHA electrical grounding safety signoff',
    category: 'Compliance',
    priority: 'urgent',
    column: 'review',
    dueDate: 'Today',
    assignedTo: {
      name: 'Aisha Patel',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    },
    projectId: 'PRJ-2026-02',
    commentsCount: 5,
    checklistTotal: 6,
    checklistCompleted: 6
  },
  {
    id: 'TSK-106',
    title: 'Refrigerant line leak check on Terminal Chiller #3',
    category: 'Maintenance',
    priority: 'normal',
    column: 'completed',
    dueDate: 'Nov 1',
    assignedTo: {
      name: 'Carlos Mendez',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    },
    projectId: 'PRJ-2026-03',
    commentsCount: 3,
    checklistTotal: 4,
    checklistCompleted: 4
  }
];

export const PROTOTYPE_SERVICE_REQUESTS = [
  {
    id: 'SR-481',
    client: 'Metro Retail Distribution Co.',
    contact: 'Olivia Parker',
    title: 'Dock Leveler Ramp Stuck in Elevated Position',
    urgency: 'critical',
    status: 'new', // 'new' | 'assigned' | 'in_review' | 'converted'
    createdAt: '45 mins ago',
    location: 'Distribution Center Bay 12',
    description:
      'Main freight truck cannot unload. Hydraulic cylinder not venting pressure properly.',
    estimatedCost: '$650.00'
  },
  {
    id: 'SR-480',
    client: 'Pacific Freight Express',
    contact: 'Marcus Vance',
    title: 'Electric Forklift Charger Error Code E-44',
    urgency: 'high',
    status: 'assigned',
    createdAt: '3 hours ago',
    location: 'Charging Depot Stall 4',
    description: 'Charger tripping 480V circuit breaker intermittently upon battery connection.',
    estimatedCost: '$1,200.00'
  },
  {
    id: 'SR-479',
    client: 'Harbor Cold Chain Logistics',
    contact: 'David Miller',
    title: 'Chiller Zone B Temperature Drift Alarm',
    urgency: 'urgent',
    status: 'converted',
    createdAt: 'Yesterday',
    location: 'Cold Storage Room 2',
    description: 'Ambient temp climbed from -18C to -12C. Secondary compressor failing to engage.',
    estimatedCost: '$2,400.00',
    convertedWorkOrderId: 'WO-8429'
  }
];

export const PROTOTYPE_WORK_ORDERS = [
  {
    id: 'WO-8421',
    title: 'Hydraulic Loading Ramp Periodic Inspection & Seal Repair',
    client: 'Metro Retail Distribution Co.',
    technician: 'David Kim',
    asset: 'Hydraulic Ramp Lift #4 (Model HR-400)',
    site: 'Metro Central Bay 4',
    priority: 'high',
    status: 'in_progress', // 'draft' | 'dispatched' | 'in_progress' | 'review' | 'completed'
    scheduledWindow: '2026-11-04 08:30 - 16:30',
    costEstimate: '$850.00',
    progress: 75,
    checklist: [
      { text: 'Check hydraulic oil reservoir level and fluid viscosity', done: true },
      { text: 'Replace worn rubber piston seals', done: true },
      { text: 'Perform 10-ton load drop pressure test', done: true },
      { text: 'Log safety certificate in tenant document vault', done: false }
    ]
  },
  {
    id: 'WO-8424',
    title: 'Cold Storage Ambient Temperature Sensor Diagnostic',
    client: 'Metro Retail Distribution Co.',
    technician: 'Emily Davis',
    asset: 'IoT Telemetry Gateway (Model TG-80)',
    site: 'Cold Storage Room 2',
    priority: 'critical',
    status: 'dispatched',
    scheduledWindow: '2026-11-04 14:00 - 18:00',
    costEstimate: '$1,400.00',
    progress: 25,
    checklist: [
      { text: 'Verify 24V DC auxiliary power supply', done: true },
      { text: 'Recalibrate RTD thermocouple probes', done: false },
      { text: 'Test alert broadcast to manager mobile app', done: false }
    ]
  },
  {
    id: 'WO-8430',
    title: 'Emergency Generator Load Bank Maintenance Test',
    client: 'Pacific Freight Express',
    technician: 'Carlos Mendez',
    asset: 'Cummins 500kW Standby Diesel Generator',
    site: 'Harbor Gate 12 Power Station',
    priority: 'normal',
    status: 'review',
    scheduledWindow: '2026-11-03 09:00 - 13:00',
    costEstimate: '$2,100.00',
    progress: 90,
    checklist: [
      { text: 'Inspect diesel fuel filter and water separator', done: true },
      { text: 'Run 100% capacity resistive load bank for 2 hours', done: true },
      { text: 'Collect oil sample for laboratory spectrochemical analysis', done: true },
      { text: 'Manager sign-off on EPA compliance log', done: false }
    ]
  }
];

export const PROTOTYPE_INVENTORY = [
  {
    sku: 'HYD-SEAL-044',
    name: 'Industrial Hydraulic Cylinder Seal Kit',
    category: 'Hydraulics',
    location: 'Warehouse Central • Aisle 4, Bin B-12',
    inStock: 18,
    reorderLevel: 8,
    unitCost: '$38.50',
    status: 'in_stock'
  },
  {
    sku: 'SEN-RTD-100',
    name: 'Platinum RTD Temperature Probe (-50C to +200C)',
    category: 'IoT & Sensors',
    location: 'Warehouse Central • Aisle 2, Bin S-03',
    inStock: 4,
    reorderLevel: 10,
    unitCost: '$95.00',
    status: 'low_stock'
  },
  {
    sku: 'PWR-BRK-480',
    name: '3-Phase 480V 100A Industrial Circuit Breaker',
    category: 'Electrical',
    location: 'Warehouse Central • Aisle 6, Bin E-01',
    inStock: 0,
    reorderLevel: 3,
    unitCost: '$240.00',
    status: 'out_of_stock'
  },
  {
    sku: 'FLT-OIL-300',
    name: 'Heavy Duty Diesel Spin-on Oil Filter',
    category: 'Fleet & Engine',
    location: 'Depot Workshop • Shelf 3',
    inStock: 32,
    reorderLevel: 12,
    unitCost: '$22.00',
    status: 'in_stock'
  },
  {
    sku: 'SAF-HARN-01',
    name: 'OSHA Approved Full Body Fall Protection Harness',
    category: 'Safety & PPE',
    location: 'Safety Storage Locker A',
    inStock: 15,
    reorderLevel: 5,
    unitCost: '$115.00',
    status: 'in_stock'
  }
];

export const PROTOTYPE_EXPENSES = [
  {
    id: 'EXP-1092',
    date: '2026-11-04',
    employee: 'David Kim',
    category: 'Equipment Maintenance',
    description: 'Emergency hydraulic fluid and replacement brass fittings from Grainger',
    amount: '$184.20',
    receiptAttached: true,
    status: 'approved',
    workOrderId: 'WO-8421'
  },
  {
    id: 'EXP-1091',
    date: '2026-11-03',
    employee: 'Emily Davis',
    category: 'Fleet Fuel',
    description: 'Diesel refuel for Service Van #4 (Highway Route 101)',
    amount: '$92.50',
    receiptAttached: true,
    status: 'approved',
    workOrderId: null
  },
  {
    id: 'EXP-1090',
    date: '2026-11-03',
    employee: 'Carlos Mendez',
    category: 'Tooling',
    description: 'Digital insulation multimeter replacement for generator testing',
    amount: '$345.00',
    receiptAttached: true,
    status: 'pending',
    workOrderId: 'WO-8430'
  },
  {
    id: 'EXP-1089',
    date: '2026-11-02',
    employee: 'Aisha Patel',
    category: 'Meals & Travel',
    description: 'Per-diem meals during multi-site safety audit across Harbor Terminal',
    amount: '$48.00',
    receiptAttached: false,
    status: 'pending',
    workOrderId: null
  }
];

export const PROTOTYPE_ANALYTICS = {
  kpis: {
    workforceUtilization: '92.4%',
    workforceTrend: '+4.2% vs last month',
    slaCompliance: '98.8%',
    slaTrend: 'Target: >95.0%',
    meanTimeToResolve: '2.4 hrs',
    mttrTrend: '-18 mins improvement',
    netProfitMargin: '34.2%',
    marginTrend: '+$14.2k quarterly growth'
  },
  utilizationByDepartment: [
    { dept: 'Field Logistics', rate: 94, target: 90 },
    { dept: 'Fleet Operations', rate: 89, target: 85 },
    { dept: 'Maintenance & Safety', rate: 96, target: 90 },
    { dept: 'Quality Inspection', rate: 91, target: 85 }
  ],
  monthlyRevenueVsExpense: [
    { month: 'Jun', revenue: 42000, expense: 28000 },
    { month: 'Jul', revenue: 48000, expense: 31000 },
    { month: 'Aug', revenue: 56000, expense: 34000 },
    { month: 'Sep', revenue: 64000, expense: 38000 },
    { month: 'Oct', revenue: 78000, expense: 44000 },
    { month: 'Nov (Projected)', revenue: 86000, expense: 48000 }
  ],
  workOrdersByStatus: [
    { label: 'Completed', count: 142, color: 'bg-emerald-500' },
    { label: 'In Progress', count: 18, color: 'bg-indigo-600' },
    { label: 'Dispatched', count: 8, color: 'bg-blue-500' },
    { label: 'Pending', count: 4, color: 'bg-amber-500' }
  ]
};
