import React, { useEffect, useState, useRef } from "react";
import {
  X,
  Mic,
  Search,
  Users,
  Check,
  AlertCircle,
  Lock,
  MapPin,
  Calendar,
  Map as MapIcon,
  Layers,
  ArrowUp,
  Trophy,
  Info,
  Clock,
  CheckCircle,
  XCircle,
  Monitor,
  Image as ImageIcon,
  FileText,
  Edit,
  Trash2,
  Plus,
  Save,
  Phone,
  Filter,
  Upload,
  Mail,
  CreditCard,
  Delete,
  RefreshCcw,
} from "lucide-react";
import L from "leaflet";
import {
  ContentType,
  AppMode,
  ImageConfig,
  PresentationContent,
  SportsEvent,
  League,
  Room,
  RentalConfig,
} from "../types";
import {
  fetchSportsData,
  fetchImages,
  updateImages,
  fetchPresentationData,
  updatePresentationData,
  getAgenda,
  addAgendaItem,
  deleteAgendaItem,
  getLeagues,
  addLeagueItem,
  deleteLeagueItem,
  getRooms,
  addRoomItem,
  deleteRoomItem,
  fetchRentalConfig,
  updateRentalConfig,
  fetchAdminPin,
  updateAdminPin,
} from "../services/geminiService";

interface ContentModalProps {
  type: ContentType;
  onClose: () => void;
  appMode: AppMode;
  onConfigurationChange?: () => void;
  version?: number;
}

type AdminTab =
  | "SCREENSAVER"
  | "HOME"
  | "PRESENTATION"
  | "LEAGUES"
  | "AGENDA"
  | "RENTAL"
  | "SECURITY"
  | "MAINTENANCE";

