export interface ApiResponseType {
  success: boolean;
  message: string;
  data: any;
}

export interface assignedEventData {
  association_id: number,
  assign_vehicle: string,
  assign_number: string,
  id: number,
};

export type BucketInformation = {
  totalSizeBytes: number;
  totalSizeMB: number;
  totalSizeGB: number;
  fileCount: number;
  folderStructure: {
    [folder: string]: {
      sizeBytes: number;
      fileCount: number;
    }
  };
}

export interface Collections {
  id: number,
  association_id: number,
  name: string,
  desc: string,
  amount: number,
  vehicle: number,
  owner: number,
  owner_collection: number,
  start?: Date | null,
  end?: Date | null,
  timestamp: Date,
  category?: string,
  collection_timestamp?: Date,
  driver_id?: number,
};

export interface Collectors {
  id: number,
  association_id: number,
  collector_id: number,
  user: string,
  user_id: number,
  collectors_amount: number,
  owner_collection: number,
  vehicle_collection: number,
  timestamp: Date,
  collection: number,
};

export type ComsType = {
  association_id: number;
  id: number;
  subject: string;
  message: string;
  sender: number;
  date: Date;
  commuter: boolean;
  owner: boolean;
  finance: boolean;
  marshal: boolean;
  staff: boolean;
  squad: boolean;
  driver: boolean;
  mobile: boolean;
  type: string;
};

export interface Driver {
  // User fields (from app_users)
  id: number; // app_users.id
  association_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  
  // Driver-specific fields (from driver_details)
  user_id: number; // FK to app_users.id
  license: string;
  license_exp: any;
  idNum: string;
  status: string;
  vehicle_id: number | null;
  vehicle: number; // Legacy field, maps to vehicle_id
  owner_id: number | null;
  owner: number; // Legacy field, maps to owner_id
  alternative_number: string;
  alternative_name: string;
  onboarding_id: number | null;
  timestamp: Date;
};

export interface DriverDocs {
  association_id: number,
  driver_id: number,
  id: string,
  docs_id: number,
  license_link: string,
  id_link: string,
  profile: string
};

export interface Duty {
  association_id?: number;
  id?: number;
  name: string;
  date: Date;
  end: Date;
  owner?: number;
  dutyData: string;
};

export interface DutyHistory {
  association_id: number;
  id: number;
  name: string;
  start: string;
  end: string;
  vehicle: string;
  rank: string;
  category: string;
}

export interface Event {
  association_id: number;
  id: number;
  name: string;
  location: string;
  category: string;
  date: Date;
  startTime: string;
  endTime: string;
  desc: string;
};

export interface EventData {
  title: string;
  id: number;
  name: string;
  desc: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
};

