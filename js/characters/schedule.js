/**
 * @fileoverview True-to-Map IIT Kharagpur Landmark Coordinates, Massive Nalanda Complex,
 * Pandit Madan Mohan Malaviya (MMM) Hall of Residence, and NPC Schedules.
 */

export const CAMPUS_LANDMARKS = Object.freeze([
  // 1. Central Academic Cluster
  { id: 'main_building', name: 'Main Building (Werner Moser 1951)', category: 'academic', x: 0, z: 0, w: 118, d: 42, h: 22, color: 0xf4f5f0 },
  { id: 'central_library', name: 'Vikram Sarabhai Central Library', category: 'library', x: 78, z: -22, w: 50, d: 36, h: 17, color: 0xc2a687 },
  { id: 'cse_dept', name: 'Takshashila & CSE Department', category: 'academic', x: 105, z: -95, w: 58, d: 38, h: 17, color: 0xcbd5e1 },
  { id: 'vikramshila', name: 'Vikramshila & Kalidas Auditorium', category: 'auditorium', x: 125, z: 68, w: 68, d: 42, h: 16, color: 0xd97706 },
  { id: 'vgsom', name: 'Vinod Gupta School of Management (VGSoM)', category: 'academic', x: 225, z: -120, w: 56, d: 38, h: 15, color: 0xb45309 },

  // 2. MASSIVE Nalanda Classroom Complex (East Campus — 4 Multi-Story Blocks NR-100..NR-400 + Central Plaza + Skybridges + Cycle Sheds)
  { id: 'nalanda', name: 'Nalanda Classroom Complex (Massive 4-Block Hub)', category: 'academic', x: 320, z: 10, w: 176, d: 132, h: 18, color: 0xe11d48 },

  // 3. Scholar's Avenue Hostels (RP & RK Halls) + Tikka Junction
  { id: 'tikka_stall', name: "Tikka / Scholar's Ave Chai Tapri", category: 'canteen', x: -38, z: 72, w: 18, d: 14, h: 5, color: 0x22c55e },
  { id: 'rp_hall', name: 'Rajendra Prasad (RP) Hall', category: 'hostel', x: -105, z: 105, w: 66, d: 56, h: 13, color: 0x6366f1 },
  { id: 'rk_hall', name: 'Radhakrishnan (RK) Hall', category: 'hostel', x: -105, z: 195, w: 66, d: 56, h: 13, color: 0x10b981 },

  // 4. PAN Loop Hostels (West Avenue: Patel, Azad, Nehru Halls)
  { id: 'patel_hall', name: 'Patel Hall of Residence (PAN Loop)', category: 'hostel', x: -235, z: 30, w: 68, d: 58, h: 13, color: 0xf59e0b },
  { id: 'azad_hall', name: 'Azad Hall of Residence (PAN Loop)', category: 'hostel', x: -235, z: 125, w: 68, d: 58, h: 13, color: 0xef4444 },
  { id: 'nehru_hall', name: 'Nehru Hall of Residence (PAN Loop)', category: 'hostel', x: -235, z: 220, w: 68, d: 58, h: 13, color: 0x0284c7 },

  // 5. Mega Hostels Zone (Pandit Madan Mohan Malaviya Hall & Lal Bahadur Shastri Hall)
  { id: 'mmm_hall', name: 'Pandit Madan Mohan Malaviya (MMM) Hall', category: 'hostel', x: -375, z: 95, w: 108, d: 86, h: 18, color: 0x9333ea },
  { id: 'lbs_hall', name: 'Lal Bahadur Shastri (LBS) Mega Hall', category: 'hostel', x: -375, z: -45, w: 112, d: 88, h: 22, color: 0xc2410c },

  // 6. Sports, Gymkhana, Hospital, Heritage Museum & Puri Gate (South / Southeast)
  { id: 'gymkhana', name: "Technology Students' Gymkhana & Lake", category: 'sports', x: 88, z: 168, w: 76, d: 48, h: 12, color: 0x38bdf8 },
  { id: 'jnan_ghosh', name: 'Jnan Ghosh Stadium & Sports Complex', category: 'sports', x: 205, z: 175, w: 84, d: 58, h: 10, color: 0x16a34a },
  { id: 'bc_roy_hospital', name: 'Dr. B.C. Roy Technology Hospital', category: 'academic', x: 85, z: 278, w: 52, d: 36, h: 12, color: 0x0284c7 },
  { id: 'nehru_museum', name: 'Nehru Museum (Hijli Saheed Bhavan)', category: 'museum', x: 220, z: 285, w: 60, d: 42, h: 16, color: 0x991b1b },
  { id: 'puri_gate', name: 'Main Puri Gate Approach', category: 'gate', x: 0, z: 360, w: 30, d: 12, h: 10, color: 0xfacc15 }
]);

