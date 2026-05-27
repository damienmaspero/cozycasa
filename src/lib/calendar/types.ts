export interface Booking {
  id: number;
  organization_id: string;
  name: string;
  guests: number;
  check_in_date: string;
  check_out_date: string;
  comment: string;
  is_request: boolean;
  created_at: string;
}

export interface BookingInput {
  check_in_date: string;
  check_out_date: string;
  name: string;
  guests: number;
  comment: string;
  is_request: boolean;
}

export const HOUSE_CAPACITY = 15;