export interface FleetNoteType {
  id: number;
  association_id: number;
  vehicle_id?: number | null;
  driver_id?: number | null;
  squad_member_id?: number | null;
  squad_car_id?: number | null;
  note: string;
  author_type: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface Owner {
  membership: any;
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  idNum: string;
  executive?: string | null;
  adhoc?: string | null;
  gender: string;
  alternative_number: string;
  alternative_name: string;
};

export interface MeetingMinutes {
  id?: string;
  event_id: string;
  title: string;
  content: string;
  attendees: string;
  action_items: string;
  next_meeting?: string;
  created_by: string;
  created_at: Date;
  updated_at?: string;
}

export type RankName = {
  id: number;
  name: string;
  location: string;
  created_at: Date;
  updated_at: Date;
}

export type RankType = {
  association_id: number;
  created_at: Date;
  id: number;
  name: number;
  updated_at: Date;
};




export interface OwnerContextType {
  ownerData: Owner[];
  fetchOwnerData: () => void;
  vehicleData: Vehicle[];
  fetchVehicleData: () => void;
  driverData: Driver[];
  fetchDriverData: () => void;
  eventData: Event[];
  fetchEventData: () => void;
  collectionData: Collections[];
  fetchCollectionsData: () => void;
  collectorsData: Collectors[];
  fetchCollectorsData: () => void;
  session: SessionUser;
};

export interface Marshal {
  // User fields (from app_users)
  id: number; // app_users.id
  association_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  
  // Marshal-specific fields (from marshal_details)
  user_id: number; // FK to app_users.id
  idNum: string;
  rank: number;
  status: string;
  timestamp: Date;
};

export interface SubscriptionType {
  id: number;
  association_id: number;
  name: string;
  desc: string;
  status: "Active" | "Closed";
  period: "Onde Off" | "Weekly" | "Bi-Weekly" | "Monthly" | "Annually";
  start: Date;
  due: Date;
  timestamp: Date;
};

export interface Subscriber {
  id: number;
  association_id: number;
  subscription_id: number;
  first_name: string;
  last_name: string;
  ownedVehicles: number;
  membership: number;
  perTaxi: number;
  collected: number;
  total: number;
  timestamp: string;
};
export interface SubscriptionPlan {
  association_id: number,
  id: number,
  name: string,
  model: string,
  owner: string,
};

export interface SquadCar {
  status: string;
  association_id: number,
  id: number,
  make: string,
  model: string,
  registration: string,
  year: number,
  driver: number,
};

export interface SquadMember {
  // User fields (from app_users)
  id: number; // app_users.id
  association_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  
  // Squad member-specific fields (stored in user metadata)
  user_id: number; // FK to app_users.id
  idNum: string;
  status: string;
  vehicle_id: number | null;
  vehicle: string | number; // Legacy field, maps to vehicle_id
  gender?: string; // May be in metadata
  timestamp: Date;
};




export interface RankData {
  id: number;
  name: number;
  location: string;
};




export interface Notification {
  association_id: number;
  id: string;
  title: string;
  notification: string;
  maker: string;
  noti_date: Date;
};

export interface SessionUser {
  // Session-specific fields (required)
  accessToken: string;

  // Database user fields (from foro-api `users` table)
  id: number;
  email: string;

  // Name fields
  full_name?: string; // Combined display name
  name?: string; // Combined name for backward compatibility
  last_name?: string;
  first_name?: string;

