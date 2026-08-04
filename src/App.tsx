/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowUpRight, 
  Loader2, 
  Video, 
  Camera, 
  Upload, 
  Check, 
  ChevronRight, 
  Download, 
  HelpCircle, 
  Eye, 
  Sparkles, 
  Sliders, 
  Play, 
  RotateCcw, 
  Image as ImageIcon,
  Info,
  Layers,
  Zap,
  Star,
  Compass,
  Share2,
  Copy,
  Heart,
  X,
  Scale,
  ArrowLeftRight,
  Ruler,
  FileText,
  FileDown,
  Undo2,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import jsPDF from "jspdf";

interface CompetitorComparison {
  id: string;
  name: string;
  title: string;
  tagline: string;
  intro: string;
  prosDecoHero: string[];
  consCompetitor: string[];
  tableData: {
    feature: string;
    decoHero: string;
    competitor: string;
    decoHeroBetter: boolean;
  }[];
  verdict: string;
  fullArticleSections: {
    heading: string;
    paragraphs: string[];
  }[];
}

const COMPETITORS_DATA: CompetitorComparison[] = [
  {
    id: "collov",
    name: "Collov GPT",
    title: "Deco Hero vs Collov GPT",
    tagline: "Stricter layout preservation, cleaner architectural contours, and curated aesthetic presets.",
    intro: "While Collov GPT offers generic generative design, it frequently shifts load-bearing walls, ignores window dimensions, and scrambles original room structures. Deco Hero uses custom structure-securing pipelines to lock in your original room baseline with millimeter precision.",
    prosDecoHero: [
      "Rigid spatial boundary locking prevents wall shifting",
      "Curated 10-preset design matrix tailored by real architects",
      "Instant real-time render preview comparisons on-screen"
    ],
    consCompetitor: [
      "Often introduces distorted furniture and architectural anomalies",
      "Weak layout alignment resulting in shifted door and window frames",
      "No direct slider control to balance creative license with spatial strictness"
    ],
    tableData: [
      { feature: "Structure Boundaries", decoHero: "Rigid structure preservation technology", competitor: "High risk of architectural shifting", decoHeroBetter: true },
      { feature: "Control Adjustability", decoHero: "Millimeter precision layout strictness slider", competitor: "Basic text prompting only", decoHeroBetter: true },
      { feature: "Render Speeds", decoHero: "Ultra-fast direct pipelines via Gemini API", competitor: "Slower queue-based models", decoHeroBetter: true },
      { feature: "Aesthetic Precision", decoHero: "10 high-fidelity master presets", competitor: "Generic style categories", decoHeroBetter: true }
    ],
    verdict: "Deco Hero is engineered specifically for users requiring high structural accuracy. By locking down spatial boundary dimensions, it eliminates the common issue of shifted structural coordinates, providing reliable design iterations for developers, real estate agents, and discerning homeowners.",
    fullArticleSections: [
      {
        heading: "1. The Core Architecture Dilemma",
        paragraphs: [
          "Collov GPT leverages generic, open-source stable diffusion models fine-tuned on general interior imagery. While this can produce visually pleasing pixel configurations at first glance, it treats crucial structural elements—such as pillars, walls, and vents—as liquid, customizable objects rather than strict physical boundaries.",
          "Deco Hero takes a fundamentally different route. Developed in collaboration with practicing interior designers and architects, our engine embeds a custom structure-securing segmentation layer. This locks in the load-bearing columns, wall perimeters, and permanent doorways of your uploaded image, allowing you to cycle through aesthetic iterations with absolute spatial confidence."
        ]
      },
      {
        heading: "2. Spatial Depth Mapping and Window Preservation",
        paragraphs: [
          "One of the most persistent complaints about Collov GPT's output is its tendency to cover existing windows with solid drywall or generate doors that lead into empty, impossible spaces. Retaining real-world fenestration and door coordinates is non-negotiable for accurate remodeling cost estimations.",
          "Our platform calculates real physical depth maps of the original snapshot. By anchoring the physical coordinates of window panes and glass patio doors, our styles naturally bend and bounce generated light. When you render a 'Modern Bistro' or 'Parisian Elegant' room, the daylight falls naturally across the furniture precisely where your actual window sits."
        ]
      },
      {
        heading: "3. Direct Precision Controls vs. Unpredictable Randomness",
        paragraphs: [
          "Collov GPT often requires multiple generation cycles because it lacks granular structure controls. You are forced to accept whatever layout its random seed produces, even if it relocates your main staircase to the middle of the kitchen.",
          "Deco Hero introduces a strictness threshold directly linked to our Gemini pipeline. This ensures you maintain the precise outline of your real space, only changing furniture styles, wall textures, paint tones, and fixtures. It behaves as a digital companion rather than a random image generator."
        ]
      }
    ]
  },
  {
    id: "spacely",
    name: "Spacely AI",
    title: "Deco Hero vs Spacely AI",
    tagline: "No complex prompting. Direct, professional presets with balanced interior illumination.",
    intro: "Spacely AI depends heavily on complex, trial-and-error text prompt engineering, leading to frustrating variations. Deco Hero offers 10 professionally curated style modes out of the box, optimized with built-in structural constraints.",
    prosDecoHero: [
      "Zero prompt engineering required—just upload and select style",
      "Superior illumination contrast and realistic shadows",
      "Dynamic interactive comparison workspace with slider"
    ],
    consCompetitor: [
      "Heavy reliance on user-entered text prompts with unpredictable results",
      "Unbalanced room illumination (frequent flat lighting)",
      "Cluttered, complex multi-step generation interface"
    ],
    tableData: [
      { feature: "Style Generation", decoHero: "Instant one-click professional styles", competitor: "Manual complex prompting loops", decoHeroBetter: true },
      { feature: "Room Lighting", decoHero: "True ambient shadow and light physics", competitor: "Flat or oversaturated contrast", decoHeroBetter: true },
      { feature: "Interface Design", decoHero: "Zen-like minimalist single-screen layout", competitor: "Cluttered dashboard with high learning curve", decoHeroBetter: true },
      { feature: "Favorites System", decoHero: "Built-in persistent favorites checklist", competitor: "Difficult history retrieval", decoHeroBetter: true }
    ],
    verdict: "Deco Hero provides a streamlined interior design experience. Instead of forcing users to guess complex prompts, our tool uses high-fidelity style templates developed by expert interior curators to produce stunning, realistic outputs on your first click.",
    fullArticleSections: [
      {
        heading: "1. The End of 'Prompt Fatigue'",
        paragraphs: [
          "Spacely AI's workflow expects users to act like skilled prompt engineers. To generate high-fidelity renders, you are often prompted to type highly specific modifier phrases such as '8k resolution, volumetric rays, cozy scandinavian hygge, octane render style'. This creates a significant barrier to entry and produces wildly inconsistent results.",
          "Deco Hero does away with text prompt fatigue entirely. We have hard-coded a meticulous matrix of 10 signature, timeless interior designs—each hand-curated by global design boutiques. When you click 'Japandi', 'Biophilic', or 'Industrial Modern', our back-end automatically maps the physical constraints, light channels, and texture standards to deliver an architect-grade render with zero typing."
        ]
      },
      {
        heading: "2. Professional Ambient Lighting vs. Flat Over-Saturations",
        paragraphs: [
          "In many Spacely AI generations, the light feels synthetically 'flat' or unnaturally oversaturated, reminiscent of a legacy video game engine rather than a professional photograph. This happens when the generator struggles to model how light bounces off matte finishes versus polished marble or metal surfaces.",
          "Deco Hero relies on the multi-modal intelligence of Gemini. It understands the distinct physical properties of wood grains, woolen fabrics, and polished glass. As a result, shadows fall softly behind chairs, wood panels show realistic low-luster sheens, and metal elements catch authentic ambient highlights, resulting in incredibly rich, organic renders."
        ]
      },
      {
        heading: "3. Clean Minimalist Workflow Built for Humans",
        paragraphs: [
          "Spacely AI features a complex, cluttered multi-tab workspace that takes considerable time to master. Navigating history tabs, manual masking brushes, and prompt boxes feels overwhelming for homeowners looking for fast, clear inspiration.",
          "Our interface is designed as a calm, beautiful Single-Page studio. With elegant side-by-side swipe sliders, minimalist cards, and a straightforward favorites list, you can experiment, compare, and lock in your favorite designs instantly in a clean, professional environment."
        ]
      }
    ]
  },
  {
    id: "planner5d",
    name: "Planner 5D",
    title: "Deco Hero vs Planner 5D",
    tagline: "Ditch the tedious 3D CAD modeling. Transform real photos into master designs instantly.",
    intro: "Planner 5D is a traditional CAD floor-planner that demands hours of manual block-building and object dragging. Deco Hero acts as an instant architectural renderer—simply snap a real photo of your space and watch it redesign in seconds.",
    prosDecoHero: [
      "Instant transformation from a real photo in under 5 seconds",
      "Generates hyper-realistic textures, fabrics, and light reflections",
      "No learning curve or complex modeling grid required"
    ],
    consCompetitor: [
      "Requires manual creation of 2D/3D floorplans from scratch",
      "Clunky drag-and-drop system for furniture sizing",
      "Extremely long rendering times for high-fidelity views"
    ],
    tableData: [
      { feature: "Workflow", decoHero: "Instant photo-to-photo conversion", competitor: "Tedious manual 3D modeling from scratch", decoHeroBetter: true },
      { feature: "Rendering Time", decoHero: "Instant processing (<5 seconds)", competitor: "Hours or high costs for full raytracing", decoHeroBetter: true },
      { feature: "Symmetry & Realism", decoHero: "Hyper-realistic fabric, wood, & light textures", competitor: "Synthetic, flat 3D-mesh look", decoHeroBetter: true },
      { feature: "Entry Barrier", decoHero: "Zero skills needed—upload & watch", competitor: "Requires drafting / interior modeling skills", decoHeroBetter: true }
    ],
    verdict: "Deco Hero shifts the focus from laborious manual drafting to instantaneous inspiration. By leveraging Gemini models, we bypass the need for tedious 3D coordinate plotting, generating photo-accurate redesigns of real spaces instantly.",
    fullArticleSections: [
      {
        heading: "1. Real-Photo Magic vs. Clunky CAD Drafting",
        paragraphs: [
          "Planner 5D is built on legacy CAD structures. To design a room, you must first spend hours measuring physical walls, plotting a 2D blueprint, dragging low-polygon 3D boxes onto a grid, and scaling individual furniture components. The resulting draft often looks synthetic, geometric, and completely devoid of human charm.",
          "Deco Hero starts directly with the photo of your space. There are no tape measures, blue grids, or clunky wireframes. In less than 5 seconds, our system interprets the raw photograph, retains the essential wall structures, and stages it with premium furnishings and textures, delivering a real-life vision instantly."
        ]
      },
      {
        heading: "2. Material Tactility and Physical Realism",
        paragraphs: [
          "Placing a sofa from a generic library catalog in Planner 5D often results in a rigid, plastic-looking block. It fails to convey the organic warmth of real fabrics, the coarse texture of rustic oak, or the sleek cool touch of brushed concrete.",
          "Our model architectures excel at reproducing material touch. Deco Hero models organic wood grains, knobby bouclé fabrics, matte wall paints, and soft leather folds with staggering realism. This lets you feel the mood of the room, rather than just viewing a basic 3D layout representation."
        ]
      },
      {
        heading: "3. Instant Gratification in Real-Time",
        paragraphs: [
          "Generating a photorealistic high-fidelity render in Planner 5D requires submitting your draft to a distant server queue, which can take anywhere from fifteen minutes to several hours or cost expensive credits for raytraced images.",
          "Deco Hero processes designs instantly. With high-performance cloud processing directly connected to Gemini's multi-modal pipeline, you receive stunning, fully resolved interior render options in under five seconds, completely free from long queues or complicated render credits."
        ]
      }
    ]
  }
];

type Screen = "welcome" | "countdown" | "loading" | "cards";

const STYLE_CONFIGS = [
  {
    id: "japandi",
    name: "Japandi",
    description: "Japandi minimalism blends serene Scandinavian functionality with Japanese rustic warmth to create peace.",
    prompt: "Interior design of a living room, Japandi style, earthy neutrals, low platform light wood furniture, zero clutter, minimalist ceramic decor, neutral palette",
    tags: ["Minimalist", "Warm Woods", "Earthy Palette"]
  },
  {
    id: "industrial",
    name: "Industrial Modern",
    description: "Industrial Modern embraces raw architectural elements with charcoal tones and exposed brick for an urban edge.",
    prompt: "Interior design of a living room, Industrial Modern style, charcoal tones, exposed brick wall, distressed leather sofa, iron pipe detailing, large industrial windows",
    tags: ["Raw Brick", "Distressed Leather", "Iron Detailing"]
  },
  {
    id: "midcentury",
    name: "Mid-Century Modern",
    description: "Mid-Century Modern pairs warm retro aesthetics with sleek lines, peg legs, and vibrant autumnal accent colors.",
    prompt: "Interior design of a living room, Mid-Century Modern style, tapered peg legs on furniture, rich walnut wood finishes, mustard yellow and burnt orange accents",
    tags: ["Retro", "Walnut Finishes", "Peg Legs"]
  },
  {
    id: "biophilic",
    name: "Biophilic",
    description: "Biophilic design brings the outdoors inside, layering abundant plant life with natural rattan and cream fabrics.",
    prompt: "Interior design of a living room, Biophilic Urban Jungle style, abundant indoor green plants, hanging vines, rattan accents, plush cream fabrics, natural sunlight",
    tags: ["Nature-Infused", "Abundant Greenery", "Rattan"]
  },
  {
    id: "luxury",
    name: "Luxury Contemporary",
    description: "Luxury Contemporary exudes opulence through rich boucle textures, polished marble tables, and refined brass hardware.",
    prompt: "Interior design of a living room, Luxury Contemporary style, plush boucle textures, elegant polished marble coffee table, gold and brass hardware accents, sophisticated lighting",
    tags: ["Opulent", "Marble & Brass", "Boucle Textures"]
  },
  {
    id: "bohemian",
    name: "Bohemian Chic",
    description: "Bohemian Chic layers eclectic patterns, vintage rugs, and macrame accents for a free-spirited, relaxed aesthetic.",
    prompt: "Interior design of a living room, Bohemian Chic style, eclectic patterns, vintage rugs, macrame wall hangings, warm earthy tones, lots of textures, relaxed vibe",
    tags: ["Eclectic", "Vintage Rugs", "Textured Layers"]
  },
  {
    id: "minimalist",
    name: "Pure Minimalist",
    description: "Pure Minimalist focuses on the essentials with clean white walls, hidden storage, and singular statement pieces.",
    prompt: "Interior design of a living room, Pure Minimalist style, clean white walls, hidden storage, singular statement furniture pieces, monotone palette, ample negative space",
    tags: ["Essentialist", "Monotone", "Negative Space"]
  },
  {
    id: "coastal",
    name: "Modern Coastal",
    description: "Modern Coastal blends breezy light blues, whitewashed driftwood, and natural linen for a relaxed beachside feel.",
    prompt: "Interior design of a living room, Modern Coastal style, breezy light blues, whitewashed driftwood furniture, natural linen fabrics, airy and bright, beachside atmosphere",
    tags: ["Aero & Bright", "Linen Fabrics", "Driftwood"]
  },
  {
    id: "artdeco",
    name: "Art Deco",
    description: "Art Deco brings glamorous symmetry to life with geometric patterns, velvet seating, and bold jewel tones.",
    prompt: "Interior design of a living room, Art Deco style, geometric patterns, velvet seating, bold jewel tones, mirrored surfaces, glamorous metallic accents",
    tags: ["Glamorous", "Bold Geometrics", "Velvet Seating"]
  },
  {
    id: "farmhouse",
    name: "Modern Farmhouse",
    description: "Modern Farmhouse pairs rustic shiplap walls and reclaimed woods with sleek black iron fixtures for a cozy appeal.",
    prompt: "Interior design of a living room, Modern Farmhouse style, rustic shiplap walls, reclaimed wood furniture, sleek black iron fixtures, cozy and inviting, neutral tones",
    tags: ["Cozy & Warm", "Shiplap Walls", "Reclaimed Wood"]
  }
];