// --- SUB-COMPONENT FOR IMAGE DRAG & DROP ---
const ImageInputWithDrop = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`bg-black/20 p-4 rounded-xl border transition-all duration-200 mb-4 ${isDragging
        ? "border-[#0047BB] bg-[#0047BB]/20 scale-[1.01] shadow-[0_0_15px_rgba(0,71,187,0.3)]"
        : "border-white/10"
        }`}
    >
      <label className="block text-sm font-bold uppercase tracking-wider text-neutral-400 mb-2 flex justify-between items-center">
        {label}
        <span
          className={`text-[10px] normal-case font-normal flex items-center gap-1 ${isDragging ? "text-[#0047BB] font-bold" : "text-neutral-600"}`}
        >
          <Upload size={12} />{" "}
          {isDragging ? "Déposez pour uploader" : "Glisser-déposer une image"}
        </span>
      </label>
      <div className="flex gap-4">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-grow bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#0047BB] focus:outline-none placeholder-neutral-600 text-sm"
          placeholder="URL https://... ou glisser un fichier local"
        />
        <div className="w-16 h-10 rounded-lg bg-neutral-800 overflow-hidden border border-white/20 flex-shrink-0 relative group">
          {value ? (
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600">
              <ImageIcon size={16} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ContentModal: React.FC<ContentModalProps> = ({
  type,
  onClose,
  appMode,
  onConfigurationChange,
  version,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [presentationData, setPresentationData] =
    useState<PresentationContent | null>(null);
  const [rentalConfig, setRentalConfig] = useState<RentalConfig | null>(null);
  const [loading, setLoading] = useState(false);

  // Search and Filter State for Leagues
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");

  // Image Config State
  const [imageConfig, setImageConfig] = useState<ImageConfig | null>(null);

  // Admin specific states
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>("SCREENSAVER");
  const [storedPin, setStoredPin] = useState("0000");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Admin Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const isHandicap = appMode === AppMode.HANDICAP;

  // Initial Load
  useEffect(() => {
    const init = async () => {
      if (
        type !== ContentType.NONE &&
        type !== ContentType.SEARCH &&
        type !== ContentType.ADMIN
      ) {
        await loadData();
        setImageConfig(await fetchImages());
      }
      if (type === ContentType.ADMIN) {
        setIsAdminAuthenticated(false);
        setAdminPassword("");
        setLoginError(false);
        setStoredPin(await fetchAdminPin());
      }
    };
    init();
  }, [type, version]);

  // Map Initialization Effect
  useEffect(() => {
    if (
      type === ContentType.PRESENTATION &&
      mapContainerRef.current &&
      !mapInstanceRef.current
    ) {
      // Tomblaine Coordinates
      const lat = 48.6844;
      const lng = 6.2057;

      const map = L.map(mapContainerRef.current).setView([lat, lng], 15);

      // CartoDB Voyager Tiles (Clean & Modern)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
        },
      ).addTo(map);

      // Custom Marker
      L.circleMarker([lat, lng], {
        radius: 12,
        fillColor: "#0047BB",
        color: "#fff",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .addTo(map)
        .bindPopup(
          `
            <div style="text-align: center; font-family: sans-serif;">
                <b style="color: #0047BB; font-size: 14px;">Maison Régionale des Sports</b><br/>
                <span style="font-size: 12px; color: #666;">13 Rue Jean Moulin<br/>54510 Tomblaine</span>
            </div>
          `,
        )
        .openPopup();

      mapInstanceRef.current = map;
    }

    // Cleanup map on unmount or type change
    return () => {
      if (type !== ContentType.PRESENTATION && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [type, presentationData]); // Re-run if data loads (layout might shift)

  // Admin Authenticated Load
  useEffect(() => {
    const loadAdmin = async () => {
      if (type === ContentType.ADMIN && isAdminAuthenticated) {
        await loadAdminData(activeAdminTab);
        setImageConfig(await fetchImages());
        setPresentationData(await fetchPresentationData());
      }
    };
    loadAdmin();
  }, [isAdminAuthenticated, type, activeAdminTab]);

  const loadData = async () => {
    setLoading(true);
    const result = await fetchSportsData(type);

    if (type === ContentType.PRESENTATION) {
      setPresentationData(result);
      setData([]); // Clear list data to prevent crashes in default render
    } else {
      setData(Array.isArray(result) ? result : []);
    }

    if (type === ContentType.RENTAL) {
      setRentalConfig(await fetchRentalConfig());
    }

    setLoading(false);
  };

  const loadAdminData = async (tab: AdminTab) => {
    setLoading(true);
    if (tab === "AGENDA") {
      setData(await getAgenda());
    } else if (tab === "LEAGUES") {
      setData(await getLeagues());
    } else if (tab === "RENTAL") {
      setData(await getRooms());
      setRentalConfig(await fetchRentalConfig());
    }
    setLoading(false);
    setIsEditing(false);
    setCurrentItem(null);
  };

  // --- CRUD HANDLERS ---

  const handleDelete = async (id: string) => {
    if (!id) {
      alert("Erreur technique : L'identifiant de l'élément est manquant.");
      return;
    }

    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer cet élément définitivement ?",
      )
    )
      return;

    setLoading(true);
    try {
      let newData: any[] = [];
      if (activeAdminTab === "AGENDA") {
        await deleteAgendaItem(id);
        newData = await getAgenda();
      } else if (activeAdminTab === "LEAGUES") {
        await deleteLeagueItem(id);
        newData = await getLeagues();
      } else if (activeAdminTab === "RENTAL") {
        await deleteRoomItem(id);
        newData = await getRooms();
      }
      setData([...newData]);
    } catch (e) {
      console.error("Delete failed", e);
      alert("Une erreur est survenue lors de la suppression.");
    }
    setLoading(false);
    if (onConfigurationChange) onConfigurationChange();
  };

  const handleSave = async () => {
    setLoading(true);

    if (activeAdminTab === "PRESENTATION") {
      await updatePresentationData(currentItem);
      setPresentationData(currentItem);
      setIsEditing(false);
      setCurrentItem(null);
      setLoading(false);
      return;
    }

    const itemToSave = {
      ...currentItem,
      id: currentItem.id || Date.now().toString(),
    };

    if (activeAdminTab === "AGENDA") {
      await addAgendaItem(itemToSave);
      setData(await getAgenda());
    } else if (activeAdminTab === "LEAGUES") {
      await addLeagueItem(itemToSave);
      setData(await getLeagues());
    } else if (activeAdminTab === "RENTAL") {
      await addRoomItem(itemToSave);
      setData(await getRooms());
    }

    setIsEditing(false);
    setCurrentItem(null);
    setLoading(false);
    if (onConfigurationChange) onConfigurationChange();
  };

  const handleSaveRentalConfig = async () => {
    if (!rentalConfig) return;
    setLoading(true);
    await updateRentalConfig(rentalConfig);
    setLoading(false);
  };

  const handleEdit = (item: any) => {
    setCurrentItem({ ...item });
    setIsEditing(true);
  };

  const handleAddNew = () => {
    if (activeAdminTab === "AGENDA") {
      setCurrentItem({
        title: "",
        date: "",
        location: "",
        description: "",
        type: "Autre",
        image: "",
      });
    } else if (activeAdminTab === "LEAGUES") {
      setCurrentItem({
        title: "",
        description: "",
        type: "Collectif",
        phone: "",
      });
    } else if (activeAdminTab === "RENTAL") {
      setCurrentItem({
        name: "",
        capacity: 0,
        description: "",
        features: [],
        image: "",
        priceHalfDay: "",
        priceFullDay: "",
      });
    }
    setIsEditing(true);
  };

  const handlePinInput = (val: string) => {
    setLoginError(false);
    if (val === "C") {
      setAdminPassword("");
    } else if (val === "BACK") {
      setAdminPassword((prev) => prev.slice(0, -1));
    } else if (adminPassword.length < 4) {
      const newPin = adminPassword + val;
      setAdminPassword(newPin);
      if (newPin.length === 4) {
        if (newPin === storedPin) {
          setIsAdminAuthenticated(true);
          setAdminPassword("");
        } else {
          setLoginError(true);
          setTimeout(() => setAdminPassword(""), 500);
        }
      }
    }
  };

  const handleUpdatePin = async () => {
    if (newPin.length !== 4) {
      alert("Le nouveau code PIN doit faire 4 chiffres.");
      return;
    }
    if (newPin !== confirmPin) {
      alert("Les codes PIN ne correspondent pas.");
      return;
    }
    setLoading(true);
    await updateAdminPin(newPin);
    setStoredPin(newPin);
    setNewPin("");
    setConfirmPin("");
    setLoading(false);
    alert("Code PIN mis à jour avec succès.");
  };

  const handleRemoteUpdate = async () => {
    if (!window.confirm("Voulez-vous vraiment mettre à jour le code du site ? Cela va synchroniser le code avec GitHub et redémarrer les services.")) return;

    setLoading(true);
    try {
      const response = await fetch('/api/update-code', { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        alert("Mise à jour réussie !\n\nSortie : " + result.output);
        window.location.reload();
      } else {
        alert("Erreur lors de la mise à jour : " + (result.error || "Inconnu") + "\n\nDétails : " + result.details);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateImageConfig = async (
    section: keyof ImageConfig,
    key: string,
    value: string,
  ) => {
    if (!imageConfig) return;
    const newConfig = { ...imageConfig };
    if (section === "screensaver") newConfig.screensaver = value;
    else if (section === "dashboard")
      newConfig.dashboard = { ...newConfig.dashboard, [key]: value };

    setImageConfig(newConfig);
    await updateImages(newConfig);
    if (onConfigurationChange) onConfigurationChange();
  };

  // --- DATE HELPERS FOR INPUT ---
  const getIsoDate = (dateStr: string) => {
    if (!dateStr) return "";
    const months: { [key: string]: number } = {
      Janvier: 0,
      Février: 1,
      Mars: 2,
      Avril: 3,
      Mai: 4,
      Juin: 5,
      Juillet: 6,
      Août: 7,
      Septembre: 8,
      Octobre: 9,
      Novembre: 10,
      Décembre: 11,
      janvier: 0,
      février: 1,
      mars: 2,
      avril: 3,
      mai: 4,
      juin: 5,
      juillet: 6,
      août: 7,
      septembre: 8,
      octobre: 9,
      novembre: 10,
      décembre: 11,
    };

    try {
      const parts = dateStr.trim().split(" ");
      if (parts.length === 3) {
        const day = parts[0].padStart(2, "0");
        const monthVal = months[parts[1]];
        const month = (monthVal !== undefined ? monthVal + 1 : 1)
          .toString()
          .padStart(2, "0");
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.warn("Date parse error", e);
    }
    return "";
  };

  // --- RENDER HELPERS ---
  const getTitle = () => {
    switch (type) {
      case ContentType.PRESENTATION:
        return "Maison Régionale des Sports";
      case ContentType.LEAGUES:
        return "Annuaire des Ligues";
      case ContentType.AGENDA:
        return "Agenda Sportif";
      case ContentType.RENTAL:
        return "Location de Salles";
      case ContentType.ADMIN:
        return "Administration";
      default:
        return "";
    }
  };

  const renderInput = (
    label: string,
    field: string,
    type: string = "text",
    placeholder: string = "",
  ) => {
    const isDate = type === "date";

    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      let value = e.target.value;

      if (isDate) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          value = new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(d);
        }
      }

      setCurrentItem({ ...currentItem, [field]: value });
    };

    const getValue = () => {
      if (isDate && currentItem[field]) {
        return getIsoDate(currentItem[field]);
      }
      return currentItem[field] || "";
    };

    return (
      <div className="mb-4">
        <label className="block text-sm font-bold uppercase tracking-wider text-neutral-400 mb-2">
          {label}
        </label>
        {type === "textarea" ? (
          <textarea
            value={currentItem[field] || ""}
            onChange={handleChange}
            className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-[#0047BB] focus:outline-none min-h-[100px]"
            placeholder={placeholder}
          />
        ) : (
          <input
            type={type}
            value={getValue()}
            onChange={handleChange}
            className={`w-full bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#0047BB] focus:outline-none ${isDate ? "appearance-none" : ""}`}
            placeholder={placeholder}
          />
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (loading && !isEditing) {
      return (
        <div className="flex justify-center items-center h-64">
          <div
            className={`animate-spin rounded-full h-24 w-24 border-8 border-t-[#0047BB] ${isHandicap ? "border-gray-200" : "border-neutral-800"}`}
          ></div>
        </div>
      );
    }

    // --- ADMIN VIEW ---
    if (type === ContentType.ADMIN) {
      if (!isAdminAuthenticated) {
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div
              className={`p-12 rounded-3xl w-full max-w-lg text-center ${isHandicap ? "bg-gray-50 border-gray-200" : "bg-neutral-800 border-neutral-700"} border shadow-xl`}
            >
              <Lock
                className={`w-24 h-24 mx-auto mb-6 ${isHandicap ? "text-gray-400" : "text-neutral-600"}`}
              />
              <h3
                className={`text-4xl font-bold mb-8 font-sport ${isHandicap ? "text-gray-800" : "text-white"}`}
              >
                Espace Administrateur
              </h3>
              <div className="space-y-8">
                {/* Visual PIN display */}
                <div className="flex justify-center gap-6 mb-8">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${adminPassword.length > i
                        ? "bg-[#0047BB] border-[#0047BB] scale-125 shadow-[0_0_10px_rgba(0,71,187,0.5)]"
                        : isHandicap
                          ? "border-black"
                          : "border-neutral-600"
                        }`}
                    />
                  ))}
                </div>

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "BACK"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePinInput(num.toString())}
                      className={`h-20 w-20 rounded-2xl flex items-center justify-center text-3xl font-bold transition-all active:scale-95 shadow-sm ${num === "C" || num === "BACK"
                        ? isHandicap
                          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                        : isHandicap
                          ? "bg-white border-2 border-black text-black hover:bg-gray-100"
                          : "bg-neutral-900 border border-neutral-700 text-white hover:border-[#0047BB] hover:bg-neutral-800"
                        }`}
                    >
                      {num === "BACK" ? <Delete size={32} /> : num}
                    </button>
                  ))}
                </div>

                {loginError && (
                  <p className="text-[#0047BB] text-xl font-bold animate-pulse text-center">
                    Code PIN incorrect
                  </p>
                )}

                <p className={`text-center text-sm ${isHandicap ? 'text-gray-500' : 'text-neutral-500'}`}>
                  Veuillez saisir votre code d'accès à 4 chiffres
                </p>
              </div>
            </div>
          </div>
        );
      }

      // AUTHENTICATED DASHBOARD
      return (
        <div className="pb-20 h-full flex flex-col">
          {/* ADMIN NAVBAR */}
          <div
            className={`flex flex-wrap gap-2 mb-8 p-2 rounded-2xl ${isHandicap ? "bg-gray-100" : "bg-neutral-800 border border-neutral-700"}`}
          >
            {[
              { id: "SCREENSAVER", icon: Monitor, label: "Veille" },
              { id: "HOME", icon: Layers, label: "Accueil" },
              { id: "PRESENTATION", icon: Info, label: "Présentation" },
              { id: "LEAGUES", icon: Trophy, label: "Ligues" },
              { id: "AGENDA", icon: Calendar, label: "Agenda" },
              { id: "RENTAL", icon: MapIcon, label: "Salles" },
              { id: "SECURITY", icon: Lock, label: "Sécurité" },
              { id: "MAINTENANCE", icon: RefreshCcw, label: "Maintenance" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveAdminTab(tab.id as AdminTab)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold uppercase text-xs md:text-sm transition-all ${activeAdminTab === tab.id
                  ? isHandicap
                    ? "bg-[#0033cc] text-white shadow-md"
                    : "bg-[#0047BB] text-white shadow-lg"
                  : isHandicap
                    ? "hover:bg-gray-200 text-gray-600"
                    : "hover:bg-neutral-700 text-neutral-400"
                  }`}
              >
                <tab.icon size={16} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto">
            {/* === CONFIG TABS (SCREENSAVER & HOME) === */}
            {(activeAdminTab === "SCREENSAVER" || activeAdminTab === "HOME") &&
              imageConfig && (
                <div
                  className={`p-8 rounded-3xl ${isHandicap ? "bg-white border-4 border-black" : "bg-neutral-800 border border-neutral-700"}`}
                >
                  <h3
                    className={`text-2xl font-black uppercase mb-6 ${isHandicap ? "text-black" : "text-white"}`}
                  >
                    {activeAdminTab === "SCREENSAVER"
                      ? "Configuration de l'écran de veille"
                      : "Images du tableau de bord"}
                  </h3>
                  {activeAdminTab === "SCREENSAVER" ? (
                    <ImageInputWithDrop
                      label="Image de fond"
                      value={imageConfig.screensaver}
                      onChange={(v) =>
                        handleUpdateImageConfig("screensaver", "", v)
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ImageInputWithDrop
                        label="Carte Présentation"
                        value={imageConfig.dashboard[ContentType.PRESENTATION]}
                        onChange={(v) =>
                          handleUpdateImageConfig(
                            "dashboard",
                            ContentType.PRESENTATION,
                            v,
                          )
                        }
                      />
                      <ImageInputWithDrop
                        label="Carte Ligues"
                        value={imageConfig.dashboard[ContentType.LEAGUES]}
                        onChange={(v) =>
                          handleUpdateImageConfig(
                            "dashboard",
                            ContentType.LEAGUES,
                            v,
                          )
                        }
                      />
                      <ImageInputWithDrop
                        label="Carte Agenda"
                        value={imageConfig.dashboard[ContentType.AGENDA]}
                        onChange={(v) =>
                          handleUpdateImageConfig(
                            "dashboard",
                            ContentType.AGENDA,
                            v,
                          )
                        }
                      />
                      <ImageInputWithDrop
                        label="Carte Salles"
                        value={imageConfig.dashboard[ContentType.RENTAL]}
                        onChange={(v) =>
                          handleUpdateImageConfig(
                            "dashboard",
                            ContentType.RENTAL,
                            v,
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              )}

            {/* === PRESENTATION TAB === */}
            {activeAdminTab === "PRESENTATION" && presentationData && (
              <div
                className={`p-8 rounded-3xl ${isHandicap ? "bg-white border-4 border-black" : "bg-neutral-800 border border-neutral-700"}`}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3
                    className={`text-2xl font-black uppercase ${isHandicap ? "text-black" : "text-white"}`}
                  >
                    Contenu Présentation
                  </h3>
                  {!isEditing ? (
                    <button
                      onClick={() => handleEdit(presentationData)}
                      className="bg-[#0047BB] px-4 py-2 rounded-lg text-white font-bold uppercase flex items-center gap-2"
                    >
                      <Edit size={16} /> Modifier
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      className="bg-green-600 px-4 py-2 rounded-lg text-white font-bold uppercase flex items-center gap-2"
                    >
                      <Save size={16} /> Enregistrer
                    </button>
                  )}
                </div>

                {isEditing && currentItem ? (
                  <div className="space-y-4">
                    <ImageInputWithDrop
                      label="Image Héro"
                      value={currentItem.heroImage}
                      onChange={(v) =>
                        setCurrentItem({ ...currentItem, heroImage: v })
                      }
                    />
                    {renderInput(
                      "Texte d'introduction",
                      "introText",
                      "textarea",
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {renderInput("Statistique Auditorium", "statAuditorium")}
                      {renderInput("Statistique Ligues", "statLeagues")}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <img
                      src={presentationData.heroImage}
                      className="w-full h-48 object-cover rounded-xl"
                      alt="Hero"
                    />
                    <p className="text-xl italic text-neutral-300">
                      "{presentationData.introText}"
                    </p>
                    <div className="flex gap-8">
                      <div className="bg-black/30 p-4 rounded-xl flex-1 text-center">
                        <span className="block text-xs uppercase text-neutral-500">
                          parking
                        </span>
                        <span className="text-2xl font-bold text-white">
                          {presentationData.statAuditorium}
                        </span>
                      </div>
                      <div className="bg-black/30 p-4 rounded-xl flex-1 text-center">
                        <span className="block text-xs uppercase text-neutral-500">
                          Ligues
                        </span>
                        <span className="text-2xl font-bold text-white">
                          {presentationData.statLeagues}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* === LIST TABS (AGENDA, LEAGUES, RENTAL) === */}
            {["AGENDA", "LEAGUES", "RENTAL"].includes(activeAdminTab) && (
              <div className="space-y-6">
                {/* Rental Global Config (Admin Only) */}
                {activeAdminTab === "RENTAL" && rentalConfig && !isEditing && (
                  <div className="p-6 bg-neutral-900/50 rounded-2xl border border-neutral-700 mb-6">
                    <h4 className="text-white font-bold uppercase mb-4 flex items-center gap-2">
                      <Lock size={16} /> Configuration Globale Location
                    </h4>
                    <div className="space-y-4">
                      <ImageInputWithDrop
                        label="QR Code de Réservation"
                        value={rentalConfig.qrCodeImage}
                        onChange={(v) =>
                          setRentalConfig({ ...rentalConfig, qrCodeImage: v })
                        }
                      />
                      <div>
                        <label className="block text-sm font-bold uppercase tracking-wider text-neutral-400 mb-2">
                          Message d'entête
                        </label>
                        <textarea
                          value={rentalConfig.headerText}
                          onChange={(e) =>
                            setRentalConfig({
                              ...rentalConfig,
                              headerText: e.target.value,
                            })
                          }
                          className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-[#0047BB] focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={handleSaveRentalConfig}
                        className="bg-[#0047BB] text-white px-4 py-2 rounded-lg font-bold uppercase flex items-center gap-2 hover:bg-blue-700"
                      >
                        <Save size={16} /> Enregistrer Config
                      </button>
                    </div>
                  </div>
                )}

                {/* Toolbar */}
                {!isEditing && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddNew}
                      className="bg-[#0047BB] hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold uppercase flex items-center gap-2 shadow-lg transition-all"
                    >
                      <Plus size={20} /> Ajouter un élément
                    </button>
                  </div>
                )}

                {/* EDIT FORM */}
                {isEditing && currentItem ? (
                  <div
                    className={`p-8 rounded-3xl ${isHandicap ? "bg-white border-4 border-black" : "bg-neutral-800 border border-neutral-700"}`}
                  >
                    <h3 className="text-2xl font-black uppercase text-white mb-6">
                      {currentItem.id ? "Modifier" : "Ajouter"}
                    </h3>

                    {activeAdminTab === "AGENDA" && (
                      <>
                        {renderInput("Titre", "title")}
                        <ImageInputWithDrop
                          label="Image de l'événement"
                          value={currentItem.image}
                          onChange={(v) =>
                            setCurrentItem({ ...currentItem, image: v })
                          }
                        />
                        <div className="grid grid-cols-2 gap-4">
                          {renderInput("Date", "date", "date")}
                          {renderInput("Lieu", "location")}
                        </div>
                        {renderInput("Description", "description", "textarea")}
                      </>
                    )}

                    {activeAdminTab === "LEAGUES" && (
                      <>
                        {renderInput("Nom de la Ligue", "title")}
                        {renderInput("Description", "description", "textarea")}
                        {renderInput("Type (Collectif/Individuel)", "type")}
                        {renderInput("Téléphone", "phone")}
                      </>
                    )}

                    {activeAdminTab === "RENTAL" && (
                      <>
                        {renderInput("Nom de la Salle", "name")}
                        <ImageInputWithDrop
                          label="Photo de la salle"
                          value={currentItem.image}
                          onChange={(v) =>
                            setCurrentItem({ ...currentItem, image: v })
                          }
                        />
                        <div className="grid grid-cols-2 gap-4">
                          {renderInput("Capacité", "capacity", "number")}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {renderInput("Prix 1/2 Journée", "priceHalfDay")}
                          {renderInput("Prix Journée", "priceFullDay")}
                        </div>
                        {renderInput("Description", "description", "textarea")}
                      </>
                    )}

                    <div className="flex gap-4 mt-8 pt-4 border-t border-white/10">
                      <button
                        onClick={handleSave}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold uppercase flex justify-center gap-2"
                      >
                        <Save /> Enregistrer
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setCurrentItem(null);
                        }}
                        className="px-6 py-3 rounded-xl font-bold uppercase text-neutral-400 hover:text-white border border-neutral-700"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  /* LIST VIEW */
                  <div className="flex flex-col gap-4">
                    {data.map((item: any, idx) => (
                      <div
                        key={item.id || idx}
                        className={`p-6 rounded-2xl flex items-center justify-between group ${isHandicap ? "bg-white border border-black" : "bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800"}`}
                      >
                        <div className="flex items-center gap-4">
                          {item.image && (
                            <img
                              src={item.image}
                              className="w-16 h-16 rounded-lg object-cover bg-neutral-900"
                            />
                          )}
                          <div>
                            <h4
                              className={`text-xl font-bold uppercase ${isHandicap ? "text-black" : "text-white"}`}
                            >
                              {item.title || item.name}
                            </h4>
                            <p className="text-neutral-400 text-sm line-clamp-1">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-3 bg-neutral-900 rounded-lg text-[#0047BB] hover:bg-white hover:text-[#0047BB] transition-colors"
                          >
                            <Edit size={20} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="p-3 bg-neutral-900 rounded-lg text-red-500 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* === SECURITY TAB === */}
            {activeAdminTab === "SECURITY" && (
              <div className="max-w-md mx-auto">
                <div
                  className={`p-8 rounded-3xl ${isHandicap ? "bg-white border-4 border-black" : "bg-neutral-800 border border-neutral-700"}`}
                >
                  <h3
                    className={`text-2xl font-black uppercase mb-8 flex items-center gap-3 ${isHandicap ? "text-black" : "text-white"}`}
                  >
                    <Lock className="text-[#0047BB]" />
                    Changer le code PIN
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-wider text-neutral-400 mb-2">
                        Nouveau code PIN (4 chiffres)
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                        className={`w-full p-4 text-center text-3xl font-bold rounded-xl border-2 tracking-[1em] ${isHandicap ? "bg-white border-black" : "bg-neutral-900 border-neutral-700 text-white focus:border-[#0047BB]"}`}
                        placeholder="••••"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold uppercase tracking-wider text-neutral-400 mb-2">
                        Confirmer le code PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                        className={`w-full p-4 text-center text-3xl font-bold rounded-xl border-2 tracking-[1em] ${isHandicap ? "bg-white border-black" : "bg-neutral-900 border-neutral-700 text-white focus:border-[#0047BB]"}`}
                        placeholder="••••"
                      />
                    </div>

                    <button
                      onClick={handleUpdatePin}
                      disabled={loading || newPin.length !== 4 || confirmPin.length !== 4}
                      className="w-full py-4 bg-[#0047BB] hover:bg-blue-600 disabled:bg-neutral-600 text-white rounded-xl font-bold uppercase tracking-widest transition-all mt-4"
                    >
                      {loading ? "Mise à jour..." : "Mettre à jour le PIN"}
                    </button>
                  </div>
                </div>

                <p className="text-center text-neutral-500 mt-6 text-sm">
                  Note : Ce code sera nécessaire pour accéder à cet espace d'administration.
                </p>
              </div>
            )}

            {/* === MAINTENANCE TAB === */}
            {activeAdminTab === "MAINTENANCE" && (
              <div className="max-w-2xl mx-auto">
                <div
                  className={`p-8 rounded-3xl ${isHandicap ? "bg-white border-4 border-black" : "bg-neutral-800 border border-neutral-700"}`}
                >
                  <h3
                    className={`text-2xl font-black uppercase mb-6 flex items-center gap-3 ${isHandicap ? "text-black" : "text-white"}`}
                  >
                    <RefreshCcw className="text-[#0047BB]" />
                    Mise à jour du système
                  </h3>

                  <div className="space-y-6">
                    <div className={`p-6 rounded-2xl ${isHandicap ? "bg-gray-100" : "bg-black/30"}`}>
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <Info size={18} className="text-[#0047BB]" />
                        Fonctionnement
                      </h4>
                      <p className="text-sm text-neutral-400 leading-relaxed">
                        Cette fonction permet de mettre a jour l'interface vers la nouvelle version.
                      </p>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-blue-400 text-sm">
                      <p><strong>Note :</strong> Une fois la mise à jour terminée, la page se rechargera automatiquement pour appliquer les changements.</p>
                    </div>

                    <button
                      onClick={handleRemoteUpdate}
                      disabled={loading}
                      className="w-full py-6 bg-[#0047BB] hover:bg-blue-600 disabled:bg-neutral-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 shadow-xl shadow-blue-900/20"
                    >
                      {loading ? (
                        <>
                          <RefreshCcw className="animate-spin" />
                          Mise à jour en cours...
                        </>
                      ) : (
                        <>
                          <RefreshCcw />
                          Lancer la mise à jour
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className={`p-6 rounded-2xl ${isHandicap ? "bg-white border-2 border-black" : "bg-neutral-800/50 border border-neutral-700"}`}>
                    <span className="block text-xs font-bold text-neutral-500 uppercase mb-1">Dernière vérification</span>
                    <span className="text-xl font-mono font-bold text-white">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // --- PUBLIC VIEWS (RENTAL, PRESENTATION, ETC) ---

    if (type === ContentType.LEAGUES) {
      const categories = [
        "Tous",
        "Collectif",
        "Individuel",
        "Combat",
        "Handisport",
        "Autre",
      ];
      const filteredLeagues = data.filter((league: any) => {
        const matchesSearch =
          league.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          league.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
          activeCategory === "Tous" || league.type === activeCategory;
        return matchesSearch && matchesCategory;
      });

      return (
        <div className="h-full flex flex-col space-y-6 pb-20">
          {/* Header with Search and Filter */}
          <div
            className={`p-6 rounded-2xl flex flex-col gap-6 shadow-md ${isHandicap ? "bg-white border-4 border-black" : "bg-neutral-800 border border-neutral-700"}`}
          >
            {/* Search Bar */}
            <div className="relative">
              <Search
                className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${isHandicap ? "text-black" : "text-neutral-400"}`}
              />
              <input
                type="text"
                placeholder="Rechercher une ligue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full py-4 pl-12 pr-4 rounded-xl text-lg outline-none ${isHandicap ? "bg-gray-100 border-2 border-black text-black placeholder-gray-500" : "bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:border-[#0047BB]"}`}
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-2 rounded-full font-bold uppercase whitespace-nowrap transition-all ${activeCategory === cat
                    ? isHandicap
                      ? "bg-black text-yellow-400"
                      : "bg-[#0047BB] text-white"
                    : isHandicap
                      ? "bg-gray-200 text-black border border-black hover:bg-gray-300"
                      : "bg-neutral-900 text-neutral-400 hover:bg-neutral-700 border border-neutral-700"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Results */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredLeagues.map((league: any, idx: number) => (
                <div
                  key={league.id || idx}
                  className={`flex flex-col p-6 rounded-2xl transition-all duration-300 ${isHandicap ? "bg-white border-4 border-black shadow-lg hover:scale-[1.02]" : "bg-neutral-800 border border-neutral-700 hover:border-[#0047BB] hover:shadow-xl hover:-translate-y-1"}`}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <h3
                        className={`font-black uppercase text-xl leading-tight font-sport ${isHandicap ? "text-black" : "text-white"}`}
                      >
                        {league.title}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isHandicap ? "bg-yellow-300 text-black border border-black" : "bg-neutral-900 text-[#0047BB] border border-neutral-700"}`}
                      >
                        {league.type}
                      </span>
                    </div>
                    <p
                      className={`text-sm mb-6 ${isHandicap ? "text-gray-800 font-medium" : "text-gray-400"}`}
                    >
                      {league.description}
                    </p>
                  </div>

                  {/* Footer with Phone */}
                  <div
                    className={`mt-auto pt-4 border-t flex items-center gap-3 ${isHandicap ? "border-gray-200 text-black" : "border-white/10 text-white"}`}
                  >
                    <div
                      className={`p-2 rounded-full ${isHandicap ? "bg-black text-white" : "bg-[#0047BB]"}`}
                    >
                      <Phone size={16} />
                    </div>
                    <span className="font-bold text-lg">
                      {league.phone || "Non renseigné"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {filteredLeagues.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-center opacity-50">
                <Search size={48} className="mb-4" />
                <p className="text-xl">Aucune ligue trouvée</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === ContentType.RENTAL) {
      return (
        <div className="space-y-8 pb-20">
          {/* Header with Dynamic Text and QR Code */}
          <div
            className={`p-6 md:p-8 rounded-xl border-l-[12px] flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0 md:space-x-8 text-2xl shadow-lg ${isHandicap ? "border-[#0033cc] bg-blue-50 text-blue-900" : "border-[#0047BB] bg-neutral-800 text-gray-200"}`}
          >
            <div className="flex items-start space-x-6 flex-1">
              <AlertCircle
                className={`flex-shrink-0 mt-1 w-10 h-10 ${isHandicap ? "text-[#0033cc]" : "text-[#0047BB]"}`}
              />
              <p className="font-medium leading-relaxed">
                {rentalConfig?.headerText ||
                  "Réservez nos espaces directement sur l'application."}
              </p>
            </div>
            {/* {rentalConfig?.qrCodeImage && (
              <div
                className={`flex-shrink-0 p-4 bg-white rounded-xl ${isHandicap ? "border-4 border-black" : ""}`}
              >
                <img
                  src={rentalConfig.qrCodeImage}
                  alt="QR Code Réservation"
                  className="w-32 h-32 md:w-40 md:h-40 object-contain"
                />
              </div>
            )} */}
          </div>

          <div className="flex flex-col gap-8">
            {data.map((room: any, idx) => (
              <div
                key={room.id || idx}
                className={`rounded-2xl overflow-hidden shadow-lg flex flex-col md:flex-row ${isHandicap ? "bg-white border-8 border-black" : "bg-neutral-800 border border-neutral-700"}`}
              >
                <div
                  className={`w-full md:w-1/3 h-64 md:h-auto relative ${isHandicap ? "bg-gray-200" : "bg-neutral-900"}`}
                >
                  <img
                    src={room.image}
                    className="w-full h-full object-cover"
                    alt={room.name}
                  />
                </div>
                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      className={`font-black uppercase font-sport mb-2 ${isHandicap ? "text-5xl" : "text-3xl text-white"}`}
                    >
                      {room.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span
                        className={`inline-block px-4 py-1 rounded-full font-bold text-sm ${isHandicap ? "bg-yellow-300 text-black" : "bg-neutral-900 text-neutral-400 border border-neutral-700"}`}
                      >
                        {room.capacity} personnes
                      </span>
                    </div>
                    <p
                      className={`mb-6 ${isHandicap ? "text-2xl text-black" : "text-xl text-gray-400"}`}
                    >
                      {room.description}
                    </p>
                  </div>

                  {/* Pricing Section */}
                  <div
                    className={`pt-4 border-t flex flex-col sm:flex-row gap-4 sm:items-center ${isHandicap ? "border-gray-200" : "border-white/10"}`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard
                        size={20}
                        className={isHandicap ? "text-black" : "text-[#0047BB]"}
                      />
                      <span
                        className={`font-bold uppercase text-sm ${isHandicap ? "text-gray-600" : "text-neutral-500"}`}
                      >
                        Tarifs :
                      </span>
                    </div>
                    <div className="flex gap-4">
                      {room.priceHalfDay && (
                        <div
                          className={`px-4 py-2 rounded-lg font-bold flex flex-col items-center ${isHandicap ? "bg-gray-100 text-black" : "bg-neutral-900 text-white"}`}
                        >
                          <span className="text-lg">{room.priceHalfDay}</span>
                          <span className="text-[10px] uppercase opacity-60">
                            1/2 Journée
                          </span>
                        </div>
                      )}
                      {room.priceFullDay && (
                        <div
                          className={`px-4 py-2 rounded-lg font-bold flex flex-col items-center ${isHandicap ? "bg-gray-100 text-black" : "bg-[#0047BB] text-white"}`}
                        >
                          <span className="text-lg">{room.priceFullDay}</span>
                          <span className="text-[10px] uppercase opacity-80">
                            Journée
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (type === ContentType.PRESENTATION && presentationData) {
      return (
        <div
          className={`space-y-6 pb-20 ${isHandicap ? "text-black" : "text-gray-300"}`}
        >
          {/* Header Image */}
          <div className="w-full h-64 md:h-80 rounded-3xl overflow-hidden relative shadow-2xl mb-8 group">
            <img
              src="/public/mrdsTomblaine.jpg"
              alt="Maison des Sports"
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
              <h2
                className={`text-4xl md:text-5xl font-black uppercase font-sport text-white tracking-tight`}
              >
                Maison Régionale
                <br />
                des Sports
              </h2>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Main Content */}
            <div className="flex-1 space-y-8">
              <div
                className={`p-6 rounded-3xl ${isHandicap ? "bg-white border-4 border-black text-2xl" : "bg-neutral-800 border border-neutral-700 text-lg"}`}
              >
                <p className="text-xl md:text-2xl leading-relaxed text-gray-300">
                  {presentationData.introText}
                </p>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-transform hover:-translate-y-1 ${isHandicap ? "bg-yellow-300 border-4 border-black" : "bg-neutral-900 border border-neutral-700"}`}
                >
                  <Users
                    size={isHandicap ? 56 : 40}
                    className={`${isHandicap ? "text-black" : "text-[#0047BB]"}`}
                  />
                  <span
                    className={`font-black uppercase text-5xl font-sport ${isHandicap ? "text-black" : "text-white"}`}
                  >
                    {presentationData.statAuditorium}
                  </span>
                  <span className="text-sm uppercase tracking-wider opacity-70">
                    Parking
                  </span>
                </div>
                <div
                  className={`p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-transform hover:-translate-y-1 ${isHandicap ? "bg-yellow-300 border-4 border-black" : "bg-neutral-900 border border-neutral-700"}`}
                >
                  <Trophy
                    size={isHandicap ? 56 : 40}
                    className={`${isHandicap ? "text-black" : "text-[#0047BB]"}`}
                  />
                  <span
                    className={`font-black uppercase text-5xl font-sport ${isHandicap ? "text-black" : "text-white"}`}
                  >
                    {presentationData.statLeagues}
                  </span>
                  <span className="text-sm uppercase tracking-wider opacity-70">
                    Hébergées
                  </span>
                </div>
              </div>
            </div>

            {/* Sidebar - Infos Pratiques */}
            <div className="w-full md:w-1/3 space-y-6">
              <div
                className={`p-6 rounded-3xl ${isHandicap ? "bg-blue-50 border-4 border-[#0033cc] text-black" : "bg-[#0047BB] text-white shadow-lg shadow-blue-900/50"}`}
              >
                <h3 className="font-black uppercase text-xl mb-6 flex items-center gap-2 border-b border-white/20 pb-4">
                  <Info size={24} /> Informations
                </h3>

                <div className="space-y-6 text-lg">
                  <div className="flex items-start gap-4">
                    <MapPin className="flex-shrink-0 mt-1 opacity-80" />
                    <div>
                      <span className="block font-bold uppercase text-xs opacity-70 mb-1">
                        Adresse
                      </span>
                      <p className="font-medium leading-tight">
                        13 Rue Jean Moulin,
                        <br />
                        54510 Tomblaine
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Clock className="flex-shrink-0 mt-1 opacity-80" />
                    <div>
                      <span className="block font-bold uppercase text-xs opacity-70 mb-1">
                        Horaires
                      </span>
                      <p className="font-medium">Lun - Ven : 8h30 - 17h30</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Phone className="flex-shrink-0 mt-1 opacity-80" />
                    <div>
                      <span className="block font-bold uppercase text-xs opacity-70 mb-1">
                        Téléphone
                      </span>
                      <p className="font-medium font-mono text-xl">
                        03 83 18 87 02
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Mail className="flex-shrink-0 mt-1 opacity-80" />
                    <div>
                      <span className="block font-bold uppercase text-xs opacity-70 mb-1">
                        Email
                      </span>
                      <p className="font-medium text-base truncate">
                        contact@cros-grandest.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Map */}
          <div
            className={`rounded-3xl overflow-hidden shadow-2xl mt-8 border ${isHandicap ? "border-4 border-black" : "border-neutral-700"}`}
          >
            <div ref={mapContainerRef} className="w-full h-80 z-0"></div>
            <div
              className={`p-4 flex items-center justify-between ${isHandicap ? "bg-yellow-300 text-black" : "bg-neutral-900 text-white"}`}
            >
              <div className="flex items-center gap-3">
                <MapIcon size={24} />
                <span className="font-bold uppercase tracking-wider">
                  Plan d'accès
                </span>
              </div>
              <span className="text-sm opacity-70">
                13 Rue Jean Moulin, Tomblaine
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 h-full flex flex-col">
        {/* Agenda View without Highlight */}
        <div className={`flex flex-col gap-6 overflow-y-auto pb-20 pr-2`}>
          {data.map((item: any, idx) => (
            <div
              key={item.id || idx}
              className={`p-6 rounded-2xl border-l-[12px] transition-all duration-300 relative overflow-hidden group ${isHandicap ? "bg-white border-4 border-black text-black" : "bg-neutral-800 border-neutral-700 hover:bg-neutral-750"}`}
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Event Image */}
                {item.image && (
                  <div
                    className={`w-full md:w-48 h-48 flex-shrink-0 rounded-xl overflow-hidden ${isHandicap ? "border-2 border-black" : "bg-neutral-900"}`}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3
                    className={`font-black uppercase mb-4 font-sport leading-tight ${isHandicap ? "text-4xl" : "text-3xl text-white"}`}
                  >
                    {item.title}
                  </h3>
                  <div className="flex flex-col gap-2 mb-4">
                    {item.date && (
                      <div
                        className={`flex items-center font-bold uppercase tracking-wide ${isHandicap ? "text-2xl text-blue-800" : "text-lg text-[#0047BB]"}`}
                      >
                        <Calendar size={20} className="mr-3" /> {item.date}
                      </div>
                    )}
                    {item.location && (
                      <div
                        className={`flex items-center ${isHandicap ? "text-2xl text-gray-600" : "text-lg text-neutral-400 font-medium"}`}
                      >
                        <MapPin size={20} className="mr-3" /> {item.location}
                      </div>
                    )}
                  </div>
                  {item.description && (
                    <p
                      className={`leading-relaxed ${isHandicap ? "text-xl text-black" : "text-base text-gray-300"}`}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-40 flex items-end md:items-center justify-center animate-in slide-in-from-bottom duration-500 ${isHandicap ? "bg-black/90" : "bg-black/90 backdrop-blur-md"}`}
    >
      <div
        className={`w-full h-[95vh] rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col shadow-2xl ${isHandicap ? "bg-white border-x-8 border-t-8 border-yellow-400" : "bg-neutral-900 border border-neutral-700 max-w-[95vw]"}`}
      >
        <div
          className={`flex justify-between items-center p-8 border-b ${isHandicap ? "bg-yellow-400 text-black border-black border-b-4" : "bg-neutral-900 border-neutral-800"}`}
        >
          <div className="flex items-center gap-6">
            {!isHandicap && (
              <img
                src="/public/logoGE.png"
                alt="Logo"
                className="h-12 w-auto object-contain mr-2"
              />
            )}
            <h2
              className={`font-black uppercase tracking-tight font-sport ${isHandicap ? "text-5xl" : "text-4xl text-white"}`}
            >
              {getTitle()}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`rounded-full transition-all ${isHandicap ? "bg-black text-white p-6" : "bg-neutral-800 text-neutral-400 hover:bg-[#0047BB] hover:text-white p-6"}`}
          >
            <X size={isHandicap ? 48 : 36} />
          </button>
        </div>
        <div
          className={`flex-1 overflow-y-auto p-8 ${isHandicap ? "bg-white" : "bg-neutral-950 scrollbar-hide"}`}
        >
          {renderContent()}
        </div>
        {isHandicap && (
          <div className="p-8 bg-black border-t-8 border-yellow-400 flex justify-center flex-shrink-0">
            <button className="flex items-center justify-center space-x-6 bg-yellow-400 text-black border-4 border-black w-full py-8 rounded-2xl font-black text-4xl hover:scale-105 transition-transform uppercase">
              <Mic size={64} />
              <span>Activer la voix</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentModal;
