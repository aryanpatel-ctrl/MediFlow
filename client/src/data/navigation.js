export const navigationItems = [
  { label: "Dashboard", shortLabel: "DB", path: "/" },
  { label: "Book Appointment", shortLabel: "AI", path: "/chat" },
  { label: "Appointments", shortLabel: "AP", path: "/appointments" },
  { label: "Queue", shortLabel: "QU", path: "/calendar" },
  { label: "Patients", shortLabel: "PT", path: "/patients" },
  { label: "Doctors", shortLabel: "DR", path: "/doctors" },
  { label: "Departments", shortLabel: "DP", path: "/departments" },
  { label: "Messages", shortLabel: "MS", path: "/messages" },
];

export const statCards = [
  {
    label: "Overall Visitors",
    value: "24,580",
    delta: "+12.5% vs yesterday",
    icon: "OV",
  },
  {
    label: "Total Patients",
    value: "8,340",
    delta: "+3.1% vs last week",
    icon: "TP",
  },
  {
    label: "Appointments",
    value: "1,275",
    delta: "+8% vs yesterday",
    icon: "AP",
  },
];

export const agendaItems = [
  {
    day: "17",
    title: "Monthly Staff Meeting & Hospital Update",
    tag: "Meeting",
  },
  {
    day: "20",
    title: "Industry Networking Night",
    tag: "Event",
  },
  {
    day: "28",
    title: "Policy Review & Compliance Documents",
    tag: "Review",
  },
];

export const doctorSchedule = [
  { name: "Dr. Amelia Hart", role: "Cardiology", status: "Available" },
  { name: "Dr. Rizky Pratama", role: "General Medicine", status: "Busy" },
  { name: "Dr. Sophia Liang", role: "Pediatrics", status: "Available" },
  { name: "Dr. Daniel Obeng", role: "Orthopedics", status: "Leave" },
  { name: "Dr. Nina Alvarez", role: "Dermatology", status: "Available" },
];

export const activityItems = [
  { title: "New patient profile created", time: "10 min ago", tone: "teal" },
  { title: "Appointment rescheduled", time: "20 min ago", tone: "blue" },
  { title: "Discharge summary updated", time: "42 min ago", tone: "green" },
  { title: "New doctor added", time: "1 hour ago", tone: "amber" },
  { title: "Billing invoice generated", time: "3 hours ago", tone: "teal" },
];

export const reportItems = [
  "Medication stock running low in Pharmacy",
  "System lag on Outpatient Registration",
  "Air conditioner issue in ICU west wing",
  "Stroke wheelchair maintenance request",
];

export const departmentItems = [
  { name: "General Medicine", value: "2,140 Patients", tone: "dark" },
  { name: "Orthopedics", value: "1,825 Patients", tone: "light" },
  { name: "Pediatrics", value: "1,420 Patients", tone: "aqua" },
  { name: "Dermatology", value: "1,080 Patients", tone: "muted" },
  { name: "Cardiology", value: "1,380 Patients", tone: "soft" },
  { name: "Neurology", value: "495 Patients", tone: "pale" },
];

export const appointmentRows = [
  {
    patient: "Alicia Perth",
    patientId: "#PT-2035-001",
    doctor: "Dr. Amelia Hart",
    specialty: "Cardiology",
    type: "Consultation",
    datetime: "02 March 2035 09:00 - 09:25",
    status: "Completed",
  },
  {
    patient: "Bima Kurnia",
    patientId: "#PT-2035-024",
    doctor: "Dr. Rizky Pratama",
    specialty: "General Medicine",
    type: "Follow Up",
    datetime: "02 March 2035 10:15 - 10:45",
    status: "Scheduled",
  },
  {
    patient: "Clara Wright",
    patientId: "#PT-2035-032",
    doctor: "Dr. Sophia Liang",
    specialty: "Pediatrics",
    type: "Consultation",
    datetime: "03 March 2035 13:00 - 13:30",
    status: "Completed",
  },
  {
    patient: "Erica Smith",
    patientId: "#PT-2035-091",
    doctor: "Dr. Nina Alvarez",
    specialty: "Dermatology",
    type: "Surgery",
    datetime: "06 March 2035 08:15 - 11:30",
    status: "Confirmed",
  },
  {
    patient: "Rendy Tan",
    patientId: "#PT-2035-092",
    doctor: "Dr. Daniel Obeng",
    specialty: "Orthopedics",
    type: "Follow Up",
    datetime: "06 March 2035 14:30 - 16:00",
    status: "Canceled",
  },
  {
    patient: "Saniya Vijay",
    patientId: "#PT-2035-021",
    doctor: "Dr. Bay Wilson",
    specialty: "Cardiology",
    type: "Surgery",
    datetime: "07 March 2035 09:00 - 09:25",
    status: "Completed",
  },
];

