export type AppointmentStatus = 'Pending' | 'Scheduled' | 'In-Progress' | 'Completed' | 'Cancelled';

export const statusLabels: Record<AppointmentStatus, string> = {
  Pending: 'Pending',
  Scheduled: 'Scheduled',
  'In-Progress': 'In progress',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

export const statuses = Object.keys(statusLabels) as AppointmentStatus[];

export const jobs = [
  { id: 'j1', title: 'Clean David’s House', subtitle: '4h ⋅ Regular cleaning' },
  { id: 'j2', title: 'Clean Robert’s House', subtitle: '3h ⋅ Regular cleaning' },
  { id: 'j3', title: 'Clean Amy’s Apartment', subtitle: '2h ⋅ Regular cleaning' },
  { id: 'j4', title: 'Clean Joe’s Office', subtitle: '6h ⋅ Deep Cleaning' },
];

export const workers = [
  { id: 'w1', title: 'Natalia Popova', subtitle: 'Owner  ⋅ Regular cleaning, Deep cleaning', initials: 'NP', bg: 'rgba(237,94,253,0.5)', fg: '#880297' },
  { id: 'w2', title: 'Anya Popova', subtitle: 'Manager  ⋅ Regular cleaning, Deep cleaning', initials: 'AP', bg: 'rgba(94,234,253,0.5)', fg: '#028697' },
  { id: 'w3', title: 'Aryana Kabir', subtitle: 'Manager  ⋅ Deep cleaning', initials: 'AK', bg: 'rgba(253,160,94,0.5)', fg: '#974002' },
  { id: 'w4', title: 'Aleksandar Bursac', subtitle: 'Manager  ⋅ Regular cleaning, Main...', initials: 'AB', bg: 'rgba(181,253,94,0.5)', fg: '#549702' },
  { id: 'w5', title: 'Joe Smith', subtitle: 'Worker  ⋅ Regular cleaning, Deep cleaning', initials: 'JS', bg: 'rgba(253,94,94,0.5)', fg: '#970202' },
];

// One week of October 2026. `load` is how strong the line under each date is.
export const week = [
  { label: 'Mon', date: 19, load: 1 },
  { label: 'Tue', date: 20, load: 0.7 },
  { label: 'Wed', date: 21, load: 0.1 },
  { label: 'Thu', date: 22, load: 0.4 },
  { label: 'Fri', date: 23, load: 1 },
  { label: 'Sat', date: 24, load: 0.4 },
  { label: 'Sun', date: 25, load: 0.5 },
];

export const appointments = [
  {
    id: 'a1', date: 23, job: 'Clean David’s House', start: '10:00 AM', end: '02:00 PM', duration: '4h',
    city: 'Oakville', location: 'Oakville, Ontario', status: 'Completed' as AppointmentStatus,
    workerIds: ['w1', 'w5'], notes: '',
  },
  {
    id: 'a2', date: 23, job: 'Clean Robert’s House', start: '02:30 PM', end: '05:30 PM', duration: '3h',
    city: 'Mississauga', location: '123 Oak Ave, Mississauga, Ontario', status: 'In-Progress' as AppointmentStatus,
    workerIds: ['w2', 'w4'], notes: 'Use his cleaning products',
  },
  {
    id: 'a3', date: 23, job: 'Clean Amy’s Apartment', start: '06:00 PM', end: '08:00 PM', duration: '2h',
    city: 'Mississauga', location: 'Mississauga, Ontario', status: 'Scheduled' as AppointmentStatus,
    workerIds: ['w3'], notes: '',
  },
  {
    id: 'a4', date: 23, job: 'Clean Equipment', start: '08:00 PM', end: '08:15 PM', duration: '15m',
    city: 'Mississauga', location: 'Mississauga, Ontario', status: 'Scheduled' as AppointmentStatus,
    workerIds: ['w5'], notes: '',
  },
];