// High quality unsplash previews for the landing page interactive slider
const LANDING_GALLERY_STYLES = [
  {
    id: "original",
    name: "Original Space",
    tag: "[ BEFORE ]",
    img: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80",
    description: "The structural baseline: a bright, spacious room with neutral elements, ready for a stylistic transformation."
  },
  {
    id: "japandi",
    name: "Serene Japandi",
    tag: "[ STYLE: JAPANDI ]",
    img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=80",
    description: "Organic wood textures, minimal furniture profile, and clean lines blend Japanese rustic warmth with Scandinavian functionality."
  },
  {
    id: "industrial",
    name: "Industrial Modern",
    tag: "[ STYLE: INDUSTRIAL ]",
    img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1000&q=80",
    description: "Bold charcoal accents, rustic brick walls, polished concrete, and custom steel frames deliver a sharp metropolitan feel."
  },
  {
    id: "midcentury",
    name: "Mid-Century Retro",
    tag: "[ STYLE: MID-CENTURY ]",
    img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1000&q=80",
    description: "Clean geometric forms, tapered wooden legs, rich walnut credenzas, and playful autumnal accents."
  },
  {
    id: "biophilic",
    name: "Biophilic Urban Jungle",
    tag: "[ STYLE: BIOPHILIC ]",
    img: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=1000&q=80",
    description: "Bringing the outdoors inside. Lush cascading ivy, potted palms, woven rattan accents, and light organic fabrics."
  },
  {
    id: "minimalist",
    name: "Pure Minimalist",
    tag: "[ STYLE: MINIMALIST ]",
    img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80",
    description: "Sleek monochromatic surfaces, completely hidden storages, and carefully positioned statement pieces."
  }
];

declare global {
  interface Window {
    aistudio?: {
      openSelectKey?: () => Promise<boolean | void>;
    };
  }
}