export const appointmentOverviewCards = [
  {
    label: "Today's Appointments",
    value: "52",
    delta: "+2.45%",
    note: "The available bed capacity is 180",
    icon: "TA",
    tone: "teal",
  },
  {
    label: "Completed",
    value: "28",
    delta: "+0.5%",
    note: "The incomplete appointments are 24",
    icon: "CP",
    tone: "green",
  },
  {
    label: "Ongoing",
    value: "18",
    delta: "-0.25%",
    note: "The performance is slower than yesterday",
    icon: "OG",
    tone: "teal",
  },
  {
    label: "Canceled",
    value: "6",
    delta: "+1.3%",
    note: "The performance is higher than yesterday",
    icon: "CN",
    tone: "rose",
  },
];

export const appointmentTrendData = [
  { day: "Mon", value: 28 },
  { day: "Tue", value: 42 },
  { day: "Wed", value: 24 },
  { day: "Thu", value: 38 },
  { day: "Fri", value: 30 },
  { day: "Sat", value: 36 },
  { day: "Sun", value: 45 },
];

export const appointmentTypeItems = [
  { label: "Consultation", value: "50%", note: "26 Total Patients", tone: "dark" },
  { label: "Follow-up", value: "25%", note: "13 Total Patients", tone: "teal" },
  { label: "Surgery", value: "15%", note: "8 Total Patients", tone: "aqua" },
  { label: "Telemedicine", value: "10%", note: "5 Total Patients", tone: "soft" },
];

export const appointmentTableRows = [
  {
    patient: "Alicia Perth",
    patientId: "#PT-2035-001",
    phone: "+62 813-3456-7102",
    doctor: "Dr. Amelia Hart",
    specialty: "Cardiology",
    type: "Consultation",
    notes: "Chest pain check",
    date: "12 March 2035",
    time: "08:30 - 09:00",
    status: "Completed",
  },
  {
    patient: "Bima Kurnia",
    patientId: "#PT-2035-024",
    phone: "+62 813-2256-8941",
    doctor: "Dr. Rizky Pratama",
    specialty: "General Medicine",
    type: "Follow-up",
    notes: "Post flu review",
    date: "12 March 2035",
    time: "09:00 - 09:20",
    status: "Completed",
  },
  {
    patient: "Clara Wright",
    patientId: "#PT-2035-053",
    phone: "+62 811-6677-2043",
    doctor: "Dr. Sophia Liang",
    specialty: "Pediatrics",
    type: "Consultation",
    notes: "Fever & cough",
    date: "12 March 2035",
    time: "09:30 - 10:00",
    status: "Ongoing",
  },
  {
    patient: "Daniel Wong",
    patientId: "#PT-2035-079",
    phone: "+62 819-9012-4477",
    doctor: "Dr. Daniel Obeng",
    specialty: "Orthopedics",
    type: "Surgery",
    notes: "Knee arthroscopy",
    date: "12 March 2035",
    time: "10:00 - 12:00",
    status: "Scheduled",
  },
  {
    patient: "Erica Smith",
    patientId: "#PT-2035-091",
    phone: "+62 815-3399-1280",
    doctor: "Dr. Nina Alvarez",
    specialty: "Dermatology",
    type: "Follow-up",
    notes: "Acne treatment plan",
    date: "12 March 2035",
    time: "11:00 - 11:20",
    status: "Scheduled",
  },
  {
    patient: "Francis Rowe",
    patientId: "#PT-2035-129",
    phone: "+62 819-4455-7832",
    doctor: "Dr. Amelia Hart",
    specialty: "Cardiology",
    type: "Follow-up",
    notes: "ECG result discussion",
    date: "12 March 2035",
    time: "13:00 - 13:20",
    status: "Completed",
  },
  {
    patient: "Grace Nathanile",
    patientId: "#PT-2035-141",
    phone: "+62 812-7788-9034",
    doctor: "Dr. Rizky Pratama",
    specialty: "General Medicine",
    type: "Consultation",
    notes: "Back pain complaint",
    date: "12 March 2035",
    time: "13:30 - 14:00",
    status: "Canceled",
  },
  {
    patient: "Hasan Malik",
    patientId: "#PT-2035-192",
    phone: "+62 817-2200-5611",
    doctor: "Dr. Daniel Obeng",
    specialty: "Orthopedics",
    type: "Telemedicine",
    notes: "Online follow-up",
    date: "12 March 2035",
    time: "14:15 - 14:45",
    status: "Ongoing",
  },
];

export const patientFilters = ["Gender", "Age", "Patient Type", "Condition"];

