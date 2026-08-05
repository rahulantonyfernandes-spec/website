import { AnimatePresence, motion } from "framer-motion";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUpRight,
  Award,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CakeSlice,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Gift,
  HeartHandshake,
  ImagePlus,
  LayoutTemplate,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Palette,
  Phone,
  Printer,
  QrCode,
  Scissors,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  firebaseAuth,
  firebaseDb,
  firebaseStorage,
  isFirebaseConfigured,
} from "./firebase";

type Service = {
  name: string;
  icon: LucideIcon;
};

type GalleryItem = {
  id?: string;
  title: string;
  category: string;
  image: string;
  storagePath?: string;
};

type SiteImages = {
  heroImage: string;
  aboutImage: string;
  heroStoragePath?: string;
  aboutStoragePath?: string;
  updatedAt?: number;
};

const GALLERY_STORAGE_KEY = "amar-printers-gallery";
const SITE_IMAGES_STORAGE_KEY = "amar-printers-site-images";
const defaultSiteImages: SiteImages = {
  heroImage: "https://images.pexels.com/photos/37394506/pexels-photo-37394506.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=2200",
  aboutImage: "https://images.pexels.com/photos/13061615/pexels-photo-13061615.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
};

function cacheSafeImageUrl(image: string, version?: number) {
  if (!image || image.startsWith("data:") || image.startsWith("blob:")) return image;
  const separator = image.includes("?") ? "&" : "?";
  return `${image}${separator}amarVersion=${version ?? Date.now()}`;
}

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

const services: Service[] = [
  { name: "Graphic Designing", icon: Palette },
  { name: "Offset Printing", icon: Printer },
  { name: "Digital Printing", icon: Send },
  { name: "Screen Printing", icon: LayoutTemplate },
  { name: "Business Cards", icon: BriefcaseBusiness },
  { name: "Wedding Cards", icon: CakeSlice },
  { name: "Brochures & Flyers", icon: BookOpen },
  { name: "Banners & Flex", icon: Scissors },
  { name: "Stickers", icon: Tag },
  { name: "Certificates", icon: Award },
  { name: "Bill Books", icon: FileText },
  { name: "ID Cards", icon: QrCode },
];

const galleryItems: GalleryItem[] = [
  {
    title: "A considered first impression",
    category: "Business Cards",
    image:
      "https://images.pexels.com/photos/8947634/pexels-photo-8947634.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    title: "Celebrations, beautifully printed",
    category: "Wedding Cards",
    image:
      "https://images.pexels.com/photos/36617802/pexels-photo-36617802.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    title: "Brochures that invite a closer look",
    category: "Brochures",
    image:
      "https://images.pexels.com/photos/7648514/pexels-photo-7648514.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    title: "Make your message impossible to miss",
    category: "Banners",
    image:
      "https://images.pexels.com/photos/34659828/pexels-photo-34659828.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    title: "Small details, strong identity",
    category: "Stickers",
    image:
      "https://images.pexels.com/photos/33714876/pexels-photo-33714876.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    title: "Recognition worth framing",
    category: "Certificates",
    image:
      "https://images.pexels.com/photos/8177922/pexels-photo-8177922.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    title: "Print with a point of view",
    category: "Business Cards",
    image:
      "https://images.pexels.com/photos/8489947/pexels-photo-8489947.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    title: "A tactile finish for every occasion",
    category: "Wedding Cards",
    image:
      "https://images.pexels.com/photos/17001821/pexels-photo-17001821.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
];

const galleryFilters = [
  "All",
  "Business Cards",
  "Wedding Cards",
  "Banners",
  "Brochures",
  "Stickers",
  "Certificates",
];

const reasons: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "Premium Quality",
    description: "We use advanced machines and high-quality materials.",
    icon: Gift,
  },
  {
    title: "Fast Delivery",
    description: "On-time delivery with speed and reliability.",
    icon: Clock3,
  },
  {
    title: "Affordable Pricing",
    description: "Best quality printing at competitive prices.",
    icon: BadgeCheck,
  },
  {
    title: "Custom Design",
    description: "Creative designs that perfectly match your needs.",
    icon: Sparkles,
  },
  {
    title: "Customer Support",
    description: "Friendly support to help you at every step.",
    icon: HeartHandshake,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" as const } },
};

function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5" aria-label="Amar Printers home">
      <svg className="h-9 w-9 shrink-0" viewBox="0 0 42 42" fill="none" aria-hidden="true">
        <path d="M2.5 37.5 15.4 5h7.1L10.1 37.5" stroke="#F4F4F5" strokeWidth="4.4" strokeLinecap="round" />
        <path d="m11.4 26.4 5.4-13.7 10.5 24.8" stroke="#E63946" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 9.4h6.1c5.5 0 8.3 2.1 8.3 6.2 0 4.2-3 6.4-8.6 6.4h-4.1" stroke="#F4F4F5" strokeWidth="4.4" strokeLinecap="round" />
      </svg>
      <span className={`text-[15px] font-extrabold tracking-[-0.02em] ${light ? "text-white" : "text-white"}`}>
        AMAR PRINTERS
      </span>
    </span>
  );
}

