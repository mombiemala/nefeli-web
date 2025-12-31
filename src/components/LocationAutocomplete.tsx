"use client";

import { useState, useEffect, useRef } from "react";

type LocationResult = {
  label: string;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number;
  lng: number;
};

type LocationAutocompleteProps = {
  label?: string;
  value: string;
  onChangeValue: (value: string, origin?: "typing" | "select") => void;
  onSelect: (item: { label: string; lat: number; lng: number }) => void;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
};

export default function LocationAutocomplete({
  label = "Birth location",
  value,
  onChangeValue,
  onSelect,
  placeholder = "City, State / Country",
  helpText,
  disabled = false,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync query with value prop
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced location search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length >= 3 && !disabled) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/geo/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: query }),
          });

          const data = await res.json();
          if (data.results) {
            setResults(data.results);
          } else {
            setResults([]);
          }
        } catch (error) {
          console.error("Location search error:", error);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300); // 300ms debounce
    } else {
      setResults([]);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, disabled]);

  // Close dropdown on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setResults([]);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setQuery(newValue);
    onChangeValue(newValue, "typing");
    // Don't call onSelect when typing
  }

  function handleResultSelect(result: LocationResult) {
    // Call onSelect FIRST
    onSelect({
      label: result.label,
      lat: result.lat,
      lng: result.lng,
    });
    // Then call onChangeValue with "select" origin
    onChangeValue(result.label, "select");
    setQuery(result.label);
    setResults([]);
  }

  return (
    <div className="relative" ref={containerRef}>
      <label htmlFor="locationInput" className="block text-sm font-medium text-neutral-200">
        {label}
      </label>
      <input
        id="locationInput"
        type="text"
        disabled={disabled}
        className="mt-2 block w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
      />
      {isSearching && (
        <div className="absolute right-3 top-9">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-400" />
        </div>
      )}
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 shadow-lg">
          {results.map((result, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleResultSelect(result)}
              className="w-full px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800 first:rounded-t-xl last:rounded-b-xl transition-colors"
            >
              {result.label}
            </button>
          ))}
        </div>
      )}
      {helpText && (
        <p className="mt-2 text-xs text-neutral-500">{helpText}</p>
      )}
    </div>
  );
}