export const patientTableRows = [
  {
    patient: "Alicia Perth",
    patientId: "#PT-2035-001",
    genderAge: "f / 34",
    condition: "Hypertension",
    doctor: "Dr. Amelia Hart",
    specialty: "Cardiology",
    patientType: "Outpatient",
    admissionDate: "--",
    location: "--",
    status: "Discharged",
  },
  {
    patient: "Bima Kurnia",
    patientId: "#PT-2035-024",
    genderAge: "d / 29",
    condition: "Gastritis",
    doctor: "Dr. Rizky Pratama",
    specialty: "General Medicine",
    patientType: "Outpatient",
    admissionDate: "--",
    location: "--",
    status: "Discharged",
  },
  {
    patient: "Clara Wright",
    patientId: "#PT-2035-053",
    genderAge: "g / 7",
    condition: "Dengue Fever",
    doctor: "Dr. Sophia Liang",
    specialty: "Pediatrics",
    patientType: "Outpatient",
    admissionDate: "--",
    location: "--",
    status: "In Treatment",
  },
  {
    patient: "Daniel Wong",
    patientId: "#PT-2035-078",
    genderAge: "d / 42",
    condition: "Bone Fracture",
    doctor: "Dr. Daniel Obeng",
    specialty: "Orthopedics",
    patientType: "Inpatient",
    admissionDate: "11 March 2035",
    location: "Room 402B - 4th Floor",
    status: "Admitted",
    highlighted: true,
  },
  {
    patient: "Erica Smith",
    patientId: "#PT-2035-091",
    genderAge: "f / 26",
    condition: "Acne",
    doctor: "Dr. Nina Alvarez",
    specialty: "Dermatology",
    patientType: "Outpatient",
    admissionDate: "--",
    location: "--",
    status: "In Treatment",
  },
  {
    patient: "Francis Rowe",
    patientId: "#PT-2035-129",
    genderAge: "d / 51",
    condition: "Arrhythmia",
    doctor: "Dr. Amelia Hart",
    specialty: "Cardiology",
    patientType: "Inpatient",
    admissionDate: "10 March 2035",
    location: "Room 305A - 3rd Floor",
    status: "Admitted",
  },
  {
    patient: "Grace Nathanile",
    patientId: "#PT-2035-141",
    genderAge: "f / 31",
    condition: "Migraine",
    doctor: "Dr. Rizky Pratama",
    specialty: "General Medicine",
    patientType: "Outpatient",
    admissionDate: "--",
    location: "--",
    status: "Discharged",
  },
  {
    patient: "Hasan Malik",
    patientId: "#PT-2035-152",
    genderAge: "d / 47",
    condition: "Sciatica",
    doctor: "Dr. Daniel Obeng",
    specialty: "Orthopedics",
    patientType: "Inpatient",
    admissionDate: "12 March 2035",
    location: "Room 210C - 2nd Floor",
    status: "Admitted",
  },
  {
    patient: "Indah Lestari",
    patientId: "#PT-2035-163",
    genderAge: "g / 9",
    condition: "Viral Infection",
    doctor: "Dr. Sophia Liang",
    specialty: "Pediatrics",
    patientType: "Outpatient",
    admissionDate: "--",
    location: "--",
    status: "Discharged",
  },
  {
    patient: "Johan Greece",
    patientId: "#PT-2035-175",
    genderAge: "d / 38",
    condition: "Dermatitis",
    doctor: "Dr. Nina Alvarez",
    specialty: "Dermatology",
    patientType: "Outpatient",
    admissionDate: "--",
    location: "--",
    status: "In Treatment",
  },
  {
    patient: "Liam Becker",
    patientId: "#PT-2035-188",
    genderAge: "d / 52",
    condition: "Diabetes",
    doctor: "Dr. Rizky Pratama",
    specialty: "General Medicine",
    patientType: "Inpatient",
    admissionDate: "11 March 2035",
    location: "Room 108A - 1st Floor",
    status: "Admitted",
  },
  {
    patient: "Mei Tan",
    patientId: "#PT-2035-196",
    genderAge: "g / 36",
    condition: "Pneumonia",
    doctor: "Dr. Arjun Mehta",
    specialty: "Pulmonology",
    patientType: "Inpatient",
    admissionDate: "09 March 2035",
    location: "ICU 02 - 1st Floor",
    status: "Admitted",
  },
];

export const patientVitals = [
  { label: "Blood Sugar", value: "171mg/dL", icon: "BS" },
  { label: "Body Weight", value: "62kg", icon: "BW" },
  { label: "Temperature", value: "37°C", icon: "TP" },
];