export const ROLE_SCHEDULES = Object.freeze({
  student: [
    { startMin: 0, endMin: 450, targetCategory: 'hostel', activity: 'Resting in Hostel (MMM / LBS / PAN Loop)' },
    { startMin: 450, endMin: 520, targetCategory: 'canteen', activity: 'Morning Chai & Breakfast at Tikka' },
    { startMin: 520, endMin: 750, targetCategory: 'academic', activity: 'Attending Lectures at Huge Nalanda Complex' },
    { startMin: 750, endMin: 840, targetCategory: 'hostel', activity: 'Mess Lunch Break' },
    { startMin: 840, endMin: 1020, targetCategory: 'library', activity: 'Studying at Central Library' },
    { startMin: 1020, endMin: 1140, targetCategory: 'sports', activity: 'Evening Gymkhana / Jnan Ghosh Practice' },
    { startMin: 1140, endMin: 1260, targetCategory: 'canteen', activity: 'Evening Adda at Tikka Stall' },
    { startMin: 1260, endMin: 1440, targetCategory: 'hostel', activity: 'Night Study & Hostel Routine' }
  ],
  professor: [
    { startMin: 0, endMin: 510, targetCategory: 'hostel', activity: 'Faculty Quarters' },
    { startMin: 510, endMin: 1050, targetCategory: 'academic', activity: 'Department Lectures & Research' },
    { startMin: 1050, endMin: 1170, targetCategory: 'library', activity: 'Reviewing Journals at Library' },
    { startMin: 1170, endMin: 1440, targetCategory: 'hostel', activity: 'Faculty Quarters' }
  ],
  guard: [
    { startMin: 0, endMin: 480, targetCategory: 'gate', activity: 'Night Gate Patrol' },
    { startMin: 480, endMin: 960, targetCategory: 'academic', activity: 'Main Building & Nalanda Security' },
    { startMin: 960, endMin: 1440, targetCategory: 'gate', activity: 'Evening Gate Shift' }
  ],
  vendor: [
    { startMin: 0, endMin: 390, targetCategory: 'gate', activity: 'Closed / Supply Prep' },
    { startMin: 390, endMin: 1380, targetCategory: 'canteen', activity: 'Serving Hot Chai & Samosas' },
    { startMin: 1380, endMin: 1440, targetCategory: 'gate', activity: 'Closing Stall' }
  ]
});

export const LOCALIZED_GREETINGS = Object.freeze({
  en: {
    student: 'Riding from MMM Hall to Nalanda Complex NR-213 before 9 AM attendance closes!',
    professor: 'Good morning! Remember to submit your lab records at Takshashila by Friday.',
    guard: 'Keep your institute ID card handy near the Main Building plaza.',
    vendor: 'Hot ginger chai and samosa ready at Tikka! Take a quick break.'
  },
  hi: {
    student: 'एमएमएम हॉल से नालंदा कॉम्प्लेक्स की सुबह 9 बजे की क्लास के लिए जा रहा हूँ!',
    professor: 'सुप्रभात! शुक्रवार तक तक्षशिला में अपनी लैब रिपोर्ट जमा करना न भूलें।',
    guard: 'मुख्य भवन के पास अपना संस्थान पहचान पत्र साथ रखें।',
    vendor: 'गरमा-गरम अदरक वाली चाय और समोसा तैयार है!'
  },
  bn: {
    student: 'এমএমएम হল থেকে সকাল ৯টার নালন্দা ক্লাসের জন্য তাড়াতাড়ি যাচ্ছি!',
    professor: 'সুপ্রভাত! শুক্রবারের মধ্যে তক্ষশীলায় ল্যাব রিপোর্ট জমা দিতে ভুলো না।',
    guard: 'মেইন বিল্ডিং চত্বরে নিজের আইডি কার্ড সাথে রাখুন।',
    vendor: 'গরম আদা চা আর সিঙাড়া তৈরি! একটু জিরিয়ে নিন।'
  }
});

export function resolveNpcSchedule(role, currentMinute, npcIndex = 0) {
  const entries = ROLE_SCHEDULES[role] || ROLE_SCHEDULES.student;
  const wrappedMin = ((Math.floor(currentMinute) % 1440) + 1440) % 1440;

  const matched = entries.find((item) => wrappedMin >= item.startMin && wrappedMin < item.endMin) || entries[0];
  const candidates = CAMPUS_LANDMARKS.filter((l) => l.category === matched.targetCategory);
  const landmark = candidates.length > 0
    ? candidates[npcIndex % candidates.length]
    : CAMPUS_LANDMARKS[0];

  const entranceOffsetZ = (landmark.d / 2) + 8;
  const entranceOffsetX = ((npcIndex % 5) - 2) * 3.5;

  return {
    role,
    activity: matched.activity,
    targetCategory: matched.targetCategory,
    landmarkId: landmark.id,
    landmarkName: landmark.name,
    targetX: landmark.x + entranceOffsetX,
    targetZ: landmark.z + entranceOffsetZ
  };
}
