
export interface DiseaseEntry {
  id: string;
  name: string;
  admissions_u5: number;
  admissions_o5: number;
  deaths_u5: number;
  deaths_o5: number;
}

export interface DeathAuditEntry {
  id: string;
  serialNumber: string;
  patientName: string;
  residentialAddress: string;
  dob: string;
  age: string;
  sex: 'Male' | 'Female' | 'Other';
  weight: string;
  readmission: 'Y' | 'N' | 'U';
  admissionDate: string;
  admissionTime: string;
  deathDate: string;
  deathTime: string;
  deathOccurrence: 'Weekday' | 'Weekend' | 'Public holiday';
  deadOnArrival: 'Y' | 'N' | 'U';

  filePresentUsed: 'Y' | 'N';
  ccpUsed: 'Y' | 'N';
  recordsIncomplete: 'Y' | 'N';
  qualityOfNotesPoor: 'Y' | 'N';
  recordsNotesOk: 'Y' | 'N';
  emergencySigns: string;
  triage: 'E' | 'P' | 'Q' | '';
  initialEtName: string;
  initialEtTime: string;

  isReferred: 'Y' | 'N';
  referringFacilityName: string;
  referralDate: string;
  referralTime: string;
  referringFacilityType: 'Hospital' | 'Health centre' | 'Private' | 'Other' | '';
  diagnosisOnReferral: string;
  reasonForReferral: string;
  preReferralTreatment: string;
  preReferralTreatmentTime: string;
  modeOfTransport: string;

  motherStatus: 'Alive and well' | 'Dead' | 'Sick' | 'Unknown';
  fatherStatus: 'Alive and well' | 'Dead' | 'Sick' | 'Unknown';
  primaryCaregiver: 'Mother' | 'Grandmother' | 'Father' | 'Other' | 'Unknown';
  
  diagnosis: string;
  treatment: string;
  confirmedBy: string;
}

export interface WorksheetMetadata {
  wardName: string;
  month: string;
  year: string;
  compiledBy: string;
  checkedBy: string;
  totalInpatientDays: number;
  referralsFromHC: number;
  referralsToHospital: number;
  wardRounds: number;
  abscondees: number;
}

export interface WorksheetState {
  id: string;
  metadata: WorksheetMetadata;
  entries: DiseaseEntry[];
  timestamp: number;
}

export type UserRole = 'admin' | 'staff';
export type AppTab = 'worksheet' | 'dashboard' | 'visualizer' | 'admin' | 'death_audit';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  permissions: AppTab[];
}