export const healthReportItems = [
  "Orthopedic Surgery Report - 2.4 MB",
  "Inpatient Insurance Claim - 1.8 MB",
  "Informed Consent Surgery - 4.0 MB",
  "Orthopedic Surgery Review - 1.9 MB",
  "Inpatient Insurance Claim - 3.1 MB",
];

export const medicationRows = [
  {
    name: "Paracetamol",
    form: "Tablet",
    dosage: "500 mg",
    frequency: "Every 6 hours as needed",
    startEnd: "11 Mar 2035 - 15 Mar 2035",
    status: "Completed",
  },
  {
    name: "Enoxaparin",
    form: "Injection",
    dosage: "40 mg",
    frequency: "Once daily",
    startEnd: "11 Mar 2035 - 16 Mar 2035",
    status: "Active",
  },
  {
    name: "Amlodipine",
    form: "Tablet",
    dosage: "5 mg",
    frequency: "Once daily (morning)",
    startEnd: "01 Jan 2035 - Ongoing",
    status: "Discontinued",
  },
];

export const patientAppointments = [
  {
    date: "10 Mar 2035",
    time: "16:00 - 16:30",
    type: "Consultation",
    doctor: "Dr. Daniel Obeng",
    specialty: "Orthopedics",
    status: "Completed",
    note: "Pre-op assessment",
  },
  {
    date: "11 Mar 2035",
    time: "08:00 - 11:00",
    type: "Surgery",
    doctor: "Dr. Daniel Obeng",
    specialty: "Orthopedics",
    status: "Completed",
    note: "Tibia fracture fixation",
  },
  {
    date: "18 Mar 2035",
    time: "09:30 - 10:00",
    type: "Follow-up",
    doctor: "Dr. Daniel Obeng",
    specialty: "Orthopedics",
    status: "Scheduled",
    note: "Wound check & X-ray review",
  },
];

export const doctorCategoryTabs = [
  "All",
  "General Medicine",
  "Pediatrics",
  "Cardiology",
  "Orthopedics",
  "Dermatology",
  "Neurology",
];

export const doctorDirectory = [
  {
    name: "Dr. Amelia Hart",
    specialty: "Cardiology",
    schedule: "Monday - Friday | 08:00 - 14:00",
    status: "Available",
    initials: "AH",
    portraitTone: "peach",
  },
  {
    name: "Dr. Rizky Pratama",
    specialty: "General Medicine",
    schedule: "Monday - Saturday | 09:00 - 17:00",
    status: "Available",
    initials: "RP",
    portraitTone: "mint",
  },
  {
    name: "Dr. Sophia Liang",
    specialty: "Pediatrics",
    schedule: "Monday - Friday | 10:00 - 16:00",
    status: "Available",
    initials: "SL",
    portraitTone: "sky",
  },
  {
    name: "Dr. Daniel Obeng",
    specialty: "Orthopedics",
    schedule: "Mon - Thu 08:30 - 12:00 | Sat 09:00 - 13:00",
    status: "Unavailable",
    initials: "DO",
    portraitTone: "sand",
  },
  {
    name: "Dr. Nina Alvarez",
    specialty: "Dermatology",
    schedule: "Monday - Saturday | 13:00 - 20:00",
    status: "Available",
    initials: "NA",
    portraitTone: "rose",
  },
  {
    name: "Dr. Arjun Mehta",
    specialty: "Pulmonology",
    schedule: "Monday - Friday | 08:00 - 14:00",
    status: "Unavailable",
    initials: "AM",
    portraitTone: "slate",
  },
  {
    name: "Dr. Laila Hassan",
    specialty: "Neurology",
    schedule: "Monday - Friday | 09:00 - 15:00",
    status: "Available",
    initials: "LH",
    portraitTone: "blush",
  },
  {
    name: "Dr. Marco Silva",
    specialty: "Radiology",
    schedule: "Monday - Sunday | 07:00 - 13:00",
    status: "Unavailable",
    initials: "MS",
    portraitTone: "stone",
  },
  {
    name: "Dr. Hana Sato",
    specialty: "Obstetrics & Gynecology",
    schedule: "Monday - Friday | 14:00 - 21:00",
    status: "Unavailable",
    initials: "HS",
    portraitTone: "lilac",
  },
  {
    name: "Dr. Johan Muller",
    specialty: "Oncology",
    schedule: "Monday - Friday | 09:30 - 16:30",
    status: "Available",
    initials: "JM",
    portraitTone: "cream",
  },
  {
    name: "Dr. Victor Rossi",
    specialty: "Anesthesiology",
    schedule: "Saturday | 08:00 - 17:00",
    status: "Unavailable",
    initials: "VR",
    portraitTone: "aqua",
  },
  {
    name: "Dr. Sarah Ibrahim",
    specialty: "Emergency Medicine",
    schedule: "Wed - Sat | 09:00 - 17:00",
    status: "Available",
    initials: "SI",
    portraitTone: "sage",
  },
];

