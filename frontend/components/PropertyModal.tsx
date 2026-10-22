"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Property, PropertyInput } from "@/lib/db";
import { createProperty, updateProperty } from "@/lib/db";
import { getOptions } from "@/lib/api";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface PropertyModalProps {
  property?: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (prop: Property) => void;
}

const DEFAULT_DISTRICTS = ["Badulla", "Colombo", "Galle", "Kandy", "Matara", "Nuwara Eliya"];
const DEFAULT_TYPES = ["boutique", "guesthouse", "homestay", "hotel", "villa"];

const SUGGESTED_AMENITIES = [
  "Air Conditioning",
  "Free High-Speed Wi-Fi",
  "Hot Water Shower",
  "Private Balcony",
  "Sea View",
  "Breakfast Included",
  "Swimming Pool Access",
  "Garden Terrace",
  "Kitchenette",
  "Mini Refrigerator",
  "Work Desk",
  "Ceiling Fan",
  "Electric Kettle",
];

export default function PropertyModal({
  property,
  isOpen,
  onClose,
  onSaved,
}: PropertyModalProps) {
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [rooms, setRooms] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");
  const [baseRate, setBaseRate] = useState("");

  const [districts, setDistricts] = useState<string[]>(DEFAULT_DISTRICTS);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(DEFAULT_TYPES);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getOptions()
      .then((res) => {
        if (res.districts && res.districts.length > 0) setDistricts(res.districts);
        if (res.property_types && res.property_types.length > 0) setPropertyTypes(res.property_types);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (property) {
      setName(property.name);
      setDistrict(property.district);
      setPropertyType(property.property_type);
      setRooms(property.rooms ? String(property.rooms) : "");
      setAmenities(Array.isArray(property.amenities) ? property.amenities : []);
      setBaseRate(String(property.base_rate));
    } else {
      setName("");
      setDistrict("");
      setPropertyType("");
      setRooms("");
      setAmenities([]);
      setBaseRate("");
    }
    setCustomAmenity("");
    setErrorMsg(null);
  }, [property, isOpen]);

  if (!isOpen) return null;

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (!trimmed) return;
    const exists = amenities.some(
      (a) => a.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      setAmenities((prev) => [...prev, trimmed]);
    }
    setCustomAmenity("");
  };

  const handleCustomKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomAmenity();
    }
  };

  const handleToggleAmenity = (item: string) => {
    setAmenities((prev) => {
      const exists = prev.some((a) => a.toLowerCase() === item.toLowerCase());
      if (exists) {
        return prev.filter((a) => a.toLowerCase() !== item.toLowerCase());
      }
      return [...prev, item];
    });
  };

  const handleRemoveAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.filter((a) => a.toLowerCase() !== item.toLowerCase())
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg(t("property.errors.nameRequired"));
      return;
    }
    if (!district) {
      setErrorMsg(t("property.errors.districtRequired"));
      return;
    }
    if (!propertyType) {
      setErrorMsg(t("property.errors.typeRequired"));
      return;
    }

    // Room count is mandatory
    const cleanRooms = rooms.trim();
    if (!cleanRooms) {
      setErrorMsg(t("property.errors.roomsRequired") || t("property.errors.roomsInvalid"));
      return;
    }
    const numRooms = Number(cleanRooms);
    if (!numRooms || numRooms < 1 || !Number.isInteger(numRooms)) {
      setErrorMsg(t("property.errors.roomsInvalid"));
      return;
    }

    const numRate = Number(baseRate);
    if (!numRate || numRate <= 0) {
      setErrorMsg(t("property.errors.baseRateInvalid"));
      return;
    }

    setLoading(true);
    const input: PropertyInput = {
      name: cleanName,
      district,
      property_type: propertyType,
      rooms: numRooms,
      amenities,
      base_rate: numRate,
    };

    try {
      let saved: Property;
      if (property) {
        saved = await updateProperty(property.id, input);
      } else {
        saved = await createProperty(input);
      }
      onSaved(saved);
      onClose();
    } catch {
      setErrorMsg(t("common.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-modal-title"
    >
      <div className="w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-t-[32px] sm:rounded-[32px] border border-black/[0.08] bg-white/95 p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.2)] backdrop-blur-2xl animate-apple-in my-0 sm:my-8 overflow-hidden">
        {/* Mobile Drag Indicator */}
        <div className="mx-auto -mt-2 mb-4 h-1 w-10 shrink-0 rounded-full bg-neutral-300 sm:hidden" />

        <div className="flex shrink-0 items-start justify-between border-b border-black/[0.05] pb-4">
          <div>
            <h2 id="property-modal-title" className="text-2xl font-black tracking-tight text-ink">
              {property ? t("property.editTitle") : t("property.addTitle")}
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-medium text-muted">
              {t("property.addSubtitle")}
            </p>
          </div>
          {property && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-muted transition-transform hover:bg-black/[0.08] hover:text-ink active:scale-90"
              aria-label={t("common.close")}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="alert-error mt-4 shrink-0" role="alert">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 overflow-y-auto pr-1" noValidate>
          {/* Property Name */}
          <div>
            <label htmlFor="prop-name" className="field-label">
              {t("property.name")} <span className="text-down font-bold">*</span>
            </label>
            <input
              id="prop-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("property.namePlaceholder")}
              className="input font-medium"
              disabled={loading}
            />
          </div>

          {/* District & Type in 2 columns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prop-district" className="field-label">
                {t("property.district")} <span className="text-down font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  id="prop-district"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="input appearance-none bg-white pr-10 font-medium"
                  disabled={loading}
                >
                  <option value="">{t("property.chooseDistrict")}</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {t(`options.districts.${d}`) || d}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="prop-type" className="field-label">
                {t("property.type")} <span className="text-down font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  id="prop-type"
                  required
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="input appearance-none bg-white pr-10 font-medium"
                  disabled={loading}
                >
                  <option value="">{t("property.chooseType")}</option>
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`options.propertyTypes.${type}`) || type}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Rooms & Base Rate */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prop-rooms" className="field-label">
                {t("property.rooms")} <span className="text-down font-bold">*</span>
              </label>
              <input
                id="prop-rooms"
                type="number"
                min="1"
                step="1"
                required
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
                placeholder="4"
                className="input font-medium"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="prop-baserate" className="field-label">
                {t("property.baseRate")} <span className="text-down font-bold">*</span>
              </label>
              <input
                id="prop-baserate"
                type="number"
                min="100"
                step="50"
                required
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                placeholder="12000"
                className="input font-semibold"
                disabled={loading}
              />
            </div>
          </div>
          <p className="field-hint">{t("property.baseRateHint")}</p>

          {/* Room Amenities Section */}
          <div className="rounded-[24px] border border-black/[0.08] bg-neutral-50/80 p-4 sm:p-5 space-y-3.5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="field-label mb-0 text-sm font-bold text-ink">
                {t("property.amenities")}{" "}
                <span className="text-xs font-normal text-muted">
                  {t("property.amenitiesSubtitle")}
                </span>
              </label>
              {amenities.length > 0 && (
                <span className="rounded-full bg-brand-500/10 border border-brand-500/20 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                  {t("property.amenitiesCount", { count: amenities.length })}
                </span>
              )}
            </div>

            {/* Custom Amenity Input + Button */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                onKeyDown={handleCustomKeyDown}
                placeholder={t("property.amenityPlaceholder")}
                className="input min-h-[46px] h-[46px] text-sm flex-1 bg-white font-medium"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAddCustomAmenity}
                disabled={loading || !customAmenity.trim()}
                className="inline-flex min-h-[46px] h-[46px] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-ink px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-base font-bold leading-none">+</span>
                <span>{t("property.addAmenity")}</span>
              </button>
            </div>

            {/* Selected Amenities Chips */}
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {amenities.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 text-brand-900 border border-brand-300/70 px-3 py-1 text-xs sm:text-sm font-semibold shadow-[0_1px_3px_rgba(5,150,105,0.08)] transition-all animate-apple-in"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAmenity(item)}
                      className="ml-0.5 -mr-1 flex h-4 w-4 items-center justify-center rounded-full text-brand-700/80 hover:bg-brand-200/60 hover:text-brand-950 transition-colors"
                      aria-label={`Remove ${item}`}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Suggestions */}
            <div className="space-y-2 pt-1 border-t border-black/[0.05]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {t("property.quickSuggestions")}
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {SUGGESTED_AMENITIES.map((item) => {
                  const isSelected = amenities.some(
                    (a) => a.toLowerCase() === item.toLowerCase()
                  );
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleToggleAmenity(item)}
                      disabled={loading}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95 select-none ${
                        isSelected
                          ? "bg-brand-600 text-white shadow-[0_2px_8px_rgba(5,150,105,0.28)] hover:bg-brand-700"
                          : "bg-white text-ink hover:bg-black/[0.04] border border-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      }`}
                    >
                      {isSelected ? (
                        <svg className="h-3.5 w-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-muted font-bold">+</span>
                      )}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            {property && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary sm:w-auto"
              >
                {t("common.cancel")}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary sm:w-auto"
            >
              {loading ? t("common.saving") : t("property.saveButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
