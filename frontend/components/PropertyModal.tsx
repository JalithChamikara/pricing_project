"use client";

import { useEffect, useState, type FormEvent } from "react";
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
      setBaseRate(String(property.base_rate));
    } else {
      setName("");
      setDistrict("");
      setPropertyType("");
      setRooms("");
      setBaseRate("");
    }
    setErrorMsg(null);
  }, [property, isOpen]);

  if (!isOpen) return null;

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
    const numRate = Number(baseRate);
    if (!numRate || numRate <= 0) {
      setErrorMsg(t("property.errors.baseRateInvalid"));
      return;
    }
    const numRooms = rooms ? Number(rooms) : null;
    if (numRooms !== null && (numRooms < 1 || !Number.isInteger(numRooms))) {
      setErrorMsg(t("property.errors.roomsInvalid"));
      return;
    }

    setLoading(true);
    const input: PropertyInput = {
      name: cleanName,
      district,
      property_type: propertyType,
      rooms: numRooms,
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
      <div className="w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] border border-black/[0.08] bg-white/95 p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.2)] backdrop-blur-2xl animate-apple-in my-0 sm:my-8">
        {/* Mobile Drag Indicator */}
        <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-neutral-300 sm:hidden" />

        <div className="flex items-start justify-between border-b border-black/[0.05] pb-4">
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
          <div className="alert-error mt-4" role="alert">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {/* Property Name */}
          <div>
            <label htmlFor="prop-name" className="field-label">
              {t("property.name")}
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
                {t("property.district")}
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
                {t("property.type")}
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
                {t("property.rooms")} <span className="text-xs font-normal text-muted">{t("dashboard.optional")}</span>
              </label>
              <input
                id="prop-rooms"
                type="number"
                min="1"
                step="1"
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
                placeholder="4"
                className="input font-medium"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="prop-baserate" className="field-label">
                {t("property.baseRate")}
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

          {/* Buttons */}
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