export const doctorStats = [
  { label: "Total Appointments", value: "620", delta: "-0.9%" },
  { label: "Total Patients", value: "410", delta: "+0.6%" },
];

export const doctorFeedback = [
  {
    name: "Erica Smith",
    rating: "4.8",
    date: "12 March 2035",
    note: "Dr. Nina explained every step of my acne treatment clearly and showed before-after expectations.",
  },
  {
    name: "Johan Greece",
    rating: "5",
    date: "13 March 2035",
    note: "She listened carefully to my concerns about recurring rashes, adjusted the cream dosage, and suggested lifestyle changes.",
  },
  {
    name: "Maya Patel",
    rating: "4.9",
    date: "11 March 2035",
    note: "I appreciated how she combined medical expertise with realistic skincare advice and routine planning.",
  },
];

export const doctorPatientRows = [
  {
    patient: "Erica Smith",
    patientId: "#PT-2035-091",
    checkIn: "12 March 2035",
    condition: "Acne",
    treatment: "Topical & oral medication",
    status: "In Treatment",
  },
  {
    patient: "Johan Greece",
    patientId: "#PT-2035-175",
    checkIn: "12 March 2035",
    condition: "Dermatitis",
    treatment: "Anti-inflammatory cream",
    status: "In Treatment",
  },
  {
    patient: "Maya Patel",
    patientId: "#PT-2036-204",
    checkIn: "11 March 2035",
    condition: "Hyperpigmentation",
    treatment: "Chemical peel plan",
    status: "Discharged",
  },
  {
    patient: "Lucas Ferreira",
    patientId: "#PT-2036-219",
    checkIn: "10 March 2035",
    condition: "Psoriasis",
    treatment: "Long-term topical therapy",
    status: "Admitted",
  },
  {
    patient: "Sara Kim",
    patientId: "#PT-2035-231",
    checkIn: "09 March 2035",
    condition: "Eczema",
    treatment: "Moisturizer + steroid cream",
    status: "Discharged",
  },
];

export const doctorScheduleItems = [
  { day: "12", weekday: "Sat" },
  { day: "13", weekday: "Sun" },
  { day: "14", weekday: "Mon", active: true },
  { day: "15", weekday: "Tue" },
  { day: "16", weekday: "Wed" },
];

export const doctorFollowUps = [
  { name: "Erica Smith", type: "Follow-up", time: "13:30 - 13:50" },
  { name: "Johan Greece", type: "Consultation", time: "14:00 - 14:30", active: true },
  { name: "Maya Patel", type: "Consultation", time: "14:45 - 15:15" },
  { name: "Sara Kim", type: "Consultation", time: "16:00 - 16:20" },
  { name: "Ryan Patel", type: "Telemedicine", time: "16:45 - 17:15" },
  { name: "Lucas Ferreira", type: "Follow-up", time: "15:30 - 15:50" },
];

export const doctorWorkDays = [
  { day: "Monday", start: "09", end: "17", enabled: true },
  { day: "Tuesday", start: "09", end: "17", enabled: true },
  { day: "Wednesday", start: "15", end: "21", enabled: true },
  { day: "Thursday", start: "09", end: "17", enabled: true },
  { day: "Friday", start: "13", end: "16", enabled: true },
  { day: "Saturday", start: "00", end: "00", enabled: false },
  { day: "Sunday", start: "00", end: "00", enabled: false },
];

export const departmentOverviewCards = [
  {
    label: "Total Departments",
    value: "8",
    note: "with 1,475 staff in total",
    icon: "DT",
  },
  {
    label: "Total Specialties",
    value: "24",
    note: "with 73 average staff per doctor",
    icon: "SP",
  },
  {
    label: "Average Team per Department",
    value: "45",
    note: "increase 43.4% than last year",
    icon: "TM",
  },
];

export const departmentBreakdownLegend = [
  { label: "Support Staff", tone: "soft" },
  { label: "Specialists", tone: "light" },
  { label: "Nurses", tone: "teal" },
  { label: "Doctors", tone: "dark" },
];

export const departmentBreakdownRows = [
  {
    label: "General Medicine",
    values: [30, 24, 18, 12],
  },
  {
    label: "Pediatrics",
    values: [28, 20, 16, 10],
  },
  {
    label: "Cardiology",
    values: [17, 17, 13, 9],
    active: true,
  },
  {
    label: "Orthopedics",
    values: [24, 18, 14, 8],
  },
  {
    label: "Dermatology",
    values: [21, 15, 10, 7],
  },
  {
    label: "Neurology",
    values: [25, 19, 15, 9],
  },
  {
    label: "Radiology",
    values: [23, 17, 12, 6],
  },
  {
    label: "Maternity Care",
    values: [27, 21, 16, 11],
  },
];