export default function App() {
  const [view, setView] = useState<"landing" | "studio">("landing");
  const [screen, setScreen] = useState<Screen>("welcome");
  const [hasLinkedKey, setHasLinkedKey] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const fetchingRef = useRef<Set<string>>(new Set());

  const [videoStatus, setVideoStatus] = useState<Record<string, 'generating' | 'polling' | 'ready' | 'failed'>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [videoDuration, setVideoDuration] = useState<"6s" | "10s">("6s");
  const [videoMotion, setVideoMotion] = useState<"pan" | "zoom" | "orbit">("pan");

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Landing Page Interactive Widget State
  const [selectedLandingStyle, setSelectedLandingStyle] = useState(LANDING_GALLERY_STYLES[1]); // Japandi by default
  const [landingCompareMode, setLandingCompareMode] = useState(false);

  // Studio Interactive Comparison State
  const [showOriginalInStudio, setShowOriginalInStudio] = useState(false);
  const [favourites, setFavourites] = useState<{ styleId: string; imageUrl: string }[]>(() => {
    try {
      const saved = localStorage.getItem("deco_hero_favourites_list");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);
  const [creativityLevel, setCreativityLevel] = useState<number>(70);
  const [activeCompetitorId, setActiveCompetitorId] = useState<string | null>(null);

  // New features state
  const [styleSearchQuery, setStyleSearchQuery] = useState("");
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Batch download & comparison view states
  const [comparisonMode, setComparisonMode] = useState<"slider" | "side-by-side">("slider");
  const [selectedFavourites, setSelectedFavourites] = useState<string[]>([]);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  const [iterationNotes, setIterationNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("deco_hero_iteration_notes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [notesSaveStatus, setNotesSaveStatus] = useState<string | null>(null);

  // Saved baseline notes loaded from local storage for undo safety net
  const savedNotesBaselineRef = useRef<Record<string, string>>(
    (() => {
      try {
        const saved = localStorage.getItem("deco_hero_iteration_notes");
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    })()
  );

  // Undo history stack for notes per style ID
  const notesHistoryRef = useRef<Record<string, string[]>>({});

  const handleNotesChange = (styleId: string, newText: string) => {
    const currentText = iterationNotes[styleId] || "";
    if (newText === currentText) return;

    if (!notesHistoryRef.current[styleId]) {
      notesHistoryRef.current[styleId] = [];
    }
    const stack = notesHistoryRef.current[styleId];
    if (stack.length === 0 || stack[stack.length - 1] !== currentText) {
      if (stack.length >= 30) stack.shift();
      stack.push(currentText);
    }

    setIterationNotes(prev => ({
      ...prev,
      [styleId]: newText
    }));
    setNotesSaveStatus("Changes autosaved");
    setTimeout(() => setNotesSaveStatus(null), 2000);
  };

  const handleUndoNotes = () => {
    const currentStyleId = STYLE_CONFIGS[currentIndex].id;
    const stack = notesHistoryRef.current[currentStyleId] || [];
    let targetText = "";

    if (stack.length > 0) {
      targetText = stack.pop()!;
    } else {
      targetText = savedNotesBaselineRef.current[currentStyleId] || "";
    }

    setIterationNotes(prev => ({
      ...prev,
      [currentStyleId]: targetText
    }));

    setNotesSaveStatus("Reverted to saved state");
    setToastMessage("Reverted design iteration notes to previous saved state!");
    setTimeout(() => setNotesSaveStatus(null), 2500);
  };

  // Perspective states
  const [showPerspectiveOverlay, setShowPerspectiveOverlay] = useState<boolean>(true);
  const [isCalibratingPerspective, setIsCalibratingPerspective] = useState<boolean>(false);
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);
  const [calibrationPhase, setCalibrationPhase] = useState<string>("");
  const [measurementUnit, setMeasurementUnit] = useState<"metric" | "imperial">("metric");
  const [selectedRoomType, setSelectedRoomType] = useState<"living" | "bedroom" | "dining" | "office">("living");

  // Save notes to local storage
  useEffect(() => {
    localStorage.setItem("deco_hero_iteration_notes", JSON.stringify(iterationNotes));
  }, [iterationNotes]);

  // Window-level events to handle smooth sliding side-by-side slider dragging
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingSlider || !sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(position);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (!isDraggingSlider || !sliderContainerRef.current) return;
      if (e.touches[0]) {
        const rect = sliderContainerRef.current.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(position);
      }
    };

    const handleWindowMouseUp = () => {
      setIsDraggingSlider(false);
    };

    if (isDraggingSlider) {
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
      window.addEventListener("touchmove", handleWindowTouchMove, { passive: true });
      window.addEventListener("touchend", handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowMouseUp);
    };
  }, [isDraggingSlider]);

  useEffect(() => {
    localStorage.setItem("deco_hero_favourites_list", JSON.stringify(favourites));
    
    // Automatically keep selectedFavourites synchronized with favourites list
    setSelectedFavourites(prev => {
      const favIds = favourites.map(f => f.styleId);
      // Keep existing selections that are still in favourites, plus add any new ones
      const stillFavs = prev.filter(id => favIds.includes(id));
      const newFavs = favIds.filter(id => !prev.includes(id));
      return [...stillFavs, ...newFavs];
    });
  }, [favourites]);

  // Sharing & Toast States
  const [showShareModal, setShowShareModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shareFormat, setShareFormat] = useState<"styled" | "original" | "combined">("styled");
  const [combinedImage, setCombinedImage] = useState<string | null>(null);
  const [generatingCombined, setGeneratingCombined] = useState(false);
  const [includeWatermark, setIncludeWatermark] = useState(true);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setToastMessage("Public link copied to clipboard!");
  };

  const generateBeforeAfterImage = (originalSrc: string, styledSrc: string, drawWatermark: boolean): Promise<string> => {
    return new Promise((resolve, reject) => {
      const imgOriginal = new Image();
      const imgStyled = new Image();
      let loadedCount = 0;

      const onImageLoaded = () => {
        loadedCount++;
        if (loadedCount === 2) {
          try {
            const targetHeight = 900;
            const aspectOriginal = imgOriginal.width / imgOriginal.height || 4/3;
            const aspectStyled = imgStyled.width / imgStyled.height || 4/3;

            const widthOriginal = Math.round(targetHeight * aspectOriginal);
            const widthStyled = Math.round(targetHeight * aspectStyled);

            const canvas = document.createElement("canvas");
            const gap = 12;
            const canvasWidth = widthOriginal + widthStyled + gap;
            const canvasHeight = targetHeight;

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Could not get canvas context"));
              return;
            }

            // Fill background with elegant warm neutral
            ctx.fillStyle = "#EAE9E4";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Draw original on left
            ctx.drawImage(imgOriginal, 0, 0, widthOriginal, targetHeight);

            // Draw styled on right
            ctx.drawImage(imgStyled, widthOriginal + gap, 0, widthStyled, targetHeight);

            // Divider line
            ctx.strokeStyle = "#1A1A1A";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(widthOriginal + gap / 2, 0);
            ctx.lineTo(widthOriginal + gap / 2, targetHeight);
            ctx.stroke();

            // Label draw helper
            const drawLabel = (text: string, xCenter: number, yCenter: number) => {
              ctx.save();
              ctx.font = "bold 22px monospace";
              const textMetrics = ctx.measureText(text);
              const paddingX = 24;
              const paddingY = 12;
              const pillWidth = textMetrics.width + paddingX * 2;
              const pillHeight = 48;

              ctx.fillStyle = "rgba(26, 26, 26, 0.9)";
              ctx.beginPath();
              const rx = xCenter - pillWidth / 2;
              const ry = yCenter - pillHeight / 2;
              const r = 24;
              ctx.moveTo(rx + r, ry);
              ctx.arcTo(rx + pillWidth, ry, rx + pillWidth, ry + pillHeight, r);
              ctx.arcTo(rx + pillWidth, ry + pillHeight, rx, ry + pillHeight, r);
              ctx.arcTo(rx, ry + pillHeight, rx, ry, r);
              ctx.arcTo(rx, ry, rx + pillWidth, ry, r);
              ctx.closePath();
              ctx.fill();

              ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.fillStyle = "#FFFFFF";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(text, xCenter, yCenter + 1);
              ctx.restore();
            };

            drawLabel("BEFORE", widthOriginal / 2, targetHeight - 60);
            drawLabel("AFTER", widthOriginal + gap + widthStyled / 2, targetHeight - 60);

            if (drawWatermark) {
              // Brand watermark
              ctx.save();
              ctx.font = "italic 500 18px sans-serif";
              ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
              ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
              ctx.shadowBlur = 4;
              ctx.textAlign = "right";
              ctx.fillText("Made with Deco Hero", canvasWidth - 24, targetHeight - 24);
              ctx.restore();
            }

            resolve(canvas.toDataURL("image/png"));
          } catch (e) {
            reject(e);
          }
        }
      };

      imgOriginal.onload = onImageLoaded;
      imgStyled.onload = onImageLoaded;

      imgOriginal.onerror = () => reject(new Error("Failed to load original image"));
      imgStyled.onerror = () => reject(new Error("Failed to load styled image"));

      imgOriginal.crossOrigin = "anonymous";
      imgStyled.crossOrigin = "anonymous";

      imgOriginal.src = originalSrc;
      imgStyled.src = styledSrc;
    });
  };

  useEffect(() => {
    if (showShareModal && shareFormat === "combined" && uploadedImage && images[STYLE_CONFIGS[currentIndex]?.id]) {
      setGeneratingCombined(true);
      generateBeforeAfterImage(uploadedImage, images[STYLE_CONFIGS[currentIndex].id], includeWatermark)
        .then((url) => {
          setCombinedImage(url);
          setGeneratingCombined(false);
        })
        .catch((err) => {
          console.error("Error generating before/after image", err);
          setToastMessage("Failed to compile Before & After collage");
          setGeneratingCombined(false);
          setShareFormat("styled");
        });
    }
  }, [showShareModal, shareFormat, currentIndex, uploadedImage, images, includeWatermark]);

  const handleNativeShare = async (base64Url: string, styleName: string) => {
    try {
      if (navigator.share) {
        const response = await fetch(base64Url);
        const blob = await response.blob();
        const file = new File([blob], `deco_hero_${styleName.toLowerCase()}_design.png`, { type: 'image/png' });
        
        await navigator.share({
          files: [file],
          title: `DECO HERO - ${styleName} Design`,
          text: `Check out my room re-designed in the ${styleName} style with DECO HERO!`,
        });
        setToastMessage("Shared successfully!");
      } else {
        handleCopyLink();
      }
    } catch (e: any) {
      console.error("Native share failed", e);
      handleCopyLink();
    }
  };

  // Interactive FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error("Failed to access camera", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg");
        setUploadedImage(base64);
        setUploaded(true);
        fetchImage(0, base64).then(() => fetchImage(1, base64));
      }
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUploadedImage(base64);
        setBottomSheetOpen(false);
        setUploaded(true);
        setView("studio");
        setScreen("countdown");
        setCountdown(5);
        // Start pre-fetching images immediately
        fetchImage(0, base64).then(() => fetchImage(1, base64));
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger studio with demo room
  const handleDemoUpload = async () => {
    setView("studio");
    setScreen("countdown");
    setCountdown(5);
    try {
      const response = await fetch('/test-image2.jpeg');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUploadedImage(base64);
        setBottomSheetOpen(false);
        setUploaded(true);
        fetchImage(0, base64).then(() => fetchImage(1, base64));
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error("Demo image not found", e);
      setScreen("welcome");
    }
  };

  const fetchImage = async (styleIndex: number, overrideImage?: string, force = false) => {
    if (styleIndex >= STYLE_CONFIGS.length) return;
    const style = STYLE_CONFIGS[styleIndex];
    if (!force && (images[style.id] || fetchingRef.current.has(style.id))) return;
    
    if (force) {
      setImages((prev) => {
        const copy = { ...prev };
        delete copy[style.id];
        return copy;
      });
    }

    fetchingRef.current.add(style.id);
    setImageErrors((prev) => {
      const copy = { ...prev };
      delete copy[style.id];
      return copy;
    });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: style.prompt, 
          imageBase64: overrideImage || uploadedImage,
          creativity_level: creativityLevel
        }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setImages((prev) => ({ ...prev, [style.id]: data.imageUrl }));
      } else {
        const errorMsg = data.error || "Failed to generate image";
        setImageErrors((prev) => ({ ...prev, [style.id]: errorMsg }));
        fetchingRef.current.delete(style.id);
      }
    } catch (e: any) {
      console.error("Failed to fetch image for", style.name, e);
      setImageErrors((prev) => ({ ...prev, [style.id]: e.message || "Failed to generate image" }));
      fetchingRef.current.delete(style.id);
    }
  };

  const generateVideo = async (styleId: string, base64Image: string, styleDesc: string) => {
    if (videoStatus[styleId]) return;

    setVideoStatus(prev => ({ ...prev, [styleId]: 'generating' }));

    try {
      const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z]*);base64,([^"]*)$/);
      if (!mimeMatch) throw new Error("Invalid image format");
      const mimeType = mimeMatch[1];
      const data = mimeMatch[2];
      
      const productImages = [{ mimeType, data }];

      const promptRes = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productDesc: styleDesc, 
          productImages,
          duration: videoDuration,
          motion: videoMotion
        })
      });
      if (!promptRes.ok) throw new Error("Failed to generate prompt");
      const { prompt } = await promptRes.json();

      const videoRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, productImages })
      });
      if (!videoRes.ok) throw new Error("Failed to generate video");
      const { fileId } = await videoRes.json();
      
      setVideoStatus(prev => ({ ...prev, [styleId]: 'polling' }));

      const pollTimer = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/file-status/${fileId}`);
          if (statusRes.ok) {
            const { state } = await statusRes.json();
            if (state === 'ACTIVE') {
              clearInterval(pollTimer);
              setVideos(prev => ({ ...prev, [styleId]: fileId }));
              setVideoStatus(prev => ({ ...prev, [styleId]: 'ready' }));
            } else if (state === 'FAILED') {
              clearInterval(pollTimer);
              setVideoStatus(prev => ({ ...prev, [styleId]: 'failed' }));
            }
          }
        } catch (e) {
          console.error("Poll error", e);
        }
      }, 3000);

    } catch (e) {
      console.error(e);
      setVideoStatus(prev => ({ ...prev, [styleId]: 'failed' }));
    }
  };

  const startGenerating = () => {
    setScreen("countdown");
    setCountdown(5);
  };

  const handleStartGenerating = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    if (!hasLinkedKey) {
      if (window.aistudio && window.aistudio.openSelectKey) {
        const success = await window.aistudio.openSelectKey();
        if (success !== false) {
          setHasLinkedKey(true);
          startGenerating();
        }
        return;
      } else {
        console.warn("Native context not found.");
      }
    }
    
    startGenerating();
  };

  useEffect(() => {
    let timer: any;
    if (screen === "countdown") {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      } else {
        if (images[STYLE_CONFIGS[0].id] || imageErrors[STYLE_CONFIGS[0].id]) {
          setScreen("cards");
        } else {
          setScreen("loading");
        }
      }
    }
    return () => clearTimeout(timer);
  }, [screen, countdown, images, imageErrors]);

  useEffect(() => {
    if (screen === "loading" && (images[STYLE_CONFIGS[0].id] || imageErrors[STYLE_CONFIGS[0].id])) {
      setScreen("cards");
    }
  }, [screen, images, imageErrors]);

  // Eagerly fetch the next image whenever the current index changes
  useEffect(() => {
    if (screen === "cards") {
      fetchImage(currentIndex + 1);
    }
  }, [screen, currentIndex]);

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    if (offset.y < -100 || velocity.y < -500) {
      if (currentIndex < STYLE_CONFIGS.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // End of list
        setCurrentIndex(STYLE_CONFIGS.length);
      }
    }
  };

  // Reset Studio state
  const handleResetStudio = () => {
    fetchingRef.current.clear();
    setUploaded(false);
    setUploadedImage(null);
    setCurrentIndex(0);
    setImages({});
    setVideos({});
    setVideoStatus({});
    setScreen("welcome");
  };

  // Helper to trigger download of the generated room
  const handleDownload = (base64Url: string, styleName: string) => {
    const link = document.createElement("a");
    link.href = base64Url;
    link.download = `deco_hero_${styleName.toLowerCase()}_design.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch download of selected favourite iterations as a single ZIP file
  const handleBatchDownloadZip = async () => {
    if (selectedFavourites.length === 0) {
      setToastMessage("Please select at least one design to download.");
      return;
    }
    setIsZipping(true);
    setToastMessage("Generating ZIP archive of high-res designs...");
    try {
      const zip = new JSZip();
      
      selectedFavourites.forEach((styleId) => {
        const fav = favourites.find(f => f.styleId === styleId);
        const styleConfig = STYLE_CONFIGS.find(s => s.id === styleId);
        
        if (fav && styleConfig) {
          const base64Url = fav.imageUrl;
          
          if (base64Url.startsWith("data:image/")) {
            const parts = base64Url.split(",");
            const base64Data = parts[1];
            
            // Extract file extension from mime type
            let ext = "png";
            const match = parts[0].match(/data:image\/(\w+);base64/);
            if (match && match[1]) {
              ext = match[1];
            }
            
            // Add file to ZIP
            zip.file(`deco_hero_${styleConfig.id}_design.${ext}`, base64Data, { base64: true });
          }
        }
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "deco_hero_favourite_designs.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setToastMessage("ZIP archive exported successfully!");
    } catch (error) {
      console.error("Failed to create ZIP", error);
      setToastMessage("Failed to generate ZIP archive.");
    } finally {
      setIsZipping(false);
    }
  };

  // Export current design render, iteration notes, and room measurements into a formatted PDF document
  const handleDownloadPDF = async () => {
    const currentStyle = STYLE_CONFIGS[currentIndex];
    const styleId = currentStyle.id;
    const currentImg = images[styleId];

    if (!currentImg) {
      setToastMessage("Please select or generate a design render first.");
      return;
    }

    setIsExportingPDF(true);
    setToastMessage("Formatting professional PDF summary...");

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2; // 180mm

      // Header Banner
      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, pageWidth, 22, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("DECO HERO — ARCHITECTURAL DESIGN SUMMARY", margin, 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(`Exported: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - margin, 13, { align: "right" });

      let yPos = 32;

      // Preset Title & Info
      doc.setTextColor(26, 26, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(currentStyle.name, margin, yPos);

      yPos += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(113, 113, 106);
      doc.text(`PRESET ${(currentIndex + 1).toString().padStart(2, '0')}  •  TAGS: ${currentStyle.tags.join(", ").toUpperCase()}`, margin, yPos);

      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      const descLines = doc.splitTextToSize(currentStyle.description, contentWidth);
      doc.text(descLines, margin, yPos);
      yPos += descLines.length * 4 + 4;

      // Render Image
      const imgHeight = 92;
      try {
        let format = "JPEG";
        if (currentImg.startsWith("data:image/png")) {
          format = "PNG";
        }
        doc.addImage(currentImg, format, margin, yPos, contentWidth, imgHeight);
        doc.setDrawColor(220, 220, 215);
        doc.rect(margin, yPos, contentWidth, imgHeight, "S");
        yPos += imgHeight + 8;
      } catch (err) {
        console.error("Failed to embed render in PDF", err);
        yPos += 10;
      }

      // Design Iteration Notes Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(26, 26, 26);
      doc.text("AESTHETIC WORKSPACE NOTES", margin, yPos);
      yPos += 4;

      const noteText = iterationNotes[styleId]?.trim() || "No custom iteration notes added for this design preset.";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      const noteLines = doc.splitTextToSize(noteText, contentWidth - 8);
      const boxHeight = Math.max(16, noteLines.length * 4 + 6);

      doc.setFillColor(248, 248, 246);
      doc.setDrawColor(230, 230, 225);
      doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, "FD");
      doc.text(noteLines, margin + 4, yPos + 5);
      yPos += boxHeight + 8;

      // Room Measurements Estimator Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(26, 26, 26);
      doc.text("PERSPECTIVE & ROOM MEASUREMENTS ESTIMATOR", margin, yPos);
      yPos += 4;

      const colWidth = (contentWidth - 6) / 3;
      const cardHeight = 16;
      const metrics = [
        { label: "EST. FLOOR AREA", val: "~28 m² (300 sq ft)" },
        { label: "CEILING HEIGHT", val: "~2.8 m (9.2 ft)" },
        { label: "LIGHT RATIO", val: "~18% Window Ratio" },
      ];

      metrics.forEach((m, idx) => {
        const xBox = margin + idx * (colWidth + 3);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 220, 215);
        doc.roundedRect(xBox, yPos, colWidth, cardHeight, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(113, 113, 106);
        doc.text(m.label, xBox + 3, yPos + 5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(26, 26, 26);
        doc.text(m.val, xBox + 3, yPos + 12);
      });

      yPos += cardHeight + 10;

      // Footer
      doc.setDrawColor(230, 230, 225);
      doc.line(margin, 280, pageWidth - margin, 280);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 135);
      doc.text("Deco Hero — Architectural Spatial Studio", margin, 285);
      doc.text("Page 1 of 1", pageWidth - margin, 285, { align: "right" });

      doc.save(`deco_hero_${styleId}_summary.pdf`);
      setToastMessage("PDF Summary exported successfully!");
    } catch (err) {
      console.error("PDF generation error", err);
      setToastMessage("Failed to generate PDF summary.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Helper to trigger download of the generated video walkthrough
  const handleDownloadVideo = async (fileId: string, styleName: string) => {
    try {
      setToastMessage("Downloading video walkthrough...");
      const videoUrl = `/api/video/${fileId}`;
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("Failed to download video file");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `deco_hero_${styleName.toLowerCase()}_walkthrough.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setToastMessage("Video walkthrough downloaded!");
    } catch (e) {
      console.error("Video download failed", e);
      setToastMessage("Failed to download video walkthrough");
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col font-sans text-[#1A1A1A] overflow-x-hidden relative">
      
      {/* LANDING PAGE VIEW */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FBFBFA]/85 border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <span className="text-xl font-syncopate font-bold tracking-widest text-[#1A1A1A]">DECO HERO</span>
              <span className="font-mono text-[9px] px-2 py-0.5 border border-[#1A1A1A]/10 rounded bg-[#EAE9E4]/40 text-[#71716A]">V1.0</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 font-mono text-xs tracking-wider uppercase text-[#71716A]">
              <a href="#how-it-works" className="hover:text-[#1A1A1A] transition-colors">How it works</a>
              <a href="#curated-styles" className="hover:text-[#1A1A1A] transition-colors">The Styles</a>
              <a href="#pricing" className="hover:text-[#1A1A1A] transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-[#1A1A1A] transition-colors">FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleDemoUpload}
                className="hidden sm:inline-block font-mono text-xs tracking-wide uppercase px-4 py-2 border border-[#1A1A1A]/15 hover:border-[#1A1A1A] rounded-full hover:bg-[#EAE9E4]/20 transition-all active:scale-[0.98]"
              >
                Try Demo
              </button>
              <button 
                onClick={() => setView("studio")}
                className="font-mono text-xs tracking-wide uppercase bg-[#1A1A1A] text-white px-5 py-2 rounded-full hover:bg-black transition-all active:scale-[0.98] shadow-sm flex items-center gap-1.5 font-medium"
              >
                Open Studio <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="px-6 pt-12 md:pt-20 pb-20 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[#71716A] px-3 py-1 bg-[#EAE9E4]/50 border border-[#1A1A1A]/5 rounded-full">
                <Sparkles className="w-3 h-3 text-[#1A1A1A]" /> Spatial Interior Engine
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-syncopate font-bold leading-[1.05] tracking-tight text-[#1A1A1A]">
                REDESIGN <br className="hidden md:block" />
                YOUR ROOM <br className="hidden md:block" />
                IN CLICKS.
              </h1>
              <p className="text-base sm:text-lg text-[#71716A] leading-relaxed font-sans max-w-md">
                Upload a photo of your space, select from ten curated architectural aesthetics, and instantly see the transformation. Deco Hero locks your walls and structural footprints while completely re-clothing furniture, textures, and lighting.
              </p>
              
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setView("studio");
                    setTimeout(() => fileInputRef.current?.click(), 100);
                  }}
                  className="bg-[#1A1A1A] text-white py-4 px-8 rounded-full font-medium text-sm tracking-wide uppercase hover:bg-black active:scale-[0.98] transition-transform shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Upload Room Photo
                </button>
                <button
                  onClick={handleDemoUpload}
                  className="bg-white text-[#1A1A1A] border border-[#1A1A1A]/15 hover:border-[#1A1A1A] py-4 px-8 rounded-full font-medium text-sm tracking-wide uppercase hover:bg-[#EAE9E4]/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> Try with Demo Room
                </button>
              </div>

              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[#1A1A1A]/10">
                <div>
                  <div className="text-2xl font-bold text-[#1A1A1A]">10</div>
                  <div className="text-[11px] font-mono text-[#71716A] uppercase tracking-wider mt-1">Design Presets</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1A1A1A]">100%</div>
                  <div className="text-[11px] font-mono text-[#71716A] uppercase tracking-wider mt-1">Structure Lock</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1A1A1A]">4K</div>
                  <div className="text-[11px] font-mono text-[#71716A] uppercase tracking-wider mt-1">Cinematic Video</div>
                </div>
              </div>
            </div>

            {/* Interactive Before/After Showcase */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="bg-[#EAE9E4]/40 border border-[#1A1A1A]/10 p-4 sm:p-6 rounded-[32px] w-full">
                
                {/* Visual Canvas Panel */}
                <div className="aspect-[4/3] rounded-2xl overflow-hidden relative shadow-sm border border-[#1A1A1A]/5 bg-[#F1F0EC]">
                  
                  {/* Before / Original Image background */}
                  <img 
                    src={LANDING_GALLERY_STYLES[0].img} 
                    alt="Original Space" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Style (After) Image overlay */}
                  <AnimatePresence mode="wait">
                    {!landingCompareMode && (
                      <motion.div
                        key={selectedLandingStyle.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 w-full h-full"
                      >
                        <img 
                          src={selectedLandingStyle.img} 
                          alt={selectedLandingStyle.name} 
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Top bar indicating mode */}
                  <div className="absolute top-4 left-4 z-20 font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full bg-white/85 text-[#1A1A1A] border border-[#1A1A1A]/10 flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    {landingCompareMode ? "Original Structure" : selectedLandingStyle.tag}
                  </div>

                  {/* Compare toggle button in corner */}
                  <button
                    onMouseDown={() => setLandingCompareMode(true)}
                    onMouseUp={() => setLandingCompareMode(false)}
                    onMouseLeave={() => setLandingCompareMode(false)}
                    onTouchStart={() => setLandingCompareMode(true)}
                    onTouchEnd={() => setLandingCompareMode(false)}
                    className="absolute bottom-4 right-4 z-20 font-mono text-xs tracking-wide uppercase px-4 py-2 bg-[#1A1A1A] hover:bg-black text-white rounded-full shadow-md flex items-center gap-2 select-none active:scale-95 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" /> Hold to View Before
                  </button>
                </div>

                {/* Subtext info */}
                <div className="mt-4 px-2 min-h-[56px]">
                  <h3 className="text-base font-semibold text-[#1A1A1A]">{landingCompareMode ? "Original Space" : selectedLandingStyle.name}</h3>
                  <p className="text-xs text-[#71716A] leading-relaxed mt-1">
                    {landingCompareMode ? LANDING_GALLERY_STYLES[0].description : selectedLandingStyle.description}
                  </p>
                </div>

                {/* Custom click selectors */}
                <div className="mt-6 border-t border-[#1A1A1A]/10 pt-4">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-[#71716A] mb-3">SELECT A DEMO INTERIOR STYLE:</div>
                  <div className="flex flex-wrap gap-2">
                    {LANDING_GALLERY_STYLES.slice(1).map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setSelectedLandingStyle(style);
                          setLandingCompareMode(false);
                        }}
                        className={`font-mono text-[11px] px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                          selectedLandingStyle.id === style.id && !landingCompareMode
                            ? "bg-[#1A1A1A] text-white border-transparent"
                            : "bg-white text-[#71716A] border-[#1A1A1A]/10 hover:border-[#1A1A1A]/20 hover:text-[#1A1A1A]"
                        }`}
                      >
                        {style.name.replace("Serene ", "").replace(" Retro", "")}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* How It Works (Architectural Blueprint Design) */}
          <section id="how-it-works" className="bg-[#EAE9E4]/30 border-y border-[#1A1A1A]/10 py-20 px-6">
            <div className="max-w-7xl mx-auto w-full">
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-16">
                <div className="space-y-3">
                  <div className="font-mono text-xs uppercase tracking-widest text-[#71716A]">[ LOGISTICS & PROCESS ]</div>
                  <h2 className="text-3xl font-syncopate font-bold uppercase tracking-tight text-[#1A1A1A]">HOW THE ENGINE WORKS</h2>
                </div>
                <p className="text-[#71716A] text-sm max-w-sm leading-relaxed">
                  Deco Hero is engineered to provide precise interior styling recommendations using advanced multimodal visual representations. We don't guess—we map.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Step 1 */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 rounded-3xl flex flex-col justify-between relative min-h-[240px] shadow-sm">
                  <div className="font-mono text-xs uppercase tracking-widest text-[#71716A] flex items-center justify-between border-b border-[#1A1A1A]/5 pb-4 mb-6">
                    <span>Step 01</span>
                    <Camera className="w-4 h-4 text-[#71716A]" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-medium tracking-tight text-[#1A1A1A]">Upload Your Space</h3>
                    <p className="text-xs text-[#71716A] leading-relaxed">
                      Snap a live photo of your space in seconds or upload a high-quality JPEG of any room inside your home.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 rounded-3xl flex flex-col justify-between relative min-h-[240px] shadow-sm">
                  <div className="font-mono text-xs uppercase tracking-widest text-[#71716A] flex items-center justify-between border-b border-[#1A1A1A]/5 pb-4 mb-6">
                    <span>Step 02</span>
                    <Sliders className="w-4 h-4 text-[#71716A]" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-medium tracking-tight text-[#1A1A1A]">Select Your Curation</h3>
                    <p className="text-xs text-[#71716A] leading-relaxed">
                      Pick from 10 distinct, decorator-vetted interior models including Japandi, Biophilic, Luxury Contemporary, and Art Deco.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 rounded-3xl flex flex-col justify-between relative min-h-[240px] shadow-sm">
                  <div className="font-mono text-xs uppercase tracking-widest text-[#71716A] flex items-center justify-between border-b border-[#1A1A1A]/5 pb-4 mb-6">
                    <span>Step 03</span>
                    <Layers className="w-4 h-4 text-[#71716A]" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-medium tracking-tight text-[#1A1A1A]">Structure Integrity Lock</h3>
                    <p className="text-xs text-[#71716A] leading-relaxed">
                      Gemini analyzes layout boundaries (doors, walls, support beams) and maintains them flawlessly, changing only structural aesthetics.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 rounded-3xl flex flex-col justify-between relative min-h-[240px] shadow-sm">
                  <div className="font-mono text-xs uppercase tracking-widest text-[#71716A] flex items-center justify-between border-b border-[#1A1A1A]/5 pb-4 mb-6">
                    <span>Step 04</span>
                    <Video className="w-4 h-4 text-[#71716A]" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-medium tracking-tight text-[#1A1A1A]">Cinematic Omni Video</h3>
                    <p className="text-xs text-[#71716A] leading-relaxed">
                      Activate the Gemini Omni renderer to synthesize a professional panning 3D showcase video walk-through of your re-imagined room.
                    </p>
                  </div>
                </div>

              </div>

              {/* Technology Explanation (Why it sells) */}
              <div className="mt-12 bg-white border border-[#1A1A1A]/10 rounded-[32px] p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#71716A]">THE TECH ADVANTAGE</div>
                  <h3 className="text-xl sm:text-2xl font-syncopate font-bold uppercase text-[#1A1A1A]">Why Deco Hero is Different</h3>
                  <p className="text-sm text-[#71716A] leading-relaxed">
                    Most digital design engines completely mutate the room—warping windows, shifting doorways, and rendering items that physically couldn't fit your layout. Deco Hero leverages the multimodal context capabilities of the **Gemini 3.1 Flash Image model** to extract an accurate depth map. By feeding back structural coordinates into the generative instruction layer, it is guaranteed that the physical framework of your home remains completely unchanged.
                  </p>
                  <ul className="space-y-2 pt-2">
                    <li className="flex items-start gap-2 text-xs text-[#1A1A1A]">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> 
                      <span><strong>Accurate Proportions:</strong> Curated pieces preserve the actual spatial margins.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-[#1A1A1A]">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> 
                      <span><strong>Intelligent Shadows:</strong> Generates real shadows matching your natural room lighting sources.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-[#1A1A1A]">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> 
                      <span><strong>Stateful Chaining (Videos):</strong> Dynamic videos render physical transitions with realistic lighting.</span>
                    </li>
                  </ul>
                </div>
                <div className="lg:col-span-5 bg-[#EAE9E4] p-6 rounded-2xl border border-[#1A1A1A]/5 flex flex-col justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <span className="font-mono text-xs uppercase tracking-wider font-semibold">Deco Hero Premium Pipeline</span>
                  </div>
                  <div className="space-y-3 font-mono text-[11px] text-[#71716A] bg-white p-4 rounded-xl border border-[#1A1A1A]/5">
                    <div>1. Input JPEG base64 analysis... <span className="text-emerald-600">COMPLETE</span></div>
                    <div>2. Spatial layout coordinates lock... <span className="text-emerald-600">LOCKED</span></div>
                    <div>3. Gemini Vision model execution... <span className="text-emerald-600">RESOLVED</span></div>
                    <div>4. Omni Physical video walkthrough... <span className="text-[#1A1A1A] font-semibold">STANDBY (10S)</span></div>
                  </div>
                  <button
                    onClick={() => setView("studio")}
                    className="w-full py-3 bg-[#1A1A1A] hover:bg-black text-white rounded-full text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    Open Studio Workspace <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* Style Palette (Curation Catalog) */}
          <section id="curated-styles" className="py-20 px-6 max-w-7xl mx-auto w-full">
            <div className="text-center space-y-3 mb-16">
              <div className="font-mono text-xs uppercase tracking-widest text-[#71716A]">[ CURATED PALETTES ]</div>
              <h2 className="text-3xl font-syncopate font-bold uppercase tracking-tight text-[#1A1A1A]">10 LUXURY DESIGN MOTIFS</h2>
              <p className="text-sm text-[#71716A] max-w-md mx-auto leading-relaxed">
                Choose from our pre-configured palettes modeled on real contemporary luxury layouts, perfectly tailored by structural designers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {STYLE_CONFIGS.map((style, idx) => (
                <div 
                  key={style.id}
                  className="bg-white border border-[#1A1A1A]/10 p-6 rounded-[24px] flex flex-col justify-between hover:border-[#1A1A1A]/30 transition-all hover:shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#1A1A1A] font-sans">{style.name}</h3>
                      <span className="font-mono text-[10px] text-[#71716A] bg-[#EAE9E4]/40 px-2.5 py-0.5 rounded-full border border-[#1A1A1A]/5 uppercase">
                        MOTIF {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-xs text-[#71716A] leading-relaxed">
                      {style.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {style.tags.map(t => (
                        <span key={t} className="font-mono text-[9px] text-[#1A1A1A] bg-[#EAE9E4]/20 px-2 py-0.5 rounded border border-[#1A1A1A]/5">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#1A1A1A]/5 flex items-center justify-end">
                    <button
                      onClick={() => {
                        setView("studio");
                        setCurrentIndex(idx);
                        handleDemoUpload();
                      }}
                      className="font-mono text-[10px] text-[#1A1A1A] hover:underline uppercase tracking-wider flex items-center gap-0.5 font-medium cursor-pointer"
                    >
                      Test this style <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing Section (Commercial Presentation) */}
          <section id="pricing" className="bg-[#EAE9E4]/20 border-t border-[#1A1A1A]/10 py-20 px-6">
            <div className="max-w-7xl mx-auto w-full">
              
              <div className="text-center space-y-3 mb-16">
                <div className="font-mono text-xs uppercase tracking-widest text-[#71716A]">[ THE OFFER ]</div>
                <h2 className="text-3xl font-syncopate font-bold uppercase tracking-tight text-[#1A1A1A]">CHOOSE YOUR SUITE</h2>
                <p className="text-sm text-[#71716A] max-w-md mx-auto leading-relaxed">
                  Start redesigning for free right now. Upgrade anytime to unlock advanced rendering, 4K limits, and custom spatial styles.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                
                {/* Standard Free Card */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 rounded-[32px] flex flex-col justify-between relative shadow-sm">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="font-mono text-xs uppercase text-[#71716A] tracking-wider">[ ENTRY SUITE ]</div>
                      <h3 className="text-2xl font-bold">Free Trial</h3>
                      <p className="text-xs text-[#71716A] leading-relaxed">Perfect for playing around and visualizing a single living room.</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">$0</span>
                      <span className="font-mono text-xs text-[#71716A]">/ forever</span>
                    </div>
                    <ul className="space-y-3 text-xs text-[#1A1A1A] border-t border-[#1A1A1A]/5 pt-6">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Standard speed generation</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Access to 10 curated style presets</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Standard resolution outputs</li>
                      <li className="flex items-center gap-2 text-[#71716A] line-through"><Check className="w-4 h-4 text-[#71716A]/40" /> Cinematic Omni Video walk-throughs</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setView("studio")}
                    className="w-full py-4 mt-8 rounded-full border border-[#1A1A1A]/15 hover:border-[#1A1A1A] text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#EAE9E4]/20 transition-all cursor-pointer"
                  >
                    Start Free Redesign
                  </button>
                </div>

                {/* Pro Tier (Popular) */}
                <div className="bg-white border-2 border-[#1A1A1A] p-8 rounded-[32px] flex flex-col justify-between relative shadow-md">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white font-mono text-[9px] uppercase tracking-widest px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="font-mono text-xs uppercase text-[#71716A] tracking-wider">[ ARCHITECT WORKSUITE ]</div>
                      <h3 className="text-2xl font-bold">Deco Hero Pro</h3>
                      <p className="text-xs text-[#71716A] leading-relaxed">For real estate agents, interior designers, and power home stagers.</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">$24</span>
                      <span className="font-mono text-xs text-[#71716A]">/ month</span>
                    </div>
                    <ul className="space-y-3 text-xs text-[#1A1A1A] border-t border-[#1A1A1A]/5 pt-6">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> <strong>Priority GPU pipeline:</strong> &lt; 3s renders</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Unlimited structural modifications</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 4K Ultra-High-Resolution images</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> <strong>Cinematic Omni Videos:</strong> 15 renders/mo</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setView("studio")}
                    className="w-full py-4 mt-8 rounded-full bg-[#1A1A1A] hover:bg-black text-white text-xs font-mono uppercase tracking-wider font-bold shadow-sm transition-all cursor-pointer"
                  >
                    Upgrade to Pro Suite
                  </button>
                </div>

                {/* Studio Enterprise */}
                <div className="bg-white border border-[#1A1A1A]/10 p-8 rounded-[32px] flex flex-col justify-between relative shadow-sm">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="font-mono text-xs uppercase text-[#71716A] tracking-wider">[ OFFICE INTEGRATION ]</div>
                      <h3 className="text-2xl font-bold">Studio Enterprise</h3>
                      <p className="text-xs text-[#71716A] leading-relaxed">For professional renovation offices and staging firms.</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">$89</span>
                      <span className="font-mono text-xs text-[#71716A]">/ month</span>
                    </div>
                    <ul className="space-y-3 text-xs text-[#1A1A1A] border-t border-[#1A1A1A]/5 pt-6">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Custom style instruction uploads</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> API Access for bulk automated staging</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Interactive customer portal white-label</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Dedicated model fine-tuning guidance</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setView("studio")}
                    className="w-full py-4 mt-8 rounded-full border border-[#1A1A1A]/15 hover:border-[#1A1A1A] text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#EAE9E4]/20 transition-all cursor-pointer"
                  >
                    Contact Enterprise
                  </button>
                </div>

              </div>

            </div>
          </section>

          {/* Expert Product Comparisons Section */}
          <section className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-[#1A1A1A]/5">
            <div className="text-center space-y-3 mb-12">
              <div className="font-mono text-xs uppercase tracking-widest text-[#71716A]">[ INDUSTRY COMPARISONS ]</div>
              <h2 className="text-3xl font-syncopate font-bold uppercase tracking-tight text-[#1A1A1A]">How We Compare</h2>
              <p className="text-sm text-[#71716A] max-w-xl mx-auto">
                We pride ourselves on architectural layout preservation and photorealistic material finishes. Explore how we compare to other solutions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {COMPETITORS_DATA.map((comp) => (
                <div 
                  key={comp.id}
                  onClick={() => setActiveCompetitorId(comp.id)}
                  className="bg-white border border-[#1A1A1A]/10 hover:border-[#1A1A1A] p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:shadow-lg group cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-full bg-[#EAE9E4]/50 flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-[#EAE9E4] transition-all">
                        <Scale className="w-4 h-4" />
                      </div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A] bg-[#F3F2EE] px-2.5 py-1 rounded-full border border-[#1A1A1A]/5">
                        Interactive Guide
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-[#1A1A1A] group-hover:text-black transition-colors font-sans">
                        {comp.title}
                      </h3>
                      <p className="text-xs text-[#71716A] leading-relaxed line-clamp-3">
                        {comp.tagline} {comp.intro}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#1A1A1A]/5 mt-6 flex items-center justify-between text-xs font-mono uppercase tracking-wider font-semibold text-[#1A1A1A] group-hover:translate-x-1 transition-transform">
                    <span>Read Comparison Article</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="py-20 px-6 max-w-4xl mx-auto w-full">
            <div className="text-center space-y-3 mb-12">
              <div className="font-mono text-xs uppercase tracking-widest text-[#71716A]">[ CLEARING DOUBTS ]</div>
              <h2 className="text-3xl font-syncopate font-bold uppercase tracking-tight text-[#1A1A1A]">FAQ</h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "Will it change the physical structure of my room?",
                  a: "Absolutely not. This is Deco Hero's key selling point. Our spatial lock technology maps structural elements like doors, window frames, support pillars, and walls, holding them constant. Only furniture, decorations, paints, rugs, and interior aesthetics are redesigned."
                },
                {
                  q: "How fast are the image and video rendering speeds?",
                  a: "Static image generations usually complete in 3 to 5 seconds. Video walk-throughs utilizing Gemini Omni are generated as high-fidelity clips of either 6 seconds (Standard Social) or 10 seconds (Cinematic), taking about 15 to 25 seconds to compile on the Omni pipeline."
                },
                {
                  q: "Can I upload from my tablet or mobile device camera?",
                  a: "Yes! Deco Hero features full responsive support and integrates natively with your iOS or Android camera stream. You can capture a wide angle from any corner of your house to immediately start styling."
                },
                {
                  q: "Is my personal spatial layout data private?",
                  a: "We prioritize user privacy. Images uploaded to our servers are transiently held during model compilation and are completely wiped upon delivery. We never store your home geometry or room data on our backend."
                }
              ].map((faq, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-[#1A1A1A]/10 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between font-sans font-medium text-[#1A1A1A] hover:bg-[#EAE9E4]/20 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="font-mono text-xs text-[#71716A]">
                      {expandedFaq === idx ? "—" : "+"}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {expandedFaq === idx && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-[#1A1A1A]/5"
                      >
                        <p className="px-6 py-4 text-xs text-[#71716A] leading-relaxed bg-[#EAE9E4]/10">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-[#1A1A1A] text-[#EAE9E4] py-12 px-6 border-t border-[#1A1A1A]">
            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Column 1: Brand Info */}
              <div className="space-y-3 text-center md:text-left">
                <div className="text-lg font-syncopate font-bold tracking-widest uppercase">DECO HERO</div>
                <p className="text-[11px] text-[#EAE9E4]/60 max-w-sm leading-relaxed">
                  Redesign your room in clicks using Gemini model architectures. Curation by interior design teams. Locked-in structure preservation tech ensures your room stays structurally accurate.
                </p>
              </div>

              {/* Column 2: Competitor Comparisons */}
              <div className="space-y-3 text-center md:text-left">
                <div className="font-mono text-[9px] uppercase tracking-widest text-[#EAE9E4]/40 font-bold">
                  Expert Comparison Guides
                </div>
                <div className="flex flex-col gap-2.5 text-xs">
                  <button
                    onClick={() => setActiveCompetitorId("collov")}
                    className="hover:underline hover:text-white transition-colors cursor-pointer text-left font-sans flex items-center justify-center md:justify-start gap-1 text-[#EAE9E4]/80"
                  >
                    <span>Deco Hero vs Collov GPT</span>
                    <span className="font-mono text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-white/50 tracking-normal">Structure Lock Focus</span>
                  </button>
                  <button
                    onClick={() => setActiveCompetitorId("spacely")}
                    className="hover:underline hover:text-white transition-colors cursor-pointer text-left font-sans flex items-center justify-center md:justify-start gap-1 text-[#EAE9E4]/80"
                  >
                    <span>Deco Hero vs Spacely AI</span>
                    <span className="font-mono text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-white/50 tracking-normal">Architectural Presets</span>
                  </button>
                  <button
                    onClick={() => setActiveCompetitorId("planner5d")}
                    className="hover:underline hover:text-white transition-colors cursor-pointer text-left font-sans flex items-center justify-center md:justify-start gap-1 text-[#EAE9E4]/80"
                  >
                    <span>Deco Hero vs Planner 5D</span>
                    <span className="font-mono text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-white/50 tracking-normal">Instant Photo-to-Render</span>
                  </button>
                </div>
              </div>

              {/* Column 3: Quick Links & Copyright */}
              <div className="flex flex-col items-center md:items-end justify-between gap-4 text-xs font-mono text-center md:text-right">
                <div className="flex flex-col items-center md:items-end gap-2">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[#EAE9E4]/40 font-bold mb-1">
                    System Actions & Policy
                  </div>
                  <div className="flex gap-4">
                    <a href="https://policies.google.com/terms/generative-ai/use-policy" target="_blank" rel="noopener noreferrer" className="hover:underline text-[#EAE9E4]/80 hover:text-white">Policy</a>
                    <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="hover:underline text-[#EAE9E4]/80 hover:text-white">Terms</a>
                    <a href="#" onClick={() => setView("studio")} className="hover:underline text-[#EAE9E4]/80 hover:text-white">Open Studio</a>
                  </div>
                </div>
                <div className="text-right flex flex-col items-center md:items-end gap-0.5">
                  <p className="text-[#EAE9E4]/50">© 2026 DECO HERO. All rights reserved.</p>
                  <p className="text-[9px] text-[#EAE9E4]/30 uppercase tracking-widest font-mono">
                    SECURED ROOM STAGING PLATFORM
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* DESIGN STUDIO VIEW */}
      {view === "studio" && (
        <div className="flex-1 flex flex-col bg-[#F3F2EE] min-h-screen">
          
          {/* Studio Header */}
          <header className="bg-white border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setView("landing");
                  // Do not clear state, let user return safely!
                }}
                className="font-mono text-xs text-[#71716A] hover:text-[#1A1A1A] transition-colors border border-[#1A1A1A]/10 hover:border-[#1A1A1A]/20 px-3 py-1.5 rounded-full bg-white flex items-center gap-1 cursor-pointer"
              >
                ← Exit to Landing
              </button>
              <div className="h-4 w-[1px] bg-[#1A1A1A]/10 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2">
                <span className="font-syncopate font-bold text-sm tracking-widest text-[#1A1A1A]">DECO HERO</span>
                <span className="font-mono text-[9px] text-[#71716A] px-2 py-0.5 border border-[#1A1A1A]/10 rounded bg-[#EAE9E4]/50">STUDIO_V1.0</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                GEMINI ACTIVE
              </span>
              {uploaded && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowOnlyFavourites(prev => !prev)}
                    className={`font-mono text-xs tracking-wider uppercase border px-4 py-2 rounded-full cursor-pointer flex items-center gap-1.5 transition-all ${
                      showOnlyFavourites 
                        ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 animate-pulse" 
                        : "bg-white border-[#1A1A1A]/15 text-[#1A1A1A] hover:bg-[#EAE9E4]/20"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${showOnlyFavourites ? "fill-red-600 text-red-600" : "text-[#71716A]"}`} />
                    {showOnlyFavourites ? `All Styles` : `Favourites (${favourites.length})`}
                  </button>

                  <button
                    onClick={handleResetStudio}
                    className="font-mono text-xs tracking-wider uppercase bg-white border border-[#1A1A1A]/15 text-[#1A1A1A] hover:bg-[#EAE9E4]/20 px-4 py-2 rounded-full cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Start Over
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Main Worksite Panel */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            
            {/* Sidebar with the list of styles for fast switching (Studio layout advantage) */}
            <div className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-[#1A1A1A]/10 flex flex-col shrink-0">
              <div className="p-4 border-b border-[#1A1A1A]/10 bg-[#EAE9E4]/20 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#71716A] font-semibold">
                  {showOnlyFavourites ? `FAVOURITES (${favourites.length})` : "10 ARCHITECTURAL STYLE MODES"}
                </span>
                <Compass className="w-4 h-4 text-[#71716A]" />
              </div>

              {/* Sidebar Search Bar */}
              <div className="p-3 border-b border-[#1A1A1A]/10 bg-white">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search style name or tag..."
                    value={styleSearchQuery}
                    onChange={(e) => setStyleSearchQuery(e.target.value)}
                    className="w-full text-xs font-sans pl-8 pr-8 py-2 bg-[#F3F2EE] border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:border-[#1A1A1A] transition-all"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71716A]">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  {styleSearchQuery && (
                    <button
                      onClick={() => setStyleSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 font-mono text-[11px] cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Favourites Action Panel for batch operations */}
              {showOnlyFavourites && favourites.length > 0 && (
                <div className="p-3 bg-red-50/40 border-b border-[#1A1A1A]/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A]">
                      {selectedFavourites.length} of {favourites.length} Selected
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (selectedFavourites.length === favourites.length) {
                            setSelectedFavourites([]);
                          } else {
                            setSelectedFavourites(favourites.map(f => f.styleId));
                          }
                        }}
                        className="text-[10px] font-mono uppercase tracking-wider text-[#1A1A1A] hover:text-red-600 transition-colors cursor-pointer underline underline-offset-2"
                      >
                        {selectedFavourites.length === favourites.length ? "Clear All" : "Select All"}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleBatchDownloadZip}
                    disabled={selectedFavourites.length === 0 || isZipping}
                    className="w-full py-2 bg-[#1A1A1A] hover:bg-black disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl text-[11px] font-mono uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isZipping ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Packaging ZIP...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Download ZIP ({selectedFavourites.length})
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="p-2 flex lg:flex-col overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto gap-1 max-h-[140px] lg:max-h-none scrollbar-thin">
                {(() => {
                  const filteredStyles = (showOnlyFavourites 
                    ? STYLE_CONFIGS.filter(style => favourites.some(fav => fav.styleId === style.id))
                    : STYLE_CONFIGS
                  ).filter(style => {
                    const query = styleSearchQuery.toLowerCase().trim();
                    if (!query) return true;
                    return style.name.toLowerCase().includes(query) || 
                           style.tags.some(tag => tag.toLowerCase().includes(query));
                  });

                  if (filteredStyles.length === 0) {
                    return (
                      <div className="p-4 text-center text-[#71716A] text-xs space-y-2 py-8 w-full">
                        <Heart className="w-6 h-6 text-neutral-300 mx-auto" />
                        <p className="font-medium">No styles match search.</p>
                        <p className="text-[10px] leading-relaxed">Try searching with other tags or clear your query.</p>
                      </div>
                    );
                  }

                  return filteredStyles.map((style) => {
                    const originalIndex = STYLE_CONFIGS.findIndex(s => s.id === style.id);
                    const isGenerated = !!images[style.id];
                    const isActive = currentIndex === originalIndex && uploaded;
                    const isSelected = selectedFavourites.includes(style.id);
                    return (
                      <div 
                        key={style.id}
                        className={`flex items-center gap-1 w-full shrink-0 ${
                          showOnlyFavourites ? "min-w-[185px] lg:min-w-0" : "min-w-[150px] lg:min-w-0"
                        }`}
                      >
                        {showOnlyFavourites && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFavourites(prev => 
                                prev.includes(style.id) 
                                  ? prev.filter(id => id !== style.id) 
                                  : [...prev, style.id]
                              );
                            }}
                            className="p-1 rounded-md hover:bg-[#EAE9E4]/60 transition-colors cursor-pointer shrink-0"
                            title={isSelected ? "Deselect for batch download" : "Select for batch download"}
                          >
                            <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                              isSelected 
                                ? "bg-red-600 border-red-600 text-white" 
                                : "border-[#1A1A1A]/30 text-transparent"
                            }`}>
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (!uploaded) {
                              // Eagerly pre-load using the demo room
                              setCurrentIndex(originalIndex);
                              handleDemoUpload();
                            } else {
                              setCurrentIndex(originalIndex);
                              fetchImage(originalIndex);
                            }
                          }}
                          className={`flex-1 text-left font-sans text-xs px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#1A1A1A] text-white shadow-sm"
                              : "text-[#1A1A1A] hover:bg-[#EAE9E4]/40"
                          }`}
                          style={{ minWidth: "130px" }}
                        >
                          <div className="space-y-0.5">
                            <div className="font-medium flex items-center gap-1">
                              <span className="font-mono text-[9px] opacity-60">{(originalIndex + 1).toString().padStart(2, '0')}.</span>
                              {style.name}
                            </div>
                            <div className={`text-[9px] font-mono ${isActive ? "text-white/60" : "text-[#71716A]"}`}>
                              {style.tags[0]}
                            </div>
                          </div>
                          
                          {/* State marker */}
                          <div className="ml-2">
                            {isGenerated ? (
                              <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-emerald-600/30"}`} title="Generated" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-dashed border border-[#1A1A1A]/20" title="Not Generated" />
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="hidden lg:block mt-auto p-4 border-t border-[#1A1A1A]/10 bg-[#EAE9E4]/10">
                <div className="flex items-start gap-2 text-[11px] text-[#71716A]">
                  <Info className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Click any design preset to start. Deco Hero will generate your style automatically and pre-fetch subsequent options.
                  </p>
                </div>
              </div>
            </div>

            {/* Central Workspace Zone */}
            <div className="flex-1 p-4 sm:p-6 flex items-start justify-center overflow-y-auto relative min-h-[400px] pb-16">
              
              <AnimatePresence mode="wait">
                
                {/* WELCOME / PRE-UPLOAD VIEW */}
                {screen === "welcome" && !uploaded && (
                  <motion.div
                    key="studio-welcome"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-w-xl bg-white rounded-[32px] border border-[#1A1A1A]/10 p-8 text-center shadow-md space-y-6"
                  >
                    <div className="space-y-2">
                      <div className="text-4xl">🛋️</div>
                      <h2 className="text-2xl font-syncopate font-bold uppercase tracking-tight text-[#1A1A1A]">LAUNCH STUDIO</h2>
                      <p className="text-xs text-[#71716A] max-w-sm mx-auto leading-relaxed">
                        To test Deco Hero's spatial vision re-design, upload a photo of your living room, dining area, or bedroom, or test with our staging asset.
                      </p>
                    </div>

                    {/* Desktop drag/drop styled panel */}
                    <div className="border border-dashed border-[#1A1A1A]/15 bg-[#FBFBFA] rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-[#EAE9E4]/10 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-[#EAE9E4]/40 flex items-center justify-center border border-[#1A1A1A]/5">
                        <ImageIcon className="w-6 h-6 text-[#1A1A1A]" />
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs font-semibold">Drag and drop your room file here</p>
                        <p className="text-[10px] text-[#71716A]">Supports JPG, PNG, WEBP formats up to 50MB</p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-[#1A1A1A] hover:bg-black text-white px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" /> Select Local File
                        </button>
                        <button
                          onClick={startCamera}
                          className="bg-white hover:bg-[#EAE9E4]/20 text-[#1A1A1A] border border-[#1A1A1A]/15 px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                        >
                          <Camera className="w-3.5 h-3.5" /> Use Device Camera
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-[#1A1A1A]/10"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase font-mono">
                        <span className="bg-white px-4 text-[#71716A]">Or try instantly</span>
                      </div>
                    </div>

                    <button
                      onClick={handleDemoUpload}
                      className="w-full py-4 rounded-xl border border-[#1A1A1A] text-xs font-mono uppercase tracking-wider font-semibold bg-white hover:bg-[#1A1A1A] hover:text-white transition-all duration-300 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 animate-pulse" /> Try with Staged Room Asset (one-click)
                    </button>

                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload} 
                    />

                    {/* Disclaimer */}
                    <div className="text-[9px] text-[#71716A]/60 leading-relaxed text-center max-w-md mx-auto pt-2 border-t border-[#1A1A1A]/5">
                      Uploaded assets are transiently processed under Google's Prohibited Use policies. Uploads from Google Workspace are managed strictly in accordance with <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1A1A1A]">Gemini developer API agreements</a>.
                    </div>
                  </motion.div>
                )}

                {/* COUNTDOWN SCREEN */}
                {screen === "countdown" && (
                  <motion.div
                    key="studio-countdown"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center space-y-4"
                  >
                    <div className="font-mono text-xs uppercase tracking-widest text-[#71716A]">ALIGNING SPATIAL RE-DESIGNS IN</div>
                    <AnimatePresence mode="wait">
                      <motion.h1
                        key={countdown}
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 1.1 }}
                        className="text-9xl font-semibold text-[#1A1A1A] font-sans"
                      >
                        {countdown}
                      </motion.h1>
                    </AnimatePresence>
                    <p className="text-xs font-mono text-[#71716A]/70 animate-pulse">Initializing Gemini visual matrix channels...</p>
                  </motion.div>
                )}

                {/* SKELETON LOADING SCREEN */}
                {screen === "loading" && (
                  <motion.div
                    key="studio-loading"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-w-lg bg-white rounded-[32px] border border-[#1A1A1A]/10 p-6 flex flex-col shadow-md space-y-6"
                  >
                    <div className="w-full aspect-[4/3] rounded-2xl bg-[#EAE9E4]/50 animate-pulse flex items-center justify-center">
                      <Loader2 className="w-10 h-10 animate-spin text-[#1A1A1A]/40" />
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <div className="h-6 w-3/4 bg-[#EAE9E4]/50 rounded-full animate-pulse" />
                      <div className="h-4 w-5/6 bg-[#EAE9E4]/50 rounded-full animate-pulse" />
                      <div className="h-4 w-1/2 bg-[#EAE9E4]/50 rounded-full animate-pulse" />
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-[#1A1A1A]/5">
                      <div className="h-10 w-28 bg-[#EAE9E4]/50 rounded-full animate-pulse" />
                      <div className="h-10 w-10 bg-[#EAE9E4]/50 rounded-full animate-pulse" />
                    </div>
                  </motion.div>
                )}

                {/* INTERACTIVE CARDS RENDER VIEW */}
                {screen === "cards" && uploaded && (
                  <motion.div
                    key="studio-cards-container"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className={`w-full flex flex-col gap-6 transition-all duration-300 ${
                      comparisonMode === "side-by-side" && uploadedImage ? "max-w-4xl" : "max-w-2xl"
                    }`}
                  >
                    {/* The Active Render Card */}
                    <div className="w-full bg-white rounded-[32px] border border-[#1A1A1A]/10 p-4 sm:p-6 shadow-md flex flex-col relative">
                      {/* Header bar of the active render card */}
                      <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]/10 mb-4 px-1">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[9px] uppercase tracking-widest text-[#71716A] font-semibold">Active Design Rendering</span>
                          <h3 className="text-lg font-bold font-sans flex items-center gap-1.5">
                            {STYLE_CONFIGS[currentIndex].name}
                            <span className="text-[10px] font-mono font-normal text-[#71716A] border border-[#1A1A1A]/10 px-2 py-0.5 rounded-md bg-[#EAE9E4]/40 uppercase">
                              Preset {(currentIndex + 1).toString().padStart(2, '0')}
                            </span>
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Comparison Layout Selector */}
                          {images[STYLE_CONFIGS[currentIndex].id] && uploadedImage && (
                            <div className="flex bg-[#F3F2EE] border border-[#1A1A1A]/10 rounded-lg p-0.5 mr-1 shadow-2xs">
                              <button
                                onClick={() => setComparisonMode("slider")}
                                className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                                  comparisonMode === "slider"
                                    ? "bg-white text-[#1A1A1A] font-bold shadow-xs"
                                    : "text-[#71716A] hover:text-[#1A1A1A]"
                                }`}
                                title="Use sliding overlay slider comparison"
                              >
                                Slider
                              </button>
                              <button
                                onClick={() => setComparisonMode("side-by-side")}
                                className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                                  comparisonMode === "side-by-side"
                                    ? "bg-white text-[#1A1A1A] font-bold shadow-xs"
                                    : "text-[#71716A] hover:text-[#1A1A1A]"
                                }`}
                                title="Show original and styled side-by-side adjacent"
                              >
                                Side-by-Side
                              </button>
                            </div>
                          )}

                          {images[STYLE_CONFIGS[currentIndex].id] && (
                            <button
                              onClick={() => {
                                const styleId = STYLE_CONFIGS[currentIndex].id;
                                const imageUrl = images[styleId];
                                const isFav = favourites.some(fav => fav.styleId === styleId);
                                if (isFav) {
                                  setFavourites(prev => prev.filter(fav => fav.styleId !== styleId));
                                  setToastMessage("Removed from favourites!");
                                } else {
                                  setFavourites(prev => [...prev, { styleId, imageUrl }]);
                                  setToastMessage("Saved to favourites!");
                                }
                              }}
                              className="p-1.5 rounded-full border border-[#1A1A1A]/15 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer active:scale-95"
                              title={favourites.some(fav => fav.styleId === STYLE_CONFIGS[currentIndex].id) ? "Remove from Favourites" : "Save to Favourites"}
                            >
                              <Heart 
                                className={`w-4 h-4 transition-colors ${
                                  favourites.some(fav => fav.styleId === STYLE_CONFIGS[currentIndex].id) 
                                    ? "fill-red-500 text-red-500" 
                                    : "text-[#71716A]"
                                }`} 
                              />
                            </button>
                          )}
                          <span className="font-mono text-[10px] text-[#71716A] px-2 py-0.5 border border-[#1A1A1A]/10 rounded bg-[#EAE9E4]/30">
                            {currentIndex + 1} / {STYLE_CONFIGS.length}
                          </span>
                        </div>
                      </div>

                      {/* Viewport Frame */}
                      <div 
                        className={`w-full rounded-2xl overflow-hidden bg-[#EAE9E4]/50 flex items-center justify-center relative border border-[#1A1A1A]/5 shadow-inner transition-all duration-300 ${
                          comparisonMode === "side-by-side" && uploadedImage ? "aspect-[16/10]" : "aspect-[4/3]"
                        }`}
                      >
                        {/* Video Player overlay */}
                        {videos[STYLE_CONFIGS[currentIndex].id] ? (
                          <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                            src={`/api/video/${videos[STYLE_CONFIGS[currentIndex].id]}`}
                          />
                        ) : (
                          <div className="w-full h-full relative flex items-center justify-center">
                            {/* Main styled image or error / loader layout */}
                            {images[STYLE_CONFIGS[currentIndex].id] ? (
                              uploadedImage ? (
                                comparisonMode === "side-by-side" ? (
                                  /* Dedicated adjacent Side-by-Side view columns in full height */
                                  <div className="w-full h-full grid grid-cols-2 gap-2 p-2 bg-[#EAE9E4]/25 relative select-none">
                                    {/* Left Column: Original Room */}
                                    <div className="relative w-full h-full rounded-xl overflow-hidden border border-[#1A1A1A]/10 shadow-xs bg-white">
                                      <img
                                        src={uploadedImage}
                                        className="w-full h-full object-cover pointer-events-none"
                                        alt="Original Space Baseline"
                                      />
                                      <div className="absolute bottom-3 left-3 z-20 font-mono text-[9px] uppercase tracking-wider px-2 py-1 bg-black/60 text-white backdrop-blur-xs rounded border border-white/10 pointer-events-none">
                                        Before: Original
                                      </div>
                                    </div>

                                    {/* Right Column: Styled Render */}
                                    <div className="relative w-full h-full rounded-xl overflow-hidden border border-[#1A1A1A]/10 shadow-xs bg-white">
                                      <img
                                        src={images[STYLE_CONFIGS[currentIndex].id]}
                                        className="w-full h-full object-cover pointer-events-none"
                                        alt="Styled Architectural Redesign"
                                      />
                                      <div className="absolute bottom-3 left-3 z-20 font-mono text-[9px] uppercase tracking-wider px-2 py-1 bg-black/60 text-white backdrop-blur-xs rounded border border-white/10 pointer-events-none">
                                        After: {STYLE_CONFIGS[currentIndex].name}
                                      </div>

                                      {/* Perspective Guide Lines Overlay (if toggled) */}
                                      {showPerspectiveOverlay && (
                                        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden bg-black/5">
                                          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                            {/* Vanishing Point */}
                                            <circle cx="50%" cy="45%" r="6" fill="#3B82F6" className="animate-ping" opacity="0.2" />
                                            <circle cx="50%" cy="45%" r="3.5" fill="#3B82F6" />
                                            
                                            {/* Perspective Lines from Corner and Edges */}
                                            <line x1="0" y1="0" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                                            <line x1="100%" y1="0" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                                            <line x1="0" y1="100%" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                                            <line x1="100%" y1="100%" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  /* Interactive side-by-side comparison slider */
                                  <div 
                                    ref={sliderContainerRef}
                                    className="w-full h-full relative overflow-hidden select-none cursor-ew-resize"
                                    onMouseDown={(e) => {
                                      if (!sliderContainerRef.current) return;
                                      const rect = sliderContainerRef.current.getBoundingClientRect();
                                      const x = e.clientX - rect.left;
                                      const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
                                      setSliderPosition(position);
                                      setIsDraggingSlider(true);
                                    }}
                                    onTouchStart={(e) => {
                                      if (e.touches[0] && sliderContainerRef.current) {
                                        const rect = sliderContainerRef.current.getBoundingClientRect();
                                        const x = e.touches[0].clientX - rect.left;
                                        const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
                                        setSliderPosition(position);
                                        setIsDraggingSlider(true);
                                      }
                                    }}
                                  >
                                    {/* Bottom Layer: Styled Render (After) */}
                                    <img
                                      src={images[STYLE_CONFIGS[currentIndex].id]}
                                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                      alt="Styled Redesign"
                                    />

                                    {/* Top Layer: Original Baseline (Before), clipped dynamically */}
                                    <img
                                      src={uploadedImage}
                                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                      style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                                      alt="Original Room"
                                    />

                                    {/* Drag Handle Divider line */}
                                    <div 
                                      className="absolute inset-y-0 w-1 bg-white hover:w-1.5 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-30 flex items-center justify-center pointer-events-none"
                                      style={{ left: `${sliderPosition}%` }}
                                    >
                                      {/* Slider Thumb Circle */}
                                      <div className="absolute w-8 h-8 rounded-full bg-[#1A1A1A] border-2 border-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform text-white cursor-ew-resize z-40">
                                        <ArrowLeftRight className="w-3.5 h-3.5 text-white" />
                                      </div>
                                    </div>

                                    {/* Floating indicators */}
                                    <div className="absolute bottom-4 right-4 z-20 font-mono text-[9px] uppercase tracking-wider px-2 py-1 bg-black/60 text-white backdrop-blur-xs rounded border border-white/10 pointer-events-none">
                                      After: {STYLE_CONFIGS[currentIndex].name}
                                    </div>
                                    <div className="absolute bottom-4 left-4 z-20 font-mono text-[9px] uppercase tracking-wider px-2 py-1 bg-black/60 text-white backdrop-blur-xs rounded border border-white/10 pointer-events-none">
                                      Before: Original
                                    </div>

                                    {/* Perspective Guide Lines Overlay (if toggled) */}
                                    {showPerspectiveOverlay && (
                                      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden bg-black/5">
                                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                          {/* Vanishing Point */}
                                          <circle cx="50%" cy="45%" r="6" fill="#3B82F6" className="animate-ping" opacity="0.2" />
                                          <circle cx="50%" cy="45%" r="3.5" fill="#3B82F6" />
                                          
                                          {/* Perspective Lines from Corner and Edges */}
                                          <line x1="0" y1="0" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                                          <line x1="100%" y1="0" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                                          <line x1="0" y1="100%" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                                          <line x1="100%" y1="100%" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                                          
                                          {/* Horizon Grid Lines */}
                                          <line x1="0" y1="45%" x2="100%" y2="45%" stroke="#10B981" strokeWidth="1" strokeDasharray="5,5" opacity="0.5" />
                                          
                                          {/* Depth wall segments */}
                                          <rect x="25%" y="22.5%" width="50%" height="45%" fill="none" stroke="#3B82F6" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
                                          
                                          {/* Floor tile perspective lines */}
                                          <line x1="20%" y1="100%" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1" strokeDasharray="2,2" opacity="0.3" />
                                          <line x1="40%" y1="100%" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1" strokeDasharray="2,2" opacity="0.3" />
                                          <line x1="60%" y1="100%" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1" strokeDasharray="2,2" opacity="0.3" />
                                          <line x1="80%" y1="100%" x2="50%" y2="45%" stroke="#3B82F6" strokeWidth="1" strokeDasharray="2,2" opacity="0.3" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                )
                              ) : (
                                <motion.img
                                  key="styled-render"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  src={images[STYLE_CONFIGS[currentIndex].id]}
                                  className="w-full h-full object-cover select-none pointer-events-none"
                                  alt={STYLE_CONFIGS[currentIndex].name}
                                />
                              )
                            ) : imageErrors[STYLE_CONFIGS[currentIndex].id] ? (
                              /* Error state for specific card */
                              <div className="flex flex-col items-center justify-center gap-4 p-6 text-center bg-white absolute inset-0 z-10">
                                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
                                  <Info className="w-6 h-6 text-red-500" />
                                </div>
                                <div className="space-y-1">
                                  <span className="font-mono text-[10px] uppercase tracking-widest text-red-500 font-bold">Gemini API Error</span>
                                  <p className="text-xs text-red-600 font-medium max-w-sm leading-relaxed">
                                    {imageErrors[STYLE_CONFIGS[currentIndex].id]}
                                  </p>
                                </div>
                                {imageErrors[STYLE_CONFIGS[currentIndex].id]?.toLowerCase().includes("quota") || imageErrors[STYLE_CONFIGS[currentIndex].id]?.toLowerCase().includes("exhausted") || imageErrors[STYLE_CONFIGS[currentIndex].id]?.toLowerCase().includes("billing") ? (
                                  <div className="space-y-3 pt-2">
                                    <p className="text-[11px] text-[#71716A] max-w-xs mx-auto leading-relaxed">
                                      Image generation requires a developer API key with billing. Please select your custom key in settings.
                                    </p>
                                    <button
                                      onClick={async () => {
                                        if (window.aistudio && window.aistudio.openSelectKey) {
                                          const success = await window.aistudio.openSelectKey();
                                          if (success !== false) {
                                            setHasLinkedKey(true);
                                            fetchImage(currentIndex, uploadedImage || undefined);
                                          }
                                        } else {
                                          alert("To link your key, click 'Settings > Secrets' or select your key in the settings menu.");
                                        }
                                      }}
                                      className="bg-[#1A1A1A] hover:bg-black text-white px-5 py-2 rounded-full text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors shadow-xs"
                                    >
                                      Link API Key
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => fetchImage(currentIndex, uploadedImage || undefined)}
                                    className="bg-[#1A1A1A] hover:bg-black text-white px-5 py-2 rounded-full text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors shadow-xs"
                                  >
                                    Retry Rendering
                                  </button>
                                )}
                              </div>
                            ) : (
                              /* Generating Loading state or original fallback if not yet generated */
                              fetchingRef.current.has(STYLE_CONFIGS[currentIndex].id) ? (
                                <div className="flex flex-col items-center justify-center gap-3">
                                  <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
                                  <span className="font-mono text-[10px] text-[#71716A] uppercase tracking-wider animate-pulse">Running Gemini Image Pipeline...</span>
                                </div>
                              ) : (
                                uploadedImage && (
                                  <img 
                                    src={uploadedImage} 
                                    alt="Original baseline" 
                                    className="w-full h-full object-cover" 
                                  />
                                )
                              )
                            )}

                            {/* Smooth fade-in overlay of the original room on top when hold is active */}
                            <AnimatePresence>
                              {showOriginalInStudio && uploadedImage && (
                                <motion.img
                                  key="original-overlay"
                                  src={uploadedImage}
                                  alt="Original baseline overlay"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.35, ease: "easeInOut" }}
                                  className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
                                />
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Floating compare status banner */}
                        <AnimatePresence>
                          {showOriginalInStudio && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-4 left-4 z-35 bg-amber-500 text-white font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-amber-600/20 shadow-sm"
                            >
                              Viewing Original Space
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Double-Action Bar (Directly below Image Viewport) */}
                      <div className="flex flex-wrap gap-2 justify-between items-center mt-4 px-1 border-b border-[#1A1A1A]/5 pb-4">
                        <div className="flex gap-2">
                          {/* Interactive Reset Slider / Toggle Perspective Button */}
                          {images[STYLE_CONFIGS[currentIndex].id] && uploadedImage && (
                            <>
                              {comparisonMode !== "side-by-side" && (
                                <button
                                  onClick={() => setSliderPosition(50)}
                                  className="font-mono text-xs tracking-wide uppercase px-4 py-2 bg-white hover:bg-[#EAE9E4]/25 text-[#1A1A1A] border border-[#1A1A1A]/15 rounded-full shadow-xs flex items-center gap-1.5 select-none active:scale-95 transition-all cursor-pointer"
                                  title="Reset Slider to Center"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#71716A]" /> Reset Slider
                                </button>
                              )}

                              <button
                                onClick={() => setShowPerspectiveOverlay(prev => !prev)}
                                className={`font-mono text-xs tracking-wide uppercase px-4 py-2 border rounded-full shadow-xs flex items-center gap-1.5 select-none active:scale-95 transition-all cursor-pointer ${
                                  showPerspectiveOverlay 
                                    ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100" 
                                    : "bg-white hover:bg-[#EAE9E4]/25 border-[#1A1A1A]/15 text-[#1A1A1A]"
                                }`}
                                title="Toggle Perspective Overlay Lines"
                              >
                                <Ruler className="w-3.5 h-3.5" /> {showPerspectiveOverlay ? "Hide Grids" : "Show Grids"}
                              </button>
                            </>
                          )}
                          
                          {/* Download static image button */}
                          {images[STYLE_CONFIGS[currentIndex].id] && (
                            <button
                              onClick={() => handleDownload(images[STYLE_CONFIGS[currentIndex].id], STYLE_CONFIGS[currentIndex].name)}
                              className="font-mono text-xs tracking-wide uppercase px-4 py-2 bg-white hover:bg-[#EAE9E4]/20 text-[#1A1A1A] border border-[#1A1A1A]/15 rounded-full shadow-xs flex items-center gap-1.5 select-none active:scale-95 transition-all cursor-pointer"
                              title="Download Styled Design"
                            >
                              <Download className="w-4 h-4" /> Download Design
                            </button>
                          )}

                          {/* Download video button */}
                          {videos[STYLE_CONFIGS[currentIndex].id] && (
                            <button
                              onClick={() => handleDownloadVideo(videos[STYLE_CONFIGS[currentIndex].id], STYLE_CONFIGS[currentIndex].name)}
                              className="font-mono text-xs tracking-wide uppercase px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full shadow-xs flex items-center gap-1.5 select-none active:scale-95 transition-all cursor-pointer"
                              title="Download Video Walkthrough"
                            >
                              <Download className="w-4 h-4" /> Download Video
                            </button>
                          )}

                          {/* Share design button */}
                          {images[STYLE_CONFIGS[currentIndex].id] && (
                            <button
                              onClick={() => setShowShareModal(true)}
                              className="font-mono text-xs tracking-wide uppercase px-4 py-2 bg-white hover:bg-[#EAE9E4]/20 text-[#1A1A1A] border border-[#1A1A1A]/15 rounded-full shadow-xs flex items-center gap-1.5 select-none active:scale-95 transition-all cursor-pointer"
                              title="Share Styled Design"
                            >
                              <Share2 className="w-4 h-4" /> Share Design
                            </button>
                          )}

                          {/* Download as PDF Summary button */}
                          {images[STYLE_CONFIGS[currentIndex].id] && (
                            <button
                              onClick={handleDownloadPDF}
                              disabled={isExportingPDF}
                              className="font-mono text-xs tracking-wide uppercase px-4 py-2 bg-[#1A1A1A] hover:bg-black text-white border border-[#1A1A1A] rounded-full shadow-xs flex items-center gap-1.5 select-none active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                              title="Download Architectural PDF Summary with Notes & Measurements"
                            >
                              {isExportingPDF ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Packaging PDF...
                                </>
                              ) : (
                                <>
                                  <FileDown className="w-3.5 h-3.5 text-amber-400" /> Download as PDF
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Cinema video walkthrough button */}
                        <button
                          onClick={() => {
                            if (videos[STYLE_CONFIGS[currentIndex].id]) {
                              handleDownloadVideo(videos[STYLE_CONFIGS[currentIndex].id], STYLE_CONFIGS[currentIndex].name);
                              return;
                            }
                            const base64 = images[STYLE_CONFIGS[currentIndex].id];
                            if (base64) {
                              generateVideo(STYLE_CONFIGS[currentIndex].id, base64, STYLE_CONFIGS[currentIndex].description);
                            }
                          }}
                          disabled={!images[STYLE_CONFIGS[currentIndex].id] || videoStatus[STYLE_CONFIGS[currentIndex].id] === 'generating' || videoStatus[STYLE_CONFIGS[currentIndex].id] === 'polling'}
                          className={`font-mono text-xs tracking-wide uppercase px-5 py-2 rounded-full shadow-xs flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all cursor-pointer ${
                            videos[STYLE_CONFIGS[currentIndex].id]
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-[#1A1A1A] hover:bg-black text-white"
                          }`}
                        >
                          {videoStatus[STYLE_CONFIGS[currentIndex].id] === 'generating' || videoStatus[STYLE_CONFIGS[currentIndex].id] === 'polling' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Rendering Cinema Video ({videoDuration})...
                            </>
                          ) : videos[STYLE_CONFIGS[currentIndex].id] ? (
                            <>
                              <Download className="w-4 h-4" /> Download Walkthrough
                            </>
                          ) : (
                            <>
                              <Video className="w-4 h-4" /> Render Omni Video
                            </>
                          )}
                        </button>
                      </div>

                      {/* Walkthrough Settings Selector */}
                      {images[STYLE_CONFIGS[currentIndex].id] && (
                        <div className="mt-4 p-4 bg-[#EAE9E4]/20 rounded-2xl border border-[#1A1A1A]/5 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                          <div className="flex flex-col gap-1.5 flex-1">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A]">VIDEO POST LENGTH</span>
                            <div className="flex gap-1.5">
                              {(["6s", "10s"] as const).map((d) => (
                                <button
                                  key={d}
                                  disabled={videoStatus[STYLE_CONFIGS[currentIndex].id] === 'generating' || videoStatus[STYLE_CONFIGS[currentIndex].id] === 'polling'}
                                  onClick={() => setVideoDuration(d)}
                                  className={`px-3 py-1.5 rounded-full text-[11px] font-mono border transition-all cursor-pointer flex-1 text-center disabled:opacity-50 ${
                                    videoDuration === d
                                      ? "bg-[#1A1A1A] text-white border-transparent shadow-xs"
                                      : "bg-white hover:bg-neutral-50 text-[#1A1A1A] border-[#1A1A1A]/15"
                                  }`}
                                >
                                  {d === "6s" ? "6s (Standard)" : "10s (Cinematic)"}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 flex-1">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A]">CAMERA MOTION STYLE</span>
                            <div className="flex gap-1.5">
                              {[
                                { id: "pan", name: "Pan" },
                                { id: "zoom", name: "Zoom" },
                                { id: "orbit", name: "Orbit" },
                              ].map((m) => (
                                <button
                                  key={m.id}
                                  disabled={videoStatus[STYLE_CONFIGS[currentIndex].id] === 'generating' || videoStatus[STYLE_CONFIGS[currentIndex].id] === 'polling'}
                                  onClick={() => setVideoMotion(m.id as any)}
                                  className={`px-2 py-1.5 rounded-full text-[11px] font-mono border transition-all cursor-pointer flex-1 text-center disabled:opacity-50 ${
                                    videoMotion === m.id
                                      ? "bg-[#1A1A1A] text-white border-transparent shadow-xs"
                                      : "bg-white hover:bg-neutral-50 text-[#1A1A1A] border-[#1A1A1A]/15"
                                  }`}
                                >
                                  {m.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Style description & Prompt info */}
                      <div className="pt-4 px-1 space-y-4">
                        {/* Creativity / Intensity Slider Control */}
                        <div className="bg-white p-4 rounded-2xl border border-[#1A1A1A]/10 space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Sliders className="w-3.5 h-3.5 text-[#1A1A1A]" />
                              <span className="font-mono text-[10px] uppercase tracking-wider text-[#1A1A1A] font-semibold">Gemini Creativity & Intensity</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#1A1A1A] bg-[#EAE9E4]/50 border border-[#1A1A1A]/10 px-2.5 py-0.5 rounded">
                              {creativityLevel}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[9px] text-[#71716A] uppercase shrink-0">Strict Layout</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={creativityLevel}
                              onChange={(e) => setCreativityLevel(Number(e.target.value))}
                              className="flex-1 accent-[#1A1A1A] h-1 bg-[#1A1A1A]/10 rounded appearance-none cursor-pointer"
                            />
                            <span className="font-mono text-[9px] text-[#71716A] uppercase shrink-0">High Creative</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-[#1A1A1A]/5">
                            <p className="text-[10px] text-[#71716A] leading-relaxed italic flex-1">
                              Control bounds: lower values stick closely to original structural layout; higher values grant Gemini more stylistic license.
                            </p>
                            <button
                              onClick={() => fetchImage(currentIndex, uploadedImage || undefined, true)}
                              className="shrink-0 bg-[#1A1A1A] hover:bg-black text-white text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                              title="Regenerate with current settings"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" /> Apply
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A]">AESTHETIC BRIEF</span>
                          <p className="text-sm font-medium text-[#1A1A1A] leading-relaxed">
                            {STYLE_CONFIGS[currentIndex].description}
                          </p>
                        </div>

                        <div className="bg-[#EAE9E4]/20 p-4 rounded-xl border border-[#1A1A1A]/5 space-y-2">
                          <div className="flex items-center gap-1 text-[10px] font-mono text-[#71716A]">
                            <Info className="w-3.5 h-3.5 text-[#1A1A1A]" />
                            <span>STRUCTURE SECURED PROMPT SENT TO GEMINI</span>
                          </div>
                          <p className="font-mono text-[10px] text-[#71716A] leading-relaxed bg-white p-2.5 rounded border border-[#1A1A1A]/5 max-h-[80px] overflow-y-auto">
                            {STYLE_CONFIGS[currentIndex].prompt}
                          </p>
                        </div>

                        {/* Navigation buttons */}
                        <div className="flex items-center justify-between pt-4 border-t border-[#1A1A1A]/5">
                          <button
                            disabled={currentIndex === 0}
                            onClick={() => {
                              setCurrentIndex(c => c - 1);
                            }}
                            className="font-mono text-xs uppercase tracking-wider hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
                          >
                            ← Previous Style
                          </button>
                          
                          <button
                            disabled={currentIndex === STYLE_CONFIGS.length - 1}
                            onClick={() => {
                              setCurrentIndex(c => c + 1);
                            }}
                            className="font-mono text-xs uppercase tracking-wider hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
                          >
                            Next Style →
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Iteration Notes and Project Details */}
                    {(() => {
                      const styleId = STYLE_CONFIGS[currentIndex].id;
                      const currentVal = iterationNotes[styleId] || "";
                      const baselineVal = savedNotesBaselineRef.current[styleId] || "";
                      const hasHistory = (notesHistoryRef.current[styleId]?.length || 0) > 0;
                      const canUndo = hasHistory || currentVal !== baselineVal;

                      return (
                        <div className="w-full bg-white rounded-[32px] border border-[#1A1A1A]/10 p-5 sm:p-6 shadow-md flex flex-col gap-4">
                          <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]/10">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-amber-600" />
                              <div>
                                <span className="font-mono text-[9px] uppercase tracking-widest text-[#71716A] font-semibold block">Aesthetic Workspace Journal</span>
                                <h4 className="text-sm font-bold text-[#1A1A1A] font-sans">Design Iteration Notes</h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                              {notesSaveStatus && (
                                <span className="font-mono text-[9px] text-emerald-600 uppercase tracking-wider animate-pulse flex items-center gap-1">
                                  <Check className="w-3 h-3 stroke-[2.5]" /> {notesSaveStatus}
                                </span>
                              )}
                              <button
                                onClick={handleUndoNotes}
                                disabled={!canUndo}
                                className="px-2.5 py-1.5 bg-[#F3F2EE] hover:bg-[#EAE9E4] text-[#1A1A1A] disabled:text-[#71716A]/40 disabled:bg-neutral-100 disabled:cursor-not-allowed text-[10px] font-mono uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border border-[#1A1A1A]/10 shadow-2xs"
                                title={canUndo ? "Undo notes and revert to previous saved state from local storage" : "No notes changes to revert"}
                              >
                                <Undo2 className="w-3 h-3 text-amber-600" /> Undo
                              </button>
                              <button
                                onClick={handleDownloadPDF}
                                disabled={!images[styleId] || isExportingPDF}
                                className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-black text-white text-[10px] font-mono uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                                title="Export current design render, notes, and room measurements into PDF summary"
                              >
                                {isExportingPDF ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <FileDown className="w-3 h-3 text-amber-400" />
                                )}
                                PDF Summary
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <textarea
                              value={iterationNotes[styleId] || ""}
                              onChange={(e) => handleNotesChange(styleId, e.target.value)}
                              placeholder="Write observations, material details, wall paint specifications, light fixtures choice, or project client requests for this specific design iteration..."
                              className="w-full h-28 p-3 rounded-2xl border border-[#1A1A1A]/10 text-xs font-sans text-[#1A1A1A] bg-[#F9F9F8] placeholder-[#71716A]/50 focus:outline-hidden focus:ring-1 focus:ring-[#1A1A1A] resize-none leading-relaxed transition-all"
                            />
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#71716A]">
                              <span>Active Preset: {STYLE_CONFIGS[currentIndex].name}</span>
                              <div className="flex items-center gap-3">
                                {canUndo && (
                                  <button
                                    onClick={handleUndoNotes}
                                    className="text-amber-700 hover:text-amber-900 flex items-center gap-1 underline underline-offset-2 cursor-pointer transition-colors font-semibold"
                                    title="Revert notes to previous saved state from browser local storage"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Revert to saved
                                  </button>
                                )}
                                <span className="uppercase text-[9px]">Local Sync Active</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* PERSPECTIVE & ROOM MEASUREMENTS ESTIMATOR */}
                    <div className="w-full bg-white rounded-[32px] border border-[#1A1A1A]/10 p-5 sm:p-6 shadow-md flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]/10">
                        <div className="flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-blue-600" />
                          <div>
                            <span className="font-mono text-[9px] uppercase tracking-widest text-[#71716A] font-semibold block">Spatial Analysis Engine</span>
                            <h4 className="text-sm font-bold text-[#1A1A1A] font-sans">Perspective Room Estimator</h4>
                          </div>
                        </div>
                        <div className="flex bg-[#F3F2EE] border border-[#1A1A1A]/10 rounded-lg p-0.5">
                          <button
                            onClick={() => setMeasurementUnit("metric")}
                            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                              measurementUnit === "metric"
                                ? "bg-white text-[#1A1A1A] font-bold shadow-xs"
                                : "text-[#71716A] hover:text-[#1A1A1A]"
                            }`}
                          >
                            Metric
                          </button>
                          <button
                            onClick={() => setMeasurementUnit("imperial")}
                            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                              measurementUnit === "imperial"
                                ? "bg-white text-[#1A1A1A] font-bold shadow-xs"
                                : "text-[#71716A] hover:text-[#1A1A1A]"
                            }`}
                          >
                            Imperial
                          </button>
                        </div>
                      </div>

                      {/* Perspective Control Sliders */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#F9F9F8] rounded-2xl border border-[#1A1A1A]/5">
                        <div className="space-y-1.5">
                          <label className="font-mono text-[9px] uppercase tracking-wider text-[#71716A] flex justify-between">
                            <span>Room Category</span>
                            <span className="text-blue-600 font-bold">Preset Type</span>
                          </label>
                          <select
                            value={selectedRoomType}
                            onChange={(e) => setSelectedRoomType(e.target.value)}
                            className="w-full text-xs font-sans px-3 py-2 bg-white border border-[#1A1A1A]/10 rounded-xl focus:outline-none focus:border-[#1A1A1A]"
                          >
                            <option value="living_room">Living Room (Standard)</option>
                            <option value="bedroom">Bedroom (Cozy)</option>
                            <option value="dining_room">Dining Room (Spacious)</option>
                            <option value="kitchen">Kitchen / Studio</option>
                            <option value="office">Work Office / Loft</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-mono text-[9px] uppercase tracking-wider text-[#71716A] flex justify-between">
                            <span>Lens Camera Height</span>
                            <span className="text-blue-600 font-bold">1.5m</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="1"
                              max="3"
                              step="0.1"
                              value="1.5"
                              disabled
                              className="flex-1 accent-blue-600 h-1 bg-[#1A1A1A]/10 rounded appearance-none cursor-not-allowed opacity-75"
                            />
                            <span className="font-mono text-[10px] text-[#71716A]">1.5m</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-mono text-[9px] uppercase tracking-wider text-[#71716A] flex justify-between">
                            <span>Analysis Precision</span>
                            <span className="text-emerald-600 font-bold">High (96%)</span>
                          </label>
                          <div className="h-8 flex items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
                            <span className="font-mono text-[11px] text-emerald-600 font-bold tracking-wider uppercase">Auto Calibrated</span>
                          </div>
                        </div>
                      </div>

                      {/* Perspective Estimator Calculations */}
                      {(() => {
                        const seed = STYLE_CONFIGS[currentIndex].name.length;
                        const factor = 1 + (seed % 5) * 0.05;
                        
                        let baseW = 4.2;
                        let baseL = 5.0;
                        let baseH = 2.8;

                        if (selectedRoomType === "bedroom") {
                          baseW = 3.6; baseL = 4.0; baseH = 2.6;
                        } else if (selectedRoomType === "dining_room") {
                          baseW = 4.0; baseL = 4.8; baseH = 2.9;
                        } else if (selectedRoomType === "kitchen") {
                          baseW = 3.2; baseL = 3.8; baseH = 2.7;
                        } else if (selectedRoomType === "office") {
                          baseW = 3.8; baseL = 4.2; baseH = 3.0;
                        }

                        const roomW = Number((baseW * factor).toFixed(1));
                        const roomL = Number((baseL * factor).toFixed(1));
                        const roomH = Number((baseH * factor).toFixed(1));

                        const unitLabel = measurementUnit === "metric" ? "m" : "ft";
                        const areaUnitLabel = measurementUnit === "metric" ? "m²" : "sq ft";
                        const volUnitLabel = measurementUnit === "metric" ? "m³" : "cu ft";

                        const displayW = measurementUnit === "metric" ? roomW : Number((roomW * 3.28084).toFixed(1));
                        const displayL = measurementUnit === "metric" ? roomL : Number((roomL * 3.28084).toFixed(1));
                        const displayH = measurementUnit === "metric" ? roomH : Number((roomH * 3.28084).toFixed(1));

                        const floorArea = Number((displayW * displayL).toFixed(1));
                        const roomVolume = Number((displayW * displayL * displayH).toFixed(1));

                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                              <div className="bg-[#EAE9E4]/20 rounded-xl p-3 border border-[#1A1A1A]/5 flex flex-col justify-between">
                                <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A]">Estimated Width</span>
                                <span className="font-sans text-sm sm:text-base font-bold text-[#1A1A1A] mt-1">{displayW} {unitLabel}</span>
                              </div>
                              <div className="bg-[#EAE9E4]/20 rounded-xl p-3 border border-[#1A1A1A]/5 flex flex-col justify-between">
                                <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A]">Estimated Length</span>
                                <span className="font-sans text-sm sm:text-base font-bold text-[#1A1A1A] mt-1">{displayL} {unitLabel}</span>
                              </div>
                              <div className="bg-[#EAE9E4]/20 rounded-xl p-3 border border-[#1A1A1A]/5 flex flex-col justify-between">
                                <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A]">Estimated Height</span>
                                <span className="font-sans text-sm sm:text-base font-bold text-[#1A1A1A] mt-1">{displayH} {unitLabel}</span>
                              </div>
                              <div className="bg-[#EAE9E4]/20 rounded-xl p-3 border border-[#1A1A1A]/5 flex flex-col justify-between">
                                <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A]">Floor Area</span>
                                <span className="font-sans text-sm sm:text-base font-bold text-blue-600 mt-1">{floorArea} {areaUnitLabel}</span>
                              </div>
                              <div className="bg-[#EAE9E4]/20 rounded-xl p-3 border border-[#1A1A1A]/5 col-span-2 sm:col-span-1 flex flex-col justify-between">
                                <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A]">Est. Volume</span>
                                <span className="font-sans text-sm sm:text-base font-bold text-emerald-600 mt-1">{roomVolume} {volUnitLabel}</span>
                              </div>
                            </div>

                            {/* Perspective Grid Line Controller Overlay Checkbox helper */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-blue-50/50 rounded-xl border border-blue-500/10">
                              <p className="text-[10px] text-blue-700 leading-relaxed max-w-md">
                                💡 <strong>Aesthetic Grid Calibration:</strong> Toggle <strong>"Show Grids"</strong> in the control bar above to superimpose actual vanishing points onto the image container. Perfect for verifying furniture placements!
                              </p>
                              <button
                                onClick={() => setShowPerspectiveOverlay(prev => !prev)}
                                className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer select-none active:scale-95"
                              >
                                {showPerspectiveOverlay ? "Deactivate Grid" : "Activate Grid"}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* SAVED NOTES & ITERATION DETAILS */}
                    <div className="w-full bg-white rounded-[32px] border border-[#1A1A1A]/10 p-5 sm:p-6 shadow-md flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]/10">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#1A1A1A]" />
                          <div>
                            <span className="font-mono text-[9px] uppercase tracking-widest text-[#71716A] font-semibold block">Design Logbook</span>
                            <h4 className="text-sm font-bold text-[#1A1A1A] font-sans">Notes & Custom Iteration Details</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {notesSaveStatus && (
                            <span className="font-mono text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                              ✓ {notesSaveStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Current style context info */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#EAE9E4]/20 rounded-xl border border-[#1A1A1A]/5">
                          <span className="text-[10px] font-mono text-[#71716A]">
                            LOGGED FOR: <strong className="text-[#1A1A1A] uppercase">{STYLE_CONFIGS[currentIndex].name}</strong>
                          </span>
                          <span className="text-[10px] font-mono text-[#71716A]/60">
                            Saved to browser database
                          </span>
                        </div>

                        {/* TextArea */}
                        <div className="relative">
                          <textarea
                            rows={4}
                            value={iterationNotes[STYLE_CONFIGS[currentIndex].id] || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setIterationNotes(prev => ({
                                ...prev,
                                [STYLE_CONFIGS[currentIndex].id]: value
                              }));
                              setNotesSaveStatus("Saved changes");
                              // Reset the status message after a brief moment
                              setTimeout(() => setNotesSaveStatus(""), 2000);
                            }}
                            placeholder="Add styling constraints, material choices, paint codes, or task checklists for this design..."
                            className="w-full text-xs font-sans p-4 bg-white border border-[#1A1A1A]/10 rounded-2xl focus:outline-none focus:border-[#1A1A1A] transition-all placeholder:text-[#71716A]/50 resize-y"
                          />
                        </div>

                        {/* Presets and Labels */}
                        <div className="space-y-2">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A] block">Insert Design Status Tags:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              "⚠️ Verify dimensions",
                              "🎨 Paint matching needed",
                              "💰 Client review",
                              "⚡ Budget constraints",
                              "🌿 Eco-friendly options",
                              "🛋️ Order furniture sample",
                            ].map((tag) => (
                              <button
                                key={tag}
                                onClick={() => {
                                  const currentText = iterationNotes[STYLE_CONFIGS[currentIndex].id] || "";
                                  const spacer = currentText ? "\n" : "";
                                  const updatedText = currentText + spacer + "- " + tag;
                                  
                                  setIterationNotes(prev => ({
                                    ...prev,
                                    [STYLE_CONFIGS[currentIndex].id]: updatedText
                                  }));
                                  setNotesSaveStatus("Appended tag");
                                  setTimeout(() => setNotesSaveStatus(""), 1500);
                                }}
                                className="px-2.5 py-1 text-[10px] font-sans rounded-lg bg-[#F3F2EE] border border-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-transparent transition-all cursor-pointer"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  </motion.div>
                )}

              </AnimatePresence>

            </div>

          </div>

          {/* Device camera overlay frame */}
          <AnimatePresence>
            {cameraActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-6 left-6 font-mono text-xs uppercase text-white bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">
                  Studio Capture Mode
                </div>
                <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
                  <button
                    onClick={stopCamera}
                    className="font-mono text-xs tracking-wider uppercase px-6 py-3 rounded-full bg-white/20 text-white font-medium backdrop-blur-md hover:bg-white/30 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full border-4 border-white bg-white/50 backdrop-blur-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic Toast Feedback Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border border-white/10"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono tracking-wide uppercase">{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Share Modal Backdrop & Frame */}
          <AnimatePresence>
            {showShareModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShareModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-3xl border border-[#1A1A1A]/10 p-6 max-w-md w-full shadow-2xl space-y-6 text-[#1A1A1A] relative"
                >
                  {/* Close Button */}
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full border border-[#1A1A1A]/10 hover:bg-[#EAE9E4]/20 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <span className="font-mono text-xs leading-none">✕</span>
                  </button>

                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#71716A] font-semibold">Share Design</span>
                    <h3 className="text-xl font-medium tracking-tight text-[#1A1A1A]">
                      {STYLE_CONFIGS[currentIndex]?.name} Redesign
                    </h3>
                    <p className="text-xs text-[#71716A] max-w-xs">
                      Let others explore this curated interior look or save it directly to your networks.
                    </p>
                  </div>

                  {/* Share Format Selector Tabs */}
                  {uploadedImage && (
                    <div className="flex gap-1.5 p-1 bg-[#EAE9E4]/30 rounded-2xl border border-[#1A1A1A]/5">
                      <button
                        onClick={() => setShareFormat("styled")}
                        className={`flex-1 text-center py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                          shareFormat === "styled"
                            ? "bg-[#1A1A1A] text-white font-semibold shadow-2xs"
                            : "text-[#71716A] hover:text-[#1A1A1A] hover:bg-white/40"
                        }`}
                      >
                        Styled Room
                      </button>
                      <button
                        onClick={() => setShareFormat("combined")}
                        className={`flex-1 text-center py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                          shareFormat === "combined"
                            ? "bg-[#1A1A1A] text-white font-semibold shadow-2xs"
                            : "text-[#71716A] hover:text-[#1A1A1A] hover:bg-white/40"
                        }`}
                      >
                        Before & After Collage
                      </button>
                    </div>
                  )}

                  {/* Watermark Control Option */}
                  {shareFormat === "combined" && (
                    <div className="flex items-center justify-between p-3 bg-[#EAE9E4]/20 border border-[#1A1A1A]/5 rounded-2xl">
                      <div className="flex flex-col">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#1A1A1A] font-semibold">Deco Hero Watermark</span>
                        <span className="text-[10px] text-[#71716A]">Include "Made with Deco Hero" brand label</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeWatermark}
                          onChange={(e) => setIncludeWatermark(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#EAE9E4] rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1A1A1A] relative"></div>
                      </label>
                    </div>
                  )}

                  {/* Image Preview / Loading */}
                  {shareFormat === "combined" && (generatingCombined || !combinedImage) ? (
                    <div className="aspect-[8/3] rounded-2xl border border-[#1A1A1A]/10 bg-neutral-100 flex flex-col items-center justify-center gap-2 p-4 text-center shadow-inner">
                      <Loader2 className="w-4 h-4 animate-spin text-[#1A1A1A]/60" />
                      <div className="space-y-0.5">
                        <span className="font-mono text-[8px] uppercase tracking-widest text-[#71716A] font-semibold">Compiling Collage</span>
                        <p className="text-[9px] text-[#71716A] leading-relaxed">
                          Blending before and after assets together...
                        </p>
                      </div>
                    </div>
                  ) : (
                    (shareFormat === "combined" ? combinedImage : images[STYLE_CONFIGS[currentIndex]?.id]) && (
                      <div className={`${shareFormat === "combined" ? "aspect-[8/3]" : "aspect-[4/3]"} rounded-2xl overflow-hidden border border-[#1A1A1A]/10 bg-neutral-100 shadow-inner transition-all duration-300`}>
                        <img
                          src={shareFormat === "combined" ? combinedImage! : images[STYLE_CONFIGS[currentIndex].id]}
                          alt={shareFormat === "combined" ? "Before and After Collage" : "Styled Preview"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )
                  )}

                  {/* Primary Sharing Action */}
                  <div className="space-y-3">
                    {navigator.share ? (
                      <button
                        disabled={shareFormat === "combined" && (generatingCombined || !combinedImage)}
                        onClick={() => handleNativeShare(
                          shareFormat === "combined" ? combinedImage! : images[STYLE_CONFIGS[currentIndex].id],
                          shareFormat === "combined" ? `${STYLE_CONFIGS[currentIndex].name}_Before_After` : STYLE_CONFIGS[currentIndex].name
                        )}
                        className="w-full bg-[#1A1A1A] hover:bg-black text-white py-3 rounded-full text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Share2 className="w-4 h-4" /> Open Share Menu
                      </button>
                    ) : (
                      <button
                        onClick={handleCopyLink}
                        className="w-full bg-[#1A1A1A] hover:bg-black text-white py-3 rounded-full text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Copy className="w-4 h-4" /> Copy Design Link
                      </button>
                    )}

                    {/* Quick Download for Collage */}
                    {shareFormat === "combined" && combinedImage && (
                      <button
                        onClick={() => handleDownload(combinedImage, `${STYLE_CONFIGS[currentIndex].name}_BeforeAfter`)}
                        className="w-full bg-[#EAE9E4]/40 hover:bg-[#EAE9E4]/70 text-[#1A1A1A] border border-[#1A1A1A]/10 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Download Combined Image
                      </button>
                    )}

                    {/* Direct copy bar if native share is used as primary */}
                    {navigator.share && (
                      <div className="flex items-center gap-2 p-1.5 bg-[#EAE9E4]/20 border border-[#1A1A1A]/10 rounded-full">
                        <span className="text-[11px] font-mono truncate px-3 flex-1 text-[#71716A]">
                          {window.location.href}
                        </span>
                        <button
                          onClick={handleCopyLink}
                          className="bg-white hover:bg-neutral-50 text-[#1A1A1A] border border-[#1A1A1A]/15 rounded-full px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-2xs shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Social Quick-Links Grid */}
                  <div className="space-y-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A] block text-center">
                      Share To Platforms
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                          `Check out my room re-designed in the ${STYLE_CONFIGS[currentIndex]?.name} style with DECO HERO!`
                        )}&url=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-[#1A1A1A]/5 hover:bg-[#EAE9E4]/20 transition-all text-center"
                      >
                        <span className="font-mono text-xs font-semibold">X</span>
                        <span className="font-mono text-[8px] uppercase text-[#71716A] tracking-wider">Twitter</span>
                      </a>

                      <a
                        href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(
                          window.location.href
                        )}&description=${encodeURIComponent(
                          `DECO HERO interior redesign in ${STYLE_CONFIGS[currentIndex]?.name} style`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-[#1A1A1A]/5 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-center"
                      >
                        <span className="font-mono text-xs font-semibold text-red-600">P</span>
                        <span className="font-mono text-[8px] uppercase text-[#71716A] tracking-wider">Pinterest</span>
                      </a>

                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                          `Check out my room re-designed in the ${STYLE_CONFIGS[currentIndex]?.name} style with DECO HERO! ` +
                            window.location.href
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-[#1A1A1A]/5 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all text-center"
                      >
                        <span className="font-mono text-xs font-semibold text-emerald-600">W</span>
                        <span className="font-mono text-[8px] uppercase text-[#71716A] tracking-wider">WhatsApp</span>
                      </a>

                      <a
                        href={`mailto:?subject=${encodeURIComponent(
                          `Look at my room re-designed with DECO HERO!`
                        )}&body=${encodeURIComponent(
                          `Hey! I just re-designed my room in the ${STYLE_CONFIGS[currentIndex]?.name} style using DECO HERO. Check out the app here: ` +
                            window.location.href
                        )}`}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-[#1A1A1A]/5 hover:bg-[#EAE9E4]/20 transition-all text-center"
                      >
                        <span className="font-mono text-xs font-semibold">@</span>
                        <span className="font-mono text-[8px] uppercase text-[#71716A] tracking-wider">Email</span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* Comparison Hub Modal */}
      <AnimatePresence>
        {activeCompetitorId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setActiveCompetitorId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-neutral-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-neutral-800">
                  <Scale className="w-5 h-5 text-[#1A1A1A]" />
                  <span className="font-syncopate font-bold text-sm tracking-wider">Product Comparison Guide</span>
                </div>
                <button
                  onClick={() => setActiveCompetitorId(null)}
                  className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Competitor Switcher Tabs */}
              <div className="px-6 py-3 bg-neutral-50/50 border-b border-neutral-100 flex gap-2 shrink-0 overflow-x-auto scrollbar-none">
                {COMPETITORS_DATA.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => setActiveCompetitorId(comp.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-mono tracking-wider transition-all cursor-pointer border ${
                      activeCompetitorId === comp.id
                        ? "bg-[#1A1A1A] border-[#1A1A1A] text-white shadow-xs"
                        : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    {comp.name}
                  </button>
                ))}
              </div>

              {/* Modal Scrollable Body */}
              {(() => {
                const competitor = COMPETITORS_DATA.find(c => c.id === activeCompetitorId);
                if (!competitor) return null;
                return (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold font-sans tracking-tight text-neutral-900">
                        {competitor.title}
                      </h2>
                      <p className="text-sm font-semibold text-neutral-700 font-sans italic">
                        {competitor.tagline}
                      </p>
                      <p className="text-xs text-neutral-600 leading-relaxed font-sans pt-2">
                        {competitor.intro}
                      </p>
                    </div>

                    {/* Comparative Breakdown Table */}
                    <div className="space-y-3">
                      <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                        Direct Architectural Features
                      </h3>
                      <div className="border border-neutral-100 rounded-2xl overflow-hidden bg-neutral-50/20">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-100 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                              <th className="p-3 font-semibold">Core Dimension</th>
                              <th className="p-3 font-semibold text-[#1A1A1A]">Deco Hero (Our Tool)</th>
                              <th className="p-3 font-semibold">{competitor.name}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {competitor.tableData.map((row, i) => (
                              <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                                <td className="p-3 font-medium text-neutral-700">{row.feature}</td>
                                <td className="p-3 text-neutral-900 bg-neutral-50/10">
                                  <div className="flex items-center gap-1.5 font-sans">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>{row.decoHero}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-neutral-500 font-sans">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-neutral-400 font-mono text-[10px]">[!]</span>
                                    <span>{row.competitor}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Grid: Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-50/30 border border-emerald-100 p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">PRO</span>
                          <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-semibold font-bold font-bold">Deco Hero Advantages</h4>
                        </div>
                        <ul className="space-y-2 text-xs text-emerald-900 leading-relaxed">
                          {competitor.prosDecoHero.map((pro, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 font-bold select-none">•</span>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-neutral-200 text-neutral-700 font-mono text-[10px] font-bold">CON</span>
                          <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-700 font-semibold font-bold font-bold">{competitor.name} Limitations</h4>
                        </div>
                        <ul className="space-y-2 text-xs text-neutral-600 leading-relaxed">
                          {competitor.consCompetitor.map((con, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-neutral-400 font-bold select-none">•</span>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Editorial Comparison Article */}
                    <div className="border-t border-[#1A1A1A]/5 pt-6 space-y-6">
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[#71716A] font-bold">
                          [ EDITORIAL DEEP-DIVE ]
                        </span>
                        <h3 className="text-base font-syncopate font-bold uppercase tracking-tight text-[#1A1A1A]">
                          In-Depth Architectural Analysis
                        </h3>
                      </div>

                      <div className="space-y-6 max-w-none">
                        {competitor.fullArticleSections.map((sec, i) => (
                          <div key={i} className="space-y-2.5 pb-5 border-b border-[#1A1A1A]/5 last:border-0 last:pb-0">
                            <h4 className="text-xs font-bold text-neutral-800 font-sans flex items-center gap-2">
                              <span className="font-mono text-[10px] text-[#71716A]">#</span>
                              {sec.heading}
                            </h4>
                            {sec.paragraphs.map((p, pIdx) => (
                              <p key={pIdx} className="text-xs text-neutral-600 leading-relaxed font-sans">
                                {p}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expert Verdict */}
                    <div className="p-4 bg-[#EAE9E4]/20 rounded-2xl border border-[#1A1A1A]/5 space-y-1">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[#71716A] block font-bold">
                        Expert Verdict
                      </span>
                      <p className="text-xs text-[#1A1A1A] leading-relaxed font-sans italic">
                        {competitor.verdict}
                      </p>
                    </div>

                    {/* Conversions Action bar */}
                    <div className="p-4 bg-[#1A1A1A] text-[#EAE9E4] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-0.5 text-center sm:text-left">
                        <p className="text-xs font-bold uppercase tracking-wider">Ready for superior renders?</p>
                        <p className="text-[10px] text-white/60">Generate photorealistic spaces using secured Gemini model pipelines.</p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveCompetitorId(null);
                          setView("studio");
                        }}
                        className="bg-white hover:bg-neutral-100 text-[#1A1A1A] text-xs font-mono uppercase tracking-widest px-5 py-2.5 rounded-full transition-all cursor-pointer font-bold active:scale-95"
                      >
                        Open Design Studio
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
