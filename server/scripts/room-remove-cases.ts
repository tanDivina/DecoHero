// The 10 "Take out furniture" test cases for room redesigns, shared by room-remove-test.ts and removal-check-test.ts.
import type { Place } from "../src/marker.js";

const LIVING = "site/img/rooms/living-room-before.webp";
const SALA = "site/img/rooms/sala-panama-before.webp";
const KIDS = "store/rooms/before/kids-room.jpg";
const BEDROOM = "store/rooms/before/bedroom.jpg";
const DINING = "store/rooms/before/dining-room.jpg";
const OFFICE = "store/rooms/before/home-office.jpg";
const TERRACE = "store/rooms/before/terrace.jpg";

export type Case = { name: string; file: string; style: string; remove: Place[]; note: string };
export const CASES: Case[] = [
  { name: "living-armchair-japandi", file: LIVING, style: "japandi", remove: [{ x: 0.79, y: 0.55 }], note: "single piece: armchair next to the sofa" },
  { name: "living-table-boho", file: LIVING, style: "boho", remove: [{ x: 0.63, y: 0.66 }], note: "single piece: glass coffee table" },
  { name: "sala-chairs-tropical", file: SALA, style: "tropical-modern", remove: [{ x: 0.45, y: 0.50 }], note: "small piece: stacked plastic chairs" },
  { name: "sala-loveseat-industrial", file: SALA, style: "industrial", remove: [{ x: 0.68, y: 0.72 }], note: "big piece: front loveseat, touching the back sofa" },
  { name: "bedroom-nightstand-scandi", file: BEDROOM, style: "scandinavian", remove: [{ x: 0.25, y: 0.72 }], note: "small piece: nightstand with lamp, touching the bed" },
  { name: "dining-chair-farmhouse", file: DINING, style: "farmhouse", remove: [{ x: 0.68, y: 0.62 }], note: "one chair of a dining set (right-hand end)" },
  { name: "kids-desk-coastal", file: KIDS, style: "coastal", remove: [{ x: 0.86, y: 0.76 }], note: "piece touching a neighbour: desk goes, its chair stays" },
  { name: "office-chair-box-minimal", file: OFFICE, style: "modern-minimal", remove: [{ x: 0.92, y: 0.70 }, { x: 0.42, y: 0.80 }], note: "two pieces: office chair and cardboard box" },
  { name: "terrace-table-chair-tropical", file: TERRACE, style: "tropical-modern", remove: [{ x: 0.55, y: 0.65 }, { x: 0.70, y: 0.72 }], note: "two pieces: plastic table and the front chair" },
  { name: "kids-desk-chair-japandi", file: KIDS, style: "japandi", remove: [{ x: 0.86, y: 0.76 }, { x: 0.72, y: 0.77 }], note: "two pieces: desk and its chair" },
];