export const departmentCards = [
  {
    name: "General Medicine",
    floor: "1st Floor",
    beds: "14 Staff",
    note: "Handles routine check-ups, acute illness, and chronic disease management with integrated access to diagnostics and referral.",
    tags: ["GM", "AR", "LK"],
    tone: "sky",
  },
  {
    name: "Pediatrics",
    floor: "2nd Floor",
    beds: "20 Staff",
    note: "Dedicated to infants, children, and adolescents with child-friendly rooms and family-focused care.",
    tags: ["PD", "SN", "JO"],
    tone: "rose",
  },
  {
    name: "Cardiology",
    floor: "3rd Floor",
    beds: "21 Staff",
    note: "Specializes in heart disease prevention, diagnosis, and intervention with access to advanced monitoring and imaging.",
    tags: ["CH", "ML", "ER"],
    tone: "mint",
  },
  {
    name: "Orthopedics",
    floor: "4th Floor",
    beds: "24 Staff",
    note: "Focuses on bone, joint, and muscle conditions, including trauma care and post-operative rehabilitation.",
    tags: ["OR", "TI", "AM"],
    tone: "sand",
  },
  {
    name: "Dermatology",
    floor: "Outpatient Clinic",
    beds: "16 Staff",
    note: "Provides medical and cosmetic skin treatments for acne, allergies, chronic rashes, and aesthetic procedures.",
    tags: ["DM", "HS", "AL"],
    tone: "stone",
  },
  {
    name: "Neurology",
    floor: "5th Floor",
    beds: "19 Staff",
    note: "Manages brain, nerve, and spinal disorders with coordinated diagnostic tests and long-term follow-up plans.",
    tags: ["NR", "LH", "RM"],
    tone: "teal",
  },
  {
    name: "Radiology",
    floor: "Basement Wing",
    beds: "18 Staff",
    note: "Supports all departments with X-ray, CT, MRI, and ultrasound imaging interpreted directly with Medlink reports.",
    tags: ["RD", "MS", "ET"],
    tone: "ice",
  },
  {
    name: "Maternity Care",
    floor: "Maternity Tower",
    beds: "25 Staff",
    note: "Covers prenatal care, delivery, and newborn services with specialized neonatal support and family-centered rooms.",
    tags: ["MC", "NA", "SR"],
    tone: "clean",
  },
];

export const departmentTeamMembers = [
  { name: "Dr. Amelia Hart", role: "Head of Cardiology", tag: "Doctors", initials: "AH" },
  { name: "Dr. Kevin Lau", role: "Consultant Cardiologist", tag: "Doctors", initials: "KL" },
  { name: "Dr. Aisha Farhan", role: "Cardiologist", tag: "Doctors", initials: "AF" },
  { name: "Maria Gonzales, RN", role: "Nurse Supervisor", tag: "Nurses", initials: "MG" },
  { name: "Ardi Prasetyo", role: "ECG Technician", tag: "Specialists", initials: "AP" },
  { name: "Lina Rahman", role: "Care Coordinator", tag: "Support Staff", initials: "LR" },
];

export const departmentPerformanceStats = [
  { label: "Patient Satisfaction", value: 94 },
  { label: "Appointment Efficiency", value: 89 },
  { label: "Treatment Outcomes", value: 91 },
  { label: "Staff Performance", value: 85 },
];

export const departmentTrendBars = [
  { day: "Mon", value: 30 },
  { day: "Tue", value: 50 },
  { day: "Wed", value: 44 },
  { day: "Thu", value: 40 },
  { day: "Fri", value: 42 },
  { day: "Sat", value: 31 },
  { day: "Sun", value: 48 },
];

export const calendarSummary = [
  { title: "Admin & Management", count: "5 Schedules" },
  { title: "System & Facility Maintenance", count: "3 Schedules" },
  { title: "Staff Training & Development", count: "4 Schedules" },
];

