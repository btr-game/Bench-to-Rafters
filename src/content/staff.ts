// Personal staff (round 25, the owner: people hired in events join a staff group on the Player
// tab, get paid every season, give very small benefits, can be talked to, and can get a raise).
// Each role: what it costs a season at level 1 ($M), where he works (the scene behind him), the
// event that offers him, and a few things he says when you stop by.

export type StaffRole = 'chef' | 'nutritionist' | 'trainer' | 'physio' | 'shooting' | 'skills' | 'psychologist' | 'analyst' | 'sleep';

export interface StaffDef {
  role: StaffRole;
  title: string; // "Personal chef"
  salary: number; // $M a season at level 1
  place: string; // where he works, for the scene
  does: string; // what he does for you, in words
  pitch: string; // the event that offers him
  talk: string[];
}

export const STAFF: Record<StaffRole, StaffDef> = {
  chef: {
    role: 'chef',
    title: 'Personal chef',
    salary: 0.12,
    place: 'kitchen',
    does: 'Keeps you near your playing weight and in a good mood.',
    pitch: 'A chef who cooked for two championship teams wants to run your kitchen full-time.',
    talk: ['"Salmon tonight. And no, the fries are not a vegetable."', '"Your mother sent me her recipe. I made it better. Do not tell her."', '"Eat the greens first. Then we talk about dessert."'],
  },
  nutritionist: {
    role: 'nutritionist',
    title: 'Nutritionist',
    salary: 0.1,
    place: 'kitchen',
    does: 'Plans what you eat, so the weight stays where it should and the body ages slower.',
    pitch: 'A nutritionist offers to plan every meal you eat, all year.',
    talk: ['"Your bloodwork is the best on the team. Keep it that way."', '"Hydration is a skill. Drink."', '"Sugar after the game, not before. Trust me."'],
  },
  trainer: {
    role: 'trainer',
    title: 'Strength trainer',
    salary: 0.2,
    place: 'gym',
    does: 'A little more athleticism every season.',
    pitch: 'A strength trainer with a waiting list has an opening, if you want him all year.',
    talk: ['"Three more. You said that last time. Three more."', '"Your vertical is up an inch. Do not get excited. Squat."', '"Rest day tomorrow. I mean it."'],
  },
  physio: {
    role: 'physio',
    title: 'Physiotherapist',
    salary: 0.25,
    place: 'clinic',
    does: 'Fewer injuries, and less wear on the body.',
    pitch: 'A physiotherapist who kept a veteran playing to 40 offers to travel with you.',
    talk: ['"The left knee is talking again. We listen to it."', '"Ice, then the bands, then sleep."', '"Your hamstrings are tighter than the team’s budget."'],
  },
  shooting: {
    role: 'shooting',
    title: 'Shooting coach',
    salary: 0.3,
    place: 'court',
    does: 'A little better shooting and a little more range every season.',
    pitch: 'A shooting coach who rebuilt three NBA jumpers wants to work with you every day.',
    talk: ['"Elbow in. Follow through. Hold it until it drops."', '"Five hundred makes, not five hundred shots."', '"You dip the ball on the catch. Stop it."'],
  },
  skills: {
    role: 'skills',
    title: 'Skills coach',
    salary: 0.25,
    place: 'court',
    does: 'A little better handle and weak hand every season.',
    pitch: 'A skills coach famous for his ball-handling videos offers a year-round deal.',
    talk: ['"Two balls. Eyes up. Again."', '"Your left hand is getting there. Slowly."', '"Tennis ball drills. Do not ask why."'],
  },
  psychologist: {
    role: 'psychologist',
    title: 'Sports psychologist',
    salary: 0.15,
    place: 'office',
    does: 'Keeps your head right: a lift in morale every season.',
    pitch: 'A sports psychologist offers to work with you all season, in person and on the phone.',
    talk: ['"What did the last miss teach you? Then let it go."', '"Breathe in for four. Out for six."', '"You are allowed to enjoy this, you know."'],
  },
  analyst: {
    role: 'analyst',
    title: 'Video analyst',
    salary: 0.12,
    place: 'film room',
    does: 'Film on every opponent: a little more feel for the game every season.',
    pitch: 'A video analyst offers to cut film on every opponent you will ever face.',
    talk: ['"Their center hedges hard on the high pick. Watch."', '"You pick up your dribble when you are tired. Here, here and here."', '"Twelve clips. Ten minutes. Go."'],
  },
  sleep: {
    role: 'sleep',
    title: 'Sleep coach',
    salary: 0.08,
    place: 'bedroom',
    does: 'Better sleep: the body ages a little slower and gets hurt a little less.',
    pitch: 'A sleep coach wants to fix your nights: travel, time zones and all.',
    talk: ['"Phone out of the room. Yes, out."', '"Nine hours. The best players sleep the most."', '"The flight lands at two. You sleep on the plane, not after."'],
  },
};

export const STAFF_ROLES = Object.keys(STAFF) as StaffRole[];