function ActionButton({
  href,
  children,
  variant,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  variant: "whatsapp" | "call" | "email" | "light";
  external?: boolean;
}) {
  const variants = {
    whatsapp: "bg-[#19b637] text-white hover:bg-[#149b2e]",
    call: "bg-[#e63946] text-white hover:bg-[#c92d3a]",
    email: "border border-white/80 bg-white/5 text-white hover:bg-white hover:text-[#0f172a]",
    light: "bg-white text-[#0f172a] hover:bg-[#f4b400] hover:text-[#0f172a]",
  };

  return (
    <a
      className={`button-ripple inline-flex items-center justify-center gap-2 rounded-[4px] px-5 py-3 text-[13px] font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${variants[variant]}`}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

function App() {
  const [isAdmin, setIsAdmin] = useState(() => typeof window !== "undefined" && window.location.hash === "#admin");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("amar-printers-admin-session") === "authenticated";
  });
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseAuthLoading, setFirebaseAuthLoading] = useState(isFirebaseConfigured);
  const [gallery, setGallery] = useState<GalleryItem[]>(() => {
    if (typeof window === "undefined") return galleryItems;
    try {
      const storedGallery = window.localStorage.getItem(GALLERY_STORAGE_KEY);
      return storedGallery ? JSON.parse(storedGallery) as GalleryItem[] : galleryItems;
    } catch {
      return galleryItems;
    }
  });
  const [siteImages, setSiteImages] = useState<SiteImages>(() => {
    if (typeof window === "undefined") return defaultSiteImages;
    try {
      const storedSiteImages = window.localStorage.getItem(SITE_IMAGES_STORAGE_KEY);
      return storedSiteImages ? { ...defaultSiteImages, ...JSON.parse(storedSiteImages) as Partial<SiteImages> } : defaultSiteImages;
    } catch {
      return defaultSiteImages;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  useEffect(() => {
    const handleHashChange = () => setIsAdmin(window.location.hash === "#admin");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      setFirebaseAuthLoading(false);
      return;
    }

    return onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      setFirebaseAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    const db = firebaseDb;
    if (!isFirebaseConfigured || !db) return;

    let cancelled = false;
    const loadFirebaseGallery = async () => {
      try {
        const snapshot = await getDocs(collection(db, "gallery"));
        const remoteGallery = snapshot.docs
          .map((galleryDoc) => {
            const data = galleryDoc.data();
            return {
              id: galleryDoc.id,
              title: String(data.title ?? "Untitled print"),
              category: String(data.category ?? "Business Cards"),
              image: String(data.imageUrl ?? data.image ?? ""),
              storagePath: data.storagePath ? String(data.storagePath) : undefined,
            };
          })
          .filter((item) => item.image);

        if (!cancelled) setGallery(remoteGallery);
      } catch {
        // Keep the bundled gallery visible if Firebase is not configured completely yet.
      }
    };

    void loadFirebaseGallery();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const db = firebaseDb;
    if (!isFirebaseConfigured || !db) return;

    return onSnapshot(doc(db, "siteSettings", "images"), (settingsSnapshot) => {
      if (!settingsSnapshot.exists()) return;
      const data = settingsSnapshot.data();
      const nextSiteImages: SiteImages = {
        heroImage: String(data.heroImage ?? defaultSiteImages.heroImage),
        aboutImage: String(data.aboutImage ?? defaultSiteImages.aboutImage),
        heroStoragePath: data.heroStoragePath ? String(data.heroStoragePath) : undefined,
        aboutStoragePath: data.aboutStoragePath ? String(data.aboutStoragePath) : undefined,
        updatedAt: Number(data.updatedAt ?? Date.now()),
      };
      setSiteImages(nextSiteImages);
      try {
        window.localStorage.setItem(SITE_IMAGES_STORAGE_KEY, JSON.stringify(nextSiteImages));
      } catch {
        // The remote Firebase value remains the source of truth if browser storage is unavailable.
      }
    }, () => {
      // Keep the local/default image visible if the public Firebase read is not available yet.
    });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(gallery));
    } catch {
      // Local image uploads can exceed browser storage limits; URL images still remain usable.
    }
  }, [gallery]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SITE_IMAGES_STORAGE_KEY, JSON.stringify(siteImages));
    } catch {
      // Local image uploads can exceed browser storage limits; URL images still remain usable.
    }
  }, [siteImages]);

  useEffect(() => {
    const handleSiteImageStorage = (event: StorageEvent) => {
      if (event.key !== SITE_IMAGES_STORAGE_KEY || !event.newValue) return;
      const newValue = event.newValue;
      try {
        setSiteImages((current) => ({ ...current, ...JSON.parse(newValue) as Partial<SiteImages> }));
      } catch {
        // Ignore malformed local values and keep the current image.
      }
    };

    window.addEventListener("storage", handleSiteImageStorage);
    return () => window.removeEventListener("storage", handleSiteImageStorage);
  }, []);

  const filteredGallery = useMemo(
    () => (activeFilter === "All" ? gallery : gallery.filter((item) => item.category === activeFilter)),
    [activeFilter, gallery],
  );
  const visibleGallery = showAllGallery ? filteredGallery : filteredGallery.slice(0, 6);

  useEffect(() => {
    document.body.style.overflow = selectedImage ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedImage]);

  const handleGalleryFilter = (filter: string) => {
    setActiveFilter(filter);
    setShowAllGallery(false);
  };

  const handleAdminLogin = async (username: string, password: string) => {
    if (isFirebaseConfigured && firebaseAuth) {
      const email = username.includes("@") ? username.trim() : "admin@amarprinters.com";
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      return;
    }

    if (username === "admin" && password === "admin") {
      window.sessionStorage.setItem("amar-printers-admin-session", "authenticated");
      setIsAdminAuthenticated(true);
      return;
    }

    throw new Error("Incorrect username or password.");
  };

  const handleAdminLogout = async () => {
    if (isFirebaseConfigured && firebaseAuth) {
      await signOut(firebaseAuth);
      return;
    }

    window.sessionStorage.removeItem("amar-printers-admin-session");
    setIsAdminAuthenticated(false);
  };

  if (isAdmin) {
    if (isFirebaseConfigured && firebaseAuthLoading) {
      return <AdminLoading />;
    }

    if (isFirebaseConfigured ? !firebaseUser : !isAdminAuthenticated) {
      return <AdminLogin onLogin={handleAdminLogin} firebaseMode={isFirebaseConfigured} />;
    }

    return (
      <AdminPage
        gallery={gallery}
        setGallery={setGallery}
        siteImages={siteImages}
        setSiteImages={setSiteImages}
        firebaseUser={firebaseUser}
        onLogout={handleAdminLogout}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#0f172a]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070b]/95 text-white shadow-[0_6px_30px_rgba(15,23,42,0.15)] backdrop-blur-xl">
        <div className="mx-auto flex h-[66px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <a href="#home" onClick={() => setMobileMenuOpen(false)} className="shrink-0">
            <Logo />
          </a>

          <nav className="hidden items-center gap-9 md:flex" aria-label="Primary navigation">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                className={`nav-link text-[12px] font-semibold tracking-[0.01em] transition-colors hover:text-[#e63946] ${index === 0 ? "text-[#e63946]" : "text-white/85"}`}
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-7 lg:flex">
            <a href="tel:+919482486971" className="flex items-center gap-2 text-[11px] font-semibold leading-[1.35] text-white/90 transition-colors hover:text-[#e63946]">
              <Phone size={16} className="text-[#e63946]" />
              <span>9482486971<br />9448136433</span>
            </a>
            <a href="mailto:apbctroad@gmail.com" className="flex items-center gap-2 text-[11px] font-semibold text-white/90 transition-colors hover:text-[#e63946]">
              <Mail size={16} className="text-[#e63946]" />
              apbctroad@gmail.com
            </a>
            <a href="tel:+919482486971" className="rounded-[3px] bg-[#e63946] px-3.5 py-2.5 text-[11px] font-extrabold text-white transition-colors hover:bg-[#c92d3a]">Call Now</a>
          </div>

          <button
            className="rounded-md border border-white/15 p-2 text-white md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/10 md:hidden"
              aria-label="Mobile navigation"
            >
              <div className="space-y-1 px-5 py-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block border-b border-white/10 py-3 text-sm font-semibold text-white/85 last:border-0 hover:text-[#e63946]"
                  >
                    {link.label}
                  </a>
                ))}
                <a href="tel:+919482486971" className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#e63946] px-4 py-3 text-xs font-bold">
                  <Phone size={15} /> Call Now
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main>
        <section id="home" className="hero relative isolate overflow-hidden bg-[#0b0d10] text-white">
          <div
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{
              backgroundImage:
                `url('${cacheSafeImageUrl(siteImages.heroImage, siteImages.updatedAt)}')`,
            }}
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,4,7,0.98)_0%,rgba(2,4,7,0.84)_34%,rgba(2,4,7,0.3)_72%,rgba(2,4,7,0.4)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(8,11,15,0.72),transparent_36%)]" />

          <div className="mx-auto flex min-h-[560px] max-w-[1240px] items-center px-5 py-20 lg:min-h-[590px] lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.12, delayChildren: 0.12 } },
              }}
              className="max-w-[570px]"
            >
              <motion.p variants={fadeUp} className="mb-4 text-[12px] font-bold tracking-[0.12em] text-[#e63946]">
                WELCOME TO
              </motion.p>
              <motion.h1 variants={fadeUp} className="font-black uppercase leading-[0.88] tracking-[-0.055em]">
                <span className="block text-[clamp(54px,8vw,91px)] text-white">Amar</span>
                <span className="block text-[clamp(54px,8vw,91px)] text-[#e63946]">Printers</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-5 font-[cursive] text-[22px] italic text-white/95 lg:text-[27px]">
                Printing Ideas with Fine Impressions
              </motion.p>
              <motion.p variants={fadeUp} className="mt-4 max-w-[480px] text-[14px] leading-6 text-white/80 lg:text-[15px]">
                We provide high-quality printing solutions with creativity, precision and perfection. Your ideas, beautifully printed.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                <ActionButton href="https://wa.me/919482486971" variant="whatsapp" external>
                  <MessageCircle size={17} fill="currentColor" /> WhatsApp
                </ActionButton>
                <ActionButton href="tel:+919482486971" variant="call">
                  <Phone size={16} fill="currentColor" /> Call Now
                </ActionButton>
                <ActionButton href="mailto:apbctroad@gmail.com" variant="email">
                  <Mail size={16} /> Email Us
                </ActionButton>
              </motion.div>
            </motion.div>
          </div>

          <motion.a
            href="#about"
            aria-label="Scroll to about"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.7 }}
            className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[9px] font-bold uppercase tracking-[0.25em] text-white/60"
          >
            <span>Scroll to explore</span>
            <span className="scroll-line"><ArrowDown size={13} /></span>
          </motion.a>
        </section>

        <section id="about" className="border-b border-slate-100 bg-white">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 md:grid-cols-[1fr_0.92fr] md:items-center md:gap-16 md:py-20 lg:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="group overflow-hidden rounded-[4px]">
              <img
                src={cacheSafeImageUrl(siteImages.aboutImage, siteImages.updatedAt)}
                alt="The welcoming interior of Amar Printers"
                className="aspect-[1.18] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
              <p className="section-kicker">ABOUT US</p>
              <h2 className="section-title mt-2">We Print Your Imagination</h2>
              <p className="mt-5 max-w-[510px] text-[14px] leading-7 text-slate-600">
                Amar Printers is a trusted printing service in Kaikamba, Bantwal, offering high-quality graphic designing, offset printing, screen printing and digital printing. We are committed to delivering professional printing solutions with fast service and excellent quality.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { title: "Quality", sub: "Assurance", icon: ShieldCheck },
                  { title: "Fast", sub: "Delivery", icon: Clock3 },
                  { title: "Affordable", sub: "Pricing", icon: Tag },
                  { title: "Experienced", sub: "Team", icon: HeartHandshake },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex flex-col items-start gap-2">
                      <Icon size={24} strokeWidth={1.6} className="text-[#0f172a]" />
                      <p className="text-[12px] font-extrabold leading-4 text-[#0f172a]">{item.title}<br />{item.sub}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="services" className="bg-[#fbfbfb] py-16 md:py-20">
          <div className="mx-auto max-w-[1270px] px-5 lg:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="text-center">
              <p className="section-kicker">OUR SERVICES</p>
              <h2 className="section-title mt-2">What We Do</h2>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.12 }}
              variants={{ visible: { transition: { staggerChildren: 0.045 } } }}
              className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            >
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <motion.div variants={fadeUp} key={service.name} className="service-card group flex min-h-[124px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-5 text-center shadow-[0_3px_12px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#e63946]/40 hover:shadow-[0_14px_25px_rgba(15,23,42,0.1)]">
                    <Icon size={27} strokeWidth={1.45} className="mb-4 text-[#e63946] transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-[12px] font-extrabold leading-[1.25] text-[#111827]">{service.name}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section id="gallery" className="bg-[#141a1f] py-16 text-white md:py-20">
          <div className="mx-auto max-w-[1270px] px-5 lg:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="text-center">
              <p className="section-kicker">OUR GALLERY</p>
              <h2 className="section-title mt-2 text-white">Our Latest Work</h2>
            </motion.div>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {galleryFilters.map((filter) => (
                <button
                  key={filter}
                  className={`rounded-full px-4 py-2 text-[10px] font-bold transition-all duration-300 ${activeFilter === filter ? "bg-[#e63946] text-white shadow-[0_6px_16px_rgba(230,57,70,0.25)]" : "bg-white/[0.07] text-white/75 hover:bg-white/15 hover:text-white"}`}
                  onClick={() => handleGalleryFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
            <motion.div layout className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <AnimatePresence mode="popLayout">
                {visibleGallery.map((item) => (
                  <motion.button
                    layout
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.3 }}
                    key={item.id ?? `${item.category}-${item.title}`}
                    onClick={() => setSelectedImage(item)}
                    className="group relative aspect-[1.06] overflow-hidden rounded-[4px] text-left"
                    aria-label={`Open ${item.category} image`}
                  >
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-70" />
                    <span className="absolute bottom-3 left-3 right-3 translate-y-2 text-[10px] font-bold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">{item.category}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
            {filteredGallery.length > 6 && (
              <div className="mt-7 text-center">
                <button onClick={() => setShowAllGallery((show) => !show)} className="button-ripple inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-6 py-3 text-[12px] font-bold text-white transition-all hover:bg-[#c92d3a] hover:shadow-lg">
                  {showAllGallery ? "Show Less" : "View More"} <ArrowUpRight size={15} />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-[1240px] px-5 lg:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="text-center">
              <p className="section-kicker">WHY CHOOSE US</p>
              <h2 className="section-title mt-2">Quality You Can Trust</h2>
            </motion.div>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
              {reasons.map((reason, index) => {
                const Icon = reason.icon;
                return (
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ delay: index * 0.05 }}
                    key={reason.title}
                    className="flex flex-col items-center text-center"
                  >
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1f1] text-[#e63946]">
                      <Icon size={21} strokeWidth={1.8} />
                    </span>
                    <h3 className="text-[13px] font-extrabold">{reason.title}</h3>
                    <p className="mt-2 max-w-[170px] text-[11px] leading-5 text-slate-600">{reason.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contact" className="border-t border-slate-100 bg-white py-16 md:py-20">
          <div className="mx-auto max-w-[1100px] px-5 lg:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="text-center">
              <p className="section-kicker">CONTACT US</p>
              <h2 className="section-title mt-2">Get In Touch</h2>
            </motion.div>
            <div className="mt-10 grid items-stretch gap-8 md:grid-cols-[0.78fr_1.35fr] md:gap-12">
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="flex flex-col justify-center gap-6">
                <a href="https://maps.google.com/?q=Amar+Printers+Kaikamba+Bantwal" target="_blank" rel="noreferrer" className="contact-row group">
                  <MapPin className="contact-icon" size={21} />
                  <span>Polali Cross Road, Kaikamba,<br />B.C. Road, Bantwal, D.K. - 574219</span>
                </a>
                <div className="contact-row">
                  <Phone className="contact-icon" size={19} />
                  <span><a href="tel:+919482486971" className="hover:text-[#e63946]">9482486971</a><br /><a href="tel:+919448136433" className="hover:text-[#e63946]">9448136433</a></span>
                </div>
                <a href="mailto:apbctroad@gmail.com" className="contact-row hover:text-[#e63946]">
                  <Mail className="contact-icon" size={19} />
                  <span>apbctroad@gmail.com</span>
                </a>
                <div className="contact-row">
                  <Clock3 className="contact-icon" size={19} />
                  <span><strong>Mon - Sat</strong> · 9:00 AM - 7:00 PM<br /><strong>Sunday</strong> · 10:00 AM - 2:00 PM</span>
                </div>
              </motion.div>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="min-h-[285px] overflow-hidden rounded-[5px] border border-slate-200 bg-slate-100 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
                <iframe
                  title="Find Amar Printers on the map"
                  src="https://www.google.com/maps?q=Amar+Printers+Kaikamba+Bantwal&output=embed"
                  className="h-full min-h-[285px] w-full border-0 grayscale-[0.15]"
                  loading="lazy"
                />
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#07131d] text-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.7fr_1fr_1.1fr_1.2fr] lg:gap-8 lg:px-8">
          <div>
            <Logo light />
            <p className="mt-4 max-w-[220px] text-[11px] leading-5 text-white/55">Printing Ideas with Fine Impressions</p>
            <div className="mt-5 flex items-center gap-2">
              <a href="#" aria-label="Facebook" className="social-link"><span className="text-[11px] font-black">f</span></a>
              <a href="#" aria-label="Instagram" className="social-link"><span className="text-[10px] font-black">ig</span></a>
              <a href="https://wa.me/919482486971" aria-label="WhatsApp" className="social-link" target="_blank" rel="noreferrer"><MessageCircle size={14} fill="currentColor" /></a>
            </div>
          </div>
          <FooterColumn title="Quick Links" links={navLinks.map((link) => ({ label: link.label, href: link.href }))} />
          <FooterColumn title="Our Services" links={services.slice(0, 6).map((service) => ({ label: service.name, href: "#services" }))} />
          <div>
            <h3 className="footer-title">Contact Info</h3>
            <div className="mt-4 space-y-3 text-[11px] leading-4 text-white/65">
              <p className="flex gap-2"><Phone size={13} className="shrink-0 text-[#e63946]" />9482486971<br />9448136433</p>
              <p className="flex gap-2"><Mail size={13} className="mt-0.5 shrink-0 text-[#e63946]" />apbctroad@gmail.com</p>
              <p className="flex gap-2"><MapPin size={13} className="mt-0.5 shrink-0 text-[#e63946]" />Polali Cross Road, Kaikamba,<br />B.C. Road, Bantwal, D.K. - 574219</p>
            </div>
          </div>
          <div>
            <h3 className="footer-title">Business Hours</h3>
            <p className="mt-4 text-[11px] leading-5 text-white/65">Mon - Sat · 9:00 AM - 7:00 PM<br />Sunday · 10:00 AM - 2:00 PM</p>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-4 text-center text-[10px] text-white/45">
          © 2024 Amar Printers. All Rights Reserved. <a href="#admin" className="ml-2 text-white/30 transition-colors hover:text-white/75">Admin</a>
        </div>
      </footer>

      <a href="tel:+919482486971" className="fixed bottom-5 left-4 z-30 flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-[#e63946] text-white shadow-[0_9px_25px_rgba(230,57,70,0.35)] transition-transform hover:scale-105 sm:bottom-7 sm:left-7" aria-label="Call Amar Printers">
        <Phone size={22} fill="currentColor" />
        <span className="mt-1 text-[9px] font-bold">Call Now</span>
      </a>
      <a href="https://wa.me/919482486971" target="_blank" rel="noreferrer" className="fixed bottom-5 right-4 z-30 flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-[#24b43a] text-white shadow-[0_9px_25px_rgba(36,180,58,0.32)] transition-transform hover:scale-105 sm:bottom-7 sm:right-7" aria-label="Chat on WhatsApp">
        <MessageCircle size={24} fill="currentColor" />
        <span className="mt-1 text-[9px] font-bold">WhatsApp</span>
      </a>
      <a href="#contact" className="fixed right-0 top-[38%] z-30 hidden -translate-y-1/2 rounded-l-[4px] bg-[#e63946] px-3 py-4 text-[11px] font-bold text-white shadow-lg [writing-mode:vertical-rl] md:block">
        <span className="mb-2 inline-block -rotate-90"><Phone size={12} fill="currentColor" /></span> Get in Touch
      </a>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20" onClick={() => setSelectedImage(null)} aria-label="Close image viewer"><X size={23} /></button>
            <button className="absolute left-3 top-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-7" onClick={(event) => { event.stopPropagation(); changeGalleryImage(-1, selectedImage, filteredGallery, setSelectedImage); }} aria-label="Previous image"><ChevronLeft size={24} /></button>
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={selectedImage.image}
              alt={selectedImage.title}
              className="max-h-[84vh] max-w-[88vw] rounded-md object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
            <button className="absolute right-3 top-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-7" onClick={(event) => { event.stopPropagation(); changeGalleryImage(1, selectedImage, filteredGallery, setSelectedImage); }} aria-label="Next image"><ChevronRight size={24} /></button>
            <p className="absolute bottom-5 left-1/2 max-w-[80%] -translate-x-1/2 text-center text-xs font-semibold text-white/80">{selectedImage.title} · {selectedImage.category}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="footer-title">{title}</h3>
      <div className="mt-4 space-y-2 text-[11px] text-white/65">
        {links.map((link) => <a key={link.label} href={link.href} className="block transition-colors hover:text-white">{link.label}</a>)}
      </div>
    </div>
  );
}

function AdminPage({
  gallery,
  setGallery,
  siteImages,
  setSiteImages,
  firebaseUser,
  onLogout,
}: {
  gallery: GalleryItem[];
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  siteImages: SiteImages;
  setSiteImages: React.Dispatch<React.SetStateAction<SiteImages>>;
  firebaseUser: User | null;
  onLogout: () => void | Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(galleryFilters[1]);
  const [imageSource, setImageSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");

  const filteredGallery = useMemo(
    () => (filter === "All" ? gallery : gallery.filter((item) => item.category === filter)),
    [filter, gallery],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Please choose an image smaller than 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSource(String(reader.result));
      setSelectedFile(file);
      setFileName(file.name);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (value: string) => {
    setImageSource(value);
    setSelectedFile(null);
    setFileName("");
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !imageSource.trim()) {
      setError("Add a title and choose an image or paste an image URL.");
      return;
    }

    setError("");
    try {
      if (isFirebaseConfigured && firebaseDb && firebaseStorage && firebaseUser) {
        let finalImageUrl = imageSource;
        let uploadedStoragePath: string | undefined;

        if (selectedFile) {
          const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          uploadedStoragePath = `gallery/${firebaseUser.uid}/${Date.now()}-${safeFileName}`;
          const uploadedFile = await uploadBytes(storageRef(firebaseStorage, uploadedStoragePath), selectedFile);
          finalImageUrl = await getDownloadURL(uploadedFile.ref);
        }

        const galleryDoc = await addDoc(collection(firebaseDb, "gallery"), {
          title: title.trim(),
          category,
          imageUrl: finalImageUrl,
          storagePath: uploadedStoragePath ?? null,
          createdAt: serverTimestamp(),
        });

        setGallery((items) => [{ id: galleryDoc.id, title: title.trim(), category, image: finalImageUrl, storagePath: uploadedStoragePath }, ...items]);
      } else {
        setGallery((items) => [
          {
            id: `gallery-${Date.now()}`,
            title: title.trim(),
            category,
            image: imageSource,
          },
          ...items,
        ]);
      }

      setTitle("");
      setCategory(galleryFilters[1]);
      setImageSource("");
      setSelectedFile(null);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (firebaseError) {
      setError(firebaseError instanceof Error ? firebaseError.message : "Could not save this image. Check your Firebase setup.");
    }
  };

  const deleteImage = async (item: GalleryItem, index: number) => {
    try {
      if (isFirebaseConfigured && firebaseDb && item.id) {
        await deleteDoc(doc(firebaseDb, "gallery", item.id));
        if (item.storagePath && firebaseStorage) {
          await deleteObject(storageRef(firebaseStorage, item.storagePath)).catch(() => undefined);
        }
      }
      setGallery((items) => items.filter((galleryItem, itemIndex) => (item.id ? galleryItem.id !== item.id : itemIndex !== index)));
    } catch (firebaseError) {
      setError(firebaseError instanceof Error ? firebaseError.message : "Could not delete this image.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#0f172a]">
      <header className="border-b border-white/10 bg-[#05070b] text-white shadow-[0_6px_30px_rgba(15,23,42,0.15)]">
        <div className="mx-auto flex h-[70px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <a href="#home" className="shrink-0"><Logo /></a>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] font-semibold text-white/55 sm:block">Gallery Admin</span>
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-[4px] border border-white/20 px-3.5 py-2 text-[11px] font-bold transition hover:border-white/50 hover:bg-white/10" type="button">
              <LogOut size={14} /> Logout
            </button>
            <a href="#home" className="inline-flex items-center gap-2 rounded-[4px] border border-white/20 px-3.5 py-2 text-[11px] font-bold transition hover:border-white/50 hover:bg-white/10">
              Back to Website
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 py-10 lg:px-8 lg:py-14">
        <div className="mb-9 max-w-[620px]">
          <p className="section-kicker">AMAR PRINTERS</p>
          <h1 className="mt-2 text-[clamp(30px,4vw,48px)] font-black tracking-[-0.055em]">Manage your gallery</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Upload new work or add an image URL. New images appear instantly in the public Gallery section.</p>
        </div>

        <SiteImageManager siteImages={siteImages} setSiteImages={setSiteImages} firebaseUser={firebaseUser} />

        <div className="grid gap-8 lg:grid-cols-[360px_1fr] lg:items-start">
          <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1f1] text-[#e63946]"><ImagePlus size={19} /></span>
              <div>
                <h2 className="text-sm font-extrabold">Add gallery image</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">JPEG, PNG, or WebP up to 4 MB</p>
              </div>
            </div>

            <label className="mt-6 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500" htmlFor="gallery-title">Image title</label>
            <input id="gallery-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Premium business cards" className="admin-input mt-2" />

            <label className="mt-5 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500" htmlFor="gallery-category">Category</label>
            <select id="gallery-category" value={category} onChange={(event) => setCategory(event.target.value)} className="admin-input mt-2">
              {galleryFilters.slice(1).map((item) => <option key={item}>{item}</option>)}
            </select>

            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-xs font-bold text-slate-700 transition hover:border-[#e63946] hover:bg-[#fff8f8] hover:text-[#e63946]">
              <Upload size={16} /> {fileName || "Choose image from device"}
            </button>

            <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
            <label className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500" htmlFor="gallery-url">Image URL</label>
            <input id="gallery-url" value={imageSource.startsWith("data:") ? "" : imageSource} onChange={(event) => handleUrlChange(event.target.value)} placeholder="https://example.com/print.jpg" className="admin-input mt-2" />

            {imageSource && (
              <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img src={imageSource} alt="Selected gallery preview" className="aspect-[1.7] w-full object-cover" />
              </div>
            )}
            {error && <p className="mt-3 text-[11px] font-semibold text-[#e63946]">{error}</p>}
            <button type="submit" className="button-ripple mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a] hover:shadow-lg"><ImagePlus size={16} /> Add To Gallery</button>
            <p className="mt-4 text-[10px] leading-4 text-slate-400">{isFirebaseConfigured ? "Connected to Firebase. Images are stored in Firebase Storage and gallery records in Firestore." : "Firebase is not configured yet, so this is using browser-only local storage. Add the VITE_FIREBASE values to connect it."}</p>
          </form>

          <section>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Published work</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">{gallery.length} gallery images</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {galleryFilters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-3 py-2 text-[10px] font-bold transition ${filter === item ? "bg-[#0f172a] text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-[#0f172a]"}`}>{item}</button>)}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredGallery.map((item, index) => (
                <div key={item.id ?? `${item.category}-${item.title}-${index}`} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_5px_20px_rgba(15,23,42,0.05)]">
                  <img src={item.image} alt={item.title} className="aspect-[1.05] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="p-3">
                    <p className="truncate text-[11px] font-extrabold text-slate-800">{item.title}</p>
                    <p className="mt-1 text-[10px] font-semibold text-[#e63946]">{item.category}</p>
                  </div>
                  <button onClick={() => void deleteImage(item, gallery.indexOf(item))} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-[#e63946]" aria-label={`Delete ${item.title}`}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            {filteredGallery.length === 0 && <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No images in this category yet.</div>}
          </section>
        </div>
      </main>
    </div>
  );
}

function SiteImageManager({
  siteImages,
  setSiteImages,
  firebaseUser,
}: {
  siteImages: SiteImages;
  setSiteImages: React.Dispatch<React.SetStateAction<SiteImages>>;
  firebaseUser: User | null;
}) {
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const aboutFileInputRef = useRef<HTMLInputElement>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [aboutFile, setAboutFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState(siteImages.heroImage);
  const [aboutPreview, setAboutPreview] = useState(siteImages.aboutImage);
  const [heroFileName, setHeroFileName] = useState("");
  const [aboutFileName, setAboutFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!heroFile) setHeroPreview(siteImages.heroImage);
  }, [heroFile, siteImages.heroImage]);

  useEffect(() => {
    if (!aboutFile) setAboutPreview(siteImages.aboutImage);
  }, [aboutFile, siteImages.aboutImage]);

  const readImageFile = (
    event: ChangeEvent<HTMLInputElement>,
    type: "hero" | "about",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Please choose an image smaller than 8 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (type === "hero") {
        setHeroFile(file);
        setHeroFileName(file.name);
        setHeroPreview(String(reader.result));
      } else {
        setAboutFile(file);
        setAboutFileName(file.name);
        setAboutPreview(String(reader.result));
      }
      setError("");
      setMessage("");
    };
    reader.readAsDataURL(file);
  };

  const saveSiteImages = async () => {
    if (!heroPreview.trim() || !aboutPreview.trim()) {
      setError("Choose both website images or add image URLs.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const nextSiteImages: SiteImages = {
        ...siteImages,
        heroImage: heroPreview,
        aboutImage: aboutPreview,
        updatedAt: Date.now(),
        heroStoragePath: heroFile ? undefined : siteImages.heroStoragePath,
        aboutStoragePath: aboutFile ? undefined : siteImages.aboutStoragePath,
      };

      if (isFirebaseConfigured) {
        if (!firebaseDb || !firebaseStorage || !firebaseUser) {
          throw new Error("Firebase is not ready. Please sign in again and try once more.");
        }

        if (heroFile) {
          const safeFileName = heroFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const path = `site-images/${firebaseUser.uid}/hero-${Date.now()}-${safeFileName}`;
          const uploadedFile = await uploadBytes(storageRef(firebaseStorage, path), heroFile);
          nextSiteImages.heroImage = await getDownloadURL(uploadedFile.ref);
          nextSiteImages.heroStoragePath = path;
        }

        if (aboutFile) {
          const safeFileName = aboutFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const path = `site-images/${firebaseUser.uid}/about-${Date.now()}-${safeFileName}`;
          const uploadedFile = await uploadBytes(storageRef(firebaseStorage, path), aboutFile);
          nextSiteImages.aboutImage = await getDownloadURL(uploadedFile.ref);
          nextSiteImages.aboutStoragePath = path;
        }

        await setDoc(doc(firebaseDb, "siteSettings", "images"), {
          heroImage: nextSiteImages.heroImage,
          aboutImage: nextSiteImages.aboutImage,
          heroStoragePath: nextSiteImages.heroStoragePath ?? null,
          aboutStoragePath: nextSiteImages.aboutStoragePath ?? null,
          updatedAt: nextSiteImages.updatedAt,
        }, { merge: true });

        if (siteImages.heroStoragePath && siteImages.heroStoragePath !== nextSiteImages.heroStoragePath && firebaseStorage) {
          await deleteObject(storageRef(firebaseStorage, siteImages.heroStoragePath)).catch(() => undefined);
        }
        if (siteImages.aboutStoragePath && siteImages.aboutStoragePath !== nextSiteImages.aboutStoragePath && firebaseStorage) {
          await deleteObject(storageRef(firebaseStorage, siteImages.aboutStoragePath)).catch(() => undefined);
        }
      } else {
        try {
          window.localStorage.setItem(SITE_IMAGES_STORAGE_KEY, JSON.stringify(nextSiteImages));
        } catch {
          throw new Error("This image is too large for browser-only storage. Configure Firebase or paste an image URL instead.");
        }
      }

      setSiteImages(nextSiteImages);
      setHeroFile(null);
      setAboutFile(null);
      setHeroFileName("");
      setAboutFileName("");
      if (heroFileInputRef.current) heroFileInputRef.current.value = "";
      if (aboutFileInputRef.current) aboutFileInputRef.current.value = "";
      setMessage("Website images updated successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the website images.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">WEBSITE IMAGES</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Update the main visuals</h2>
          <p className="mt-2 max-w-[650px] text-sm leading-6 text-slate-600">Change the hero background and the shop image shown in the About Us section. Save once to publish both updates.</p>
        </div>
        {isFirebaseConfigured && <span className="inline-flex items-center self-start rounded-full bg-[#ecfdf3] px-3 py-2 text-[10px] font-extrabold text-[#15803d] sm:self-auto">Firebase connected</span>}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold">Hero background image</h3>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">The large printing press image behind the homepage hero.</p>
            </div>
            <ImagePlus size={18} className="shrink-0 text-[#e63946]" />
          </div>
          <div className="mt-4 overflow-hidden rounded-lg bg-slate-200">
            <img src={heroPreview} alt="Hero background preview" className="aspect-[1.8] w-full object-cover" />
          </div>
          <input ref={heroFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => readImageFile(event, "hero")} className="hidden" />
          <button type="button" onClick={() => heroFileInputRef.current?.click()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition hover:border-[#e63946] hover:bg-[#fff8f8] hover:text-[#e63946]"><Upload size={15} /> {heroFileName || "Choose new hero image"}</button>
          <input value={heroFile ? "" : heroPreview} onChange={(event) => { setHeroFile(null); setHeroFileName(""); setHeroPreview(event.target.value); setMessage(""); }} className="admin-input mt-3" placeholder="Or paste a hero image URL" />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold">About/shop image</h3>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">The shop image shown on the second About Us section.</p>
            </div>
            <ImagePlus size={18} className="shrink-0 text-[#e63946]" />
          </div>
          <div className="mt-4 overflow-hidden rounded-lg bg-slate-200">
            <img src={aboutPreview} alt="About shop preview" className="aspect-[1.8] w-full object-cover" />
          </div>
          <input ref={aboutFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => readImageFile(event, "about")} className="hidden" />
          <button type="button" onClick={() => aboutFileInputRef.current?.click()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition hover:border-[#e63946] hover:bg-[#fff8f8] hover:text-[#e63946]"><Upload size={15} /> {aboutFileName || "Choose new shop image"}</button>
          <input value={aboutFile ? "" : aboutPreview} onChange={(event) => { setAboutFile(null); setAboutFileName(""); setAboutPreview(event.target.value); setMessage(""); }} className="admin-input mt-3" placeholder="Or paste a shop image URL" />
        </div>
      </div>

      {error && <p className="mt-4 text-[11px] font-semibold text-[#e63946]">{error}</p>}
      {message && <p className="mt-4 text-[11px] font-semibold text-[#15803d]">{message}</p>}
      <button type="button" onClick={() => void saveSiteImages()} disabled={saving} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"><ImagePlus size={16} /> {saving ? "Saving images..." : "Save Website Images"}</button>
    </section>
  );
}

function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07131d] px-5 text-white">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 border-t-[#e63946] animate-spin" />
        <p className="mt-5 text-sm font-bold">Checking admin session...</p>
      </div>
    </div>
  );
}

function AdminLogin({
  onLogin,
  firebaseMode,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  firebaseMode: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await onLogin(username.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error && loginError.message.includes("auth/") ? "Firebase could not sign you in. Check the admin account details." : "Incorrect username or password.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07131d] px-5 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(230,57,70,0.14),transparent_34%),radial-gradient(circle_at_82%_80%,rgba(244,180,0,0.08),transparent_30%)]" />
      <div className="relative w-full max-w-[410px]">
        <div className="mb-8 flex justify-center"><a href="#home"><Logo /></a></div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1f1] text-[#e63946]"><LockKeyhole size={22} /></div>
          <p className="section-kicker mt-6">PRIVATE AREA</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[#0f172a]">Admin login</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Sign in to manage the Amar Printers gallery.</p>

          <label htmlFor="admin-username" className="mt-7 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Username</label>
          <input id="admin-username" autoComplete="username" value={username} onChange={(event) => { setUsername(event.target.value); setError(""); }} className="admin-input mt-2" placeholder={firebaseMode ? "admin or admin@amarprinters.com" : "Enter username"} />

          <label htmlFor="admin-password" className="mt-5 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} className="admin-input mt-2" placeholder={firebaseMode ? "Firebase password (6+ characters)" : "Enter password"} />

          {error && <p className="mt-3 text-[11px] font-semibold text-[#e63946]">{error}</p>}
          <button type="submit" className="button-ripple mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a] hover:shadow-lg"><LockKeyhole size={15} /> Login To Admin</button>
          {firebaseMode && <p className="mt-4 text-[10px] leading-4 text-slate-400">Firebase mode uses <strong>admin</strong> as the username mapped to <strong>admin@amarprinters.com</strong>. Firebase requires a password of at least 6 characters.</p>}
          <p className="mt-5 text-center text-[10px] text-slate-400">Return to the <a href="#home" className="font-bold text-[#e63946] hover:underline">main website</a></p>
        </form>
      </div>
    </div>
  );
}

function changeGalleryImage(
  direction: number,
  selected: GalleryItem,
  items: GalleryItem[],
  setSelected: (item: GalleryItem) => void,
) {
  const currentIndex = items.findIndex((item) => item.title === selected.title);
  const nextIndex = (currentIndex + direction + items.length) % items.length;
  setSelected(items[nextIndex]);
}

export default App;