export const calendarDays = [
  { day: 28, muted: true },
  { day: 29, muted: true },
  { day: 30, muted: true },
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5 },
  { day: 6 },
  { day: 7 },
  { day: 8 },
  { day: 9 },
  {
    day: 10,
    events: [{ title: "Monthly Hospital Operations Briefing", time: "09:00 - 10:30", tone: "teal" }],
  },
  {
    day: 11,
    events: [{ title: "New Nurse Orientation & Safety Protocols", time: "14:00 - 16:00", tone: "mint" }],
  },
  { day: 12 },
  {
    day: 13,
    events: [
      { title: "Department Heads Coordination Meeting", time: "08:30 - 09:45", tone: "teal" },
      { title: "Scheduled EMR System Performance Review", time: "15:00 - 17:00", tone: "light" },
    ],
  },
  {
    day: 14,
    events: [
      { title: "Infection Control Refresher Session", time: "10:00 - 11:30", tone: "soft" },
      { title: "Advanced Phlebotomy Workshop", time: "13:30 - 15:00", tone: "teal" },
    ],
  },
  { day: 15 },
  {
    day: 16,
    events: [{ title: "Radiology Equipment Calibration", time: "08:00 - 09:00", tone: "mint" }],
  },
  { day: 17 },
  {
    day: 18,
    events: [
      { title: "Billing & Claims Process Review", time: "09:30 - 11:00", tone: "teal" },
      { title: "Medlink Dashboard Advanced Usage Training", time: "14:00 - 15:00", tone: "light" },
    ],
  },
  { day: 19 },
  { day: 20 },
  { day: 21 },
  { day: 22 },
  { day: 23 },
  { day: 24 },
  { day: 25 },
  { day: 26 },
  {
    day: 27,
    events: [{ title: "Quarterly KPI & Performance Review", time: "15:00 - 16:30", tone: "teal" }],
  },
  { day: 28 },
  {
    day: 29,
    events: [{ title: "Night Shift Power Backup & Generator Test", time: "20:00 - 22:00", tone: "mint" }],
  },
  { day: 30 },
  { day: 31 },
];

export const calendarScheduleDetails = [
  {
    title: "Outpatient Clinic Workflow Review",
    date: "14 March 2035",
    time: "09:00 - 10:00",
    location: "Meeting Room A - 2nd Floor",
    participants: "Department Coordinators, Front Desk Leads",
    team: "Elena Mullen",
    role: "Operations Manager",
    note: "Review patient flow, waiting time metrics, and proposed changes to triage desk layout.",
    tone: "teal",
  },
  {
    title: "Patient Communication & Empathy Workshop",
    date: "14 March 2035",
    time: "13:30 - 15:00",
    location: "Training Hall - 3rd Floor",
    participants: "Nurses, Resident Doctors, Frontline Staff",
    team: "Victor Ridge",
    role: "HR & Training",
    note: "Focus on communication scenarios, delivering difficult news, and improving overall patient satisfaction scores.",
    tone: "soft",
  },
];

export const inventoryOverviewCards = [
  {
    label: "Total Items in Stock",
    value: "1,280 Items",
    delta: "+63 vs. last month",
    icon: "BX",
    tone: "teal",
  },
  {
    label: "Low Stock Items",
    value: "34 Items",
    delta: "-3% vs. last week",
    icon: "LW",
    tone: "mint",
  },
  {
    label: "Out-of-Stock Items",
    value: "7 Items",
    delta: "-2 items vs. last week",
    icon: "OS",
    tone: "soft",
  },
  {
    label: "Expiring Soon Items",
    value: "19 Items",
    delta: "-4 items vs. last month",
    icon: "EX",
    tone: "light",
  },
];

export const inventoryTrendBars = [
  { day: "Mon", value: 35, delta: "+4.8%" },
  { day: "Tue", value: 42, delta: "+2.8%" },
  { day: "Wed", value: 58, delta: "+3.9%" },
  { day: "Thu", value: 54, delta: "+2.3%" },
  { day: "Fri", value: 70, delta: "+6.8%" },
  { day: "Sat", value: 60, delta: "+7.4%" },
  { day: "Sun", value: 76, delta: "+4.3%" },
];

export const inventoryCategories = [
  { label: "Medications", value: "40%", count: "512", tone: "striped" },
  { label: "Consumables", value: "30%", count: "384", tone: "soft" },
  { label: "IV & Fluids", value: "12%", count: "154", tone: "mint" },
  { label: "Laboratory Supplies", value: "10%", count: "128", tone: "light" },
  { label: "Medical Equipment & Accessories", value: "8%", count: "102", tone: "dark" },
];