  // Additional database fields
  phone?: string | null;
  isSuperAdmin?: boolean;
};

// Login Response Types
export interface LoginResponseUser {
  id: number;
  full_name?: string;
  name?: string; // Legacy field, may still exist
  last_name?: string;
  email: string;
  phone: string | null;
  metadata: Record<string, any>;
  organisation_id: number | null;
  is_active: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  custom_field_1?: string | null;
  custom_field_2?: string | null;
  roles: LoginResponseRole[];
}

export interface LoginResponseRole {
  id: number;
  role_name: string;
  role_key: string;
  organisation_field_name: string;
  organisation_lookup_table: string;
  organisation_lookup_field: string | null;
}

export interface LoginResponseOrganisation {
  name: string;
  id: number;
  is_admin: boolean;
}

export interface LoginResponseSession {
  accessToken: string;
}

export interface LoginResponseData {
  user: LoginResponseUser;
  organisation: LoginResponseOrganisation;
  session: LoginResponseSession;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginResponseData;
  timestamp: string;
}

export interface VehicleDocs {
  association_id: number;
  id: number;
  docs_id: number;
  registration_link: string;
  pic1: string;
  pic2: string;
  pic3: string;
  pic4: string;
};

export interface Complaint {
  fine: number;
  closing: string;
  findings: string;
  association_id: number;
  id: number;
  date: Date;
  vehicle: number;
  driver: number;
  owner: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string;
  complaint_title: string;
  complaint_desc: string;
  status: string;
  fine_paid: string;
};

export interface Staff {
  // User fields (from app_users)
  id: number; // app_users.id
  association_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  
  // Staff-specific fields (from staff_details)
  user_id: number; // FK to app_users.id
  title: string;
  id_num: string;
  status: string;
  alternative_name: string;
  alternative_phone: string;
  add_date: Date; // Legacy field, maps to created_at
};

// Details table interfaces (for direct access to details tables)
export interface DriverDetails {
  id: number;
  user_id: number;
  association_id: number;
  license?: string;
  license_expiry?: Date | string;
  idNum?: string;
  status?: string;
  vehicle_id?: number | null;
  owner_id?: number | null;
  alternative_number?: string;
  alternative_name?: string;
  onboarding_id?: number | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface MarshalDetails {
  id: number;
  user_id: number;
  association_id: number;
  idNum: string;
  rank?: number | null;
  status?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface SquadMemberDetails {
  id: number;
  user_id: number;
  association_id: number;
  idNum: string;
  status?: string;
  vehicle_id?: number | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface StaffDetails {
  id: number;
  user_id: number;
  association_id: number;
  title: string;
  id_num: string;
  status?: string;
  alternative_name?: string;
  alternative_phone?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ScheduledCom {
  id: number;
  association_id: number;
  recipients: string;
  roles: string;
  body: string;
  sender: number;
  type: string;
  title: string;
  date: string;
  timestamp: string;
}

// Add these to the DB later
export type Access = {
  Finance: any,
  Transport: any,
  Communication: any,
  Staff: any,
  Schedule: any,
  DC: any,
  Owners: any,
  Settings: any
}

export interface EventExpense {
  association_id: number,
  id: number,
  eventID: number,
  name: string,
  description: string,
  desc: string,
  amount: string,
  timestamp: Date

}

export interface Expense {
  association_id: number;
  id: number;
  name: string;
  description: string;
  category: string;
  amount: number;
  timestamp: Date;
  expense_date?: Date;
}



export type OnboardingType = {
  id: number;
  association_id: number;
  name: string;
  link: string;
  expiry: string;
  marshal: boolean;
  squad: boolean;
  status: string;
  timestamp: Date;
};




export interface User {
  accessToken?: string;
  association_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role?: string;
  status?: string;
  idNum: string;
  city?: string | null;
  executive?: string | null;
  adhoc?: string | null;
  gender: string;
  alternative_number: string;
  alternative_name: string;
  membership: string;
  title: string;
};

export interface Vehicle {
  id: number;
  association_id: number;
  driver: number;
  registration: string;
  registration_number: string;
  make: string;
  model: string;
  owner: number;
  status: string;
  seats: number;
  year: number;
  color: any;
  disk_exp: any;
  timestamp: Date;
};

// Scholar Section Interfaces
export interface ScholarAssociation {
  id: number;
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Parent {
  id: number;
  scholar_association_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  address: string;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: number;
  user_id: number; // User ID of the child app user
  scholar_association_id: number;
  parent_id: number; // User ID of the parent
  first_name: string;
  last_name: string;
  phone: string | null;
  school_id: number | null;
  school_name: string;
  grade: string;
  date_of_birth: string;
  pickup_address: string;
  dropoff_address: string;
  vehicle_id: number | null;
  reference_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface School {
  id: number;
  scholar_association_id: number;
  name: string;
  contact_person: string;
  phone: string;
  office_number: string | null;
  address: string;
  school_in_time: string;
  school_out_time: string;
  created_at: string;
  updated_at: string;
}

export interface PickupDropHistory {
  id: number;
  scholar_association_id: number;
  child_id: number;
  vehicle_id: number;
  driver_id: number;
  pickup_time: string;
  dropoff_time: string | null;
  pickup_address: string;
  dropoff_address: string | null;
  status: string;
  created_at: string;
}

export interface DriverDocument {
  id: number;
  scholar_association_id: number;
  driver_id: number;
  criminal_record_path: string | null;
  id_passport_path: string | null;
  drivers_license_path: string | null;
  prdp_expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserScholar {
  id: number;
  user_id: number | null;
}