export const inventoryRows = [
  {
    item: "Surgical Gloves Nitrile Medium",
    sku: "SKU: GLV-NT-M",
    category: "Consumables",
    availability: "Available",
    quantity: "320 Boxes",
    percent: 80,
    status: "30 Dec 2035",
    state: "Safe",
    action: "Reorder",
  },
  {
    item: "Normal Saline 0.9% 500ml",
    sku: "SKU: IVF-NS-500",
    category: "IV & Fluids",
    availability: "Available",
    quantity: "180 Bottles",
    percent: 70,
    status: "15 Nov 2035",
    state: "Safe",
    action: "Reorder",
  },
  {
    item: "Paracetamol 500mg Tablets",
    sku: "SKU: MED-PARA-500",
    category: "Medications",
    availability: "Low",
    quantity: "24 Boxes",
    percent: 20,
    status: "20 August 2035",
    state: "Near Expiry",
    action: "Reorder",
  },
  {
    item: "Ceftriaxone 1g Injection",
    sku: "SKU: MED-CEF-1G",
    category: "Medications",
    availability: "Available",
    quantity: "95 Vials",
    percent: 60,
    status: "05 July 2036",
    state: "Safe",
    action: "Reorder",
  },
  {
    item: "Rapid COVID-19 Antigen Test Kit",
    sku: "SKU: LAB-RAP-AG",
    category: "Laboratory Supplies",
    availability: "Out of Stock",
    quantity: "0 Packs",
    percent: 0,
    status: "01 June 2035",
    state: "Expired",
    action: "Reorder",
  },
];

export const inventoryActivities = [
  "50 boxes Surgical Gloves (Medium) to Central Store",
  "20 bottles Normal Saline 0.9% to Emergency Dept",
  "10 vials insulin to ICU from Pharmacy",
  "6 packs expired Rapid Test Kits disposed",
  "2 units Portable BP Monitor broken, cracked",
  "120 units N95 Masks to Isolation Ward Store",
  "5 units Syringe Pump to NICU from Equipment Room",
  "12 bottles expired Cough Syrup disposed",
  "1 unit Patient Monitor (battery failure)",
];

export const messageThreads = [
  {
    name: "Daniel Wong",
    preview: "Hi, is my follow-up appointment for tomorrow confirmed in the system?",
    time: "09:18",
    unread: 5,
    initials: "DW",
  },
  {
    name: "Dr. Amelia Hart",
    preview: "Can we add one more follow-up slot for Daniel Wong tomorrow morning...",
    time: "09:12",
    initials: "AH",
  },
  {
    name: "Erica Smith",
    preview: "Got it, thank you for the quick response!",
    time: "08:58",
    active: true,
    initials: "ES",
  },
  {
    name: "Nurse Station A - Ward 3",
    preview: "Two new admissions just arrived, updating Medlink bed status now.",
    time: "08:47",
    unread: 3,
    initials: "NS",
  },
  {
    name: "Pharmacy Admin",
    preview: "Paracetamol 500mg stock is low, should we trigger auto-reorder?",
    time: "08:15",
    initials: "PA",
  },
  {
    name: "IT Support",
    preview: "We've deployed the latest patch, please ask staff to relogin after 18...",
    time: "07:55",
    initials: "IT",
  },
  {
    name: "Sara Kim",
    preview: "Can I reschedule my eczema follow-up to Friday afternoon?",
    time: "Yesterday",
    initials: "SK",
  },
  {
    name: "Billing & Claims Dept",
    preview: "Insurance claim for Daniel Wong has been submitted and is under review.",
    time: "Yesterday",
    initials: "BC",
  },
  {
    name: "Indah Lestari's Parent",
    preview: "Insurance claim for Daniel Wong has been submitted and is under review.",
    time: "Yesterday",
    initials: "IL",
  },
];

export const activeMessages = [
  {
    from: "Erica Smith",
    text: "Hi, doctor. My skin is still red after using the new cream last night.",
    time: "08:52",
    incoming: true,
  },
  {
    from: "Dr. Nina Alvarez",
    text: "Good morning, Erica. Is the redness mild or getting worse, and do you feel any burning?",
    time: "08:53",
  },
  {
    from: "Erica Smith",
    text: "It's mild, a bit warm, but no strong burning or pain so far.",
    time: "08:54",
    incoming: true,
  },
  {
    from: "Dr. Nina Alvarez",
    text: "That can be a normal reaction during early treatment. Please avoid sun exposure and heavy makeup today.",
    time: "08:55",
  },
  {
    from: "Erica Smith",
    text: "Okay, noted. Should I continue using it tonight or skip one day?",
    time: "08:56",
    incoming: true,
  },
  {
    from: "Dr. Nina Alvarez",
    text: "Use a half amount tonight. If redness worsens or stings, stop and message us again.",
    time: "08:57",
  },
  {
    from: "Erica Smith",
    text: "Got it, thank you for the quick response!",
    time: "08:58",
    incoming: true,
  },
];

export const messageMedia = ["Dermatology check photo", "Skin reaction close-up"];

export const messageDocuments = [
  "Dermatology_Visit_Summary_2035-03.pdf",
  "Acne_Treatment_Plan_EricaSmith.pdf",
  "Eczema_Treatment_Plan_EricaSmith.pdf",
];

export const messageLinks = [
  "https://www.coursify.com/help/login",
  "https://dashboard.coursify.com/user/messages",
  "https://dashboard.coursify.com/courses",
];
